// Sync TRGG Schedule - Fetches golf schedule from trggpattaya.com and upserts into society_events
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const TRGG_SCHEDULE_URL = "https://trggpattaya.com/schedule/";
const TRGG_SOCIETY_ID = "17451cf3-f499-4aa3-83d7-c206149838c4";

// Course name mapping: TRGG website name → MyCaddiPro course_name
const COURSE_MAP: Record<string, string> = {
  "phoenix": "Phoenix Golf & Country Club",
  "st andrews": "St Andrews 2000",
  "st. andrews": "St Andrews 2000",
  "green valley": "Green Valley Country Club",
  "eastern star": "Eastern Star Country Club",
  "pattaya c.c.": "Pattaya Country Club",
  "pattaya cc": "Pattaya Country Club",
  "pattaya country club": "Pattaya Country Club",
  "greenwood": "Greenwood Golf Club",
  "pleasant valley": "Pleasant Valley Golf Club",
  "bangpakong": "Bangpakong Riverside Country Club",
  "bangpra": "Bangpra International Golf Club",
  "plutaluang s-e": "Plutaluang Navy Golf Club",
  "plutaluang n-w": "Plutaluang Navy Golf Club",
  "plutaluang": "Plutaluang Navy Golf Club",
  "hermes links": "Hermes Links Golf Club",
  "treasure hill": "Treasure Hill Golf Club",
  "mountain shadow": "Mountain Shadow Golf Club",
  "laem chabang": "Laem Chabang International Country Club",
  "khao kheow": "Khao Kheow Country Club",
  "burapha": "Burapha Golf Club",
  "siam country club": "Siam Country Club",
};

function mapCourseName(raw: string): string {
  const lower = raw.trim().toLowerCase();
  return COURSE_MAP[lower] || raw.trim();
}

interface ParsedEvent {
  date: string; // YYYY-MM-DD
  day: string;
  course_raw: string;
  course_name: string;
  departure_time: string;
  tee_time: string;
  green_fee: number;
  event_type: string;
  nine_info: string; // e.g. "S-E", "N-W" for Plutaluang
}

