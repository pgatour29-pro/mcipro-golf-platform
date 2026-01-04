// Analyze Scorecard Edge Function
// Uses Claude Vision API to extract golf scores from scorecard photos
// Returns structured JSON with hole-by-hole scores

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Get API key from Supabase Vault
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

// Standard CORS headers for all responses
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
};

interface ExtractedScore {
  hole: number;
  par: number | null;
  score: number | null;
}

interface ScorecardAnalysis {
  course_name: string | null;
  date: string | null;
  player_name: string | null;
  holes: ExtractedScore[];
  front_9: number | null;
  back_9: number | null;
  total: number | null;
  confidence: "high" | "medium" | "low";
  error?: string;
}

serve(async (req) => {
  try {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Check for API key
    if (!ANTHROPIC_API_KEY) {
      console.error("[Analyze Scorecard] ANTHROPIC_API_KEY is not set!");
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { imageBase64, mediaType = "image/jpeg" } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[Analyze Scorecard] Processing image, size:", imageBase64.length, "chars");

    // Call Claude Vision API
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: imageBase64,
                },
              },
              {
                type: "text",
                text: `You are analyzing a golf scorecard photo. Extract the player's scores for each hole.

IMPORTANT: Look for handwritten or printed numbers in the score row(s). The scorecard typically has:
- Hole numbers (1-18)
- Par for each hole (usually 3, 4, or 5)
- Player score for each hole (handwritten numbers)
- Front 9 total, Back 9 total, and Overall total

Return ONLY valid JSON (no markdown, no explanation) in this exact format:
{
  "course_name": "Name of golf course if visible, or null",
  "date": "YYYY-MM-DD if visible, or null",
  "player_name": "Player name if visible, or null",
  "holes": [
    {"hole": 1, "par": 4, "score": 5},
    {"hole": 2, "par": 3, "score": 4},
    ... continue for all 18 holes (or 9 if only 9 holes visible)
  ],
  "front_9": 45,
  "back_9": 42,
  "total": 87,
  "confidence": "high"
}

Rules:
- If a score is unreadable, set "score": null for that hole
- If par is not visible, estimate based on typical par (4 for most holes)
- Set confidence to:
  - "high" if most scores are clearly readable
  - "medium" if some scores are unclear
  - "low" if many scores are unreadable or image is poor quality
- front_9, back_9, and total should be calculated from readable scores, or null if not enough data
- If this is not a golf scorecard, return {"error": "Not a golf scorecard", "confidence": "low"}`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Analyze Scorecard] Claude API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI analysis failed", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();
    console.log("[Analyze Scorecard] Claude response received");

    // Extract the text content from Claude's response
    const textContent = result.content?.find((c: any) => c.type === "text")?.text;

    if (!textContent) {
      console.error("[Analyze Scorecard] No text in response:", result);
      return new Response(
        JSON.stringify({ error: "No analysis returned" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the JSON from Claude's response
    let analysis: ScorecardAnalysis;
    try {
      // Remove any markdown code blocks if present
      let jsonText = textContent.trim();
      if (jsonText.startsWith("```json")) {
        jsonText = jsonText.slice(7);
      }
      if (jsonText.startsWith("```")) {
        jsonText = jsonText.slice(3);
      }
      if (jsonText.endsWith("```")) {
        jsonText = jsonText.slice(0, -3);
      }
      jsonText = jsonText.trim();

      analysis = JSON.parse(jsonText);
      console.log("[Analyze Scorecard] Parsed analysis:", analysis.holes?.length, "holes, confidence:", analysis.confidence);
    } catch (parseError) {
      console.error("[Analyze Scorecard] JSON parse error:", parseError, "Raw text:", textContent);
      return new Response(
        JSON.stringify({
          error: "Failed to parse analysis",
          raw_response: textContent,
          confidence: "low"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate and fill in missing holes if needed
    if (analysis.holes && analysis.holes.length > 0 && analysis.holes.length < 18) {
      // Pad to 18 holes if only partial data
      const existingHoles = new Set(analysis.holes.map(h => h.hole));
      for (let i = 1; i <= 18; i++) {
        if (!existingHoles.has(i)) {
          analysis.holes.push({ hole: i, par: 4, score: null });
        }
      }
      analysis.holes.sort((a, b) => a.hole - b.hole);
    }

    // Calculate totals if not provided
    if (analysis.holes && analysis.holes.length > 0) {
      const front9Scores = analysis.holes.slice(0, 9).filter(h => h.score !== null).map(h => h.score!);
      const back9Scores = analysis.holes.slice(9, 18).filter(h => h.score !== null).map(h => h.score!);

      if (front9Scores.length > 0 && !analysis.front_9) {
        analysis.front_9 = front9Scores.reduce((a, b) => a + b, 0);
      }
      if (back9Scores.length > 0 && !analysis.back_9) {
        analysis.back_9 = back9Scores.reduce((a, b) => a + b, 0);
      }
      if ((analysis.front_9 || analysis.back_9) && !analysis.total) {
        analysis.total = (analysis.front_9 || 0) + (analysis.back_9 || 0);
      }
    }

    return new Response(
      JSON.stringify(analysis),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[Analyze Scorecard] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error", confidence: "low" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
