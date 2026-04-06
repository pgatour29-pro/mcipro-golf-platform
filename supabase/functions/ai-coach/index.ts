import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not set in environment variables");
    }

    const { action, message, stats, events, buddies } = await req.json();

    let prompt = "";
    if (action === 'deep_analysis') {
        prompt = `You are an elite PGA golf coach and concierge for the MyCaddiPro platform.
Review the following golfer data:
STATS: ${JSON.stringify(stats)}
UPCOMING EVENTS: ${JSON.stringify(events)}
BUDDIES: ${JSON.stringify(buddies)}

Provide a concise, highly personalized 3-paragraph analysis. 
Paragraph 1: Diagnose their current game based on stats.
Paragraph 2: Recommend exactly one upcoming event they should play and why it fits their game.
Paragraph 3: Recommend a specific buddy to team up with for scrambles based on complementary skills.
Keep the tone professional, encouraging, and authoritative.`;
    } else if (action === 'chat') {
        prompt = `You are an elite PGA golf coach for the MyCaddiPro platform. 
The user's current stats context: ${JSON.stringify(stats)}
User asks: "${message}"
Provide a helpful, actionable, and concise response (under 4 sentences) using their stats if relevant.`;
    } else {
        throw new Error("Invalid action provided");
    }

    // Call Gemini API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500,
        }
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to fetch from Gemini');
    }

    const aiResponse = data.candidates[0].content.parts[0].text;

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
