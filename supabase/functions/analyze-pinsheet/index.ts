// Analyze Pin Sheet Edge Function
// Uses Google Gemini Vision API to extract pin positions from golf course pin sheet photos
// Returns structured JSON with hole-by-hole pin locations

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { rateLimit } from "../_shared/ratelimit.ts";

// Get API keys from environment
// 2026-09-27: GEMINI_API_KEY first (the key ai-coach / marketing-ai / translate-text run on).
const GOOGLE_API_KEY = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_API_KEY");
// gemini-2.0-flash-exp was retired by Google — every read 404'd ("model not found").
// Pro first (a once-a-day read — accuracy beats seconds), flash if pro is unavailable.
const MODELS = ["gemini-pro-latest", "gemini-flash-latest"];
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
  confidence?: "high" | "low";
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
    const _rl = await rateLimit(req, "analyze-pinsheet", 10);
    if (_rl) return _rl;

    // Check for API key
    if (!GOOGLE_API_KEY) {
      console.error("[Analyze Pin Sheet] GOOGLE_API_KEY is not set!");
      return new Response(
        JSON.stringify({ error: "Google API key not configured" }),
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

    // Clean base64 (remove data URI prefix if present)
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    // Call Google Gemini Vision API with exact user configuration and verified training data
    // 2026-09-27 rewrite: the old prompt carried ONE Bangpakong sheet's 18 answers as "training
    // examples" — it pulled every other sheet toward those answers. Generic rules only now, a
    // confidence per hole, and holes it cannot see are left OUT (never guessed as centre).
    const systemInstruction = `You read a golf course's daily PIN SHEET from a photo.

Each hole has a small drawing of its green (a circle, oval, box or grid) with a mark showing where the hole is cut: a dot, flag, X, circle or filled square.
Orientation: the TOP of each drawing is the BACK of the green, the BOTTOM is the FRONT (the side the player approaches from).
For each hole, measure WHERE the mark sits inside that hole's drawing (use the drawing's outer edge as the frame, not any grid lines):
- x = distance from the drawing's LEFT edge divided by its width (0 = left edge, 0.5 = middle, 1 = right edge)
- y = distance from the drawing's TOP edge divided by its height (0 = top/back, 0.5 = middle, 1 = bottom/front)
Measure the CENTRE of the mark, to two decimals. Look closely at each drawing on its own.
If the sheet prints numbers instead of a mark — e.g. "24" paces from the front and "6L"/"5R" paces from the left/right edge — estimate x and y from them (a typical green is ~30 paces deep and ~30 wide).
Take hole numbers from the labels printed on the sheet, not from the order you read them.
confidence = "low" when the photo is blurred there or you are unsure where the mark is; otherwise "high".
Only return holes you can actually see. Never invent a hole.
Also read the course name, the date and the green speed (stimp, e.g. 9'6") from the header if printed.`;

    const callModel = (model: string) => fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GOOGLE_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemInstruction }]
          },
          contents: [{
            role: "user",
            parts: [
              { text: "Read every hole's pin position from this pin sheet." },
              {
                inlineData: {
                  mimeType: mediaType,
                  data: cleanBase64
                }
              }
            ]
          }],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 32768,   // thinking tokens count here — 4096 cut the JSON off mid-hole
            responseMimeType: "application/json",
            responseSchema: {
              type: "object",
              properties: {
                course_name: { type: "string" },
                date: { type: "string" },
                green_speed: { type: "string" },
                holes: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      hole: { type: "number" },
                      x: { type: "number" },
                      y: { type: "number" },
                      confidence: { type: "string", enum: ["high", "low"] }
                    },
                    required: ["hole", "x", "y", "confidence"]
                  }
                }
              },
              required: ["holes"]
            }
          }
        })
      }
    );
    // Two independent readers (pro + flash) in parallel. On test sheets each model misread 1-3
    // holes near a dividing line — never the SAME holes — and marked them "high". Agreement =
    // taken as read; disagreement (or only one reader) = "low" so the crew checks that hole.
    const readWith = async (model: string): Promise<any | null> => {
      try {
        const r = await callModel(model);
        if (!r.ok) { console.warn(`[Analyze Pin Sheet] ${model} -> ${r.status}`, (await r.text()).slice(0, 300)); return null; }
        const j = await r.json();
        const text = j.candidates?.[0]?.content?.parts?.[0]?.text;
        return text ? JSON.parse(text) : null;
      } catch (e) { console.warn(`[Analyze Pin Sheet] ${model} failed`, e); return null; }
    };
    const readers = MODELS.includes(body.model) ? [body.model] : MODELS;   // body.model = diagnostics: one reader
    const reads = await Promise.all(readers.map(readWith));
    const good = reads.filter(Boolean);
    if (!good.length) {
      return new Response(
        JSON.stringify({ error: "AI analysis failed", details: "no reader returned a result" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const geminiData: any = good[0];
    const other: any = good[1] || null;

    // Convert depth/side format to grid number and coordinates
    const depthSideToGrid = (depth: string, side: string): { grid: number; x: number; y: number; position: string } => {
      const gridMap: Record<string, { grid: number; x: number; y: number; position: string }> = {
        "Front-Left": { grid: 1, x: 0.17, y: 0.83, position: "front-left" },
        "Front-Center": { grid: 2, x: 0.50, y: 0.83, position: "front" },
        "Front-Right": { grid: 3, x: 0.83, y: 0.83, position: "front-right" },
        "Middle-Left": { grid: 4, x: 0.17, y: 0.50, position: "left" },
        "Middle-Center": { grid: 5, x: 0.50, y: 0.50, position: "center" },
        "Middle-Right": { grid: 6, x: 0.83, y: 0.50, position: "right" },
        "Back-Left": { grid: 7, x: 0.17, y: 0.17, position: "back-left" },
        "Back-Center": { grid: 8, x: 0.50, y: 0.17, position: "back" },
        "Back-Right": { grid: 9, x: 0.83, y: 0.17, position: "back-right" },
      };
      const key = `${depth}-${side}`;
      return gridMap[key] || null;   // unreadable = left out, never a made-up "center"
    };

    // Convert Gemini holes format to our format
    // Thirds are cut HERE from the measured x/y (models place a mark far better than they
    // classify it); a mark within 0.06 of a dividing line comes back "low" = "check this one".
    const third = (v: number) => (v < 1 / 3 ? 0 : v < 2 / 3 ? 1 : 2);
    const nearLine = (v: number) => Math.abs(v - 1 / 3) < 0.06 || Math.abs(v - 2 / 3) < 0.06;
    const seen = new Set<number>();
    const pins: PinLocation[] = (geminiData.holes || []).map((hole: any) => {
      const n = Number(hole.hole), x = Number(hole.x), y = Number(hole.y);
      if (!(n >= 1 && n <= 18) || seen.has(n) || !(x >= 0 && x <= 1) || !(y >= 0 && y <= 1)) return null;
      seen.add(n);
      const depth = ["Back", "Middle", "Front"][third(y)], side = ["Left", "Center", "Right"][third(x)];
      const converted = depthSideToGrid(depth, side)!;
      let agree = true;
      if (other) {
        const o = (other.holes || []).find((h: any) => Number(h.hole) === n);
        const ox = Number(o?.x), oy = Number(o?.y);
        agree = !!o && ox >= 0 && ox <= 1 && oy >= 0 && oy <= 1 && third(ox) === third(x) && third(oy) === third(y);
      }
      return {
        hole: n,
        primary_grid: converted.grid,
        position: converted.position,
        micro_placement: `${depth}-${side}`,
        line_hugging: nearLine(x) || nearLine(y),
        x: converted.x,
        y: converted.y,
        description: `${depth} ${side}`,
        confidence: (!agree || hole.confidence === "low" || nearLine(x) || nearLine(y)) ? "low" : "high"
      };
    }).filter(Boolean).sort((a: any, b: any) => a.hole - b.hole);

    const analysis: PinSheetAnalysis = {
      course_name: geminiData.course_name || courseName || "Unknown Course",
      date: geminiData.date || date || new Date().toISOString().split('T')[0],
      green_speed: geminiData.green_speed || other?.green_speed || null,
      pins: pins,
      holes_detected: pins.length,
      confidence: pins.length === 18 ? "high" : (pins.length >= 16 ? "medium" : "low")
    };

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
