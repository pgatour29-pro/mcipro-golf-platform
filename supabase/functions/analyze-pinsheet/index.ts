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

PIN SHEETS USE A NUMBERED QUADRANT SYSTEM!

Each circle (green) is divided into quadrants with NUMBERS showing the pin location:

MOST COMMON SYSTEM (9 quadrants):
Front row:  1 (front-left)   2 (front-center)   3 (front-right)
Middle row: 4 (middle-left)  5 (center)         6 (middle-right)
Back row:   7 (back-left)    8 (back-center)    9 (back-right)

SOME COURSES use 3 quadrants only:
1 = front
2 = middle/center
3 = back

YOUR JOB: For each of the 18 holes, READ THE NUMBER inside the circle and map it to position.

STEP 1: Look at hole 1's circle - what NUMBER do you see? (1-9 or 1-3)
STEP 2: Map that number to the position using the grid above
STEP 3: Repeat for all 18 holes

COORDINATE MAPPING FOR EACH NUMBER:

When you see a number in the circle, use these EXACT coordinates:

Position 1 (front-left):     x: 0.2,  y: 0.8,  position: "front-left"
Position 2 (front-center):   x: 0.5,  y: 0.8,  position: "front"
Position 3 (front-right):    x: 0.8,  y: 0.8,  position: "front-right"
Position 4 (middle-left):    x: 0.2,  y: 0.5,  position: "left"
Position 5 (center):         x: 0.5,  y: 0.5,  position: "center"
Position 6 (middle-right):   x: 0.8,  y: 0.5,  position: "right"
Position 7 (back-left):      x: 0.2,  y: 0.2,  position: "back-left"
Position 8 (back-center):    x: 0.5,  y: 0.2,  position: "back"
Position 9 (back-right):     x: 0.8,  y: 0.2,  position: "back-right"

SPECIAL CASE - If the number shows "5+" or has an arrow pointing right:
This means center-right: x: 0.65, y: 0.5, position: "right"

COORDINATE SYSTEM:
- X-axis: 0.0 = left, 0.5 = center, 1.0 = right
- Y-axis: 0.0 = back (top), 0.5 = middle, 1.0 = front (bottom)

EXAMPLES:

Example 1: Hole 1 shows number "3" in the circle
→ That's position 3 = front-right
→ Output: {"hole": 1, "position": "front-right", "x": 0.8, "y": 0.8, "description": "Front right"}

Example 2: Hole 2 shows number "5" with arrow pointing right
→ That's position 5+ = center-right
→ Output: {"hole": 2, "position": "right", "x": 0.65, "y": 0.5, "description": "Center right"}

Example 3: Hole 3 shows number "7"
→ That's position 7 = back-left
→ Output: {"hole": 3, "position": "back-left", "x": 0.2, "y": 0.2, "description": "Back left"}

Example 4: Hole 4 shows number "1"
→ That's position 1 = front-left
→ Output: {"hole": 4, "position": "front-left", "x": 0.2, "y": 0.8, "description": "Front left"}

CRITICAL: READ THE NUMBERS in each circle. DO NOT try to find dots or measure positions visually.

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
- READ THE NUMBER in each circle (1-9) and map to exact coordinates using the table above
- Use EXACT coordinates from the mapping table - do not estimate
- confidence: "high" if all numbers clearly visible, "medium" if some unclear, "low" if poor quality
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
