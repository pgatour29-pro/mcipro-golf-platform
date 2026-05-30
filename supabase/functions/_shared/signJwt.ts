import { create } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

// Signs a Supabase-compatible JWT with the imported asymmetric private key.
// Shared by mint-supabase-jwt and verify-admin-pin so signing logic lives once.
// Secrets: APP_JWT_PRIVATE_JWK (private key JWK), APP_JWT_KID (its kid).
export async function signSupabaseJwt(
  claims: Record<string, unknown>,
  ttlSeconds: number,
): Promise<string> {
  const jwkRaw = Deno.env.get("APP_JWT_PRIVATE_JWK");
  const kid = Deno.env.get("APP_JWT_KID");
  if (!jwkRaw || !kid) throw new Error("signing key secrets not set");

  const key = await crypto.subtle.importKey(
    "jwk",
    JSON.parse(jwkRaw),
    { name: "ECDSA", namedCurve: "P-256" }, // ES256
    false,
    ["sign"],
  );

  const now = Math.floor(Date.now() / 1000);
  return await create(
    { alg: "ES256", typ: "JWT", kid },
    { role: "authenticated", aud: "authenticated", iat: now, exp: now + ttlSeconds, ...claims },
    key,
  );
}
