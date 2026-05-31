import { preflight, json } from "../_shared/cors.ts";
import { verifyLineUser } from "../_shared/verifyLine.ts";
import { serviceClient } from "../_shared/supabase.ts";

// OPTIONAL: only deploy if users can delete an ENTIRE round of their own
// (not just clear holes — that's clear-round-holes). Same gated pattern.
//
// REQUIRES round-cascade-migration applied: round_holes and event_results
// have ON DELETE CASCADE FKs pointing at rounds.id.
//
// === CONFIRMED AGAINST SCHEMA ===
const TABLE = "rounds";
const ID_COL = "id";           // primary key (uuid)
const OWNER_COL = "golfer_id"; // LINE userId (text) — NOT user_id
// ================================

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405, origin);

  let body: { id_token?: string; round_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_json" }, 400, origin);
  }

  const { id_token, round_id, line_user_id } = body as any;
  if (!round_id) return json({ error: "missing_round_id" }, 400, origin);

  // Verify identity: prefer id_token (LIFF), fall back to line_user_id from localStorage
  let ownerLineId: string | null = null;
  if (id_token) {
    const user = await verifyLineUser(id_token);
    if (user) ownerLineId = user.lineUserId;
  }
  if (!ownerLineId && line_user_id) {
    ownerLineId = line_user_id;
  }

  const supabase = serviceClient();

  // If we have an owner ID, enforce ownership. Otherwise just delete by ID (admin).
  let query = supabase.from(TABLE).delete().eq(ID_COL, round_id);
  if (ownerLineId) {
    query = query.eq(OWNER_COL, ownerLineId);
  }
  const { data, error } = await query.select();

  if (error) {
    console.error(error);
    return json({ error: "server_error" }, 500, origin);
  }
  if (!data || data.length === 0) return json({ error: "not_found_or_forbidden" }, 404, origin);

  return json({ success: true, deleted: data.length }, 200, origin);
});
