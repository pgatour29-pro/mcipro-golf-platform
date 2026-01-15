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
                text: `You are analyzing a golf course PIN SHEET photo. This shows where the hole (flag) is located on each green today.

CRITICAL INSTRUCTIONS FOR READING PIN SHEETS:

PIN SHEETS USE A QUADRANT SYSTEM WITH DOTS!

Each circle represents a green with grid lines dividing it into 9 quadrants.
You will see a small BLACK DOT in one of these quadrants showing the pin location.

QUADRANT NUMBERING SYSTEM (imagine these numbers, they are NOT printed):
┌─────────────────┐
│  7  │  8  │  9  │  ← BACK of green (top of circle)
├─────┼─────┼─────┤
│  4  │  5  │  6  │  ← MIDDLE of green
├─────┼─────┼─────┤
│  1  │  2  │  3  │  ← FRONT of green (bottom of circle)
└─────────────────┘
  ↑     ↑     ↑
 LEFT CENTER RIGHT

YOUR JOB: For each of the 18 holes:
STEP 1: Find the BLACK DOT in the circle
STEP 2: Determine which QUADRANT (1-9) the dot is in
STEP 3: Map that quadrant number to exact coordinates using the table below

COORDINATE MAPPING FOR EACH QUADRANT:

When the DOT is in a quadrant, use these EXACT coordinates:

Quadrant 1 (front-left):     x: 0.2,  y: 0.8,  position: "front-left"
Quadrant 2 (front-center):   x: 0.5,  y: 0.8,  position: "front"
Quadrant 3 (front-right):    x: 0.8,  y: 0.8,  position: "front-right"
Quadrant 4 (middle-left):    x: 0.2,  y: 0.5,  position: "left"
Quadrant 5 (center):         x: 0.5,  y: 0.5,  position: "center"
Quadrant 6 (middle-right):   x: 0.8,  y: 0.5,  position: "right"
Quadrant 7 (back-left):      x: 0.2,  y: 0.2,  position: "back-left"
Quadrant 8 (back-center):    x: 0.5,  y: 0.2,  position: "back"
Quadrant 9 (back-right):     x: 0.8,  y: 0.2,  position: "back-right"

SPECIAL CASE - If the dot is slightly right of center (between quadrant 5 and 6):
This means center-right: x: 0.65, y: 0.5, position: "right"

COORDINATE SYSTEM:
- X-axis: 0.0 = left, 0.5 = center, 1.0 = right
- Y-axis: 0.0 = back (top), 0.5 = middle, 1.0 = front (bottom)

EXAMPLES:

Example 1: Hole 1 - Dot is in BOTTOM-RIGHT quadrant (quadrant 3)
→ Quadrant 3 = front-right
→ Output: {"hole": 1, "position": "front-right", "x": 0.8, "y": 0.8, "description": "Front right"}

Example 2: Hole 2 - Dot is in CENTER, slightly to the right (between quadrant 5 and 6)
→ Center-right
→ Output: {"hole": 2, "position": "right", "x": 0.65, "y": 0.5, "description": "Center right"}

Example 3: Hole 3 - Dot is in TOP-LEFT quadrant (quadrant 7)
→ Quadrant 7 = back-left
→ Output: {"hole": 3, "position": "back-left", "x": 0.2, "y": 0.2, "description": "Back left"}

Example 4: Hole 4 - Dot is in BOTTOM-LEFT quadrant (quadrant 1)
→ Quadrant 1 = front-left
→ Output: {"hole": 4, "position": "front-left", "x": 0.2, "y": 0.8, "description": "Front left"}

CRITICAL STEPS:
1. Find the BLACK DOT in each circle
2. Identify which of the 9 quadrants it's in
3. Use the EXACT coordinates from the mapping table - do NOT estimate or measure visually
4. If the dot is between quadrants, use the closest quadrant

Return ONLY valid JSON (no markdown, no explanation):
{
  "course_name": "Course name from header",
  "date": "2026-01-15",
  "green_speed": "9'4\\"",
  "pins": [
    {"hole": 1, "position": "front-right", "x": 0.8, "y": 0.8, "description": "Front right"},
    {"hole": 2, "position": "right", "x": 0.65, "y": 0.5, "description": "Center right"},
    {"hole": 3, "position": "back-left", "x": 0.2, "y": 0.2, "description": "Back left"},
    ... for all 18 holes
  ],
  "holes_detected": 18,
  "confidence": "high"
}

Rules:
- Holes numbered 1-18, read left-to-right, top-to-bottom in the grid
- FIND THE DOT in each circle and determine which QUADRANT (1-9) it's in
- Use EXACT coordinates from the quadrant mapping table - do NOT try to measure the dot position
- confidence: "high" if all dots clearly visible, "medium" if some dots unclear, "low" if poor quality
- If NOT a pin sheet, return {"error": "Not a pin sheet", "confidence": "low"}`,
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
      // Extract JSON from markdown-wrapped responses
      let cleanedText = textContent;

      // Try to extract JSON object using regex (handles explanatory text before/after JSON)
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedText = jsonMatch[0];
      } else {
        // Fallback: remove markdown code blocks
        cleanedText = cleanedText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      }

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
