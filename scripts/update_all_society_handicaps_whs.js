const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://pyeeplwsnupmhgbguwqs.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTg0MzY2OSwiZXhwIjoyMDc1NDE5NjY5fQ.yz1WTV7h_qpaJu3kQ0pEKHMF3rw-_fSLmdne_3Rb6Yc');

async function calculateWHSForGolfer(golferId) {
  // Get last 20 completed rounds with valid data
  const { data: rounds } = await supabase
    .from('rounds')
    .select('id, total_gross, course_id, tee_marker, completed_at')
    .eq('golfer_id', golferId)
    .eq('status', 'completed')
    .not('total_gross', 'is', null)
    .not('tee_marker', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(20);

  if (!rounds || rounds.length === 0) {
    return null;
  }

  // Calculate differentials
  const differentials = [];

  for (const r of rounds) {
    const { data: course } = await supabase
      .from('courses')
      .select('name, tees')
      .eq('id', r.course_id)
      .single();

    let rating = 72, slope = 113;
    if (course?.tees) {
      const tee = course.tees.find(t => t.name?.toLowerCase() === r.tee_marker?.toLowerCase());
      if (tee) {
        rating = tee.rating || 72;
        slope = tee.slope || 113;
      }
    }

    const diff = (r.total_gross - rating) * 113 / slope;
    differentials.push(diff);
  }

  const n = differentials.length;
  if (n === 0) return null;

  // WHS table for number of diffs to use and adjustments
  let numToUse, adjustment = 0;
  if (n >= 20) { numToUse = 8; }
  else if (n >= 17) { numToUse = Math.floor(n * 0.35); }
  else if (n >= 12) { numToUse = Math.floor(n * 0.35); }
  else if (n >= 9) { numToUse = Math.floor(n * 0.35); }
  else if (n >= 7) { numToUse = 2; }
  else if (n === 6) { numToUse = 2; adjustment = -1; }
  else if (n === 5) { numToUse = 1; }
  else if (n === 4) { numToUse = 1; adjustment = -1; }
  else if (n === 3) { numToUse = 1; adjustment = -2; }
  else { numToUse = 1; adjustment = -2; }

  // Sort and take best N
  const sorted = [...differentials].sort((a, b) => a - b);
  const best = sorted.slice(0, numToUse);
  const avg = best.reduce((a, b) => a + b, 0) / best.length;
  const handicap = Math.round((avg * 0.96 + adjustment) * 10) / 10;

  return {
    handicap: Math.max(-10, Math.min(54, handicap)),
    roundsUsed: n,
    best: best.map(d => Math.round(d * 10) / 10)
  };
}

async function updateAllSocietyHandicaps() {
  console.log('=== UPDATING ALL SOCIETY HANDICAPS TO WHS 8-of-20 ===\n');

  // Get all society handicap records
  const { data: records } = await supabase
    .from('society_handicaps')
    .select('golfer_id, society_id, handicap_index')
    .not('society_id', 'is', null);

  console.log('Found', records?.length, 'society handicap records\n');

  const golferIds = [...new Set(records?.map(r => r.golfer_id) || [])];
  console.log('Unique golfers:', golferIds.length, '\n');

  let updated = 0;
  for (const golferId of golferIds) {
    const result = await calculateWHSForGolfer(golferId);

    if (result === null) {
      console.log(`${golferId.substring(0, 15)}... - No valid rounds`);
      continue;
    }

    // Update all society records for this golfer
    const golferRecords = records.filter(r => r.golfer_id === golferId);

    for (const record of golferRecords) {
      if (record.handicap_index !== result.handicap) {
        console.log(`${golferId.substring(0, 15)}... : ${record.handicap_index} -> ${result.handicap} (best ${result.best.length}: ${result.best.join(', ')})`);

        await supabase
          .from('society_handicaps')
          .update({
            handicap_index: result.handicap,
            rounds_count: result.roundsUsed,
            last_calculated_at: new Date().toISOString(),
            calculation_method: 'WHS-8of20',
            updated_at: new Date().toISOString()
          })
          .eq('golfer_id', golferId)
          .eq('society_id', record.society_id);

        updated++;
      }
    }
  }

  console.log('\n=== Updated', updated, 'records ===');
}

updateAllSocietyHandicaps().catch(console.error);
