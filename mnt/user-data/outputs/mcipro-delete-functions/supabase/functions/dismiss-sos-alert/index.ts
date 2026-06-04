import { preflight, json } from "../_shared/cors.ts";
import { verifyLineUser } from "../_shared/verifyLine.ts";
import { serviceClient } from "../_shared/supabase.ts";

// === CONFIRM AGAINST YOUR SCHEMA ===
const TABLE = "emergency_alerts";
const ID_COL = "id";
const OWNER_COL = "user_id"; // LINE userId of whoever raised the alert
// ===================================

// NOTE ON EMERGENCY DATA: this hard-deletes the alert to match the current
// feature. For an SOS/safety feature you almost certainly want an AUDIT TRAIL
// instead — i.e. soft-delete by setting status='dismissed' + dismissed_at,
// so you keep a record that an emergency was raised and when it was cleared.
// The soft-delete version is shown commented at the bottom; consider switching.
//
// Also consider WHO may dismiss: this scopes dismissal to the person who raised
// the alert. If on-course staff/responders must dismiss others' alerts, that
// needs a separate staff-gated path (similar to the admin functions).

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

  const { data, error } = await supabase
    .from(TABLE)
    .delete()
    .eq(ID_COL, alert_id)
    .eq(OWNER_COL, user.lineUserId)
    .select();

  if (error) {
    console.error(error);
    return json({ error: "server_error" }, 500, origin);
  }
  if (!data || data.length === 0) return json({ error: "not_found_or_forbidden" }, 404, origin);

  return json({ success: true, deleted: data.length }, 200, origin);

  // --- RECOMMENDED soft-delete alternative (replace the block above) ---
  // const { data, error } = await supabase
  //   .from(TABLE)
  //   .update({ status: "dismissed", dismissed_at: new Date().toISOString() })
  //   .eq(ID_COL, alert_id)
  //   .eq(OWNER_COL, user.lineUserId)
  //   .select();
  // ... same error / empty handling, return { success: true, dismissed: data.length }
});
