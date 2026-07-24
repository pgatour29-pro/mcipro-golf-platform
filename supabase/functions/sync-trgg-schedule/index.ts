// Sync TRGG Schedule - Fetches golf schedule from trggpattaya.com and upserts into society_events
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const TRGG_SCHEDULE_URL = "https://trggpattaya.com/schedule/";
const TRGG_SOCIETY_ID = "7c0e4b72-d925-44bc-afda-38259a7ba346";

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

const pad2 = (n: number) => String(n).padStart(2, '0');

const DOW: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

// True if y-m-d is a real calendar date falling on the expected weekday
function dateMatchesDow(y: number, m: number, d: number, dow: number): boolean {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d && dt.getUTCDay() === dow;
}

function parseScheduleHTML(html: string): { events: ParsedEvent[]; warnings: string[] } {
  const events: ParsedEvent[] = [];
  const warnings: string[] = [];

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

  // Strip tags and decode the HTML entities the TRGG site actually emits —
  // leaving &amp; in place is what stored "BURAPHA A &amp; B" titles in the DB
  const clean = (s: string) => s
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;amp;/g, '&')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
    .trim();

  // Split HTML into chunks by <tr> tags (handles missing </tr>)
  const chunks = html.split(/<tr[^>]*>/gi);

  for (const chunk of chunks) {
    // Extract cells from this row FIRST. The next month's header (<h3>August 2026...)
    // sits between this row's </tr> and the following <tr>, i.e. INSIDE this chunk —
    // applying it before parsing the cells shifted the last day of every month into
    // the next month (July 31 BURAPHA landed on Aug 31).
    const cells = chunk.match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
    row: if (cells && cells.length >= 5) {
      const dateStr = clean(cells[0]);
      const dayStr = clean(cells[1]);
      const courseStr = clean(cells[2]);
      const departureStr = clean(cells[3]);
      const teeTimeStr = clean(cells[4]);
      const feeStr = cells[5] ? clean(cells[5]) : '';

      // Skip header rows and empty filler rows (e.g. "30 | | | | |")
      if (dateStr === 'DATE' || dayStr === 'DAY') break row;
      if (!courseStr) break row;

      // Parse date — just a number (day of month), month comes from <h3> header
      const numMatch = dateStr.match(/(\d+)/);
      if (!numMatch || !currentMonth) break row;
      const day = parseInt(numMatch[1]);
      if (day < 1 || day > 31) break row;

      let year = currentYear;
      let month = currentMonth;

      // Sanity-check against the DAY column: if the weekday doesn't match,
      // try the adjacent months (header-bleed correction); otherwise skip.
      const expectedDow = DOW[dayStr.toLowerCase().slice(0, 3)];
      if (expectedDow !== undefined && !dateMatchesDow(year, month, day, expectedDow)) {
        let fixed = false;
        for (const delta of [-1, 1]) {
          let m = month + delta, y = year;
          if (m === 0) { m = 12; y -= 1; } else if (m === 13) { m = 1; y += 1; }
          if (dateMatchesDow(y, m, day, expectedDow)) {
            month = m; year = y; fixed = true;
            warnings.push(`Month corrected for "${dateStr} ${dayStr} ${courseStr}" → ${y}-${pad2(m)}-${pad2(day)}`);
            break;
          }
        }
        if (!fixed) {
          warnings.push(`Skipped "${dateStr} ${dayStr} ${courseStr}": weekday doesn't match any nearby month`);
          break row;
        }
      }

      const dateFormatted = `${year}-${pad2(month)}-${pad2(day)}`;

      // Parse nine info from course name (e.g., "Plutaluang S-E")
      let nineInfo = '';
      const nineMatch = courseStr.match(/([NS])-([EW])/i);
      if (nineMatch) nineInfo = nineMatch[0].toUpperCase();

      // Parse times — handles both "09:00" and "09.00" formats
      const parseTime = (s: string) => {
        const m = s.match(/(\d{1,2})[:.:](\d{2})/);
        return m ? `${m[1].padStart(2, '0')}:${m[2]}` : '';
      };

      // Parse green fee
      const feeMatch = feeStr.match(/(\d[\d,]*)/);
      const greenFee = feeMatch ? parseInt(feeMatch[1].replace(/,/g, '')) : 0;

      // Determine event type from course name (e.g., "ST ANDREWS FREE FOOD FRIDAY")
      let eventType = 'Regular';
      if (courseStr.match(/scramble|stroke|stableford|medal|competition|championship|cup|trophy/i)) {
        eventType = courseStr;
      }

      events.push({
        date: dateFormatted,
        day: dayStr,
        course_raw: courseStr,
        course_name: mapCourseName(courseStr),
        departure_time: parseTime(departureStr),
        tee_time: parseTime(teeTimeStr),
        green_fee: greenFee,
        event_type: eventType,
        nine_info: nineInfo,
      });
    }

    // Now apply any month header found in this chunk — it governs the FOLLOWING rows
    const monthHeaders = chunk.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s*(20\d{2})/gi);
    if (monthHeaders) {
      for (const mh of monthHeaders) {
        const parts = mh.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s*(20\d{2})/i);
        if (parts) {
          const mName = parts[1].toLowerCase().substring(0, 3);
          if (months[mName]) currentMonth = months[mName];
          currentYear = parseInt(parts[2]);
        }
      }
    }
  }

  return { events, warnings };
}

