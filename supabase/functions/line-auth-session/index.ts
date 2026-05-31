import { preflight, json } from "../_shared/cors.ts";
import { verifyLineUser } from "../_shared/verifyLine.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Creates a real Supabase Auth session from a LINE id_token.
// Simplified: uses email+password with deterministic password from LINE userId.

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405, origin);

  let body: { id_token?: string };
  try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400, origin); }
  if (!body.id_token) return json({ error: "missing_id_token" }, 400, origin);

  const lineUser = await verifyLineUser(body.id_token);
  if (!lineUser) return json({ error: "invalid_line_token" }, 401, origin);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const email = lineUser.lineUserId.toLowerCase() + "@line.mycaddipro.com";
  // Deterministic password — not guessable from outside, consistent across logins
  const password = "lp_" + lineUser.lineUserId + "_mcipro";

  // Find existing profile to align auth.uid() = profiles.id
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("line_user_id", lineUser.lineUserId)
    .maybeSingle();

  // Try to sign in first (existing user)
  const anonUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonClient = createClient(anonUrl, anonKey, { auth: { persistSession: false } });

  let signIn = await anonClient.auth.signInWithPassword({ email, password });

  if (signIn.error) {
    // User doesn't exist yet — create them
    const createOpts: Record<string, unknown> = {
      email,
      password,
      email_confirm: true,
      user_metadata: {
        line_user_id: lineUser.lineUserId,
        display_name: lineUser.name || "LINE User",
      },
    };
    // Align auth user id with existing profile id
    if (profile) createOpts.id = profile.id;

    const { error: createErr } = await supabase.auth.admin.createUser(createOpts);
    if (createErr) {
      console.error("Create user failed:", createErr.message);
      return json({ error: "create_failed", detail: createErr.message }, 500, origin);
    }

    // If no profile existed, create one
    if (!profile) {
      const { data: newUser } = await anonClient.auth.signInWithPassword({ email, password });
      if (newUser?.user) {
        await supabase.from("profiles").upsert({
          id: newUser.user.id,
          line_user_id: lineUser.lineUserId,
          display_name: lineUser.name || "LINE User",
        }, { onConflict: "line_user_id" });
      }
    }

    // Now sign in
    signIn = await anonClient.auth.signInWithPassword({ email, password });
    if (signIn.error) {
      console.error("Sign in after create failed:", signIn.error.message);
      return json({ error: "signin_failed", detail: signIn.error.message }, 500, origin);
    }
  }

  const session = signIn.data.session!;
  return json({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: session.expires_in,
    user: {
      id: session.user.id,
      line_user_id: lineUser.lineUserId,
      display_name: lineUser.name,
    },
  }, 200, origin);
});
