import { preflight, json } from "../_shared/cors.ts";
import { verifyLineUser } from "../_shared/verifyLine.ts";
import { serviceClient } from "../_shared/supabase.ts";

// LIFF in-app login -> real Supabase Auth session (v2: magic-link OTP, no passwords).
// Verifies the LINE id_token server-side, ensures a profile + a single mapped auth
// user (profiles.auth_user_id), then mints a one-time magic-link token_hash. The
// client calls supabase.auth.verifyOtp({ token_hash, type: 'magiclink' }) to
// establish the session; the Custom Access Token Hook injects profile_id + line_id.
// Mirrors line-oauth-exchange, but sourced from a LIFF id_token instead of an OAuth code.

const AUTH_EMAIL_DOMAIN = "line-users.mycaddipro.com";

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405, origin);

  let body: { id_token?: string };
  try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400, origin); }
  if (!body.id_token) return json({ error: "missing_id_token" }, 400, origin);

  // Trust ONLY the identity LINE returns for a valid token (never the client's claim).
  const lineUser = await verifyLineUser(body.id_token);
  if (!lineUser) return json({ error: "invalid_line_token" }, 401, origin);

  const supabase = serviceClient();
  const lineUserId = lineUser.lineUserId;

  // 1. Find the profile (canonical identity), keyed by line_user_id.
  let { data: profile } = await supabase
    .from("profiles")
    .select("id, auth_user_id, display_name")
    .eq("line_user_id", lineUserId)
    .maybeSingle();

  // 2. Resolve the auth user FIRST (deterministic email — no profile row needed).
  // ORDER MATTERS: profiles.id is NOT NULL with no default and FK-references
  // auth.users(id), so the profile row can only be created AFTER the auth user,
  // with id = auth user id. Creating the profile first was the bug that failed
  // every new LINE signup with profile_create_failed.
  const authEmail = `${lineUserId.toLowerCase()}@${AUTH_EMAIL_DOMAIN}`;
  let authUserId: string | null = (profile?.auth_user_id as string | null) ?? null;

  if (authUserId) {
    const { data: got } = await supabase.auth.admin.getUserById(authUserId);
    if (!got?.user) authUserId = null; // stale mapping -> recreate
  }

  if (!authUserId) {
    const { data: createdUser, error: uErr } = await supabase.auth.admin.createUser({
      email: authEmail,
      email_confirm: true,
      user_metadata: { line_user_id: lineUserId },
    });
    if (createdUser?.user) {
      authUserId = createdUser.user.id;
    } else {
      // Email may already exist from a prior login -> locate it.
      const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const existing = list?.users?.find((u) => u.email === authEmail);
      if (existing) authUserId = existing.id;
      else return json({ error: "auth_user_create_failed", detail: uErr?.message }, 500, origin);
    }
  }

  // 3. Ensure the profiles row exists (id = auth user id) and is mapped.
  if (!profile) {
    const { data: created, error: cErr } = await supabase
      .from("profiles")
      .upsert(
        {
          id: authUserId,
          auth_user_id: authUserId,
          line_user_id: lineUserId,
          display_name: lineUser.name || "LINE User",
        },
        { onConflict: "id" },
      )
      .select("id, auth_user_id, display_name")
      .single();
    if (cErr || !created) {
      return json({ error: "profile_create_failed", detail: cErr?.message }, 500, origin);
    }
    profile = created;
  } else if (profile.auth_user_id !== authUserId) {
    await supabase.from("profiles").update({ auth_user_id: authUserId }).eq("id", profile.id);
  }

  // 3. Mint a one-time magic-link token_hash for the client to verifyOtp.
  const { data: linkData, error: lErr } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email: authEmail,
  });
  const tokenHash = linkData?.properties?.hashed_token;
  if (lErr || !tokenHash) {
    return json({ error: "session_link_failed", detail: lErr?.message }, 500, origin);
  }

  return json({
    token_hash: tokenHash,
    profile: {
      userId: lineUserId,
      displayName: lineUser.name || profile.display_name || "LINE User",
      pictureUrl: lineUser.picture || "",
    },
  }, 200, origin);
});