interface ExistingRow {
  id: string;
  society_id: string | null;
  event_date: string;
  course_name: string | null;
  title: string;
  start_time: string | null;
  departure_time: string | null;
  entry_fee: number | string | null;
  format: string | null;
  status: string | null;
  description: string | null;
  created_at: string;
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
    const { events: allParsed, warnings } = parseScheduleHTML(html);

    // Only manage today-forward (Bangkok). Past events may carry results,
    // standings and series data — the sync must never rewrite history.
    const todayBkk = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
    const events = allParsed.filter(e => e.date >= todayBkk);
    console.log('[TRGG Sync] Parsed', allParsed.length, 'events (', events.length, 'today-forward),', warnings.length, 'warnings');

    if (events.length === 0) {
      return cors(json(200, {
        success: false,
        message: 'No events found in schedule page. The page format may have changed.',
        warnings,
        htmlPreview: html.substring(0, 500)
      }));
    }

    // Connect to Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get existing TRGG events to avoid duplicates.
    // Match by title prefix OR society_id — the Schedule Creator has saved TRGG
    // events with society_id NULL, and societies/society_profiles carry different
    // UUIDs, so society_id alone misses rows and re-inserts them as duplicates.
    const { data: existingEvents, error: existErr } = await supabase
      .from('society_events')
      .select('id, society_id, event_date, course_name, title, start_time, departure_time, entry_fee, format, status, description, created_at')
      .or(`society_id.eq.${TRGG_SOCIETY_ID},title.ilike.TRGG*`)
      .gte('event_date', todayBkk);

    if (existErr) {
      return cors(json(500, { error: `Failed to load existing events: ${existErr.message}` }));
    }

    // ALL rows per date — duplicates must be seen, not silently overwritten in a map
    const byDate = new Map<string, ExistingRow[]>();
    for (const e of (existingEvents || []) as ExistingRow[]) {
      const list = byDate.get(e.event_date) || [];
      list.push(e);
      byDate.set(e.event_date, list);
    }

    // Registration counts for dates holding duplicates — used to pick the canonical
    // row (the one players registered on) and to migrate stragglers before deleting
    const dupIds: string[] = [];
    for (const list of byDate.values()) {
      if (list.length > 1) dupIds.push(...list.map(r => r.id));
    }
    const regCounts = new Map<string, number>();
    if (dupIds.length > 0) {
      const { data: regs } = await supabase
        .from('event_registrations')
        .select('event_id')
        .in('event_id', dupIds);
      for (const r of regs || []) {
        const k = String(r.event_id);
        regCounts.set(k, (regCounts.get(k) || 0) + 1);
      }
    }

    let inserted = 0;
    let updated = 0;
    let unchanged = 0;
    const duplicatesRemoved: Array<{ date: string; id: string; title: string }> = [];
    const errors: string[] = [];

    const normTime = (t: string | null | undefined) => (t || '').slice(0, 5); // HH:MM vs HH:MM:SS

