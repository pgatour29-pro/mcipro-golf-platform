import { preflight, json } from "../_shared/cors.ts";
import { checkAdmin } from "../_shared/admin.ts";
import { serviceClient } from "../_shared/supabase.ts";

// === CONFIRM AGAINST YOUR SCHEMA ===
// trgg_user_map links a TRGG player to a MyCaddiPro user. Decide what you key
// the unlink on: the map row's own primary key (map_id) is safest. If you'd
// rather unlink by line_user_id, swap ID_COL and the body field accordingly.
const TABLE = "trgg_user_map";
const ID_COL = "id";
// ===================================

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405, origin);

  if (!checkAdmin(req)) return json({ error: "forbidden" }, 403, origin);

  let body: { map_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_json" }, 400, origin);
  }
  if (!body.map_id) return json({ error: "missing_fields" }, 400, origin);

  const supabase = serviceClient();
  const { data, error } = await supabase
    .from(TABLE)
    .delete()
    .eq(ID_COL, body.map_id)
    .select();

  if (error) {
    console.error(error);
    return json({ error: "server_error" }, 500, origin);
  }
  if (!data || data.length === 0) return json({ error: "not_found" }, 404, origin);

  return json({ success: true, deleted: data.length }, 200, origin);
});
