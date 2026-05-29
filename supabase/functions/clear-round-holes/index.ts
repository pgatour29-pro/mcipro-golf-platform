import { preflight, json } from "../_shared/cors.ts";
import { verifyLineUser } from "../_shared/verifyLine.ts";
import { serviceClient } from "../_shared/supabase.ts";

// === CONFIRMED AGAINST SCHEMA ===
// round_holes has no direct owner column.
// Ownership is verified via the parent rounds row:
//   rounds.id = round_holes.round_id
//   rounds.golfer_id = LINE userId (text)
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

  const { id_token, round_id } = body;
  if (!id_token || !round_id) return json({ error: "missing_fields" }, 400, origin);

  const user = await verifyLineUser(id_token);
  if (!user) return json({ error: "unauthorized" }, 401, origin);

  const supabase = serviceClient();

  // Verify ownership on the parent round BEFORE deleting holes.
  const { data: round, error: roundErr } = await supabase
    .from("rounds")
    .select("id, golfer_id")
    .eq("id", round_id)
    .single();

  if (roundErr || !round) return json({ error: "round_not_found" }, 404, origin);
  if (round.golfer_id !== user.lineUserId) return json({ error: "forbidden" }, 403, origin);

  // Safe to delete — caller owns the round.
  const { data, error } = await supabase
    .from("round_holes")
    .delete()
    .eq("round_id", round_id)
    .select();

  if (error) {
    console.error(error);
    return json({ error: "server_error" }, 500, origin);
  }

  return json({ success: true, deleted: data?.length ?? 0 }, 200, origin);
});
