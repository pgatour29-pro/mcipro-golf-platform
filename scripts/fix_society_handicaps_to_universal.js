const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://pyeeplwsnupmhgbguwqs.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTg0MzY2OSwiZXhwIjoyMDc1NDE5NjY5fQ.yz1WTV7h_qpaJu3kQ0pEKHMF3rw-_fSLmdne_3Rb6Yc');

async function fixAllSocietyHandicaps() {
  console.log('=== FIXING ALL SOCIETY HANDICAPS TO MATCH UNIVERSAL ===\n');

  // Get all golfers who have society_handicaps records
  const { data: allRecords } = await supabase
    .from('society_handicaps')
    .select('golfer_id, society_id, handicap_index')
    .not('society_id', 'is', null);  // Only society-specific (not universal)

  console.log('Found', allRecords?.length, 'society-specific handicap records\n');

  // Group by golfer
  const golferIds = [...new Set(allRecords?.map(r => r.golfer_id) || [])];
  console.log('Unique golfers:', golferIds.length);

  for (const golferId of golferIds) {
    // Calculate universal handicap for this golfer
    const { data: calcResult, error: calcErr } = await supabase.rpc('calculate_society_handicap_index', {
      p_golfer_id: golferId,
      p_society_id: null  // Universal = ALL rounds
    });

    if (calcErr) {
      console.log('Error calculating for', golferId, ':', calcErr.message);
      continue;
    }

    const universalHcp = calcResult?.new_handicap_index;
    if (universalHcp === null || universalHcp === undefined) {
      console.log('No handicap for', golferId, '(no valid rounds)');
      continue;
    }

    // Get all society records for this golfer
    const golferRecords = allRecords.filter(r => r.golfer_id === golferId);

    for (const record of golferRecords) {
      if (record.handicap_index !== universalHcp) {
        console.log(`Updating ${golferId.substring(0, 10)}... society ${record.society_id?.substring(0, 8)}: ${record.handicap_index} -> ${universalHcp}`);

        // Update to match universal
        await supabase
          .from('society_handicaps')
          .update({
            handicap_index: universalHcp,
            rounds_count: calcResult.rounds_used,
            last_calculated_at: new Date().toISOString(),
            calculation_method: 'WHS-UNIVERSAL',
            updated_at: new Date().toISOString()
          })
          .eq('golfer_id', golferId)
          .eq('society_id', record.society_id);
      }
    }
  }

  console.log('\n=== DONE ===');

  // Verify Pete specifically
  const PETE_ID = 'U2b6d976f19bca4b2f4374ae0e10ed873';
  const { data: peteHcps } = await supabase
    .from('society_handicaps')
    .select('society_id, handicap_index')
    .eq('golfer_id', PETE_ID);

  console.log('\nPete Park handicaps after fix:');
  for (const h of peteHcps || []) {
    console.log(' -', h.society_id || 'Universal', ':', h.handicap_index);
  }
}

fixAllSocietyHandicaps().catch(console.error);
