const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://pyeeplwsnupmhgbguwqs.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTg0MzY2OSwiZXhwIjoyMDc1NDE5NjY5fQ.yz1WTV7h_qpaJu3kQ0pEKHMF3rw-_fSLmdne_3Rb6Yc');

const PETE_ID = 'U2b6d976f19bca4b2f4374ae0e10ed873';

async function check() {
  console.log('=== PETE PARK HANDICAP DIAGNOSIS ===\n');

  // 1. Check user_profiles (line_user_id is primary key)
  const { data: profile, error: profErr } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('line_user_id', PETE_ID)
    .single();

  if (profErr) {
    console.log('Profile error:', profErr);
  } else {
    console.log('=== USER_PROFILES ===');
    console.log('Name:', profile?.name || profile?.display_name);
    console.log('handicap_index column:', profile?.handicap_index);
    console.log('profile_data.handicap:', profile?.profile_data?.handicap);
    console.log('profile_data.golfInfo.handicap:', profile?.profile_data?.golfInfo?.handicap);
  }

  // 2. Check society_handicaps
  const { data: socHcps } = await supabase
    .from('society_handicaps')
    .select('society_id, handicap_index, last_updated')
    .eq('golfer_id', PETE_ID);

  console.log('\n=== SOCIETY_HANDICAPS ===');
  if (!socHcps || socHcps.length === 0) {
    console.log('NO SOCIETY HANDICAPS FOUND!');
  }
  for (const sh of socHcps || []) {
    let socName = 'Universal (null)';
    if (sh.society_id) {
      const { data: soc } = await supabase.from('society_profiles').select('name').eq('id', sh.society_id).single();
      socName = soc?.name || sh.society_id;
    }
    console.log(socName, ':', sh.handicap_index, '- Updated:', sh.last_updated);
  }

  // 3. Check society_members handicap
  const { data: memberships } = await supabase
    .from('society_members')
    .select('society_id, handicap, status')
    .eq('user_id', PETE_ID);

  console.log('\n=== SOCIETY_MEMBERS (handicap field) ===');
  if (!memberships || memberships.length === 0) {
    console.log('No society memberships found');
  }
  for (const m of memberships || []) {
    const { data: soc } = await supabase.from('society_profiles').select('name').eq('id', m.society_id).single();
    console.log(soc?.name || m.society_id, ':', m.handicap, '| Status:', m.status);
  }

  // 4. Check handicap_history (last 15)
  const { data: history } = await supabase
    .from('handicap_history')
    .select('old_handicap, new_handicap, change_reason, society_id, created_at')
    .eq('golfer_id', PETE_ID)
    .order('created_at', { ascending: false })
    .limit(15);

  console.log('\n=== HANDICAP_HISTORY (last 15) ===');
  if (!history || history.length === 0) {
    console.log('NO HANDICAP HISTORY!');
  }
  for (const h of history || []) {
    const socLabel = h.society_id ? h.society_id.substring(0,8) : 'universal';
    console.log(h.created_at, ':', h.old_handicap, '->', h.new_handicap, '|', h.change_reason, '| society:', socLabel);
  }

  // 5. Check last 7 completed rounds
  const { data: rounds } = await supabase
    .from('rounds')
    .select('id, course_id, tee_marker, total_gross, status, primary_society_id, created_at, completed_at')
    .eq('golfer_id', PETE_ID)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(7);

  console.log('\n=== LAST 7 COMPLETED ROUNDS ===');
  if (!rounds || rounds.length === 0) {
    console.log('NO COMPLETED ROUNDS!');
  }
  for (const r of rounds || []) {
    const { data: course } = await supabase.from('courses').select('name, tees').eq('id', r.course_id).single();

    let rating = 72, slope = 113;
    if (course?.tees) {
      const tee = course.tees.find(t => t.name?.toLowerCase() === r.tee_marker?.toLowerCase());
      if (tee) {
        rating = tee.rating || 72;
        slope = tee.slope || 113;
      }
    }

    const diff = ((r.total_gross - rating) * 113 / slope).toFixed(1);
    const socLabel = r.primary_society_id ? r.primary_society_id.substring(0,8) : 'none';

    console.log(r.completed_at?.substring(0,10), ':', (course?.name || 'Unknown').substring(0,20).padEnd(20), '| Gross:', r.total_gross, '| Diff:', diff, '| Tee:', r.tee_marker || 'null', '| Society:', socLabel);
  }

  // 6. Check round_societies links
  if (rounds && rounds.length > 0) {
    console.log('\n=== ROUND_SOCIETIES LINKS ===');
    for (const r of rounds.slice(0, 5)) {
      const { data: links } = await supabase
        .from('round_societies')
        .select('society_id')
        .eq('round_id', r.id);

      const societies = [];
      for (const link of links || []) {
        const { data: soc } = await supabase.from('society_profiles').select('name').eq('id', link.society_id).single();
        societies.push(soc?.name || link.society_id.substring(0,8));
      }
      console.log(r.completed_at?.substring(0,10), ':', societies.join(', ') || 'NO LINKS');
    }
  }

  // 7. Calculate expected handicaps
  console.log('\n=== EXPECTED HANDICAP CALCULATION ===');

  // Get TRGG society ID
  const { data: trgg } = await supabase.from('society_profiles').select('id, name').ilike('name', '%TRGG%').single();
  const trggId = trgg?.id;
  console.log('TRGG Society ID:', trggId, '| Name:', trgg?.name);

  // Also check for "Travellers" name
  if (!trggId) {
    const { data: travellers } = await supabase.from('society_profiles').select('id, name').ilike('name', '%Traveller%').single();
    console.log('Travellers Society:', travellers?.id, '| Name:', travellers?.name);
  }

  // List all societies
  const { data: allSocs } = await supabase.from('society_profiles').select('id, name');
  console.log('\nAll societies:');
  for (const s of allSocs || []) {
    console.log('  -', s.name, ':', s.id.substring(0,8));
  }

  // Get all completed rounds for TRGG (by primary_society_id)
  const { data: trggRounds } = await supabase
    .from('rounds')
    .select('id, total_gross, course_id, tee_marker, completed_at')
    .eq('golfer_id', PETE_ID)
    .eq('status', 'completed')
    .eq('primary_society_id', trggId)
    .order('completed_at', { ascending: false })
    .limit(5);

  console.log('\n\nTRGG rounds (by primary_society_id) - last 5:');
  const trggDiffs = [];
  for (const r of trggRounds || []) {
    const { data: course } = await supabase.from('courses').select('name, tees').eq('id', r.course_id).single();
    let rating = 72, slope = 113;
    if (course?.tees) {
      const tee = course.tees.find(t => t.name?.toLowerCase() === r.tee_marker?.toLowerCase());
      if (tee) { rating = tee.rating || 72; slope = tee.slope || 113; }
    }
    const diff = (r.total_gross - rating) * 113 / slope;
    trggDiffs.push(diff);
    console.log(r.completed_at?.substring(0,10), ':', (course?.name || 'Unknown').substring(0,20).padEnd(20), '| Gross:', r.total_gross, '| Rating:', rating, '| Slope:', slope, '| Diff:', diff.toFixed(1));
  }

  if (trggDiffs.length >= 3) {
    const sorted = [...trggDiffs].sort((a, b) => a - b);
    const best3 = sorted.slice(0, 3);
    const avg = best3.reduce((a, b) => a + b, 0) / 3;
    const expected = (avg * 0.96).toFixed(1);
    console.log('\nBest 3 diffs:', best3.map(d => d.toFixed(1)).join(', '));
    console.log('Average:', avg.toFixed(2), 'x 0.96 = EXPECTED TRGG HCP:', expected);
  } else {
    console.log('\nNot enough TRGG rounds (need 3+), found:', trggRounds?.length || 0);
  }

  // Universal rounds (ALL)
  const { data: allRounds } = await supabase
    .from('rounds')
    .select('id, total_gross, course_id, tee_marker, completed_at')
    .eq('golfer_id', PETE_ID)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(5);

  console.log('\n\nUniversal rounds (ALL) - last 5:');
  const allDiffs = [];
  for (const r of allRounds || []) {
    const { data: course } = await supabase.from('courses').select('name, tees').eq('id', r.course_id).single();
    let rating = 72, slope = 113;
    if (course?.tees) {
      const tee = course.tees.find(t => t.name?.toLowerCase() === r.tee_marker?.toLowerCase());
      if (tee) { rating = tee.rating || 72; slope = tee.slope || 113; }
    }
    const diff = (r.total_gross - rating) * 113 / slope;
    allDiffs.push(diff);
    console.log(r.completed_at?.substring(0,10), ':', (course?.name || 'Unknown').substring(0,20).padEnd(20), '| Gross:', r.total_gross, '| Rating:', rating, '| Slope:', slope, '| Diff:', diff.toFixed(1));
  }

  if (allDiffs.length >= 3) {
    const sorted = [...allDiffs].sort((a, b) => a - b);
    const best3 = sorted.slice(0, 3);
    const avg = best3.reduce((a, b) => a + b, 0) / 3;
    const expected = (avg * 0.96).toFixed(1);
    console.log('\nBest 3 diffs:', best3.map(d => d.toFixed(1)).join(', '));
    console.log('Average:', avg.toFixed(2), 'x 0.96 = EXPECTED UNIVERSAL HCP:', expected);
  }
}

check().catch(console.error);
