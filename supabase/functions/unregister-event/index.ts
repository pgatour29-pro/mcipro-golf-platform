import { preflight, json } from "../_shared/cors.ts";
import { verifyLineUser } from "../_shared/verifyLine.ts";
import { serviceClient } from "../_shared/supabase.ts";

// === CONFIRMED AGAINST SCHEMA ===
const TABLE = "event_registrations";
const ID_COL = "id";           // primary key (uuid)
const OWNER_COL = "player_id"; // LINE userId stored as text
// ================================

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405, origin);

  let body: { id_token?: string; registration_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_json" }, 400, origin);
  }

  const { id_token, registration_id } = body;
  if (!id_token || !registration_id) return json({ error: "missing_fields" }, 400, origin);

  const user = await verifyLineUser(id_token);
  if (!user) return json({ error: "unauthorized" }, 401, origin);

  const supabase = serviceClient();

  const { data, error } = await supabase
    .from(TABLE)
    .delete()
    .eq(ID_COL, registration_id)
    .eq(OWNER_COL, user.lineUserId)
    .select();

  if (error) {
    console.error(error);
    return json({ error: "server_error" }, 500, origin);
  }
  if (!data || data.length === 0) return json({ error: "not_found_or_forbidden" }, 404, origin);

  return json({ success: true, deleted: data.length }, 200, origin);
});
