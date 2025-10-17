// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ORIGIN = "https://mycaddipro.com";
const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};
const json = (b: any, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json", ...CORS } });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const ct = req.headers.get("content-type") ?? "";
    if (!ct.includes("application/json")) return json({ error: "content-type must be application/json" }, 415);

    const { code, state } = await req.json().catch(() => ({}));
    if (!code) return json({ error: "Missing code" }, 400);
    if (!state) return json({ error: "Missing state" }, 400);

    const CLIENT_ID = Deno.env.get("LINE_CHANNEL_ID");
    const CLIENT_SECRET = Deno.env.get("LINE_CHANNEL_SECRET");
    if (!CLIENT_ID || !CLIENT_SECRET) {
      return json({ error: "Server not configured", detail: "Missing LINE_CHANNEL_ID/LINE_CHANNEL_SECRET" }, 500);
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
      }, tokenRes.status === 401 ? 401 : 400);
    }

    const profRes = await fetch("https://api.line.me/v2/profile", {
      headers: { Authorization: `Bearer ${js.access_token}` },
    });
    const profile = profRes.ok ? await profRes.json() : null;

    return json({ ok: true, token: js, profile }, 200);
  } catch (e: any) {
    return json({ error: "Server error", detail: String(e?.message || e) }, 500);
  }
});

