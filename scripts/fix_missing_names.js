/**
 * Fix missing player names in event_results
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://pyeeplwsnupmhgbguwqs.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTg0MzY2OSwiZXhwIjoyMDc1NDE5NjY5fQ.yz1WTV7h_qpaJu3kQ0pEKHMF3rw-_fSLmdne_3Rb6Yc';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function fixMissingNames() {
  console.log('='.repeat(70));
  console.log('CHECKING & FIXING MISSING PLAYER NAMES IN EVENT_RESULTS');
  console.log('='.repeat(70));

  // Get all event_results
  const { data: results } = await supabase
    .from('event_results')
    .select('*')
    .order('event_date', { ascending: false });

  console.log(`\nTotal event_results: ${results?.length || 0}\n`);

  // Find records with missing names
  const missing = results?.filter(r => !r.player_name || r.player_name === 'Unknown') || [];
  console.log(`Records with missing/Unknown names: ${missing.length}\n`);

  if (missing.length === 0) {
    console.log('All records have player names!');
    return;
  }

  console.log('Missing names:');
  missing.forEach(r => {
    console.log(`  ${r.event_date} | Pos ${r.position} | "${r.player_name || 'NULL'}" | ID: ${r.player_id}`);
  });

  // Try to fix by looking up names from user_profiles or rounds
  console.log('\n' + '='.repeat(70));
  console.log('ATTEMPTING TO FIX MISSING NAMES');
  console.log('='.repeat(70));

  let fixed = 0;

  for (const result of missing) {
    // Try user_profiles first
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('name, display_name')
      .eq('line_user_id', result.player_id)
      .single();

    let newName = null;

    if (profile) {
      newName = profile.display_name || profile.name;
      console.log(`\n[${result.player_id.substring(0, 15)}...] Found in user_profiles: "${newName}"`);
    }

    // If not found, try rounds table
    if (!newName) {
      const { data: round } = await supabase
        .from('rounds')
        .select('player_name')
        .eq('golfer_id', result.player_id)
        .not('player_name', 'is', null)
        .limit(1)
        .single();

      if (round && round.player_name) {
        newName = round.player_name;
        console.log(`\n[${result.player_id.substring(0, 15)}...] Found in rounds: "${newName}"`);
      }
    }

    if (newName) {
      // Update the record
      const { error } = await supabase
        .from('event_results')
        .update({ player_name: newName })
        .eq('id', result.id);

      if (error) {
        console.log(`   ERROR: ${error.message}`);
      } else {
        console.log(`   ✅ Updated to: "${newName}"`);
        fixed++;
      }
    } else {
      console.log(`\n[${result.player_id}] ❌ No name found in user_profiles or rounds`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));
  console.log(`Fixed: ${fixed}/${missing.length} records`);

  // Show final state
  console.log('\n=== FINAL 2026 STANDINGS ===');
  const { data: final } = await supabase
    .from('event_results')
    .select('player_id, player_name, points_earned')
    .gte('event_date', '2026-01-01');

  // Aggregate
  const totals = {};
  final?.forEach(r => {
    if (!totals[r.player_id]) {
      totals[r.player_id] = { name: r.player_name, points: 0 };
    }
    totals[r.player_id].points += (r.points_earned || 0);
    // Update name if we have a better one
    if (r.player_name && r.player_name !== 'Unknown') {
      totals[r.player_id].name = r.player_name;
    }
  });

  const sorted = Object.entries(totals)
    .sort((a, b) => b[1].points - a[1].points);

  sorted.forEach(([id, data], i) => {
    console.log(`${i + 1}. ${data.name || 'STILL UNKNOWN'} | ${data.points} pts`);
  });
}

fixMissingNames().catch(console.error);
