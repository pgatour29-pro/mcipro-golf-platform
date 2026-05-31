// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    // --- Create Supabase Auth session for this LINE user ---
    let authSession: any = null;
    if (profile?.userId) {
      try {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
          { auth: { persistSession: false, autoRefreshToken: false } }
        );

        const lineUserId = profile.userId;
        const email = lineUserId.toLowerCase() + "@line.mycaddipro.com";
        const password = "lp_" + lineUserId + "_mcipro";

        // Find existing profile to align auth.uid() = profiles.id
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("line_user_id", lineUserId)
          .maybeSingle();

        // Try sign in first (existing auth user)
        const anonClient = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
          { auth: { persistSession: false } }
        );

        let signIn = await anonClient.auth.signInWithPassword({ email, password });

        if (signIn.error) {
          // Create auth user
          const createOpts: any = {
            email,
            password,
            email_confirm: true,
            user_metadata: {
              line_user_id: lineUserId,
              display_name: profile.displayName || "LINE User",
            },
          };
          if (existingProfile) createOpts.id = existingProfile.id;

          await supabase.auth.admin.createUser(createOpts);

          // Create profile if needed
          if (!existingProfile) {
            const { data: newSignIn } = await anonClient.auth.signInWithPassword({ email, password });
            if (newSignIn?.user) {
              await supabase.from("profiles").upsert({
                id: newSignIn.user.id,
                line_user_id: lineUserId,
                display_name: profile.displayName || "LINE User",
              }, { onConflict: "line_user_id" });
            }
          }

          // Sign in again
          signIn = await anonClient.auth.signInWithPassword({ email, password });
        }

        if (signIn.data?.session) {
          authSession = {
            access_token: signIn.data.session.access_token,
            refresh_token: signIn.data.session.refresh_token,
            expires_in: signIn.data.session.expires_in,
          };
        }
      } catch (authErr: any) {
        console.error("[line-oauth-exchange] Auth session creation failed:", authErr?.message, authErr?.stack);
        authSession = { error: authErr?.message || "unknown error" };
      }
    }

    return json({ ok: true, token: js, profile, auth_session: authSession }, 200, origin);
  } catch (e: any) {
    return json({ error: "Server error", detail: String(e?.message || e) }, 500, origin);
  }
});

