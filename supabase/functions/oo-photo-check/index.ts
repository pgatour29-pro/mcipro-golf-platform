// 1on1 (2026-09-06): SERVER-SIDE screening of partner gallery photos.
//
// Pete: "do we have safeguards in place for photo uploads to make sure there is no nudity". The browser already
// runs NSFWJS (content-moderation.js) but that fails open and can be bypassed by writing to storage directly, so
// the DB now lands every browser-uploaded photo as `pending` (invisible to members) and ONLY this function — via
// the service-role RPC oo_media_screen — can publish or destroy it. Same shape as oo-face-check (v1100):
//   1. verify the caller's Supabase session JWT and read its `line_id` claim;
//   2. the media row must belong to THAT partner (or the caller is a 1on1 admin);
//   3. sign a short-lived URL for the private oo-media object, fetch it, ask Gemini to classify it;
//   4. allowed  → oo_media_screen(ok) publishes it (and it becomes her cover if she has none);
//      rejected → the object is DELETED from storage and the row is marked 'removed' with the verdict kept;
//      error    → nothing changes: the photo stays `pending`, hidden from members, waiting for Admin → Photos.
// A dry-run header (x-oo-dryrun = OO_FACE_DRYRUN_SECRET) classifies any https image with no auth and no writes.
// Deployed --no-verify-jwt (config.toml pin): we validate the JWT ourselves.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";
import { corsHeaders, preflight } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/supabase.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const DRYRUN_SECRET = Deno.env.get("OO_FACE_DRYRUN_SECRET") ?? "";
const MODEL = "gemini-flash-latest";
const FALLBACK_MODEL = "gemini-3.6-flash";
const MAX_BYTES = 8 * 1024 * 1024;

const SYSTEM = `You screen photos for the profile gallery of a private golf playing-partner service. The service is
about golf only: it is not a dating site and it offers no other service, so the gallery must stay unambiguously
ordinary — the sort of photo that could sit on a golf club noticeboard.

REJECT if the image shows any of: nudity or partial nudity; exposed or barely covered breasts, buttocks or genitals;
underwear, lingerie, swimwear or see-through clothing; a sexualised pose, framing or expression; any sexual act or
sexual suggestion; fetish or adult-industry imagery; a minor in any suggestive context.
ACCEPT ordinary clothed photos: golf attire, casual or formal clothes, portraits, action shots, group photos with
friends, the golf course, clubhouse, equipment, scenery, food. Sleeveless tops, golf skirts and shorts are normal
golf clothing and are fine. Do not reject a photo for being flattering, well lit or professionally taken.
When the image is ordinary clothing and you are unsure, ACCEPT. When it is skin-revealing and you are unsure, REJECT.
Answer strictly as JSON.`;

interface Verdict { allowed: boolean; category: string; reason: string }

function json(body: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } });
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "=");
    return JSON.parse(atob(b64));
  } catch { return null; }
}

async function classify(bytes: Uint8Array, mime: string): Promise<Verdict> {
  const errors: string[] = [];
  for (let attempt = 0; attempt < 3; attempt++) {
    try { return await classifyOnce(bytes, mime, attempt); } catch (e) { errors.push(`a${attempt}:${String(e).slice(0, 200)}`); console.warn("[oo-photo-check] attempt", attempt, String(e).slice(0, 200)); }
  }
  throw new Error(errors.join(" | "));
}

