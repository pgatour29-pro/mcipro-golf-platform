import { preflight, json } from "../_shared/cors.ts";
import { checkAdmin } from "../_shared/admin.ts";
import { serviceClient } from "../_shared/supabase.ts";

// Admin-only: delete old trgg_rounds for a player and insert new ones.
// Used by the TRGG handicap paste/sync feature.

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405, origin);

  if (!checkAdmin(req)) return json({ error: "forbidden" }, 403, origin);

  let body: { player_id?: string; rounds?: { round_date: string; stableford: number }[] };
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_json" }, 400, origin);
  }

  const { player_id, rounds } = body;
  if (!player_id || !rounds || !Array.isArray(rounds)) {
    return json({ error: "missing_fields" }, 400, origin);
  }

  const supabase = serviceClient();

  // Delete old rounds for this player
  const { error: delErr } = await supabase
    .from("trgg_rounds")
    .delete()
    .eq("player_id", player_id);

  if (delErr) {
    console.error("Delete error:", delErr);
    return json({ error: "delete_failed" }, 500, origin);
  }

  // Insert new rounds
  if (rounds.length > 0) {
    const rows = rounds.map((r) => ({
      player_id,
      round_date: r.round_date,
      stableford: r.stableford,
    }));

    const { error: insErr } = await supabase.from("trgg_rounds").insert(rows);
    if (insErr) {
      console.error("Insert error:", insErr);
      return json({ error: "insert_failed" }, 500, origin);
    }
  }

  return json({ success: true, deleted: true, inserted: rounds.length }, 200, origin);
});
