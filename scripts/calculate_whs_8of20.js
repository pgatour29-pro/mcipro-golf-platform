const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://pyeeplwsnupmhgbguwqs.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTg0MzY2OSwiZXhwIjoyMDc1NDE5NjY5fQ.yz1WTV7h_qpaJu3kQ0pEKHMF3rw-_fSLmdne_3Rb6Yc');

const PETE_ID = 'U2b6d976f19bca4b2f4374ae0e10ed873';

async function calculateWHS() {
  console.log('=== WHS HANDICAP CALCULATION (Best 8 of 20) ===\n');

  // Get Pete's last 20 completed rounds with valid data
  const { data: rounds } = await supabase
    .from('rounds')
    .select('id, total_gross, course_id, tee_marker, completed_at')
    .eq('golfer_id', PETE_ID)
    .eq('status', 'completed')
    .not('total_gross', 'is', null)
    .not('tee_marker', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(20);

  console.log('Found', rounds?.length, 'valid rounds (with tee_marker)\n');

  // Calculate differentials for each round
  const differentials = [];

  for (const r of rounds || []) {
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
    differentials.push({
      date: r.completed_at?.substring(0, 10),
      course: course?.name || 'Unknown',
      gross: r.total_gross,
      rating,
      slope,
      diff: diff.toFixed(1)
    });

    console.log(`${r.completed_at?.substring(0, 10)} | ${(course?.name || 'Unknown').substring(0, 20).padEnd(20)} | Gross: ${r.total_gross} | R: ${rating} S: ${slope} | Diff: ${diff.toFixed(1)}`);
  }

  console.log('\n--- WHS Calculation ---');

  // WHS rules based on number of rounds
  const n = differentials.length;
  let numToUse = 0;

  if (n >= 20) numToUse = 8;
  else if (n >= 19) numToUse = 7;
  else if (n >= 18) numToUse = 7;
  else if (n >= 17) numToUse = 7;
  else if (n >= 16) numToUse = 6;
  else if (n >= 15) numToUse = 6;
  else if (n >= 14) numToUse = 5;
  else if (n >= 13) numToUse = 5;
  else if (n >= 12) numToUse = 5;
  else if (n >= 11) numToUse = 4;
  else if (n >= 10) numToUse = 4;
  else if (n >= 9) numToUse = 4;
  else if (n >= 8) numToUse = 3;
  else if (n >= 7) numToUse = 3;
  else if (n >= 6) numToUse = 2;
  else if (n >= 5) numToUse = 2;
  else if (n >= 4) numToUse = 1;
  else if (n >= 3) numToUse = 1;
  else numToUse = 1;

  // Adjustment based on number of rounds (WHS table)
  let adjustment = 0;
  if (n === 3) adjustment = -2.0;
  else if (n === 4) adjustment = -1.0;
  else if (n === 5) adjustment = 0;
  else if (n === 6) adjustment = -1.0;
  else adjustment = 0;

  console.log(`Rounds available: ${n}`);
  console.log(`Using best ${numToUse} of ${n}`);
  console.log(`Adjustment: ${adjustment}`);

  // Sort differentials and take best N
  const sortedDiffs = differentials.map(d => parseFloat(d.diff)).sort((a, b) => a - b);
  const bestDiffs = sortedDiffs.slice(0, numToUse);

  console.log('\nAll differentials (sorted):', sortedDiffs.map(d => d.toFixed(1)).join(', '));
  console.log('Best', numToUse, 'differentials:', bestDiffs.map(d => d.toFixed(1)).join(', '));

  // Calculate average
  const avg = bestDiffs.reduce((a, b) => a + b, 0) / bestDiffs.length;
  console.log('Average:', avg.toFixed(2));

  // Apply 0.96 multiplier and adjustment
  const handicapIndex = (avg * 0.96) + adjustment;
  console.log('× 0.96 + adjustment:', handicapIndex.toFixed(1));

  // Cap at WHS limits
  const finalHcp = Math.max(-10, Math.min(54, handicapIndex));
  console.log('\n=== FINAL WHS HANDICAP INDEX:', finalHcp.toFixed(1), '===');

  return finalHcp;
}

calculateWHS().catch(console.error);
