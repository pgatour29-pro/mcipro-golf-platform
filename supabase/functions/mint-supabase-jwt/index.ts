import { preflight, json } from "../_shared/cors.ts";
import { verifyLineUser } from "../_shared/verifyLine.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { signSupabaseJwt } from "../_shared/signJwt.ts";

// Mints a Supabase JWT from a verified LINE login, signed with the asymmetric
// key (via _shared/signJwt.ts). sub is the CANONICAL user UUID so auth.uid()
// matches existing uuid-keyed data (chat rooms, friendships, C1 UUID tables).
//
// *** CONFIRM CANONICAL_USERS: the table whose uuid `id` your chat/friendships
// rows reference (trace room_members.user_id — likely profiles or user_profiles).
// It must have a unique line_user_id column. ***
//
// If that table already maps every LINE user -> uuid, app_users is redundant and
// you can drop it (and its Part 2 read-own policy); we mint straight from here.

const CANONICAL_USERS = "profiles";        // <-- set to the confirmed table
const LINE_COL = "line_user_id";           // <-- confirm the LINE id column name
const JWT_TTL_SECONDS = 60 * 60;

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405, origin);

  let body: { id_token?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_json" }, 400, origin);
  }
  if (!body.id_token) return json({ error: "missing_fields" }, 400, origin);

  // 1. Verify with LINE.
  const user = await verifyLineUser(body.id_token);
  if (!user) return json({ error: "unauthorized" }, 401, origin);

  // 2. Resolve the CANONICAL user UUID (this is what auth.uid() will return).
  const supabase = serviceClient();
  let userUuid: string | null = null;

  const { data: existing, error: lookErr } = await supabase
    .from(CANONICAL_USERS)
    .select("id")
    .eq(LINE_COL, user.lineUserId)
    .maybeSingle();
  if (lookErr) {
    console.error("canonical lookup failed:", lookErr);
    return json({ error: "server_error" }, 500, origin);
  }
  userUuid = existing?.id ?? null;

  // First-ever login: create the canonical user row.
  if (!userUuid) {
    const { data: created, error: insErr } = await supabase
      .from(CANONICAL_USERS)
      .insert({ [LINE_COL]: user.lineUserId })
      .select("id")
      .single();
    if (insErr || !created) {
      console.error("canonical insert failed:", insErr);
      return json({ error: "server_error" }, 500, origin);
    }
    userUuid = created.id;
  }

  // 3. Sign. sub = canonical uuid; line_id carries the LINE id for text-keyed RLS.
  const token = await signSupabaseJwt(
    { sub: userUuid, line_id: user.lineUserId },
    JWT_TTL_SECONDS,
  );

  return json(
    { access_token: token, expires_in: JWT_TTL_SECONDS, sub: userUuid },
    200,
    origin,
  );
});
