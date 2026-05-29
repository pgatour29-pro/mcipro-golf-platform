// Gate for admin-only functions. The caller must send the shared admin secret
// in the "x-admin-secret" header. Only you and Hal hold this secret.
//
// SECURITY: Do NOT embed ADMIN_SECRET in any public/browser JavaScript. These
// admin functions should be invoked from a trusted context (Hal's tooling, or
// an access-controlled admin panel) — never from the public app bundle, where
// the secret would be readable by anyone. Real per-admin auth comes with Part 2.

export function checkAdmin(req: Request): boolean {
  const provided = req.headers.get("x-admin-secret") ?? "";
  const expected = Deno.env.get("ADMIN_SECRET") ?? "";
  if (!expected) {
    console.error("ADMIN_SECRET env var is not set");
    return false;
  }
  return timingSafeEqual(provided, expected);
}

// Constant-time comparison to avoid leaking the secret via response timing.
function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  if (ab.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i];
  return diff === 0;
}
