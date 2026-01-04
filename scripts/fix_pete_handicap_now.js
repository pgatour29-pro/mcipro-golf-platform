const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://pyeeplwsnupmhgbguwqs.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTg0MzY2OSwiZXhwIjoyMDc1NDE5NjY5fQ.yz1WTV7h_qpaJu3kQ0pEKHMF3rw-_fSLmdne_3Rb6Yc');

const PETE_ID = 'U2b6d976f19bca4b2f4374ae0e10ed873';
const TRGG_ID = '7c0e4b72-d925-44bc-afda-38259a7ba346';

async function fixPete() {
  console.log('=== FIXING PETE PARK HANDICAP ===\n');

  // 1. Check Pete's current society_handicaps records
  console.log('1. Checking Pete\'s current society_handicaps records...');
  const { data: existingHcps } = await supabase
    .from('society_handicaps')
    .select('*')
    .eq('golfer_id', PETE_ID);

  console.log('Existing records:', existingHcps?.length || 0);
  for (const h of existingHcps || []) {
    console.log(' -', h.society_id || 'Universal', ':', h.handicap_index);
  }

  // 2. Calculate handicaps using the working RPC
  console.log('\n2. Calculating handicaps via RPC...');

  // Universal handicap
  const { data: universalCalc, error: uErr } = await supabase.rpc('calculate_society_handicap_index', {
    p_golfer_id: PETE_ID,
    p_society_id: null
  });

  if (uErr) {
    console.log('Universal calc error:', uErr);
  } else {
    console.log('Universal handicap calculated:', universalCalc?.new_handicap_index);
    console.log('  Diffs:', universalCalc?.all_differentials);
    console.log('  Best:', universalCalc?.best_differentials);
  }

  // TRGG handicap
  const { data: trggCalc, error: tErr } = await supabase.rpc('calculate_society_handicap_index', {
    p_golfer_id: PETE_ID,
    p_society_id: TRGG_ID
  });

  if (tErr) {
    console.log('TRGG calc error:', tErr);
  } else {
    console.log('\nTRGG handicap calculated:', trggCalc?.new_handicap_index);
    console.log('  Diffs:', trggCalc?.all_differentials);
    console.log('  Best:', trggCalc?.best_differentials);
    console.log('  Rounds used:', trggCalc?.rounds_used);
  }

  // 3. Insert/Update society_handicaps
  console.log('\n3. Updating society_handicaps table...');

  // Universal (society_id = NULL)
  if (universalCalc?.new_handicap_index !== undefined) {
    const { error: upsertErr } = await supabase
      .from('society_handicaps')
      .upsert({
        golfer_id: PETE_ID,
        society_id: null,
        handicap_index: universalCalc.new_handicap_index,
        rounds_count: universalCalc.rounds_used,
        last_calculated_at: new Date().toISOString(),
        calculation_method: 'WHS-5',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'golfer_id,society_id'
      });

    if (upsertErr) {
      console.log('Universal upsert error:', upsertErr);
    } else {
      console.log('Universal handicap set to:', universalCalc.new_handicap_index);
    }
  }

  // TRGG
  if (trggCalc?.new_handicap_index !== undefined) {
    const { error: upsertErr } = await supabase
      .from('society_handicaps')
      .upsert({
        golfer_id: PETE_ID,
        society_id: TRGG_ID,
        handicap_index: trggCalc.new_handicap_index,
        rounds_count: trggCalc.rounds_used,
        last_calculated_at: new Date().toISOString(),
        calculation_method: 'WHS-5',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'golfer_id,society_id'
      });

    if (upsertErr) {
      console.log('TRGG upsert error:', upsertErr);
    } else {
      console.log('TRGG handicap set to:', trggCalc.new_handicap_index);
    }
  }

  // 4. Update user_profiles
  console.log('\n4. Updating user_profiles...');
  const newUniversalHcp = universalCalc?.new_handicap_index;

  if (newUniversalHcp !== undefined) {
    // First get current profile_data
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('profile_data')
      .eq('line_user_id', PETE_ID)
      .single();

    const newProfileData = {
      ...(profile?.profile_data || {}),
      handicap: newUniversalHcp,
      golfInfo: {
        ...(profile?.profile_data?.golfInfo || {}),
        handicap: newUniversalHcp
      }
    };

    const { error: upErr } = await supabase
      .from('user_profiles')
      .update({
        handicap_index: newUniversalHcp,
        profile_data: newProfileData,
        updated_at: new Date().toISOString()
      })
      .eq('line_user_id', PETE_ID);

    if (upErr) {
      console.log('Profile update error:', upErr);
    } else {
      console.log('Profile updated: handicap_index =', newUniversalHcp);
      console.log('Profile updated: profile_data.handicap =', newUniversalHcp);
      console.log('Profile updated: profile_data.golfInfo.handicap =', newUniversalHcp);
    }
  }

  // 5. Verify
  console.log('\n5. Verifying updates...');

  const { data: finalProfile } = await supabase
    .from('user_profiles')
    .select('handicap_index, profile_data')
    .eq('line_user_id', PETE_ID)
    .single();

  console.log('user_profiles.handicap_index:', finalProfile?.handicap_index);
  console.log('profile_data.handicap:', finalProfile?.profile_data?.handicap);
  console.log('profile_data.golfInfo.handicap:', finalProfile?.profile_data?.golfInfo?.handicap);

  const { data: finalSocHcps } = await supabase
    .from('society_handicaps')
    .select('society_id, handicap_index')
    .eq('golfer_id', PETE_ID);

  console.log('\nsociety_handicaps:');
  for (const h of finalSocHcps || []) {
    console.log(' -', h.society_id || 'Universal', ':', h.handicap_index);
  }

  console.log('\n=== DONE ===');
}

fixPete().catch(console.error);
