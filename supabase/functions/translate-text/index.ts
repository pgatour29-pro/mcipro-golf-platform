// Translate free text into a target language.
// Used by the Event Notice Board (notices + private messages) so players and
// organizers can read each other across languages (EN/TH/KO/JA + others).
// Backend: Google Gemini (gemini-flash-latest) via GEMINI_API_KEY.
// Input:  { text: string, target: "en"|"ko"|"th"|"ja"|<name> }
// Output: { translated: string }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
};

const LANG_NAMES: Record<string, string> = {
  en: "English",
  ko: "Korean",
  th: "Thai",
  ja: "Japanese",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY not set" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { text, target } = await req.json();
    if (!text || !String(text).trim()) {
      return new Response(JSON.stringify({ error: "text required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const langName = LANG_NAMES[String(target || "en").toLowerCase()] || String(target || "English");
    const src = String(text).slice(0, 4000); // safety cap

    const prompt =
      `Translate the text below into ${langName}. Return ONLY the translation — no quotes, ` +
      `no notes, no preamble, no romanization. Preserve line breaks, names, numbers, times and emoji. ` +
      `If the text is already in ${langName}, return it unchanged.\n\nText:\n${src}`;

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 2048 },
        }),
      },
    );

    if (!resp.ok) {
      const errTxt = await resp.text();
      console.error("[translate-text] Gemini error", resp.status, errTxt);
      return new Response(JSON.stringify({ error: "translation failed" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const translated = (data?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();

    return new Response(JSON.stringify({ translated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[translate-text] error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
