// Analyze Pin Sheet Edge Function
// Uses Claude Vision API to extract pin positions from golf course pin sheet photos
// Returns structured JSON with hole-by-hole pin locations

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// Get API keys from environment
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Standard CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
};

interface PinLocation {
  hole: number;
  position: string; // "back-right", "front-center", "middle-left", etc.
  x: number; // 0-1 normalized
  y: number; // 0-1 normalized
  description: string; // Human-readable
}

interface PinSheetAnalysis {
  course_name: string;
  date: string; // YYYY-MM-DD
  green_speed: string | null;
  pins: PinLocation[];
  holes_detected: number;
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
      console.error("[Analyze Pin Sheet] ANTHROPIC_API_KEY is not set!");
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const {
      imageBase64,
      mediaType = "image/jpeg",
      courseName,
      date,
      uploadedBy,
      saveToDatabase = true
    } = body;

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[Analyze Pin Sheet] Processing image, size:", imageBase64.length, "chars");

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
        max_tokens: 4096,
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
                text: `You are analyzing a golf course PIN SHEET photo. This is a daily sheet showing where the hole (pin/flag) is located on each green.

IMPORTANT: Pin sheets typically show:
- 18 circular diagrams (one per hole), usually arranged in a 6x3 grid
- Each circle represents a green
- A small dot or mark inside each circle shows the pin location
- Header information: course name, date, green speed (e.g., "9'4"")

Your task:
1. Identify the course name from the header or side text
2. Extract the date if visible (format YYYY-MM-DD)
3. Extract green speed if shown (e.g., "9'4"" or "10.5")
4. For each of the 18 holes, determine the pin position within the circle

For pin positions, use a coordinate system:
- X-axis: 0.0 = far left, 0.5 = center, 1.0 = far right
- Y-axis: 0.0 = front of green, 0.5 = middle, 1.0 = back of green

Position labels:
- "front-left" (x≈0.2, y≈0.2)
- "front-center" (x≈0.5, y≈0.2)
- "front-right" (x≈0.8, y≈0.2)
- "middle-left" (x≈0.2, y≈0.5)
- "center" (x≈0.5, y≈0.5)
- "middle-right" (x≈0.8, y≈0.5)
- "back-left" (x≈0.2, y≈0.8)
- "back-center" (x≈0.5, y≈0.8)
- "back-right" (x≈0.8, y≈0.8)

Return ONLY valid JSON (no markdown, no explanation) in this exact format:
{
  "course_name": "Bangpakong Riverside Country Club",
  "date": "2026-01-15",
  "green_speed": "9'4\\"",
  "pins": [
    {"hole": 1, "position": "back-right", "x": 0.75, "y": 0.8, "description": "Back right"},
    {"hole": 2, "position": "front-center", "x": 0.5, "y": 0.2, "description": "Front center"},
    ... continue for all 18 holes
  ],
  "holes_detected": 18,
  "confidence": "high"
}

Rules:
- Holes are numbered 1-18, reading left-to-right, top-to-bottom
- If a pin position is unclear, estimate based on visible dot location
- Set confidence to:
  - "high" if all 18 pin positions are clearly visible
  - "medium" if some positions are unclear but detectable
  - "low" if image quality is poor or many pins missing
- If this is NOT a pin sheet, return {"error": "Not a pin sheet", "confidence": "low"}
- x and y values should be between 0.0 and 1.0
- Use 3 decimal places for x and y (e.g., 0.750)`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Analyze Pin Sheet] Claude API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI analysis failed", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();
    console.log("[Analyze Pin Sheet] Claude response received");

    // Extract the text content from Claude's response
    const textContent = result.content?.find((c: any) => c.type === "text")?.text;

    if (!textContent) {
      console.error("[Analyze Pin Sheet] No text in response:", result);
      return new Response(
        JSON.stringify({ error: "No analysis returned" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse JSON response
    let analysis: PinSheetAnalysis;
    try {
      // Remove markdown code blocks if present
      const cleanedText = textContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      analysis = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("[Analyze Pin Sheet] JSON parse error:", parseError);
      console.error("[Analyze Pin Sheet] Raw text:", textContent);
      return new Response(
        JSON.stringify({ error: "Failed to parse AI response", raw: textContent }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for errors in analysis
    if (analysis.error) {
      return new Response(
        JSON.stringify({ error: analysis.error, confidence: analysis.confidence }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate analysis has required fields
    if (!analysis.course_name || !analysis.pins || analysis.pins.length === 0) {
      return new Response(
        JSON.stringify({ error: "Incomplete pin sheet analysis", data: analysis }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Analyze Pin Sheet] Successfully analyzed: ${analysis.course_name}, ${analysis.pins.length} holes`);

    // Optionally save to database
    if (saveToDatabase) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

        // Use provided course name or extracted one
        const finalCourseName = courseName || analysis.course_name;
        const finalDate = date || analysis.date || new Date().toISOString().split('T')[0];

        // Insert pin_positions record
        const { data: pinPosition, error: insertError } = await supabase
          .from('pin_positions')
          .insert({
            course_name: finalCourseName,
            date: finalDate,
            green_speed: analysis.green_speed,
            uploaded_by: uploadedBy,
            holes_detected: analysis.holes_detected,
            status: 'active',
            metadata: {
              confidence: analysis.confidence,
              processed_at: new Date().toISOString(),
            }
          })
          .select()
          .single();

        if (insertError) {
          console.error("[Analyze Pin Sheet] Database insert error:", insertError);
          // Return analysis anyway, just log the error
          return new Response(
            JSON.stringify({
              ...analysis,
              database_saved: false,
              database_error: insertError.message
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Insert pin_locations for each hole
        const pinLocations = analysis.pins.map(pin => ({
          pin_position_id: pinPosition.id,
          hole_number: pin.hole,
          position_label: pin.position,
          x_position: pin.x,
          y_position: pin.y,
          description: pin.description,
        }));

        const { error: locationsError } = await supabase
          .from('pin_locations')
          .insert(pinLocations);

        if (locationsError) {
          console.error("[Analyze Pin Sheet] Pin locations insert error:", locationsError);
        }

        console.log(`[Analyze Pin Sheet] Saved to database: pin_position_id=${pinPosition.id}`);

        return new Response(
          JSON.stringify({
            ...analysis,
            database_saved: true,
            pin_position_id: pinPosition.id
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

      } catch (dbError) {
        console.error("[Analyze Pin Sheet] Database error:", dbError);
        // Return analysis anyway
        return new Response(
          JSON.stringify({
            ...analysis,
            database_saved: false,
            database_error: String(dbError)
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Return analysis without saving to database
    return new Response(
      JSON.stringify(analysis),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[Analyze Pin Sheet] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
