const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://pyeeplwsnupmhgbguwqs.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTg0MzY2OSwiZXhwIjoyMDc1NDE5NjY5fQ.yz1WTV7h_qpaJu3kQ0pEKHMF3rw-_fSLmdne_3Rb6Yc');

const peteId = 'U2b6d976f19bca4b2f4374ae0e10ed873';

(async () => {
  const { data: rounds } = await supabase.from('rounds')
    .select('score, differential, holes, created_at, course_name')
    .eq('golfer_id', peteId)
    .order('created_at', { ascending: false });

  console.log('Pete Park rounds:');
  for (const r of rounds || []) {
    console.log('  ', r.created_at?.substring(0, 10), 'Score:', r.score, 'Diff:', r.differential, 'Holes:', r.holes);
  }

  const validScores = (rounds || []).filter(s => s.holes === 18 && s.differential !== null);
  console.log('\nValid 18-hole rounds with differentials:', validScores.length);

  if (validScores.length >= 3) {
    const sortedDiffs = validScores.map(s => s.differential).sort((a, b) => a - b);
    console.log('Sorted differentials:', sortedDiffs.slice(0, 10));

    let whsHandicap;
    if (sortedDiffs.length >= 20) {
      const best8 = sortedDiffs.slice(0, 8);
      whsHandicap = best8.reduce((sum, diff) => sum + diff, 0) / 8;
    } else {
      whsHandicap = sortedDiffs[0];
    }
    console.log('\nCalculated WHS Handicap:', Math.round(whsHandicap * 10) / 10);
  } else {
    console.log('Not enough rounds for WHS');
  }
})();
