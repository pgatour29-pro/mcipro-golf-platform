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
  primary_grid: number; // 1-9 quadrant number
  position: string; // "back-right", "front-center", "middle-left", etc.
  micro_placement: string; // "High", "Low", "Left", "Right", "Center", or combinations
  line_hugging: boolean; // true if pin is on or very close to grid line
  x: number; // 0-1 normalized
  y: number; // 0-1 normalized
  description: string; // Human-readable with micro-detail
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
                text: `# SYSTEM PROTOCOL: CRITICAL ACCURACY PIN MAPPING
You are a coordinate-based image processor. Do not estimate. Follow this math.

You are analyzing a golf course PIN SHEET photo using a HIGH-RESOLUTION 9-QUADRANT GRID SYSTEM.

GRID SYSTEM DEFINITION:
┌─────────────────┐
│  7  │  8  │  9  │  ← BACK of green (top of circle)
├─────┼─────┼─────┤
│  4  │  5  │  6  │  ← MIDDLE of green
├─────┼─────┼─────┤
│  1  │  2  │  3  │  ← FRONT of green (bottom of circle)
└─────────────────┘
  ↑     ↑     ↑
 LEFT CENTER RIGHT

Each circle represents a green. You will see a small BLACK DOT showing the pin location.

THE SCANNING RULE (MANDATORY):

For each of the 18 holes, follow this EXACT mathematical process:

STEP 1 - DIVIDE THE CIRCLE MATHEMATICALLY:
- Horizontal bands: 0-33%, 34-66%, 67-100% (measured from BOTTOM of circle)
  * 0-33% = FRONT row (Grids 1, 2, 3)
  * 34-66% = MIDDLE row (Grids 4, 5, 6)
  * 67-100% = BACK row (Grids 7, 8, 9)
- Vertical bands: 0-33%, 34-66%, 67-100% (measured from LEFT of circle)
  * 0-33% = LEFT column (Grids 1, 4, 7)
  * 34-66% = CENTER column (Grids 2, 5, 8)
  * 67-100% = RIGHT column (Grids 3, 6, 9)

STEP 2 - APPLY LINE RULE (CRITICAL):
If a pin is ON A LINE (at 33% or 67% boundary), it is ALWAYS the HIGHER number:
- On line between 1 and 4 → Grid 4 (not 1)
- On line between 2 and 5 → Grid 5 (not 2)
- On line between 4 and 7 → Grid 7 (not 4)
- On line between 1 and 2 → Grid 2 (not 1)
- On line between 2 and 3 → Grid 3 (not 2)

STEP 3 - MICRO-PLACEMENT WITHIN GRID:
After determining the grid number, specify position within that grid:
- "Low" = Bottom portion of grid
- "High" = Top portion of grid
- "Left" = Left portion of grid
- "Right" = Right portion of grid
- "Center" = Dead center of grid
- Combinations: "Low-Left", "High-Right", etc.

STEP 4 - VERIFICATION STEP (STOP AND THINK):
Before outputting, you MUST check your math for these 'Danger' holes:
- Hole 16: Is it touching the line between 1 and 4? If YES, it is Grid 4.
- Hole 12 & 15: Are they at the same height? If 15 is higher than 12, they must be described as different depths.
- Any pin in Grid 2: Check if it's Low in 2 (Front-Center) or High in 2 (Bordering Dead Center).

VERIFIED TRAINING EXAMPLES (use these as reference):

Hole 1: Grid 3, "Front Right: Tucked toward the right fringe"
→ primary_grid: 3, micro_placement: "Right-Deep", x: 0.85, y: 0.85

Hole 2: Grid 5, "Dead Center: True middle of the green"
→ primary_grid: 5, micro_placement: "Center", x: 0.5, y: 0.5

Hole 3: Grid 7, "Back Left: Deep and tucked toward the left edge"
→ primary_grid: 7, micro_placement: "Left-Deep", x: 0.15, y: 0.15

Hole 4: Grid 1, "Front Left: Deep within the quadrant, bordering the Middle-Left (4)"
→ primary_grid: 1, micro_placement: "Bordering 4", x: 0.2, y: 0.7

Hole 12: Grid 2, "Front Center: Sitting low and slightly left within the box"
→ primary_grid: 2, micro_placement: "Low-Left", x: 0.45, y: 0.85

Hole 15: Grid 2, "Front Center: High and right within the box (bordering 5 and 3)"
→ primary_grid: 2, micro_placement: "High-Right", x: 0.55, y: 0.7

Hole 16: Grid 4, "Middle Left: Bottom edge, bordering the Front-Left (1)"
→ primary_grid: 4, micro_placement: "Bordering 1", x: 0.2, y: 0.65

COORDINATE CONVERSION (for database output):

After determining grid number and micro-placement, convert to 0-1 normalized coordinates:

Base coordinates for each grid:
- Grid 1 (Front-Left):     x: 0.17, y: 0.83
- Grid 2 (Front-Center):   x: 0.50, y: 0.83
- Grid 3 (Front-Right):    x: 0.83, y: 0.83
- Grid 4 (Middle-Left):    x: 0.17, y: 0.50
- Grid 5 (Dead Center):    x: 0.50, y: 0.50
- Grid 6 (Middle-Right):   x: 0.83, y: 0.50
- Grid 7 (Back-Left):      x: 0.17, y: 0.17
- Grid 8 (Back-Center):    x: 0.50, y: 0.17
- Grid 9 (Back-Right):     x: 0.83, y: 0.17

Adjust based on micro-placement (±0.10 from base):
- "Low": y + 0.10 (toward front/bottom, max 1.0)
- "High": y - 0.10 (toward back/top, min 0.0)
- "Left": x - 0.10 (toward left edge, min 0.0)
- "Right": x + 0.10 (toward right edge, max 1.0)

COORDINATE SYSTEM (for database):
- X-axis: 0.0 = left edge, 0.5 = center, 1.0 = right edge
- Y-axis: 0.0 = back/top edge, 1.0 = front/bottom edge

CRITICAL PROCESS:
1. Read holes left-to-right, top-to-bottom (1-18 in the sheet grid)
2. For EACH hole, measure dot position as percentage from bottom-left corner
3. Apply 0-33%, 34-66%, 67-100% mathematical boundaries
4. If on a line (33% or 67%), choose HIGHER grid number
5. Verify danger holes (16, 12, 15) before finalizing
6. Calculate exact x/y coordinates for database

Return ONLY valid JSON (no markdown, no explanation):
{
  "course_name": "Course name from header",
  "date": "2026-01-15",
  "green_speed": "9'4\\"",
  "pins": [
    {
      "hole": 1,
      "primary_grid": 3,
      "position": "front-right",
      "micro_placement": "Right-Deep",
      "line_hugging": false,
      "x": 0.85,
      "y": 0.85,
      "description": "Front Right: Tucked toward the right fringe"
    },
    {
      "hole": 16,
      "primary_grid": 4,
      "position": "left",
      "micro_placement": "Bottom-Edge",
      "line_hugging": true,
      "x": 0.2,
      "y": 0.65,
      "description": "Middle Left: Bottom edge, bordering Front-Left (1)"
    },
    ... for all 18 holes
  ],
  "holes_detected": 18,
  "confidence": "high"
}

Rules:
- confidence: "high" if all dots clearly visible, "medium" if some unclear, "low" if poor quality
- If NOT a pin sheet, return {"error": "Not a pin sheet", "confidence": "low"}
- Use training examples above as reference for accuracy`,
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
        const pinLocations = analysis.pins.map(pin => {
          const baseFields = {
            pin_position_id: pinPosition.id,
            hole_number: pin.hole,
            position_label: pin.position,
            x_position: pin.x,
            y_position: pin.y,
            description: pin.description,
          };

          // Try to include new fields (will be ignored if columns don't exist yet)
          if (pin.primary_grid !== undefined) {
            baseFields.primary_grid = pin.primary_grid;
          }
          if (pin.micro_placement !== undefined) {
            baseFields.micro_placement = pin.micro_placement;
          }
          if (pin.line_hugging !== undefined) {
            baseFields.line_hugging = pin.line_hugging;
          }

          return baseFields;
        });

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
