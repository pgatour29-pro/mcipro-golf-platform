import { preflight, json } from "../_shared/cors.ts";
import { verifyLineUser } from "../_shared/verifyLine.ts";
import { serviceClient } from "../_shared/supabase.ts";

// round_holes has no direct owner column — ownership lives on the parent round.
// So we verify the round belongs to the caller, THEN delete its holes.
//
// === CONFIRM AGAINST YOUR SCHEMA ===
const ROUNDS_TABLE = "rounds";       // parent table that holds the owner
const ROUNDS_ID_COL = "id";
const ROUNDS_OWNER_COL = "user_id";  // LINE userId of the round owner
const HOLES_TABLE = "round_holes";
const HOLES_FK_COL = "round_id";     // FK in round_holes -> rounds.id
// ===================================

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

  const { id_token, round_id } = body;
  if (!id_token || !round_id) return json({ error: "missing_fields" }, 400, origin);

  const user = await verifyLineUser(id_token);
  if (!user) return json({ error: "unauthorized" }, 401, origin);

  const supabase = serviceClient();

  // 1. Confirm the round belongs to the verified caller.
  const { data: round, error: rErr } = await supabase
    .from(ROUNDS_TABLE)
    .select(ROUNDS_ID_COL)
    .eq(ROUNDS_ID_COL, round_id)
    .eq(ROUNDS_OWNER_COL, user.lineUserId)
    .maybeSingle();

  if (rErr) {
    console.error(rErr);
    return json({ error: "server_error" }, 500, origin);
  }
  if (!round) return json({ error: "not_found_or_forbidden" }, 404, origin);

  // 2. Delete the holes for that round.
  const { data, error } = await supabase
    .from(HOLES_TABLE)
    .delete()
    .eq(HOLES_FK_COL, round_id)
    .select();

  if (error) {
    console.error(error);
    return json({ error: "server_error" }, 500, origin);
  }

  return json({ success: true, deleted: data?.length ?? 0 }, 200, origin);
});
