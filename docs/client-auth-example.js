// Part 2 — client wiring
// Fetches a Supabase JWT from the mint function and feeds it to supabase-js via
// the accessToken option, so every request carries the user's identity and RLS
// scopes their data. Falls back to anon (public-read only) if minting fails.

const SUPABASE_URL = "https://<your-project-ref>.supabase.co";
const SUPABASE_ANON_KEY = "<your anon key>";

let cached = { token: null, exp: 0 };

// Call the mint function with a PLAIN fetch using anon-key headers — NOT through
// the supabase client below, whose token depends on this call (avoids a loop).
async function mintSupabaseToken() {
  const idToken = liff.getIDToken(); // however you currently obtain the LINE id_token
  if (!idToken) throw new Error("no LINE id_token");

  const res = await fetch(`${SUPABASE_URL}/functions/v1/mint-supabase-jwt`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ id_token: idToken }),
  });
  if (!res.ok) throw new Error(`mint failed: ${res.status}`);

  const { access_token, expires_in } = await res.json();
  // refresh 60s before actual expiry
  cached = { token: access_token, exp: Date.now() + (expires_in - 60) * 1000 };
  return access_token;
}

async function getSupabaseToken() {
  if (cached.token && Date.now() < cached.exp) return cached.token;
  return await mintSupabaseToken();
}

// supabase-js v2: when accessToken is provided, the client attaches this token
// to every request. NOTE: this disables the client's built-in auth methods
// (supabase.auth.signIn*, getSession, etc.) — LINE is your identity source now.
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  accessToken: async () => {
    try {
      return await getSupabaseToken();
    } catch (e) {
      console.warn("token mint failed, falling back to anon:", e);
      return null; // anon: only public-browse tables will return data
    }
  },
});

// From here, normal queries are automatically scoped by RLS:
//   const { data } = await supabase.from("bookings").select("*");
//   // returns only the signed-in user's bookings
