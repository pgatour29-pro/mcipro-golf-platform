// Shared rate limiter (2026-09-06 security review, Pete's checklist #11/#12).
//
// Several functions are deployed verify_jwt=false and spend money (Gemini) or push to LINE, so an unauthenticated
// caller could hammer them. rl_hit() is a fixed-window counter in Postgres (service_role only), so the limit holds
// across edge isolates and regions. FAILS OPEN: if the limiter itself errors, the request proceeds — a limiter
// blip must never take a feature down. A real overrun gets 429 + Retry-After.
import { serviceClient } from "./supabase.ts";

export function callerKey(req: Request, tag: string): string {
  const fwd = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
  const ip = fwd || req.headers.get("cf-connecting-ip") || "noip";
  return `${tag}:${ip}`;
}

/** null = allowed. A 429 Response = over the limit (send it back as-is). */
export async function rateLimit(
  req: Request,
  tag: string,
  limit: number,
  windowSecs = 60,
  headers: HeadersInit = {},
): Promise<Response | null> {
  try {
    const { data, error } = await serviceClient().rpc("rl_hit", {
      p_key: callerKey(req, tag),
      p_limit: limit,
      p_window_secs: windowSecs,
    });
    if (error || !data || data.allowed !== false) return null;
    const retry = Number(data.retry_after ?? windowSecs);
    console.warn(`[ratelimit] ${tag} over limit (${data.hits}/${limit})`);
    return new Response(JSON.stringify({ error: "rate_limited", retry_after: retry }), {
      status: 429,
      headers: { ...headers, "Content-Type": "application/json", "Retry-After": String(retry) },
    });
  } catch (e) {
    console.warn("[ratelimit] failing open:", String(e).slice(0, 120));
    return null;
  }
}
