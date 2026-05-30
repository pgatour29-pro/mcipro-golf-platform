import { create } from "https://deno.land/x/djwt@v3.0.2/mod.ts";
import { preflight, json } from "../_shared/cors.ts";
import { verifyLineUser } from "../_shared/verifyLine.ts";
import { serviceClient } from "../_shared/supabase.ts";

// SEALED mint: signs with an ASYMMETRIC private key that YOU generated and
// imported as a Supabase signing key. The private key lives ONLY here (as an
// Edge Function secret) and is not extractable from Supabase. The leaked legacy
// HS256 secret is revoked, so nothing in the system depends on a shared secret.
//
// Secrets required (set via `supabase secrets set`, run by YOU, never via Hal):
//   APP_JWT_PRIVATE_JWK  - the private signing key, as a JWK string (CLI output)
//   APP_JWT_KID          - the kid of that signing key (from the dashboard/CLI)
//   APP_DB_SECRET        - the new sb_secret_... API key (see _shared/supabase.ts)
//   LINE_CHANNEL_ID      - LINE Login channel id (already set)
//
// ALG must match the algorithm of the key you imported. Supabase CLI generates
// an EC P-256 key by default => ES256. If you imported RSA, switch ALG to RS256
// and the importKey algorithm to { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }.

const JWT_TTL_SECONDS = 60 * 60;
const ALG = "ES256";

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405, origin);

  let body: { id_token?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_json" }, 400, origin);
  }
  if (!body.id_token) return json({ error: "missing_fields" }, 400, origin);

  // 1. Verify with LINE (reuses the Part 1 helper).
  const user = await verifyLineUser(body.id_token);
  if (!user) return json({ error: "unauthorized" }, 401, origin);

  // 2. Map LINE userId -> stable UUID.
  const supabase = serviceClient();
  const { data: appUser, error: upErr } = await supabase
    .from("app_users")
    .upsert(
      {
        line_user_id: user.lineUserId,
        display_name: user.name ?? null,
        last_login: new Date().toISOString(),
      },
      { onConflict: "line_user_id" },
    )
    .select("id")
    .single();
  if (upErr || !appUser) {
    console.error("app_users upsert failed:", upErr);
    return json({ error: "server_error" }, 500, origin);
  }

  // 3. Sign with the asymmetric private key.
  const jwkRaw = Deno.env.get("APP_JWT_PRIVATE_JWK");
  const kid = Deno.env.get("APP_JWT_KID");
  if (!jwkRaw || !kid) {
    console.error("APP_JWT_PRIVATE_JWK / APP_JWT_KID not set");
    return json({ error: "server_error" }, 500, origin);
  }

  const key = await crypto.subtle.importKey(
    "jwk",
    JSON.parse(jwkRaw),
    { name: "ECDSA", namedCurve: "P-256" }, // ES256
    false,
    ["sign"],
  );

  const now = Math.floor(Date.now() / 1000);
  const token = await create(
    { alg: ALG, typ: "JWT", kid }, // kid tells Supabase which public key verifies this
    {
      sub: appUser.id,
      role: "authenticated",
      aud: "authenticated",
      line_id: user.lineUserId,
      iat: now,
      exp: now + JWT_TTL_SECONDS,
    },
    key,
  );

  return json(
    { access_token: token, expires_in: JWT_TTL_SECONDS, sub: appUser.id },
    200,
    origin,
  );
});
