// Image safety screen (2026-09-06) — the server-side half of content-moderation.js.
//
// Pete asked whether anything stops a nude photo being uploaded. The browser check (NSFWJS) fails open and can be
// skipped; 1on1 partner photos got a proper DB gate (oo-photo-check), and this function is the same classifier for
// every OTHER surface where a photo is shown to other people: profile photos, caddy notebook photos, society logos,
// 19th Hole listings, course-condition photos, maintenance photos, course requests.
// It only classifies — it writes nothing — so the caller decides what to do; ContentModeration.screenImage() in the
// browser treats "no verdict" as a REFUSAL (fail closed), because these surfaces have no pending state to fall back
// on. Deployed --no-verify-jwt: an Authorization header (session JWT or the publishable key, which
// supabase.functions.invoke always sends) is required, nothing more — the function exposes no data.
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";
import { corsHeaders, preflight } from "../_shared/cors.ts";
import { rateLimit } from "../_shared/ratelimit.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const MODEL = "gemini-flash-latest";
const FALLBACK_MODEL = "gemini-3.6-flash";
const MAX_BYTES = 8 * 1024 * 1024;

const CONTEXT_NOTE: Record<string, string> = {
  profile: "This is a member's profile photo — a portrait of a real person is expected.",
  caddy: "This is a caddie's photo in a golfer's caddie notebook — a portrait taken at the course is expected.",
  logo: "This is a golf society's logo or badge — artwork, text and crests are all expected and fine.",
  listing: "This is a photo in a golf classifieds listing — clubs, bags, shoes, gadgets and their owners are expected.",
  course: "This is a photo of course conditions — grass, bunkers, greens, damage and machinery are expected.",
  maintenance: "This is a photo attached to a maintenance job — equipment, turf and facilities are expected.",
  general: "",
};

const SYSTEM = `You screen photos uploaded to a golf club management app used by clubs, societies, caddies and
golfers in Thailand. Your ONLY job is to catch content that must never be published to other users.

REJECT (allowed=false) if the image contains: nudity or partial nudity; exposed or barely covered breasts, buttocks
or genitals; underwear, lingerie, swimwear or see-through clothing; a sexualised pose, framing or expression; any
sexual act or sexual suggestion; fetish or adult-industry imagery; a minor in any suggestive context; graphic
violence, gore or self-harm; hateful symbols.
ACCEPT (allowed=true) everything else — people in ordinary or golf clothing (sleeveless tops, golf skirts and shorts
are normal golf wear), portraits, groups, courses, clubhouses, equipment, scorecards, documents, screenshots, logos,
artwork, food, animals, scenery. Do not reject a photo for being flattering, professionally taken, low quality,
blurry, irrelevant or badly framed — that is not your call. Only the list above is rejected.
When it is ordinary clothing or an object and you are unsure, ACCEPT. When it is skin-revealing and you are unsure,
REJECT. Answer strictly as JSON.`;

interface Verdict { allowed: boolean; category: string; reason: string }

function json(body: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } });
}

async function classifyOnce(bytes: Uint8Array, mime: string, note: string, attempt = 0): Promise<Verdict> {
  const model = attempt < 2 ? MODEL : FALLBACK_MODEL;
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{
        role: "user",
        parts: [
          { text: (note ? note + " " : "") + "May this image be published to other users under the rules? Classify it." + (attempt ? " Respond with ONLY the JSON object — no prose, no markdown." : "") },
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
            allowed: { type: "boolean" },
            category: { type: "string", enum: ["ok", "nudity", "underwear", "swimwear", "sexualised", "explicit", "minor", "violence", "hate", "other"] },
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
  const _rl = await rateLimit(req, "image-screen", 30);
  if (_rl) return _rl;
  const origin = req.headers.get("origin");
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405, origin);
  if (!GEMINI_API_KEY) return json({ error: "gemini_not_configured" }, 500, origin);
  if (!(req.headers.get("authorization") ?? "").trim()) return json({ error: "not_signed_in" }, 401, origin);

  let body: { image_b64?: string; mime?: string; context?: string } = {};
  try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400, origin); }

  const b64 = String(body.image_b64 ?? "").replace(/^data:[^;]+;base64,/, "").trim();
  if (!b64) return json({ error: "no_image" }, 400, origin);
  const mime = String(body.mime ?? "image/jpeg").split(";")[0].trim().toLowerCase();
  if (!mime.startsWith("image/")) return json({ error: "not_an_image" }, 400, origin);

  let bytes: Uint8Array;
  try { bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)); } catch { return json({ error: "bad_base64" }, 400, origin); }
  if (!bytes.length) return json({ error: "empty_image" }, 400, origin);
  if (bytes.length > MAX_BYTES) return json({ error: "too_large" }, 400, origin);

  const note = CONTEXT_NOTE[String(body.context ?? "general")] ?? "";
  const errors: string[] = [];
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const v = await classifyOnce(bytes, mime, note, attempt);
      return json({ ok: v.allowed, category: v.category, reason: v.reason }, 200, origin);
    } catch (e) { errors.push(`a${attempt}:${String(e).slice(0, 200)}`); }
  }
  console.error("[image-screen] classify failed", errors.join(" | "));
  return json({ error: "check_failed", detail: errors.join(" | ").slice(0, 400) }, 502, origin);
});
