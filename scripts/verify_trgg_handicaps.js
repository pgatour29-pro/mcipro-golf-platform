/**
 * Verify TRGG Handicap Updates
 * Quick verification script
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://pyeeplwsnupmhgbguwqs.supabase.co';
const SUPABASE_SERVICE_KEY = 'REDACTED_SERVICE_ROLE_KEY_ROTATED_2026_09_06';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const TRGG_SOCIETY_ID = '7c0e4b72-d925-44bc-afda-38259a7ba346';

async function verify() {
  console.log('='.repeat(60));
  console.log('TRGG HANDICAP VERIFICATION');
  console.log('='.repeat(60));
  console.log('');

  // Count total TRGG handicaps
  const { count, error: countError } = await supabase
    .from('society_handicaps')
    .select('*', { count: 'exact', head: true })
    .eq('society_id', TRGG_SOCIETY_ID);

  console.log(`Total TRGG handicap records: ${count}`);
  console.log('');

  // Get some sample records
  const { data: samples, error: samplesError } = await supabase
    .from('society_handicaps')
    .select('golfer_id, handicap_index, calculation_method, last_calculated_at')
    .eq('society_id', TRGG_SOCIETY_ID)
    .order('last_calculated_at', { ascending: false })
    .limit(10);

  if (samplesError) {
    console.error('Error fetching samples:', samplesError.message);
    return;
  }

  // Get player names
  const golferIds = samples.map(s => s.golfer_id);
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('line_user_id, name')
    .in('line_user_id', golferIds);

  const nameMap = {};
  for (const p of profiles || []) {
    nameMap[p.line_user_id] = p.name;
  }

  console.log('Sample recently updated handicaps:');
  console.log('-'.repeat(60));

  for (const s of samples) {
    const name = nameMap[s.golfer_id] || 'Unknown';
    console.log(`${name.padEnd(25)} | HCP: ${String(s.handicap_index).padStart(5)} | ${s.calculation_method}`);
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('VERIFICATION COMPLETE');
  console.log('='.repeat(60));
}

verify().catch(console.error);
