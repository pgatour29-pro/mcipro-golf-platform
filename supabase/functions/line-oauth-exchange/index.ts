// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// LINE OAuth → Supabase Auth (v2: magic-link OTP, no passwords)
// Returns token_hash for client to call verifyOtp({ token_hash, type: 'magiclink' })
// Custom Access Token Hook then injects profile_id + line_id claims.

const ALLOWED_ORIGINS = ["https://mycaddipro.com", "https://www.mycaddipro.com"];
const AUTH_EMAIL_DOMAIN = "line-users.mycaddipro.com";

function getCorsHeaders(origin: string | null) {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Max-Age": "86400",
  };
}

const json = (b: any, s = 200, origin: string | null) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json", ...getCorsHeaders(origin) } });

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

    const SB_URL = Deno.env.get("SUPABASE_URL")!;
    const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const headers = { "Content-Type": "application/json", "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}` };

    // Force exact redirect URI to match LINE console
    const REDIRECT_URI = "https://mycaddipro.com/";

    // 1. Exchange LINE code for tokens
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
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      return json({ error: "LINE token exchange failed", status: tokenRes.status, body: tokenData }, 400, origin);
    }

    // 2. Get LINE profile
    const profRes = await fetch("https://api.line.me/v2/profile", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const lineProfile = profRes.ok ? await profRes.json() : null;
    if (!lineProfile?.userId) {
      return json({ error: "Failed to get LINE profile" }, 400, origin);
    }
    const lineUserId: string = lineProfile.userId;
    console.log("[line-oauth-exchange] LINE user:", lineUserId);

    // 3. Look up existing profile by line_user_id
    const profileLookupRes = await fetch(
      `${SB_URL}/rest/v1/profiles?line_user_id=eq.${lineUserId}&select=id,auth_user_id,line_user_id,display_name&limit=1`,
      { headers }
    );
    const profiles = await profileLookupRes.json();
    let profile = profiles?.[0] || null;

    // 4. If no profile exists, create one
    if (!profile) {
      console.log("[line-oauth-exchange] Creating new profile for:", lineUserId);
      const createProfileRes = await fetch(`${SB_URL}/rest/v1/profiles`, {
        method: "POST",
        headers: { ...headers, "Prefer": "return=representation" },
        body: JSON.stringify({
          line_user_id: lineUserId,
          display_name: lineProfile.displayName || "LINE User",
        }),
      });
      const created = await createProfileRes.json();
      profile = Array.isArray(created) ? created[0] : created;
      if (!profile?.id) {
        return json({ error: "profile_create_failed", detail: created }, 500, origin);
      }
      console.log("[line-oauth-exchange] Profile created:", profile.id);
    }

    // 5. Ensure exactly ONE auth user per profile via auth_user_id mapping
    const authEmail = `${lineUserId.toLowerCase()}@${AUTH_EMAIL_DOMAIN}`;
    let authUserId: string | null = profile.auth_user_id || null;

    // Verify existing mapping is still valid
    if (authUserId) {
      const checkRes = await fetch(`${SB_URL}/auth/v1/admin/users/${authUserId}`, { headers });
      if (!checkRes.ok) {
        console.log("[line-oauth-exchange] Stale auth_user_id, will recreate");
        authUserId = null;
      }
    }

    // Create auth user if needed
    if (!authUserId) {
      console.log("[line-oauth-exchange] Creating auth user for:", lineUserId);
      const createRes = await fetch(`${SB_URL}/auth/v1/admin/users`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          email: authEmail,
          email_confirm: true,
          user_metadata: { line_user_id: lineUserId, profile_id: profile.id },
        }),
      });
      const createData = await createRes.json();
      if (!createRes.ok || !createData?.id) {
        // Might already exist with this email — try to find it
        if (createData?.msg?.includes("already been registered") || createData?.message?.includes("already been registered")) {
          console.log("[line-oauth-exchange] Auth user exists with email, looking up...");
          // List users by email to find the existing one
          const listRes = await fetch(`${SB_URL}/auth/v1/admin/users?page=1&per_page=1`, {
            headers,
          });
          const listData = await listRes.json();
          const existing = listData?.users?.find((u: any) => u.email === authEmail);
          if (existing) {
            authUserId = existing.id;
            console.log("[line-oauth-exchange] Found existing auth user:", authUserId);
          } else {
            return json({ error: "auth_user_create_failed", detail: createData }, 500, origin);
          }
        } else {
          return json({ error: "auth_user_create_failed", detail: createData }, 500, origin);
        }
      } else {
        authUserId = createData.id;
        console.log("[line-oauth-exchange] Auth user created:", authUserId);
      }

      // Persist the mapping
      await fetch(`${SB_URL}/rest/v1/profiles?id=eq.${profile.id}`, {
        method: "PATCH",
        headers: { ...headers, "Prefer": "return=minimal" },
        body: JSON.stringify({ auth_user_id: authUserId }),
      });
      console.log("[line-oauth-exchange] auth_user_id mapped:", authUserId);
    }

    // 6. Mint a ONE-TIME magic-link token (no password ever set)
    const linkRes = await fetch(`${SB_URL}/auth/v1/admin/generate_link`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        type: "magiclink",
        email: authEmail,
      }),
    });
    const linkData = await linkRes.json();
    console.log("[line-oauth-exchange] generateLink status:", linkRes.status);
    console.log("[line-oauth-exchange] generateLink response keys:", Object.keys(linkData || {}));

    // REST API returns hashed_token in properties, or action_link as a URL
    let tokenHash = linkData?.properties?.hashed_token;
    if (!tokenHash && linkData?.action_link) {
      // Extract token_hash from action_link URL
      try {
        const url = new URL(linkData.action_link);
        tokenHash = url.searchParams.get("token_hash") || url.searchParams.get("token");
        // Also try hash fragment
        if (!tokenHash && url.hash) {
          const hashParams = new URLSearchParams(url.hash.slice(1));
          tokenHash = hashParams.get("token_hash") || hashParams.get("token");
        }
      } catch {}
    }
    // hashed_token might also be at top level
    if (!tokenHash) tokenHash = linkData?.hashed_token;

    if (!linkRes.ok || !tokenHash) {
      console.error("[line-oauth-exchange] generateLink failed:", JSON.stringify(linkData));
      return json({ error: "session_link_failed", detail: linkData }, 500, origin);
    }

    console.log("[line-oauth-exchange] ✅ token_hash generated for:", lineUserId);

    // 7. Return token_hash + profile. Client calls verifyOtp to establish session.
    return json({
      ok: true,
      token_hash: tokenHash,
      profile: {
        id: profile.id,
        line_user_id: lineUserId,
        display_name: lineProfile.displayName || profile.display_name,
        picture_url: lineProfile.pictureUrl,
      },
      // Keep LINE token for backward compat (profile restore uses it)
      token: tokenData,
    }, 200, origin);

  } catch (e: any) {
    console.error("[line-oauth-exchange] Error:", e?.message || e);
    return json({ error: "Server error", detail: String(e?.message || e) }, 500, origin);
  }
});
