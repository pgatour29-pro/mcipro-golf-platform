// Shared CORS handling for all MyCaddiPro delete functions.
// The browser calls these directly, so preflight + headers are required.

// === CONFIRM: list every origin the app is served from ===
const ALLOWED_ORIGINS = [
  "https://mycaddipro.com",
  "https://www.mycaddipro.com",
  "https://mcipro-golf-platform.vercel.app",
];
// =========================================================

export function corsHeaders(origin: string | null): HeadersInit {
  // Echo the origin only if it's allow-listed; otherwise fall back to the first.
  const allow =
    origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-admin-secret",
    "Access-Control-Max-Age": "86400",
  };
}

// Returns a preflight response if this is an OPTIONS request, else null.
export function preflight(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req.headers.get("origin")) });
  }
  return null;
}

// Standard JSON response with CORS headers attached.
export function json(body: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });
}
