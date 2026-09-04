// 1on1 (v1100): facial profile photo check.
//
// Pete 2026-09-04: members must add a profile photo within 24h of activation — "it can't be a avatar or emoji, it must
// be a facial photo". The browser uploads the image to the public `profile-photos` bucket, then calls this function
// with { url } (or { use_current: true } to check the photo already on the profile). We:
//   1. verify the caller's Supabase session JWT (Auth v2) and read its `line_id` claim → must be an oo_members row;
//   2. fetch the image (our bucket, or the member's own stored profile photo URL) and ask Gemini whether it is a REAL
//      photograph of a human face (not an illustration / avatar / emoji / logo / object);
//   3. on YES call oo_photo_verified() with the service role — that stamps oo_members.photo_url/photo_verified_at,
//      sets profile_data.media.profilePhoto and lifts a no-photo suspension. The browser can never stamp this itself.
// A dry-run header (x-oo-dryrun = OO_FACE_DRYRUN_SECRET) classifies any https image WITHOUT auth or DB writes — used
// to test the classifier from the terminal. Deployed with --no-verify-jwt (config.toml pin) because we validate the
// JWT ourselves and PIN-demo sessions must get a clean `not_signed_in`, not a gateway 401.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";
import { corsHeaders, preflight } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/supabase.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const DRYRUN_SECRET = Deno.env.get("OO_FACE_DRYRUN_SECRET") ?? "";
const MODEL = "gemini-flash-latest";
const FALLBACK_MODEL = "gemini-3.6-flash";   // named by Google's own 404 text for the retired 2.x models (2026-09-04)
const MAX_BYTES = 4 * 1024 * 1024;

const SYSTEM = `You screen profile photos for a private golf club whose members must show their real face.
Accept ONLY a genuine photograph of a real human being whose face is clearly visible and recognisable — a selfie or
portrait, alone or as the obvious subject. Sunglasses, hats, golf gear are fine when the face is still recognisable.
Reject everything else: cartoons, anime, illustrations, drawings, 3D or game avatars, emoji, stickers, memes,
heavily stylised art, logos, text, screenshots, objects, animals, cars, scenery, landscapes,
photos where no face is visible, or a face too small, blurred, masked or turned away to recognise.
Do not reject a normal photograph merely because it is polished, professionally lit or looks like a stock photo —
if it plausibly shows a real person's face, accept it. When unsure between "photo" and "avatar", choose "photo".
Answer strictly as JSON.`;

function json(body: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "=");
    return JSON.parse(atob(b64));
  } catch {
    return null;
  }
}

interface Verdict { is_photograph: boolean; face_visible: boolean; kind: string; reason: string }

// Gemini sometimes wraps the JSON in prose or a code fence despite responseMimeType — take the first {...} block, retry once.
async function classify(bytes: Uint8Array, mime: string): Promise<Verdict> {
  const errors: string[] = [];
  for (let attempt = 0; attempt < 3; attempt++) {   // 0: primary · 1: primary, JSON-only prompt · 2: fallback model, JSON-only prompt
    try { return await classifyOnce(bytes, mime, attempt); } catch (e) { errors.push(`a${attempt}:${String(e).slice(0, 220)}`); console.warn("[oo-face-check] attempt", attempt, String(e).slice(0, 220)); }
  }
  throw new Error(errors.join(" | "));
}