async function classifyOnce(bytes: Uint8Array, mime: string, attempt = 0): Promise<Verdict> {
  const model = attempt < 2 ? MODEL : FALLBACK_MODEL;
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{
        role: "user",
        parts: [
          { text: "May this image appear in the public gallery under the rules? Classify it." + (attempt ? " Respond with ONLY the JSON object — no prose, no markdown." : "") },
          { inlineData: { mimeType: mime, data: encodeBase64(bytes) } },
        ],
      }],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 2048,
        thinkingConfig: { thinkingBudget: 0 },
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            allowed: { type: "boolean", description: "true only if the image is acceptable under the rules" },
            category: { type: "string", enum: ["ok", "nudity", "underwear", "swimwear", "sexualised", "explicit", "minor", "other"] },
            reason: { type: "string", description: "one short sentence" },
          },
          required: ["allowed", "category", "reason"],
        },
      },
    }),
  });
  if (!res.ok) throw new Error(`gemini_${res.status}:${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const text: string = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
  const block = text.match(/\{[\s\S]*\}/);
  if (!block) throw new Error(`no_json:${text.slice(0, 160)}`);
  const v = JSON.parse(block[0]);
  const category = String(v.category ?? "other");
  return { allowed: v.allowed === true && category === "ok", category, reason: String(v.reason ?? "").slice(0, 200) };
}

Deno.serve(async (req: Request) => {
  const pre = preflight(req);
  if (pre) return pre;
  const origin = req.headers.get("origin");
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405, origin);
  if (!GEMINI_API_KEY) return json({ error: "gemini_not_configured" }, 500, origin);

  let body: { media_id?: string; url?: string } = {};
  try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400, origin); }

  const dry = !!DRYRUN_SECRET && req.headers.get("x-oo-dryrun") === DRYRUN_SECRET;
  const svc = serviceClient();
  let mediaId = String(body.media_id ?? "").trim();
  let url = "";
  let storagePath = "";
  let partnerId = "";

  if (dry && body.url) {
    url = String(body.url).trim();
  } else {
    // 1. who is calling
    const auth = req.headers.get("authorization") ?? "";
    const token = auth.replace(/^Bearer\s+/i, "").trim();
    if (!token || token.startsWith("sb_") || token.split(".").length !== 3) return json({ error: "not_signed_in" }, 401, origin);
    const anon = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: u, error: uErr } = await anon.auth.getUser(token);
    if (uErr || !u?.user) return json({ error: "not_signed_in" }, 401, origin);
    const claims = decodeJwtPayload(token) ?? {};
    const lineId = (claims.line_id as string) || (u.user.app_metadata?.line_id as string) || null;
    if (!lineId) return json({ error: "no_line_id" }, 401, origin);
    if (!mediaId) return json({ error: "no_media_id" }, 400, origin);

    // 2. the row must be this partner's own pending photo (admins may re-run a screen on any of them)
    const { data: m } = await svc.from("oo_media").select("id, partner_id, kind, status, storage_path").eq("id", mediaId).maybeSingle();
    if (!m || m.kind !== "photo" || !m.storage_path) return json({ error: "not_found" }, 404, origin);
    const { data: p } = await svc.from("oo_partners").select("id, user_id, cover_media_id").eq("id", m.partner_id).maybeSingle();
    const { data: adm } = await svc.from("oo_admins").select("user_id").eq("user_id", lineId).maybeSingle();
    if (!p || (p.user_id !== lineId && !adm)) return json({ error: "not_your_photo" }, 403, origin);
    if (m.status !== "pending") return json({ ok: m.status === "visible", already: m.status }, 200, origin);
    storagePath = m.storage_path;
    partnerId = p.id;

    const { data: signed, error: sErr } = await svc.storage.from("oo-media").createSignedUrl(storagePath, 120);
    if (sErr || !signed?.signedUrl) return json({ error: "sign_failed" }, 500, origin);
    url = signed.signedUrl;
  }

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
    console.error("[oo-photo-check] classify", e);
    // FAIL CLOSED: the photo stays pending — invisible to members until an admin looks at it
    return json({ error: "check_failed", pending: true, detail: String(e).slice(0, 400) }, 502, origin);
  }
  if (dry) return json({ ok: verdict.allowed, category: verdict.category, reason: verdict.reason, dry: true }, 200, origin);

  // 4. publish, or destroy the bytes
  const check = { ...verdict, model: MODEL, at: new Date().toISOString() };
  if (!verdict.allowed) {
    try { await svc.storage.from("oo-media").remove([storagePath]); } catch (e) { console.warn("[oo-photo-check] remove", String(e).slice(0, 160)); }
  }
  const { error: rpcErr } = await svc.rpc("oo_media_screen", { p_media: mediaId, p_ok: verdict.allowed, p_check: check });
  if (rpcErr) {
    console.error("[oo-photo-check] oo_media_screen", rpcErr);
    return json({ error: "save_failed", detail: rpcErr.message }, 500, origin);
  }

  // 5. first approved photo becomes her cover (the DB refuses a cover that is not published)
  if (verdict.allowed && partnerId) {
    const { data: p2 } = await svc.from("oo_partners").select("cover_media_id").eq("id", partnerId).maybeSingle();
    if (p2 && !p2.cover_media_id) await svc.from("oo_partners").update({ cover_media_id: mediaId }).eq("id", partnerId);
  }
  return json({ ok: verdict.allowed, category: verdict.category, reason: verdict.reason }, 200, origin);
});
