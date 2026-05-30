// Parse JOA Schedule from Image
// Uses Claude Vision API to extract golf schedule from JOA's Korean table format
// Translates Korean course names and inserts into society_events

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const JOA_ORGANIZER_NAME = "JOA Golf Pattaya"; // organizer_id is UUID column, use name for matching

// Korean → English course name mapping
const COURSE_MAP: Record<string, string> = {
  "방프라": "Bangpra CC",
  "트레저힐": "Treasure Hill CC",
  "파타비아": "Pattavia CC",
  "카오키여우": "Khao Kheow Fox CC",
  "방파콩리버사이드": "Bangpakong Riverside CC",
  "에르메스": "Hermes CC",
  "이스턴스타": "Eastern Star CC",
  "그린우드": "Greenwood CC",
  "플레전트밸리": "Pleasant Valley CC",
  "피닉스": "Phoenix Golf CC",
  "부라파": "Burapha CC",
  "플루타루앙": "Plutaluang CC",
  "카오키오": "Khao Kheow Fox CC",
  "방프라인터내셔널": "Bangpra CC",
  "시암컨트리": "Siam Country Club",
  "레이크우드": "Lakewood CC",
  "방콕": "Bangpakong Riverside CC",
  "램차방": "Laem Chabang International CC",
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
};

function mapCourseName(korean: string): string {
  const cleaned = korean.replace(/cc|CC|골프|클럽|컨트리|리조트/g, "").trim();
  for (const [kr, en] of Object.entries(COURSE_MAP)) {
    if (cleaned.includes(kr)) return en;
  }
  // If already English, return as-is
  if (/^[a-zA-Z\s&.'-]+$/.test(korean.trim())) return korean.trim();
  return korean.trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not set" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { image_base64, image_url, year, month, society_id } = await req.json();

    if (!image_base64 && !image_url) {
      return new Response(JSON.stringify({ error: "image_base64 or image_url required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Build image content for Claude
    const imageContent = image_base64
      ? { type: "image", source: { type: "base64", media_type: "image/jpeg", data: image_base64 } }
      : { type: "image", source: { type: "url", url: image_url } };

    // Call Claude Vision to parse the schedule
    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages: [{
          role: "user",
          content: [
            imageContent,
            {
              type: "text",
              text: `This is a Korean golf schedule table image from JOA Golf Pattaya. Extract ALL rows into JSON.

The table has columns: Date (일), Day (요일), Course/CC (골프장), Departure Time (출발시간), Tee Off Time (T.OFF 시간), Green Fee (그린피), Caddy (캐디), Cart (카트).

Return ONLY a JSON array, no other text. Each object must have:
- "day": number (1-31)
- "course_korean": the original Korean course name
- "course_english": translated English course name
- "departure_time": "HH:MM" format
- "tee_time": "HH:MM" format
- "green_fee": number (in baht, extract number only)
- "caddy_included": boolean (포함 = true)
- "cart_included": boolean (포함 = true)

Known course translations:
방프라 = Bangpra CC, 트레저힐 = Treasure Hill CC, 파타비아 = Pattavia CC,
카오키여우 = Khao Kheow Fox CC, 방파콩리버사이드 = Bangpakong Riverside CC,
에르메스 = Hermes CC, 이스턴스타 = Eastern Star CC, 그린우드 = Greenwood CC

Extract EVERY row. Return valid JSON array only.`
            }
          ]
        }]
      })
    });

    if (!claudeResponse.ok) {
      const err = await claudeResponse.text();
      return new Response(JSON.stringify({ error: "Claude API error", details: err }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const claudeData = await claudeResponse.json();
    const responseText = claudeData.content?.[0]?.text || "";

    // Parse JSON from Claude's response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return new Response(JSON.stringify({ error: "Could not parse schedule from image", raw: responseText }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const parsedEvents = JSON.parse(jsonMatch[0]);

    // Determine year and month
    const eventYear = year || new Date().getFullYear();
    const eventMonth = month || (new Date().getMonth() + 2); // Default to next month

    // Get JOA society ID
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    let joaSocietyId = society_id;
    if (!joaSocietyId) {
      const { data: joaSociety } = await supabase
        .from("society_profiles")
        .select("id")
        .or("organizer_id.eq.JOAGOLFPAT,society_name.ilike.%JOA%")
        .limit(1)
        .single();
      joaSocietyId = joaSociety?.id;
    }

    // Build events for insertion
    const events = [];
    const errors = [];

    for (const ev of parsedEvents) {
      try {
        const dayNum = parseInt(ev.day);
        if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) continue;

        const eventDate = `${eventYear}-${String(eventMonth).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
        const courseName = mapCourseName(ev.course_english || ev.course_korean || "");
        const teeTime = ev.tee_time || "11:00";
        const departureTime = ev.departure_time || "10:00";
        const greenFee = parseInt(ev.green_fee) || 0;

        // Calculate total fee (green fee includes caddy+cart if marked)
        const description = `Caddy: ${ev.caddy_included ? "Included" : "Extra"}, Cart: ${ev.cart_included ? "Included" : "Extra"}`;

        events.push({
          title: `JOA Golf - ${courseName}`,
          society_id: joaSocietyId,
          organizer_name: JOA_ORGANIZER_NAME,
          event_date: eventDate,
          start_time: teeTime,
          departure_time: departureTime,
          course_name: courseName,
          entry_fee: greenFee,
          description: description,
          format: "stableford",
          status: "published",
          creator_type: "organizer",
        });
      } catch (e) {
        errors.push({ day: ev.day, error: String(e) });
      }
    }

    // Upsert events (by date + organizer to avoid duplicates)
    let inserted = 0, updated = 0, failed = 0;

    for (const ev of events) {
      // Check if event already exists for this date by organizer name
      const { data: existing } = await supabase
        .from("society_events")
        .select("id")
        .eq("event_date", ev.event_date)
        .eq("organizer_name", JOA_ORGANIZER_NAME)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from("society_events")
          .update(ev)
          .eq("id", existing.id);
        if (error) { failed++; errors.push({ date: ev.event_date, error: error.message }); }
        else updated++;
      } else {
        // Insert new
        const { error } = await supabase
          .from("society_events")
          .insert(ev);
        if (error) { failed++; errors.push({ date: ev.event_date, error: error.message }); }
        else inserted++;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      total_parsed: parsedEvents.length,
      inserted,
      updated,
      failed,
      errors: errors.length > 0 ? errors : undefined,
      events: events.map(e => ({ date: e.event_date, course: e.course_name, time: e.start_time, fee: e.entry_fee }))
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
