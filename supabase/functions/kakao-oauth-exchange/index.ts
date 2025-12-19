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

    return json({ ok: true, token: tokenData, profile }, 200, origin);
  } catch (e: any) {
    return json({ error: "Server error", detail: String(e?.message || e) }, 500, origin);
  }
});
