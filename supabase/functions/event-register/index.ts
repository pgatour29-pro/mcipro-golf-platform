// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import * as jose from "https://deno.land/x/jose@v5.6.3/index.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LINE_CHANNEL_SECRET = Deno.env.get("LINE_CHANNEL_SECRET")!;
const LINE_CHANNEL_ID = Deno.env.get("LINE_CHANNEL_ID") ?? undefined;

const supaAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false }});

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};
const json = (b: any, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json", ...CORS } });

async function verifyLineIdToken(idToken: string) {
  try {
    const secret = new TextEncoder().encode(LINE_CHANNEL_SECRET);
    const { payload } = await jose.jwtVerify(idToken, secret, {
      issuer: "https://access.line.me",
      ...(LINE_CHANNEL_ID ? { audience: LINE_CHANNEL_ID } : {}),
    });
    return { ok: true as const, sub: String(payload.sub), name: payload.name as string | undefined, picture: payload.picture as string | undefined };
  } catch (e) {
    return { ok: false as const, detail: `id_token verify failed: ${e?.message ?? String(e)}` };
  }
}

async function getUserUuidForLine(lineUserId: string) {
  const { data, error } = await supaAdmin
    .from("user_identities")
    .select("user_uuid")
    .eq("line_user_id", lineUserId)
    .maybeSingle();
  if (error) return { ok: false as const, detail: `map lookup failed: ${error.message}` };
  if (!data) return { ok: false as const, detail: "no mapping for this LINE user" };
  return { ok: true as const, user_uuid: data.user_uuid as string };
}

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

    // Env guards (prevent uncaught throws)
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !LINE_CHANNEL_SECRET) {
      return json({ ok: false, where: "env", detail: "Missing required envs" }, 500);
    }

    if (req.method !== "POST") return json({ ok: false, where: "method", detail: "POST required" }, 405);

    // Read id_token from request body (to match current frontend implementation)
    const body = await req.json().catch(() => ({}));
    const idToken = body.id_token || "";
    if (!idToken) return json({ ok: false, where: "auth", detail: "missing id_token in request body" }, 401);

    const v = await verifyLineIdToken(idToken);
    if (!v.ok) return json({ ok: false, where: "verify", detail: v.detail }, 401);

    const map = await getUserUuidForLine(v.sub);
    if (!map.ok) return json({ ok: false, where: "map", detail: map.detail }, 401);

    const { event_id, want_transport, want_competition, total_fee, payment_status } = body;
    if (!event_id) return json({ ok: false, where: "validate", detail: "event_id (uuid) is required" }, 400);

    // Validate payment status
    const allowed = new Set(['unpaid', 'paid', 'partial']);
    const final_status = allowed.has(payment_status || '') ? payment_status : 'unpaid';

    const { data, error } = await supaAdmin
      .from("event_registrations")
      .insert({
        id: crypto.randomUUID(),
        event_id,
        player_id: map.user_uuid,
        player_name: v.name || 'User',
        handicap: 0, // Will be populated from profile_data if needed
        want_transport: !!want_transport,
        want_competition: !!want_competition,
        total_fee: Number(total_fee) || 0,
        payment_status: final_status,
      })
      .select("*")
      .single();

    if (error) return json({ ok: false, where: "insert", detail: error.message, hint: error.hint, code: error.code }, 400);

    console.log('[EventRegister] Success:', { registration_id: data.id, line_user: v.sub, user_uuid: map.user_uuid });

    return json({ ok: true, id: data.id, message: `Successfully registered for event` }, 201);
  } catch (e) {
    console.error("UNCAUGHT ERROR:", e);
    return json({ ok: false, where: "uncaught", detail: String(e) }, 500);
  }
});
