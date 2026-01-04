const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://pyeeplwsnupmhgbguwqs.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTg0MzY2OSwiZXhwIjoyMDc1NDE5NjY5fQ.yz1WTV7h_qpaJu3kQ0pEKHMF3rw-_fSLmdne_3Rb6Yc');

async function test() {
  console.log('=== TESTING DEPLOYED WHS FUNCTION ===\n');

  // Test with Pete's golfer ID
  const { data, error } = await supabase.rpc('calculate_whs_handicap_index', {
    p_golfer_id: 'U2b6d976f19bca4b2f4374ae0e10ed873'
  });

  if (error) {
    console.log('ERROR:', error.message);
    return;
  }

  console.log('Function returned successfully!');
  console.log('WHS Handicap:', data.new_handicap_index);
  console.log('Rounds used:', data.rounds_used);
  console.log('Best differentials:', data.best_differentials);

  // Also check current society handicap values
  const { data: sh } = await supabase
    .from('society_handicaps')
    .select('society_id, handicap_index, calculation_method, rounds_count')
    .eq('golfer_id', 'U2b6d976f19bca4b2f4374ae0e10ed873');

  console.log('\nPete\'s society handicaps:');
  for (const s of sh || []) {
    const socId = s.society_id ? s.society_id.substring(0,8) : 'null';
    console.log(`  - Society ${socId}...: ${s.handicap_index} (${s.calculation_method || 'n/a'}, ${s.rounds_count || 0} rounds)`);
  }

  // Check universal handicap too
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('display_name, handicap_index')
    .eq('line_user_id', 'U2b6d976f19bca4b2f4374ae0e10ed873')
    .single();

  console.log('\nPete\'s universal handicap:', profile?.handicap_index);
}

test().catch(console.error);
