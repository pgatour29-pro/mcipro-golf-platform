import { preflight, json } from "../_shared/cors.ts";
import { checkAdmin } from "../_shared/admin.ts";
import { serviceClient } from "../_shared/supabase.ts";

// === CONFIRM AGAINST YOUR SCHEMA ===
const TABLE = "trgg_rounds";
const ID_COL = "id";
// ===================================

// CASCADE NOTE: if other tables reference trgg_rounds (scores, hole rows, etc.)
// and the FK is NOT defined ON DELETE CASCADE, this delete will either fail on
// the FK constraint or orphan children. Either add ON DELETE CASCADE to those
// FKs, or delete the child rows here first before deleting the round.

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405, origin);

  // Admin gate — no LINE identity needed, but the shared secret is required.
  if (!checkAdmin(req)) return json({ error: "forbidden" }, 403, origin);

  let body: { round_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_json" }, 400, origin);
  }
  if (!body.round_id) return json({ error: "missing_fields" }, 400, origin);

  const supabase = serviceClient();
  const { data, error } = await supabase
    .from(TABLE)
    .delete()
    .eq(ID_COL, body.round_id)
    .select();

  if (error) {
    console.error(error);
    return json({ error: "server_error" }, 500, origin);
  }
  if (!data || data.length === 0) return json({ error: "not_found" }, 404, origin);

  return json({ success: true, deleted: data.length }, 200, origin);
});