function parseScheduleHTML(html: string): ParsedEvent[] {
  const events: ParsedEvent[] = [];

  // Find the current year from the page or use current year
  const now = new Date();
  let currentYear = now.getFullYear();

  // Look for year in heading like "2026 Schedule" or month headers
  const yearMatch = html.match(/20\d{2}\s*Schedule/i) || html.match(/<h\d[^>]*>.*?(20\d{2})/i);
  if (yearMatch) {
    currentYear = parseInt(yearMatch[1] || yearMatch[0].match(/20\d{2}/)?.[0] || String(currentYear));
  }

  // Parse table rows - TRGG schedule is in HTML tables
  // Each month section has rows with: Date | Day | Course | Departure | 1st Tee | Green Fee | Event
  const months: Record<string, number> = {
    'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
    'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
  };

  let currentMonth = 0;

  // Split by table rows
  const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];

  for (const row of rows) {
    // Check for month header
    const monthHeader = row.match(/(January|February|March|April|May|June|July|August|September|October|November|December)/i);
    if (monthHeader) {
      const monthName = monthHeader[1].toLowerCase().substring(0, 3);
      currentMonth = months[monthName] || 0;

      // Check if year is in the header too
      const yrMatch = row.match(/20\d{2}/);
      if (yrMatch) currentYear = parseInt(yrMatch[0]);
      continue;
    }

    // Extract cells
    const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
    if (!cells || cells.length < 5) continue;

    // Strip HTML tags from cell content
    const clean = (s: string) => s.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();

    const dateStr = clean(cells[0]);
    const dayStr = clean(cells[1]);
    const courseStr = clean(cells[2]);
    const departureStr = clean(cells[3]);
    const teeTimeStr = clean(cells[4]);
    const feeStr = cells[5] ? clean(cells[5]) : '';
    const eventStr = cells[6] ? clean(cells[6]) : 'Regular';

    // Parse date - format like "Apr 1", "May 15", etc.
    const dateMatch = dateStr.match(/([A-Za-z]+)\s+(\d+)/);
    if (!dateMatch && !currentMonth) continue;

    let month = currentMonth;
    let day = 0;

    if (dateMatch) {
      const mName = dateMatch[1].toLowerCase().substring(0, 3);
      if (months[mName]) month = months[mName];
      day = parseInt(dateMatch[2]);
    } else {
      // Try just a number
      const numMatch = dateStr.match(/(\d+)/);
      if (numMatch) day = parseInt(numMatch[1]);
    }

    if (!month || !day) continue;

    const dateFormatted = `${currentYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    // Parse nine info from course name (e.g., "Plutaluang S-E")
    let nineInfo = '';
    const nineMatch = courseStr.match(/([NS])-([EW])/i);
    if (nineMatch) nineInfo = nineMatch[0].toUpperCase();

    // Parse times - format "08:00" or "09:30"
    const parseTime = (s: string) => {
      const m = s.match(/(\d{1,2}):(\d{2})/);
      return m ? `${m[1].padStart(2, '0')}:${m[2]}` : '';
    };

    // Parse green fee
    const feeMatch = feeStr.match(/(\d[\d,]*)/);
    const greenFee = feeMatch ? parseInt(feeMatch[1].replace(/,/g, '')) : 0;

    events.push({
      date: dateFormatted,
      day: dayStr,
      course_raw: courseStr,
      course_name: mapCourseName(courseStr),
      departure_time: parseTime(departureStr),
      tee_time: parseTime(teeTimeStr),
      green_fee: greenFee,
      event_type: eventStr || 'Regular',
      nine_info: nineInfo,
    });
  }

  return events;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return cors(new Response(null, { status: 204 }));
  }

  try {
    // Fetch the TRGG schedule page
    console.log('[TRGG Sync] Fetching schedule from', TRGG_SCHEDULE_URL);
    const pageResp = await fetch(TRGG_SCHEDULE_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });

    if (!pageResp.ok) {
      return cors(json(500, { error: `Failed to fetch schedule: ${pageResp.status}` }));
    }

    const html = await pageResp.text();
    console.log('[TRGG Sync] Got HTML, length:', html.length);

    // Parse events
    const events = parseScheduleHTML(html);
    console.log('[TRGG Sync] Parsed', events.length, 'events');

    if (events.length === 0) {
      return cors(json(200, {
        success: false,
        message: 'No events found in schedule page. The page format may have changed.',
        htmlPreview: html.substring(0, 500)
      }));
    }

    // Connect to Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get existing TRGG events to avoid duplicates
    const { data: existingEvents } = await supabase
      .from('society_events')
      .select('id, event_date, course_name, title')
      .eq('society_id', TRGG_SOCIETY_ID)
      .gte('event_date', events[0]?.date || '2026-01-01');

    const existingMap = new Map<string, string>();
    for (const e of existingEvents || []) {
      // Key by date + normalized course name
      const key = `${e.event_date}_${(e.course_name || '').toLowerCase()}`;
      existingMap.set(key, e.id);
    }

    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const evt of events) {
      const key = `${evt.date}_${evt.course_name.toLowerCase()}`;
      const existingId = existingMap.get(key);

      // Build title
      let title = evt.event_type === 'Regular'
        ? `TRGG - ${evt.course_name}`
        : `TRGG - ${evt.event_type}`;

      if (evt.nine_info) {
        title += ` (${evt.nine_info})`;
      }

      const eventData = {
        title,
        society_id: TRGG_SOCIETY_ID,
        event_date: evt.date,
        start_time: evt.tee_time,
        departure_time: evt.departure_time,
        course_name: evt.course_name,
        description: `Green Fee: ฿${evt.green_fee} (incl. caddy & cart)${evt.nine_info ? ` | Nines: ${evt.nine_info}` : ''}`,
        format: evt.event_type === 'Monthly Medal Stroke' ? 'medal_stroke'
              : evt.event_type === 'Two Man Scramble' ? 'scramble'
              : 'stableford',
        status: 'published',
        entry_fee: evt.green_fee,
      };

      if (existingId) {
        // Update existing
        const { error } = await supabase
          .from('society_events')
          .update(eventData)
          .eq('id', existingId);

        if (error) {
          errors.push(`Update ${evt.date} ${evt.course_name}: ${error.message}`);
        } else {
          updated++;
        }
      } else {
        // Insert new
        const { error } = await supabase
          .from('society_events')
          .insert(eventData);

        if (error) {
          errors.push(`Insert ${evt.date} ${evt.course_name}: ${error.message}`);
        } else {
          inserted++;
        }
      }
    }

    console.log('[TRGG Sync] Done:', { inserted, updated, skipped, errors: errors.length });

    return cors(json(200, {
      success: true,
      total_parsed: events.length,
      inserted,
      updated,
      errors: errors.length > 0 ? errors : undefined,
      events: events.map(e => ({ date: e.date, course: e.course_name, type: e.event_type, tee: e.tee_time })),
    }));

  } catch (err: any) {
    console.error('[TRGG Sync] Error:', err);
    return cors(json(500, { error: err.message }));
  }
});

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function cors(response: Response): Response {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return response;
}
