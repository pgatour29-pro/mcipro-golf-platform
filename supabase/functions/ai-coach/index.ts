import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is missing");

    const { action, message, stats, events, buddies } = await req.json();

    let prompt = "";
    if (action === 'deep_analysis') {
        prompt = `You are a highly knowledgeable golf buddy, expert caddie, and scratch golfer for the MyCaddiPro platform.
Review the following golfer data:
STATS: ${JSON.stringify(stats)}
UPCOMING EVENTS: ${JSON.stringify(events)}
BUDDIES: ${JSON.stringify(buddies)}

Provide a concise, highly personalized 3-paragraph analysis. 
Paragraph 1: Diagnose their current game based on stats. Give it to them straight.
Paragraph 2: Recommend exactly one upcoming event they should play and why it fits their game.
Paragraph 3: Recommend a specific buddy to team up with for scrambles based on complementary skills.
TONE RULES: Speak like a real person. Be casual, direct, and conversational, like a buddy at the 19th hole or a trusted caddie. Avoid stiff, formal, or robotic language. Use golf slang naturally, but don't overdo it.`;
    } else if (action === 'chat') {
        prompt = `You are a highly knowledgeable golf buddy, expert caddie, and scratch golfer for the MyCaddiPro platform. 
The user's current stats context: ${JSON.stringify(stats)}

USER QUESTION: "${message}"

RULES:
1. ONLY answer questions related to golf (swing mechanics, equipment, strategy, mental game, rules, their stats, or the MyCaddiPro app).
2. If the user asks about ANYTHING non-golf related (politics, cooking, coding, general knowledge, etc.), politely steer the conversation back to golf.
3. TONE: Speak like a real person. Be casual, direct, and conversational, like a buddy at the 19th hole or a trusted caddie. Do NOT sound like a robotic, formal corporate assistant or a stiff country club pro. 
4. Give the user detailed, actionable advice. Feel free to use 2-3 paragraphs if needed to fully answer the question. Give it to them straight.`;
    } else {
        throw new Error("Invalid action provided");
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2000,
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ]
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to fetch from Gemini');
    }

    let aiResponse = "";
    if (data.candidates && data.candidates[0]?.content?.parts?.length > 0) {
        aiResponse = data.candidates[0].content.parts[0].text;
    } else {
        console.error("Gemini Response Data:", JSON.stringify(data));
        throw new Error("LLM failed to generate a valid response (Blocked by safety filters or empty output)");
    }

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
