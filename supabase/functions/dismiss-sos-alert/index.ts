import { preflight, json } from "../_shared/cors.ts";
import { verifyLineUser } from "../_shared/verifyLine.ts";
import { serviceClient } from "../_shared/supabase.ts";

// === CONFIRMED AGAINST SCHEMA ===
const TABLE = "emergency_alerts";
const ID_COL = "id";         // primary key (text, not uuid)
const OWNER_COL = "user_id"; // LINE userId (text)
// ================================

// DESIGN NOTE: This does a hard delete to match the current browser behavior.
// For an SOS feature you probably want the audit trail. Uncomment the soft-delete
// alternative below and comment out the hard delete if you'd rather keep the record.

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405, origin);

  let body: { id_token?: string; alert_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_json" }, 400, origin);
  }

  const { id_token, alert_id } = body;
  if (!id_token || !alert_id) return json({ error: "missing_fields" }, 400, origin);

  const user = await verifyLineUser(id_token);
  if (!user) return json({ error: "unauthorized" }, 401, origin);

  const supabase = serviceClient();

  // Hard delete (current behavior)
  const { data, error } = await supabase
    .from(TABLE)
    .delete()
    .eq(ID_COL, alert_id)
    .eq(OWNER_COL, user.lineUserId)
    .select();

  // Soft-delete alternative (recommended for audit trail):
  // const { data, error } = await supabase
  //   .from(TABLE)
  //   .update({ status: "dismissed", resolved_by: user.lineUserId, resolved_at: new Date().toISOString() })
  //   .eq(ID_COL, alert_id)
  //   .eq(OWNER_COL, user.lineUserId)
  //   .select();

  if (error) {
    console.error(error);
    return json({ error: "server_error" }, 500, origin);
  }
  if (!data || data.length === 0) return json({ error: "not_found_or_forbidden" }, 404, origin);

  return json({ success: true, deleted: data.length }, 200, origin);
});
