import { preflight, json } from "../_shared/cors.ts";
import { verifyLineUser } from "../_shared/verifyLine.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Creates a real Supabase Auth session from a LINE id_token.
// Flow:
//   1. Verify LINE id_token server-side (reuses verifyLine.ts)
//   2. Find or create the Auth user, linked to the existing profiles.id
//   3. Return a real Supabase session (access_token + refresh_token)
//
// The Custom Access Token Hook (registered separately) adds line_id to the JWT.

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
  if (!body.id_token) return json({ error: "missing_id_token" }, 400, origin);

  // 1. Verify with LINE
  const lineUser = await verifyLineUser(body.id_token);
  if (!lineUser) return json({ error: "invalid_line_token" }, 401, origin);

  // Service-role client for admin operations
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  // 2. Find the existing profile by LINE user ID
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, line_user_id, display_name")
    .eq("line_user_id", lineUser.lineUserId)
    .maybeSingle();

  // 3. Find or create the Auth user
  // Check if an Auth user already exists for this LINE id
  const { data: { users } } = await supabase.auth.admin.listUsers();
  let authUser = users?.find((u: any) =>
    u.user_metadata?.line_user_id === lineUser.lineUserId ||
    (profile && u.id === profile.id)
  );

  if (!authUser) {
    // Create a new Auth user
    // If a profile exists, use its UUID so auth.uid() = profiles.id
    const createOpts: any = {
      email: lineUser.lineUserId + "@line.mycaddipro.com", // synthetic email (required by Auth)
      email_confirm: true, // auto-confirm
      user_metadata: {
        line_user_id: lineUser.lineUserId,
        display_name: lineUser.name || "LINE User",
        avatar_url: lineUser.picture || null,
      },
    };
    if (profile) {
      createOpts.id = profile.id; // auth.uid() = profiles.id
    }

    const { data: created, error: createErr } = await supabase.auth.admin.createUser(createOpts);
    if (createErr) {
      console.error("Auth user creation failed:", createErr);
      // If it failed because user exists with that email, try to find them
      if (createErr.message?.includes("already been registered")) {
        const { data: { users: existing } } = await supabase.auth.admin.listUsers();
        authUser = existing?.find((u: any) =>
          u.email === createOpts.email ||
          u.user_metadata?.line_user_id === lineUser.lineUserId
        );
        if (!authUser) {
          return json({ error: "auth_user_creation_failed" }, 500, origin);
        }
      } else {
        return json({ error: "auth_user_creation_failed", details: createErr.message }, 500, origin);
      }
    } else {
      authUser = created.user;
    }

    // If no profile existed, create one with the Auth user's UUID
    if (!profile && authUser) {
      await supabase.from("profiles").insert({
        id: authUser.id,
        line_user_id: lineUser.lineUserId,
        display_name: lineUser.name || "LINE User",
      });
    }
  }

  if (!authUser) {
    return json({ error: "no_auth_user" }, 500, origin);
  }

  // Update user metadata on each login (name/picture might change)
  await supabase.auth.admin.updateUser(authUser.id, {
    user_metadata: {
      line_user_id: lineUser.lineUserId,
      display_name: lineUser.name || authUser.user_metadata?.display_name,
      avatar_url: lineUser.picture || authUser.user_metadata?.avatar_url,
    },
  });

  // 4. Generate a session for this user
  // This creates real access_token + refresh_token signed by Supabase
  const { data: session, error: sessionErr } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email: authUser.email!,
  });

  // Alternative: use signInWithPassword with a generated password, or use
  // admin.generateLink. The cleanest approach for programmatic login:
  // Generate an OTP-less session directly.
  // Actually, the admin API doesn't have a direct "create session" method.
  // The correct approach is to use admin.generateLink and exchange it, or
  // set a known password and sign in.

  // Simpler: set a deterministic password derived from the LINE userId and sign in
  const password = "line_" + lineUser.lineUserId + "_" + Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!.substring(0, 10);

  // Update the user's password
  await supabase.auth.admin.updateUser(authUser.id, { password });

  // Now sign in with it to get a real session
  const anonClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  const { data: signInData, error: signInErr } = await anonClient.auth.signInWithPassword({
    email: authUser.email!,
    password: password,
  });

  if (signInErr || !signInData.session) {
    console.error("Sign in failed:", signInErr);
    return json({ error: "session_creation_failed" }, 500, origin);
  }

  return json({
    access_token: signInData.session.access_token,
    refresh_token: signInData.session.refresh_token,
    expires_in: signInData.session.expires_in,
    user: {
      id: signInData.session.user.id,
      line_user_id: lineUser.lineUserId,
      display_name: lineUser.name,
    },
  }, 200, origin);
});
