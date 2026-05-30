import { preflight, json } from "../_shared/cors.ts";
import { verifyLineUser } from "../_shared/verifyLine.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { signSupabaseJwt } from "../_shared/signJwt.ts";

// Replaces the broken client-side PIN check. The PIN is verified SERVER-SIDE
// against the locked course_admins table; on success we issue a short-lived
// token carrying an admin_courses claim. RLS reads that claim (see the
// is_course_admin stub) so admin access works without ever exposing the PIN.
//
// CONFIRM course_admins columns: a course key (assumed course_id) plus
// super_admin_pin / staff_pin / access_pin.
//
// SECURITY TODO: PINs should be HASHED at rest (e.g. bcrypt), not plaintext.
// This compares whatever is stored; switch to hash-verify once you migrate them.

const ADMIN_TTL = 30 * 60; // 30 minutes — admin elevation is short-lived

function timingSafeEq(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  if (ea.length !== eb.length) return false;
  let d = 0;
  for (let i = 0; i < ea.length; i++) d |= ea[i] ^ eb[i];
  return d === 0;
}

function levelFor(row: Record<string, string | null>, pin: string): string | null {
  if (row.super_admin_pin && timingSafeEq(pin, row.super_admin_pin)) return "super_admin";
  if (row.staff_pin && timingSafeEq(pin, row.staff_pin)) return "staff";
  if (row.access_pin && timingSafeEq(pin, row.access_pin)) return "access";
  return null;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405, origin);

  let body: { course_id?: string; pin?: string; id_token?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_json" }, 400, origin);
  }
  if (!body.course_id || !body.pin) return json({ error: "missing_fields" }, 400, origin);

  const supabase = serviceClient();

  // Fetch the PINs for this course (service_role bypasses the table lock).
  const { data: row, error } = await supabase
    .from("course_admins")
    .select("super_admin_pin, staff_pin, access_pin")
    .eq("course_id", body.course_id)
    .maybeSingle();
  if (error) {
    console.error(error);
    return json({ error: "server_error" }, 500, origin);
  }
  if (!row) return json({ error: "unauthorized" }, 401, origin);

  const level = levelFor(row as Record<string, string | null>, body.pin);
  if (!level) return json({ error: "unauthorized" }, 401, origin);

  // Optionally tie the admin token to the logged-in LINE user (better audit,
  // per-person admin). If no id_token, issue an ephemeral admin identity.
  let sub: string | null = null;
  let lineId: string | null = null;
  if (body.id_token) {
    const user = await verifyLineUser(body.id_token);
    if (user) {
      const { data: appUser } = await supabase
        .from("app_users")
        .upsert(
          { line_user_id: user.lineUserId, last_login: new Date().toISOString() },
          { onConflict: "line_user_id" },
        )
        .select("id")
        .single();
      sub = appUser?.id ?? null;
      lineId = user.lineUserId;
    }
  }
  if (!sub) sub = crypto.randomUUID(); // ephemeral; admin policies use the claim, not auth.uid()

  const claims: Record<string, unknown> = {
    sub,
    admin_courses: [body.course_id],
    admin_level: level,
  };
  if (lineId) claims.line_id = lineId;

  const token = await signSupabaseJwt(claims, ADMIN_TTL);
  return json({ access_token: token, expires_in: ADMIN_TTL, admin_level: level }, 200, origin);
});
