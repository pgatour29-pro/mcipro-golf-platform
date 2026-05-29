import { create } from "https://deno.land/x/djwt@v3.0.2/mod.ts";
import { preflight, json } from "../_shared/cors.ts";
import { verifyLineUser } from "../_shared/verifyLine.ts";
import { serviceClient } from "../_shared/supabase.ts";

// Mints a Supabase-signed JWT from a verified LINE login.
//
// Flow:
//   1. Verify the LINE id_token  (reuses the Part 1 _shared/verifyLine.ts helper)
//   2. Map LINE userId -> a stable app_users UUID (insert on first login)
//   3. Sign a Supabase JWT (HS256) with:
//        sub     = the app_users UUID   (so auth.uid() works if you migrate later)
//        role    = "authenticated"      (REQUIRED — tells PostgREST which pg role)
//        line_id = the LINE userId       (policies key off this against existing
//                                         text owner columns — no data migration)
//
// Call this from the browser with a plain fetch (anon key headers), NOT through
// the supabase client whose token depends on this call — see client example.

const JWT_TTL_SECONDS = 60 * 60; // 1 hour

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

  // 1. Verify with LINE.
  const user = await verifyLineUser(body.id_token);
  if (!user) return json({ error: "unauthorized" }, 401, origin);

  // 2. Map LINE userId -> stable UUID (upsert on first login, touch last_login).
  const supabase = serviceClient();
  const { data: appUser, error: upsertErr } = await supabase
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

  if (upsertErr || !appUser) {
    console.error("app_users upsert failed:", upsertErr);
    return json({ error: "server_error" }, 500, origin);
  }

  // 3. Sign the Supabase JWT.
  // APP_JWT_SECRET must equal your project's JWT secret (Settings -> API / JWT
  // Keys). It is NOT named SUPABASE_* because that prefix is reserved for secrets.
  const secretRaw = Deno.env.get("APP_JWT_SECRET");
  if (!secretRaw) {
    console.error("APP_JWT_SECRET env var is not set");
    return json({ error: "server_error" }, 500, origin);
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secretRaw),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const now = Math.floor(Date.now() / 1000);
  const token = await create(
    { alg: "HS256", typ: "JWT" },
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