    // A same-date row only counts as the website's event if it refers to the same
    // course — matched loosely on the leading course words. Special-series rows
    // (e.g. "Chiang Mai Classic 2026 — R3 Highlands") legitimately share a date
    // with a regular schedule row and must never be updated or deleted here.
    const normText = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const courseKeys = (evt: ParsedEvent): string[] => {
      const keys: string[] = [];
      for (const src of [evt.course_raw, evt.course_name]) {
        const words = normText(src).split(' ').filter(Boolean);
        if (words[0] && words[0].length >= 4) keys.push(words[0]);
        if (words.length >= 2) keys.push(words.slice(0, 2).join(' '));
      }
      return [...new Set(keys)].filter(k => k.length >= 4);
    };
    const matchesEvent = (row: ExistingRow, evt: ParsedEvent): boolean => {
      const hay = normText(`${row.title} ${row.course_name || ''}`);
      return courseKeys(evt).some(k => hay.includes(k));
    };

    for (const evt of events) {
      const rows = (byDate.get(evt.date) || []).filter(r => matchesEvent(r, evt));

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

      if (rows.length === 0) {
        // Insert new
        const { error } = await supabase
          .from('society_events')
          .insert(eventData);

        if (error) {
          errors.push(`Insert ${evt.date} ${evt.course_name}: ${error.message}`);
        } else {
          inserted++;
        }
        continue;
      }

      // Canonical row = most registrations, tie broken by oldest created_at
      const canonical = [...rows].sort((a, b) =>
        (regCounts.get(b.id) || 0) - (regCounts.get(a.id) || 0) ||
        a.created_at.localeCompare(b.created_at)
      )[0];

      // An organizer cancellation wins over the website — never resurrect
      if ((canonical.status || '') === 'cancelled') {
        unchanged++;
      } else {
        // Only write when something actually differs — a blind update every sync
        // run re-fires LINE notifications on the trigger's watched columns
        const changed =
          canonical.title !== eventData.title ||
          (canonical.course_name || '') !== eventData.course_name ||
          normTime(canonical.start_time) !== normTime(eventData.start_time) ||
          normTime(canonical.departure_time) !== normTime(eventData.departure_time) ||
          Number(canonical.entry_fee || 0) !== Number(eventData.entry_fee || 0) ||
          (canonical.description || '') !== eventData.description ||
          (canonical.format || '') !== eventData.format ||
          (canonical.status || '') !== eventData.status ||
          (canonical.society_id || '') !== TRGG_SOCIETY_ID;

        if (!changed) {
          unchanged++;
        } else {
          const { error } = await supabase
            .from('society_events')
            .update(eventData)
            .eq('id', canonical.id);

          if (error) {
            errors.push(`Update ${evt.date} ${evt.course_name}: ${error.message}`);
          } else {
            updated++;
          }
        }
      }

      // Self-heal: remove surplus rows for this date, migrating any linked data
      // to the canonical row first. DELETE on society_events has no LINE trigger.
      for (const dup of rows) {
        if (dup.id === canonical.id) continue;
        let repointFailed = false;
        for (const table of ['event_registrations', 'event_pairings', 'event_announcements']) {
          const { error } = await supabase
            .from(table)
            .update({ event_id: canonical.id })
            .eq('event_id', dup.id);
          if (error) {
            errors.push(`Repoint ${table} ${dup.id}→${canonical.id}: ${error.message}`);
            repointFailed = true;
          }
        }
        if (repointFailed) continue; // keep the dup rather than orphan its data

        const { error: delErr } = await supabase
          .from('society_events')
          .delete()
          .eq('id', dup.id);
        if (delErr) {
          errors.push(`Delete duplicate ${evt.date} ${dup.title}: ${delErr.message}`);
        } else {
          duplicatesRemoved.push({ date: evt.date, id: dup.id, title: dup.title });
        }
      }
    }

    console.log('[TRGG Sync] Done:', { inserted, updated, unchanged, duplicatesRemoved: duplicatesRemoved.length, errors: errors.length });

    return cors(json(200, {
      success: true,
      total_parsed: allParsed.length,
      managed_from: todayBkk,
      managed: events.length,
      inserted,
      updated,
      unchanged,
      duplicates_removed: duplicatesRemoved.length > 0 ? duplicatesRemoved : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
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