async function classifyOnce(bytes: Uint8Array, mime: string, attempt = 0): Promise<Verdict> {
  const model = attempt < 2 ? MODEL : FALLBACK_MODEL;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [{
          role: "user",
          parts: [
            { text: "Is this image an acceptable profile photo under the rules? Classify it." + (attempt ? " Respond with ONLY the JSON object — no prose, no markdown." : "") },
            { inlineData: { mimeType: mime, data: encodeBase64(bytes) } },
          ],
        }],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 2048,                     // thinking tokens count against this on the 2.5+ flash models — 256 truncated the JSON
          thinkingConfig: { thinkingBudget: 0 },     // no reasoning needed for a yes/no on one image
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              is_photograph: { type: "boolean", description: "true only for a genuine camera photograph of a real person" },
              face_visible: { type: "boolean", description: "true only if a real human face is clearly visible and recognisable" },
              kind: { type: "string", enum: ["photo", "illustration", "avatar", "emoji", "logo", "text", "object", "animal", "scenery", "other"] },
              reason: { type: "string", description: "one short sentence" },
            },
            required: ["is_photograph", "face_visible", "kind", "reason"],
          },
        },
      }),
    },
  );
  if (!res.ok) throw new Error(`gemini_${res.status}:${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const text: string = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
  const block = text.match(/\{[\s\S]*\}/);
  if (!block) throw new Error(`no_json:${text.slice(0, 160)}`);
  const v = JSON.parse(block[0]);
  return {
    is_photograph: v.is_photograph === true,
    face_visible: v.face_visible === true,
    kind: String(v.kind ?? "other"),
    reason: String(v.reason ?? "").slice(0, 200),
  };
}

Deno.serve(async (req: Request) => {
  const pre = preflight(req);
  if (pre) return pre;
  const origin = req.headers.get("origin");
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405, origin);
  if (!GEMINI_API_KEY) return json({ error: "gemini_not_configured" }, 500, origin);

  let body: { url?: string; use_current?: boolean } = {};
  try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400, origin); }

  const dry = !!DRYRUN_SECRET && req.headers.get("x-oo-dryrun") === DRYRUN_SECRET;
  let lineId: string | null = null;
  let url = String(body.url ?? "").trim();

  if (!dry) {
    // 1. who is calling — a real Supabase session JWT (publishable keys and PIN demo sessions are not signed in)
    const auth = req.headers.get("authorization") ?? "";
    const token = auth.replace(/^Bearer\s+/i, "").trim();
    if (!token || token.startsWith("sb_") || token.split(".").length !== 3) return json({ error: "not_signed_in" }, 401, origin);
    const anon = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: u, error: uErr } = await anon.auth.getUser(token);
    if (uErr || !u?.user) return json({ error: "not_signed_in" }, 401, origin);
    const claims = decodeJwtPayload(token) ?? {};
    lineId = (claims.line_id as string) || (u.user.app_metadata?.line_id as string) || (u.user.user_metadata?.line_user_id as string) || null;
    if (!lineId) return json({ error: "no_line_id" }, 401, origin);

    const svc = serviceClient();
    const { data: m } = await svc.from("oo_members").select("user_id, status").eq("user_id", lineId).maybeSingle();
    if (!m || m.status === "removed") return json({ error: "not_a_member" }, 403, origin);

    // 2. which image — a fresh upload in our public bucket, or the photo already on the member's profile
    if (body.use_current || !url) {
      const { data: p } = await svc.from("user_profiles").select("profile_data").eq("line_user_id", lineId).maybeSingle();
      url = String(p?.profile_data?.media?.profilePhoto ?? "").trim();
      if (!url) return json({ error: "no_photo" }, 400, origin);
    } else {
      const prefix = `${SUPABASE_URL}/storage/v1/object/public/profile-photos/`;
      if (!url.startsWith(prefix)) return json({ error: "bad_url" }, 400, origin);
    }
  }
  if (!/^https:\/\//i.test(url)) return json({ error: "bad_url" }, 400, origin);

  // 3. fetch + classify
  let bytes: Uint8Array; let mime: string;
  try {
    const r = await fetch(url, { redirect: "follow" });
    if (!r.ok) return json({ error: "fetch_failed", status: r.status }, 400, origin);
    mime = (r.headers.get("content-type") ?? "image/jpeg").split(";")[0].trim().toLowerCase();
    if (!mime.startsWith("image/")) return json({ error: "not_an_image" }, 400, origin);
    bytes = new Uint8Array(await r.arrayBuffer());
    if (!bytes.length) return json({ error: "empty_image" }, 400, origin);
    if (bytes.length > MAX_BYTES) return json({ error: "too_large" }, 400, origin);
  } catch (e) {
    return json({ error: "fetch_failed", detail: String(e).slice(0, 120) }, 400, origin);
  }

  let verdict: Verdict;
  try { verdict = await classify(bytes, mime); } catch (e) {
    console.error("[oo-face-check] classify", e);
    return json({ error: "check_failed", detail: String(e).slice(0, 700) }, 502, origin);
  }
  const ok = verdict.is_photograph && verdict.face_visible && verdict.kind === "photo";

  // 4. stamp it (service role) — the only path that can mark a member's photo verified
  if (ok && !dry && lineId) {
    const { error } = await serviceClient().rpc("oo_photo_verified", {
      p_user: lineId, p_url: url, p_check: { ...verdict, model: MODEL, at: new Date().toISOString() },
    });
    if (error) {
      console.error("[oo-face-check] oo_photo_verified", error);
      return json({ error: "save_failed", detail: error.message }, 500, origin);
    }
  }
  return json({ ok, kind: verdict.kind, reason: verdict.reason, url, dry }, 200, origin);
});
