// Kakao Push (self-notification) Edge Function
// Sends a KakaoTalk "send to me" (memo) message to a Kakao user, using THEIR stored
// OAuth token (requires the talk_message scope, granted at login). This is the only
// Kakao API that can deliver to an arbitrary user at an arbitrary later time.
//
// Input:  { recipient_id: "KAKAO-<id>", message: "..." }
// Output: { success, notified, reason? }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const KAKAO_TOKEN_URL = "https://kauth.kakao.com/oauth/token";
const KAKAO_MEMO_URL = "https://kapi.kakao.com/v2/api/talk/memo/default/send";
const APP_URL = "https://mycaddipro.com";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const KAKAO_CLIENT_ID = Deno.env.get("KAKAO_CLIENT_ID")!;
const KAKAO_CLIENT_SECRET = Deno.env.get("KAKAO_CLIENT_SECRET")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { recipient_id, message } = await req.json().catch(() => ({}));
    if (!recipient_id || !message) return json({ success: false, error: "Missing recipient_id or message" }, 400);
    if (!String(recipient_id).startsWith("KAKAO-")) {
      return json({ success: true, notified: 0, reason: "not_kakao_user" });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: row } = await supabase
      .from("kakao_push_tokens")
      .select("access_token, refresh_token, expires_at, scope")
      .eq("kakao_id", recipient_id)
      .single();

    if (!row) {
      console.log("[Kakao Push] No stored token for", recipient_id);
      return json({ success: true, notified: 0, reason: "no_token" });
    }
    if (row.scope && !row.scope.includes("talk_message")) {
      console.log("[Kakao Push] Token lacks talk_message scope for", recipient_id);
      return json({ success: true, notified: 0, reason: "no_talk_message_scope" });
    }

    let accessToken = row.access_token;

    // Refresh proactively if expired (or within 60s of expiring).
    const expMs = row.expires_at ? new Date(row.expires_at).getTime() : 0;
    if (!expMs || expMs - Date.now() < 60_000) {
      accessToken = (await refreshToken(supabase, recipient_id, row.refresh_token)) || accessToken;
    }

    let sent = await sendMemo(accessToken, message);

    // On 401 (expired/invalid token) refresh once and retry.
    if (sent === 401 && row.refresh_token) {
      const fresh = await refreshToken(supabase, recipient_id, row.refresh_token);
      if (fresh) sent = await sendMemo(fresh, message);
    }

    if (sent === true) return json({ success: true, notified: 1 });
    return json({ success: false, notified: 0, reason: "send_failed", code: sent });
  } catch (e) {
    console.error("[Kakao Push] Error:", e);
    return json({ success: false, error: String((e as Error)?.message || e) }, 500);
  }
});

// Returns true on success, the HTTP status number on failure (e.g. 401).
async function sendMemo(accessToken: string, message: string): Promise<true | number> {
  const templateObject = {
    object_type: "text",
    text: String(message).slice(0, 195),
    link: { web_url: APP_URL, mobile_web_url: APP_URL },
    button_title: "열기", // "Open"
  };
  const res = await fetch(KAKAO_MEMO_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ template_object: JSON.stringify(templateObject) }),
  });
  if (res.ok) {
    console.log("[Kakao Push] ✅ memo sent");
    return true;
  }
  const body = await res.text();
  console.error("[Kakao Push] memo failed:", res.status, body);
  return res.status;
}

// Refreshes the access token via refresh_token grant, persists the new token, returns it (or null).
async function refreshToken(supabase: any, kakaoId: string, refresh: string | null): Promise<string | null> {
  if (!refresh) return null;
  try {
    const res = await fetch(KAKAO_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: KAKAO_CLIENT_ID,
        client_secret: KAKAO_CLIENT_SECRET,
        refresh_token: refresh,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.access_token) {
      console.error("[Kakao Push] refresh failed:", res.status, JSON.stringify(data));
      return null;
    }
    const expiresAt = data.expires_in ? new Date(Date.now() + Number(data.expires_in) * 1000).toISOString() : null;
    const patch: Record<string, unknown> = { access_token: data.access_token, expires_at: expiresAt, updated_at: new Date().toISOString() };
    // Kakao only returns a new refresh_token when the old one is nearing expiry.
    if (data.refresh_token) patch.refresh_token = data.refresh_token;
    await supabase.from("kakao_push_tokens").update(patch).eq("kakao_id", kakaoId);
    return data.access_token;
  } catch (e) {
    console.error("[Kakao Push] refresh error:", e);
    return null;
  }
}
