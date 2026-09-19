// MARKETING AI (v1257, 2026-09-19) — the "Ask AI" panel of the Marketing dashboard's report viewer.
// Pete: "downloading the CSV is great and keep that, but i want it to open on screen and explore and
// analyze with Ai assistance".
//
// The browser sends the course's report datasets (the same aggregate rows the on-screen tables and the
// CSVs show — counts only, never a golfer list) plus the question and the conversation so far. This
// function reads nothing from the database (only the rate limiter), so it can expose no data the
// caller didn't already hold. It spends money, so it is rate-limited per IP and size-capped.
//
// Provider: Gemini (GEMINI_API_KEY — the key ai-coach and translate-text use). Pete 2026-09-19: "use other ai
// gemini" after the Anthropic account behind ANTHROPIC_API_KEY ran out of credit.
//
// Response: NDJSON stream, one object per line —
//   {"s":"thinking"}           model started reasoning (show "Analysing…")
//   {"t":"text"}               answer text delta
//   {"done":true,"stop":"…"}   finished (stop = Gemini finishReason: STOP | MAX_TOKENS | SAFETY …)
//   {"error":"…"}              failed (sent instead of done)
// Deployed with --no-verify-jwt (the browser sends the publishable key, not a JWT) — pinned in config.toml.
import { rateLimit } from "../_shared/ratelimit.ts";
import { corsHeaders } from "../_shared/cors.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const GEMINI_MODELS = ["gemini-flash-latest", "gemini-3.6-flash"];   // second = fallback if the alias errors

const LANGS: Record<string, string> = { en: "English", th: "Thai", ko: "Korean", ja: "Japanese" };

const SYSTEM = `You are the marketing analyst inside MyCaddiPro, a golf platform used by golf courses and golf societies around Pattaya, Thailand. You are talking to someone on the marketing team of one golf course. They are on the Reports screen of their marketing dashboard and want help reading the numbers and deciding what to do.

Each request carries the course's report data as JSON: every dataset on the dashboard for the selected period, plus a 12-month daily rounds series. All figures are aggregate counts. The platform never gives a course a list of individual golfers, so neither do you — if asked for names, contact details or a golfer list, explain that campaigns are delivered to segments on the course's behalf and the course never holds the list.

What the figures mean:
- golfers: distinct players with a round at this course in the period — app users plus players an organizer added. golfers_prev / rounds_prev cover the previous period of the same length.
- app_users: golfers who have the app, so they can be reached in the in-app inbox.
- first_timers: first ever round here fell inside the period. regulars: 3+ rounds here in the period. lapsed: played here in the last year but not in the last 90 days.
- followers: golfers following the course in the app. push_opt_ins: followers who also accept LINE pushes.
- Society mix: golfers by the society their round was posted under. "Independent" means no society tag; tagging is incomplete, so Independent is overstated.
- Golfer origin: the country a golfer registered from, else their profile nationality; "Unknown" means neither is recorded. Origin and language cover app users only.
- Campaign funnel: delivered = landed in a golfer's in-app inbox; pushed = LINE push sent (opted-in followers only, at most 2 a day per golfer); opened; clicked = tapped the offer's button; dismissed.
- The rounds-per-day series lists only days with at least one round. Single-day spikes of 30+ rounds are usually society events.

What the course can do in this app:
- Campaigns tab: send an offer (special offer, food & drink, caddy offer, society package, course news) to a segment — everyone who played here, or played since a date, filtered by app language and handicap range — with a button (book a tee time, book a caddy, pro shop, web link), start and end dates, and an optional Thai version. Every golfer in the segment gets it in the in-app inbox.
- Tee-time deals (discounted open slots golfers grab in the app) are posted from the pro shop tee sheet.
- LINE pushes only reach followers who opted in, so growing followers is the only way to grow pushes.

How to answer:
- Ground every claim in the data and quote the numbers you use; do the arithmetic carefully. If the data cannot answer the question, say what is missing instead of guessing, and do not invent industry benchmarks.
- Say plainly when data is thin — tiny samples, zeros, a period that holds a single event.
- When you recommend something, make it concrete: which segment, what offer, when, using what this app can do.
- They read on a phone: lead with the answer, keep it short (usually under 180 words), use short bullet points and **bold** for key numbers. No tables and no markdown headings.
- Write in the language the request names.`;

