const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://pyeeplwsnupmhgbguwqs.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTg0MzY2OSwiZXhwIjoyMDc1NDE5NjY5fQ.yz1WTV7h_qpaJu3kQ0pEKHMF3rw-_fSLmdne_3Rb6Yc');

const PETE_ID = 'U2b6d976f19bca4b2f4374ae0e10ed873';

async function fix() {
  console.log('=== FIXING SOCIETY_HANDICAPS ===\n');

  // Get correct handicap
  const { data: calcResult } = await supabase.rpc('calculate_society_handicap_index', {
    p_golfer_id: PETE_ID,
    p_society_id: null
  });

  const correctHcp = calcResult?.new_handicap_index;
  console.log('Correct universal handicap:', correctHcp);

  // Update the universal record (where society_id IS NULL)
  const { error } = await supabase
    .from('society_handicaps')
    .update({
      handicap_index: correctHcp,
      rounds_count: calcResult?.rounds_used,
      last_calculated_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('golfer_id', PETE_ID)
    .is('society_id', null);

  if (error) {
    console.log('Update error:', error);
  } else {
    console.log('Universal society_handicaps updated to:', correctHcp);
  }

  // Verify
  const { data: final } = await supabase
    .from('society_handicaps')
    .select('*')
    .eq('golfer_id', PETE_ID);

  console.log('\nFinal society_handicaps for Pete:');
  for (const h of final || []) {
    console.log(' -', h.society_id || 'Universal', ':', h.handicap_index);
  }
}

fix().catch(console.error);
