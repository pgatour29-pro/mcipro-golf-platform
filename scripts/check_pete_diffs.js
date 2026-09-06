const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://pyeeplwsnupmhgbguwqs.supabase.co', 'REDACTED_SERVICE_ROLE_KEY_ROTATED_2026_09_06');

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