type Turn = { q: string; a: string };
type Msg = { role: "user" | "assistant"; content: string };

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  // the app's origins (shared allowlist) plus localhost, so the dashboard can be exercised before a deploy
  const cors = origin && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
    ? { ...corsHeaders(origin), "Access-Control-Allow-Origin": origin } : corsHeaders(origin);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const fail = (status: number, error: string) =>
    new Response(JSON.stringify({ error }), { status, headers: { ...cors, "Content-Type": "application/json" } });

  if (req.method !== "POST") return fail(405, "POST only");
  const limited = await rateLimit(req, "marketing-ai", 10, 60, cors);
  if (limited) return limited;
  if (!GEMINI_API_KEY) return fail(500, "GEMINI_API_KEY is not set");

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return fail(400, "Body must be JSON"); }

  const question = str(body.question, 800).trim();
  if (!question) return fail(400, "Missing question");
  const course = str(body.course, 120) || "this course";
  const focus = str(body.focus, 80) || "Reports";
  const days = Math.max(1, Math.min(366, Number(body.days) || 30));
  const today = str(body.today, 10);
  const language = LANGS[str(body.lang, 5).toLowerCase()] || "English";
  const data = JSON.stringify(body.data ?? {});
  if (data.length > 80000) return fail(413, "Report data too large");
  const turns: Turn[] = (Array.isArray(body.turns) ? body.turns : [])
    .slice(-10)
    .map((x: any) => ({ q: str(x?.q, 800), a: str(x?.a, 6000) }))
    .filter((x) => x.q && x.a);

  // The data rides once, at the head of the first user turn; follow-ups carry only what is on screen now.
  const head = `Course: ${course}\nPeriod: the last ${days} days${today ? ` (today is ${today}, Bangkok time)` : ""}\nAnswer in: ${language}\n\n<report_data>\n${data}\n</report_data>`;
  const messages: Msg[] = [];
  turns.forEach((x, i) => {
    messages.push({ role: "user", content: i === 0 ? `${head}\n\n${x.q}` : x.q });
    messages.push({ role: "assistant", content: x.a });
  });
  const ask = `(Viewing: ${focus})\n${question}`;
  messages.push({ role: "user", content: messages.length ? ask : `${head}\n\n${ask}` });

  const enc = new TextEncoder();
  const out = new ReadableStream({
    async start(controller) {
      const send = (o: unknown) => controller.enqueue(enc.encode(JSON.stringify(o) + "\n"));
      try {
        const stop = await askGemini(messages, send);
        send({ done: true, stop });
      } catch (e) {
        const msg = String((e as Error)?.message || e);
        console.error("[marketing-ai] failed:", msg);
        send({ error: msg.slice(0, 300) });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(out, {
    headers: { ...cors, "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
});

type Send = (o: unknown) => void;

// Gemini streamGenerateContent over SSE: each `data:` line is a partial GenerateContentResponse.
async function askGemini(messages: Msg[], send: Send): Promise<string> {
  const contents = messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: String(m.content) }] }));
  let lastErr = "";
  for (const model of GEMINI_MODELS) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: SYSTEM }] }, contents, generationConfig: { temperature: 0.4, maxOutputTokens: 8192 } }),
    });
    if (!res.ok || !res.body) { lastErr = `${model} ${res.status} ${(await res.text()).slice(0, 200)}`; console.warn("[marketing-ai] gemini", lastErr); continue; }
    send({ s: "thinking" });
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "", stop = "", wrote = false;
    const eat = (line: string) => {
      if (!line.startsWith("data:")) return;
      try {
        const d = JSON.parse(line.slice(5));
        const c = d.candidates?.[0];
        for (const p of c?.content?.parts || []) if (p.text && !p.thought) { wrote = true; send({ t: p.text }); }
        if (c?.finishReason) stop = c.finishReason;
      } catch { /* partial or keep-alive line */ }
    };
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf("\n")) >= 0) { eat(buf.slice(0, i).trim()); buf = buf.slice(i + 1); }
    }
    eat(buf.trim());
    if (!wrote) { lastErr = `${model} returned no text (${stop || "no finish reason"})`; console.warn("[marketing-ai] gemini", lastErr); continue; }
    console.log(`[marketing-ai] gemini ${model} stop=${stop}`);
    return stop || "STOP";
  }
  throw new Error("AI unavailable: " + lastErr);
}
