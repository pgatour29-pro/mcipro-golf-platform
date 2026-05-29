// Verifies a LINE id_token against LINE's servers and returns the LINE userId.
//
// This is the SAME verification you need for the Part 2 Supabase-JWT mint
// function — once you build that, import verifyLineUser() there too instead
// of duplicating it. The only difference is Part 2 continues on to mint a
// Supabase-signed JWT; here we just need the verified identity.
//
// Why server-side verification matters: the browser holds a LINE userId in
// app state, which anyone can spoof. We never trust a user_id sent in the
// request body. We trust ONLY the userId LINE itself returns for a valid token.

export interface LineUser {
  lineUserId: string; // the LINE "sub", e.g. "U1234abcd..."
  name?: string;
  picture?: string;
  email?: string;
}

export async function verifyLineUser(idToken: string): Promise<LineUser | null> {
  // LINE_CHANNEL_ID = your LINE *Login* channel ID (the one that issues id_tokens).
  const channelId = Deno.env.get("LINE_CHANNEL_ID");
  if (!channelId) {
    console.error("LINE_CHANNEL_ID env var is not set");
    return null;
  }
  if (!idToken) return null;

  let res: Response;
  try {
    res = await fetch("https://api.line.me/oauth2/v2.1/verify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ id_token: idToken, client_id: channelId }),
    });
  } catch (e) {
    console.error("LINE verify request failed:", e);
    return null;
  }

  // 400 from LINE = invalid signature, expired token, wrong channel, etc.
  if (!res.ok) return null;

  const payload = await res.json();
  if (!payload.sub) return null;

  // LINE validates aud == client_id, but re-check defensively.
  if (payload.aud !== channelId) return null;

  return {
    lineUserId: payload.sub,
    name: payload.name,
    picture: payload.picture,
    email: payload.email,
  };
}
