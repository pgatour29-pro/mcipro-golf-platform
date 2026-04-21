// AI Caddie - Voice assistant backend for MyCaddiPro
// Processes natural language commands and returns structured actions

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";

const SYSTEM_PROMPT = `You are the MyCaddiPro AI Caddie - a voice assistant for a golf scoring app. You help golfers during their rounds.

You receive voice commands and return JSON responses with an action and a spoken reply.

Available actions:
- {"action": "navigate", "tab": "scorecard|overview|rounds|societyevents|golfanalytics|booking|caddies|conditions|messages", "reply": "..."}
- {"action": "start_round", "course": "course_id", "reply": "..."}
- {"action": "enter_score", "hole": number, "score": number, "reply": "..."}
- {"action": "check_handicap", "reply": "Your handicap is ..."}
- {"action": "check_stats", "stat": "average|best|rounds|fairways|gir|putts", "reply": "..."}
- {"action": "course_info", "hole": number, "info": "par|yardage|si|all", "reply": "..."}
- {"action": "leaderboard", "reply": "..."}
- {"action": "weather", "reply": "..."}
- {"action": "chat", "reply": "..."} (for general questions)

Context provided: current user info, active round info, course data.

Rules:
- Always return valid JSON with "action" and "reply" fields
- Keep replies short and natural for speech (1-2 sentences)
- If unsure what the user wants, ask for clarification using the "chat" action
- Use golf terminology naturally
- Be encouraging and supportive`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (!ANTHROPIC_API_KEY) {
    return json(500, { error: "ANTHROPIC_API_KEY not set" });
  }

  try {
    const { message, context } = await req.json();

    const userMessage = `Context: ${JSON.stringify(context || {})}

User said: "${message}"

Respond with a JSON object containing "action" and "reply" fields.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || '{"action":"chat","reply":"Sorry, I didn\'t catch that."}';

    // Parse the JSON response
    let parsed;
    try {
      // Extract JSON from the response (handle markdown code blocks)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch?.[0] || text);
    } catch {
      parsed = { action: "chat", reply: text };
    }

    return json(200, parsed);
  } catch (err: any) {
    return json(500, { error: err.message });
  }
});

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
