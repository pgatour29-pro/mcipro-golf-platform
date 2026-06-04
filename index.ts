// supabase/functions/line-oauth-exchange/index.ts
// Verifies LINE, ensures ONE Supabase Auth user per profile (mapped via
// profiles.auth_user_id — no listUsers scan, no duplicates), and returns a
// one-time magic-link token_hash. NO password is ever set or returned.
// The client calls supabase.auth.verifyOtp({ token_hash, type: 'magiclink' })
// to establish the session; the Custom Access Token Hook then injects claims.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const LINE_TOKEN_URL = "https://api.line.me/oauth2/v2.1/token";
const LINE_VERIFY_URL = "https://api.line.me/oauth2/v2.1/verify";

// Deterministic auth email per LINE user. Must use a domain Supabase accepts
// as valid (".local" is often rejected) — use a domain you control / can null-route.
const AUTH_EMAIL_DOMAIN = "line-users.mycaddipro.com";

const CORS = {
  "Access-Control-Allow-Origin": "*", // tighten to your origins in production
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s: number) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const { code, state, redirectUri } = await req.json();
    // 1. Validate `state` for CSRF — keep your existing check here.
    if (!code || !redirectUri) return json({ error: "missing_fields" }, 400);

    // 2. Exchange the LINE code for tokens.
    const tokenRes = await fetch(LINE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: Deno.env.get("LINE_CHANNEL_ID")!,
        client_secret: Deno.env.get("LINE_CHANNEL_SECRET")!,
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.id_token) return json({ error: "line_token_exchange_failed" }, 400);

    // 3. Verify the ID token WITH LINE (sidesteps JWKS/kid/alg entirely).
    const verifyRes = await fetch(LINE_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        id_token: tokenData.id_token,
        client_id: Deno.env.get("LINE_CHANNEL_ID")!,
      }),
    });
    const lineProfile = await verifyRes.json();
    if (!lineProfile.sub) return json({ error: "line_verification_failed" }, 400);
    const lineUserId: string = lineProfile.sub;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, // or APP_DB_SECRET once on new keys
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    // 4. Upsert the CANONICAL profile by line_user_id.
    const { data: profile, error: pErr } = await admin
      .from("profiles")
      .upsert(
        { line_user_id: lineUserId, display_name: lineProfile.name, avatar_url: lineProfile.picture },
        { onConflict: "line_user_id" },
      )
      .select("id, auth_user_id, line_user_id")
      .single();
    if (pErr || !profile) return json({ error: "profile_upsert_failed", details: pErr }, 500);

    // 5. Ensure exactly ONE auth user per profile, via the stored mapping.
    //    No listUsers() scan, so no pagination bug and no duplicates.
    const authEmail = `${lineUserId.toLowerCase()}@${AUTH_EMAIL_DOMAIN}`;
    let authUserId: string | null = profile.auth_user_id ?? null;

    if (authUserId) {
      const { data: got, error } = await admin.auth.admin.getUserById(authUserId);
      if (error || !got?.user) authUserId = null; // stale mapping -> recreate
    }
    if (!authUserId) {
      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email: authEmail,
        email_confirm: true,
        user_metadata: { line_user_id: lineUserId, profile_id: profile.id },
      });
      if (cErr || !created?.user) return json({ error: "auth_user_create_failed", details: cErr }, 500);
      authUserId = created.user.id;
      // Persist the mapping so future logins resolve directly.
      await admin.from("profiles").update({ auth_user_id: authUserId }).eq("id", profile.id);
    }

    // 6. Mint a ONE-TIME session credential without any password.
    const { data: link, error: lErr } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: authEmail,
    });
    if (lErr || !link?.properties?.hashed_token) {
      return json({ error: "session_link_failed", details: lErr }, 500);
    }

    // 7. Return the one-time token_hash + profile (UI cache only). No session yet.
    return json({ token_hash: link.properties.hashed_token, profile }, 200);
  } catch (e) {
    return json({ error: "unexpected", details: String(e) }, 500);
  }
});
