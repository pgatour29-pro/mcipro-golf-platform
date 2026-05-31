// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ALLOWED_ORIGINS = ["https://mycaddipro.com", "https://www.mycaddipro.com"];

function getCorsHeaders(origin: string | null) {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Max-Age": "86400",
  };
}

const json = (b: any, s = 200, origin: string | null) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json", ...getCorsHeaders(origin) } });

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: getCorsHeaders(origin) });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, origin);

  try {
    const ct = req.headers.get("content-type") ?? "";
    if (!ct.includes("application/json")) return json({ error: "content-type must be application/json" }, 415, origin);

    const { code, state } = await req.json().catch(() => ({}));
    if (!code) return json({ error: "Missing code" }, 400, origin);
    if (!state) return json({ error: "Missing state" }, 400, origin);

    const CLIENT_ID = Deno.env.get("LINE_CHANNEL_ID");
    const CLIENT_SECRET = Deno.env.get("LINE_CHANNEL_SECRET");
    if (!CLIENT_ID || !CLIENT_SECRET) {
      return json({ error: "Server not configured", detail: "Missing LINE_CHANNEL_ID/LINE_CHANNEL_SECRET" }, 500, origin);
    }

    // Force exact redirect URI to match LINE console
    const REDIRECT_URI = "https://mycaddipro.com/";

    const tokenRes = await fetch("https://api.line.me/oauth2/v2.1/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }),
    });

    const txt = await tokenRes.text();
    let js: any = null; try { js = JSON.parse(txt); } catch {}

    if (!tokenRes.ok) {
      return json({
        error: "LINE token exchange failed",
        status: tokenRes.status,
        body: js ?? txt,
        hint: "Check exact redirect_uri, channel id/secret, and use a fresh code (single-use).",
      }, tokenRes.status === 401 ? 401 : 400, origin);
    }

    const profRes = await fetch("https://api.line.me/v2/profile", {
      headers: { Authorization: `Bearer ${js.access_token}` },
    });
    const profile = profRes.ok ? await profRes.json() : null;

    // --- Create Supabase Auth session using raw fetch (no createClient import) ---
    let authSession: any = null;
    if (profile?.userId) {
      try {
        const SB_URL = Deno.env.get("SUPABASE_URL")!;
        const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const lineUserId = profile.userId;
        const email = lineUserId.toLowerCase() + "@line.mycaddipro.com";
        const password = "lp_" + lineUserId + "_mcipro";

        console.log("[line-oauth-exchange] Creating auth session for:", lineUserId);

        // Try sign in with password
        const signInRes = await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}` },
          body: JSON.stringify({ email, password }),
        });

        if (signInRes.ok) {
          const session = await signInRes.json();
          console.log("[line-oauth-exchange] Sign in SUCCESS");
          authSession = {
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            expires_in: session.expires_in,
          };
        } else {
          console.log("[line-oauth-exchange] Sign in failed, updating user...");
          // User exists but needs email/password — update via admin API
          // First find the user's auth id from profiles
          const profileRes = await fetch(`${SB_URL}/rest/v1/profiles?line_user_id=eq.${lineUserId}&select=id&limit=1`, {
            headers: { "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}` },
          });
          const profiles = await profileRes.json();
          const profileId = profiles?.[0]?.id;

          if (profileId) {
            // Update existing auth user with email/password
            const updateRes = await fetch(`${SB_URL}/auth/v1/admin/users/${profileId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json", "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}` },
              body: JSON.stringify({
                email, password, email_confirm: true,
                user_metadata: { line_user_id: lineUserId, display_name: profile.displayName || "LINE User" },
              }),
            });
            console.log("[line-oauth-exchange] Update user status:", updateRes.status);

            // Retry sign in
            const retryRes = await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}` },
              body: JSON.stringify({ email, password }),
            });
            if (retryRes.ok) {
              const session = await retryRes.json();
              console.log("[line-oauth-exchange] Retry sign in SUCCESS");
              authSession = {
                access_token: session.access_token,
                refresh_token: session.refresh_token,
                expires_in: session.expires_in,
              };
            } else {
              const err = await retryRes.text();
              console.error("[line-oauth-exchange] Retry sign in failed:", err);
              authSession = { error: "signin_failed_after_update" };
            }
          } else {
            console.log("[line-oauth-exchange] No profile found, creating new user...");
            // Create new user
            const createRes = await fetch(`${SB_URL}/auth/v1/admin/users`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}` },
              body: JSON.stringify({
                email, password, email_confirm: true,
                user_metadata: { line_user_id: lineUserId, display_name: profile.displayName || "LINE User" },
              }),
            });
            console.log("[line-oauth-exchange] Create user status:", createRes.status);

            if (createRes.ok) {
              // Sign in with new user
              const newSignInRes = await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}` },
                body: JSON.stringify({ email, password }),
              });
              if (newSignInRes.ok) {
                const session = await newSignInRes.json();
                console.log("[line-oauth-exchange] New user sign in SUCCESS");
                authSession = {
                  access_token: session.access_token,
                  refresh_token: session.refresh_token,
                  expires_in: session.expires_in,
                };
              }
            }
          }
        }
      } catch (authErr: any) {
        console.error("[line-oauth-exchange] Auth error:", authErr?.message);
        authSession = { error: authErr?.message || "unknown" };
      }
    }

    return json({ ok: true, token: js, profile, auth_session: authSession }, 200, origin);
  } catch (e: any) {
    return json({ error: "Server error", detail: String(e?.message || e) }, 500, origin);
  }
});

