import { preflight, json } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/supabase.ts";

// v1525 FINGERPRINT LOGIN -> real Supabase session (sql/passkey_session_v1525.sql).
// A fingerprint / passkey login used to open the app on the phone only; the server never learned who it was.
//   { op: "challenge" }                       -> { id, challenge }   one-time, 3 minutes
//   { op: "verify", challenge_id, credential_id, client_data, auth_data, signature }
//                                             -> { token_hash }      the client calls auth.verifyOtp({ token_hash, type: 'magiclink' })
// verify checks the WebAuthn assertion against the public key stored for that credential: our challenge, our origin,
// our rpId, user present + verified, counter not replayed, signature valid. Only a credential BOUND to its account
// (webauthn_bind(), from a session already verified for that account) can mint a session. Never trusts the client's
// account id: the account is whatever the credential row says.

const ORIGINS = ["https://mycaddipro.com", "https://www.mycaddipro.com"];
const RP_IDS = ["mycaddipro.com", "www.mycaddipro.com"];
const CHALLENGE_TTL_MS = 3 * 60 * 1000;

const enc = new TextEncoder();
const b64urlToBytes = (s: string): Uint8Array => {
  const b = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  return Uint8Array.from(atob(b), (c) => c.charCodeAt(0));
};
const b64ToBytes = (s: string): Uint8Array => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const bytesToB64url = (u: Uint8Array): string => btoa(String.fromCharCode(...u)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const sha256 = async (u: Uint8Array): Promise<Uint8Array> => new Uint8Array(await crypto.subtle.digest("SHA-256", u));
const eq = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((x, i) => x === b[i]);

// WebAuthn ES256 signatures are ASN.1 DER; WebCrypto wants raw r||s (32 + 32 bytes)
function derToRaw(der: Uint8Array): Uint8Array | null {
  try {
    if (der[0] !== 0x30) return null;
    let i = 2;
    if (der[1] & 0x80) i = 2 + (der[1] & 0x7f);
    const read = () => {
      if (der[i] !== 0x02) throw new Error("int");
      const len = der[i + 1]; let v = der.slice(i + 2, i + 2 + len); i += 2 + len;
      while (v.length > 32 && v[0] === 0) v = v.slice(1);
      if (v.length > 32) throw new Error("len");
      const out = new Uint8Array(32); out.set(v, 32 - v.length); return out;
    };
    const r = read(), s = read();
    const raw = new Uint8Array(64); raw.set(r, 0); raw.set(s, 32); return raw;
  } catch { return null; }
}

async function verifySig(spkiB64: string, data: Uint8Array, sig: Uint8Array): Promise<boolean> {
  let spki: Uint8Array;
  try { spki = b64ToBytes(spkiB64); } catch { return false; }
  if (!spki.length) return false;
  try {   // ES256 (what phones use)
    const k = await crypto.subtle.importKey("spki", spki, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
    const raw = derToRaw(sig);
    if (raw && await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, k, raw, data)) return true;
  } catch { /* not an EC key */ }
  try {   // RS256
    const k = await crypto.subtle.importKey("spki", spki, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    if (await crypto.subtle.verify("RSASSA-PKCS1-v1_5", k, sig, data)) return true;
  } catch { /* not an RSA key */ }
  return false;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405, origin);
  let body: Record<string, string>;
  try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400, origin); }
  const db = serviceClient();

  if (body.op === "challenge") {
    await db.from("webauthn_challenges").delete().lt("created_at", new Date(Date.now() - 10 * 60 * 1000).toISOString());
    const challenge = bytesToB64url(crypto.getRandomValues(new Uint8Array(32)));
    const { data, error } = await db.from("webauthn_challenges").insert({ challenge }).select("id").single();
    if (error || !data) return json({ error: "challenge_failed" }, 500, origin);
    return json({ id: data.id, challenge }, 200, origin);
  }

  if (body.op !== "verify") return json({ error: "bad_op" }, 400, origin);
  const { challenge_id, credential_id, client_data, auth_data, signature } = body;
  if (!challenge_id || !credential_id || !client_data || !auth_data || !signature) return json({ error: "missing" }, 400, origin);

  // 1. the challenge: ours, unused (deleted on read), fresh
  const { data: ch } = await db.from("webauthn_challenges").delete().eq("id", challenge_id).select("challenge, created_at").maybeSingle();
  if (!ch || Date.now() - new Date(ch.created_at).getTime() > CHALLENGE_TTL_MS) return json({ error: "challenge_expired" }, 401, origin);

  let cd: Uint8Array, ad: Uint8Array, sig: Uint8Array, client: { type?: string; challenge?: string; origin?: string };
  try { cd = b64urlToBytes(client_data); ad = b64urlToBytes(auth_data); sig = b64urlToBytes(signature); client = JSON.parse(new TextDecoder().decode(cd)); }
  catch { return json({ error: "bad_assertion" }, 400, origin); }

  // 2. what the browser signed: a sign-in, for our challenge, on our site
  if (client.type !== "webauthn.get" || client.challenge !== ch.challenge || !ORIGINS.includes(client.origin || "")) return json({ error: "bad_client_data" }, 401, origin);

  // 3. authenticator data: our rpId, user present AND verified (fingerprint / face), counter
  if (ad.length < 37) return json({ error: "bad_auth_data" }, 401, origin);
  const rpHash = ad.slice(0, 32);
  let rpOk = false;
  for (const id of RP_IDS) if (eq(rpHash, await sha256(enc.encode(id)))) rpOk = true;
  const flags = ad[32];
  if (!rpOk || !(flags & 0x01) || !(flags & 0x04)) return json({ error: "bad_auth_data" }, 401, origin);
  const counter = ((ad[33] << 24) >>> 0) + (ad[34] << 16) + (ad[35] << 8) + ad[36];

  // 4. the credential: bound to its account (the account is the row's, never the client's)
  const { data: cred } = await db.from("webauthn_credentials").select("id, user_id, public_key, sign_count, bound_at").eq("credential_id", credential_id).maybeSingle();
  if (!cred || !cred.bound_at) return json({ error: "not_bound" }, 403, origin);
  if (counter > 0 && Number(cred.sign_count || 0) > 0 && counter <= Number(cred.sign_count)) return json({ error: "replayed" }, 401, origin);

  // 5. the signature over authData || SHA-256(clientDataJSON)
  const signed = new Uint8Array(ad.length + 32); signed.set(ad, 0); signed.set(await sha256(cd), ad.length);
  if (!await verifySig(cred.public_key || "", signed, sig)) return json({ error: "bad_signature" }, 401, origin);
  await db.from("webauthn_credentials").update({ sign_count: counter, last_used_at: new Date().toISOString() }).eq("id", cred.id);

  // 6. the account's real session: its existing auth user (made by its LINE / Kakao / Google login), one-time magic link
  const { data: prof } = await db.from("profiles").select("auth_user_id").eq("line_user_id", cred.user_id).maybeSingle();
  if (!prof?.auth_user_id) return json({ error: "no_account" }, 404, origin);
  const { data: got } = await db.auth.admin.getUserById(prof.auth_user_id);
  const email = got?.user?.email;
  if (!email) return json({ error: "no_account" }, 404, origin);
  const { data: link, error: lErr } = await db.auth.admin.generateLink({ type: "magiclink", email });
  const tokenHash = link?.properties?.hashed_token;
  if (lErr || !tokenHash) return json({ error: "session_link_failed" }, 500, origin);
  return json({ token_hash: tokenHash, user_id: cred.user_id }, 200, origin);
});
