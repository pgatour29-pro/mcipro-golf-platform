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

const json = (b: any, s = 200, origin: string | null) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { "Content-Type": "application/json", ...getCorsHeaders(origin) },
  });

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

    const CLIENT_ID = Deno.env.get("KAKAO_CLIENT_ID");
    const CLIENT_SECRET = Deno.env.get("KAKAO_CLIENT_SECRET");
    if (!CLIENT_ID || !CLIENT_SECRET) {
      return json({ error: "Server not configured", detail: "Missing KAKAO_CLIENT_ID/KAKAO_CLIENT_SECRET" }, 500, origin);
    }

    const REDIRECT_URI = "https://mycaddipro.com/";

    // Exchange authorization code for access token
    const tokenRes = await fetch("https://kauth.kakao.com/oauth/token", {
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

    const tokenText = await tokenRes.text();
    let tokenData: any = null;
    try {
      tokenData = JSON.parse(tokenText);
    } catch {}

    if (!tokenRes.ok) {
      return json(
        {
          error: "Kakao token exchange failed",
          status: tokenRes.status,
          body: tokenData ?? tokenText,
          hint: "Check exact redirect_uri, client id/secret, and use a fresh code (single-use).",
        },
        tokenRes.status === 401 ? 401 : 400,
        origin
      );
    }

    // Fetch user profile using access token
    const profileRes = await fetch("https://kapi.kakao.com/v2/user/me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!profileRes.ok) {
      return json(
        {
          error: "Kakao profile fetch failed",
          status: profileRes.status,
        },
        profileRes.status,
        origin
      );
    }

    const kakaoProfile = await profileRes.json();

    // Transform Kakao profile to standard format
    // Kakao response structure:
    // {
    //   id: 1234567890,
    //   properties: { nickname: "Name", profile_image: "url", thumbnail_image: "url" },
    //   kakao_account: { email: "email@example.com", profile: { nickname, profile_image_url } }
    // }
    // Note: email scope requires business verification in Korea
    // We only request profile_nickname and profile_image
    const profile = {
      id: String(kakaoProfile.id),
      userId: String(kakaoProfile.id),
      displayName: kakaoProfile.properties?.nickname || kakaoProfile.kakao_account?.profile?.nickname || "Kakao User",
      pictureUrl: kakaoProfile.properties?.profile_image || kakaoProfile.kakao_account?.profile?.profile_image_url || null,
      email: null, // Not requesting email - requires business verification
      provider: "kakao",
    };

    // --- v2: establish a Supabase Auth session (FAIL-SAFE — never blocks login) ---
    // Creates a public.profiles row keyed to KAKAO-<id> (matching user_profiles) + an auth user,
    // then mints a magic-link token_hash. The Custom Access Token Hook reads public.profiles by
    // auth_user_id and injects line_id + profile_id claims. Client calls verifyOtp(token_hash).
    let token_hash: string | null = null;
    try {
      const SB_URL = Deno.env.get("SUPABASE_URL")!;
      const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const sb = { "Content-Type": "application/json", "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}` };
      const effectiveId = `KAKAO-${profile.id}`;
      const authEmail = `${effectiveId.toLowerCase()}@kakao-users.mycaddipro.com`;

      // Persist the Kakao tokens so kakao-push can send "send to me" notifications later.
      // Only useful once the user has granted the talk_message scope. Non-fatal.
      try {
        const expiresAt = tokenData?.expires_in
          ? new Date(Date.now() + Number(tokenData.expires_in) * 1000).toISOString()
          : null;
        await fetch(`${SB_URL}/rest/v1/kakao_push_tokens`, {
          method: "POST",
          headers: { ...sb, Prefer: "resolution=merge-duplicates,return=minimal" },
          body: JSON.stringify({
            kakao_id: effectiveId,
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token ?? null,
            expires_at: expiresAt,
            scope: tokenData.scope ?? null,
            updated_at: new Date().toISOString(),
          }),
        });
      } catch (tokErr) {
        console.warn("[kakao-oauth-exchange] token store failed (non-fatal):", String(tokErr));
      }

      // 1. Existing mapping for this provider id?
      const prof: any = (await (await fetch(`${SB_URL}/rest/v1/profiles?line_user_id=eq.${encodeURIComponent(effectiveId)}&select=id,auth_user_id&limit=1`, { headers: sb })).json())?.[0] || null;
      // 2. Resolve the auth user (profiles.id & auth_user_id are FKs to auth.users; creating a user
      //    auto-creates its profiles row via the new-user trigger, so we PATCH rather than insert).
      let authUserId: string | null = prof?.auth_user_id || prof?.id || null;
      if (authUserId) { const chk = await fetch(`${SB_URL}/auth/v1/admin/users/${authUserId}`, { headers: sb }); if (!chk.ok) authUserId = null; }
      if (!authUserId) {
        const cr = await fetch(`${SB_URL}/auth/v1/admin/users`, { method: "POST", headers: sb, body: JSON.stringify({ email: authEmail, email_confirm: true }) });
        const cd = await cr.json();
        authUserId = (cr.ok && cd?.id) ? cd.id : (await (await fetch(`${SB_URL}/auth/v1/admin/users?page=1&per_page=200`, { headers: sb })).json())?.users?.find((u: any) => u.email === authEmail)?.id || null;
      }
      if (authUserId) {
        // 3. Stamp our identity onto the (auto-created) profiles row so the hook injects line_id/profile_id
        await fetch(`${SB_URL}/rest/v1/profiles?id=eq.${authUserId}`, { method: "PATCH", headers: { ...sb, Prefer: "return=minimal" }, body: JSON.stringify({ line_user_id: effectiveId, display_name: profile.displayName, auth_user_id: authUserId }) });
        // 4. Mint the one-time magic-link token
        const lk = await (await fetch(`${SB_URL}/auth/v1/admin/generate_link`, { method: "POST", headers: sb, body: JSON.stringify({ type: "magiclink", email: authEmail }) })).json();
        token_hash = lk?.hashed_token || lk?.properties?.hashed_token || null;
        if (!token_hash && lk?.action_link) { try { const u = new URL(lk.action_link); token_hash = u.searchParams.get("token_hash") || u.searchParams.get("token"); } catch { /* ignore */ } }
      }
    } catch (sessErr) {
      console.warn("[kakao-oauth-exchange] session establishment failed (non-fatal):", String(sessErr));
    }

    return json({ ok: true, token: tokenData, profile, token_hash }, 200, origin);
  } catch (e: any) {
    return json({ error: "Server error", detail: String(e?.message || e) }, 500, origin);
  }
});
