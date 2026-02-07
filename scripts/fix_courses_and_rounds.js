const SUPABASE_URL = 'https://pyeeplwsnupmhgbguwqs.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk';

async function supaFetch(path, opts = {}) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...opts.headers
    }
  });
  const text = await resp.text();
  if (!resp.ok) {
    console.error(`ERROR ${resp.status}:`, text);
    return null;
  }
  return JSON.parse(text);
}

async function main() {
  // Step 1: Insert missing multi-nine course entries with required name field
  console.log('=== Inserting missing course entries ===');
  const missingCourses = [
    { id: 'burapha', course_code: 'burapha', name: 'Burapha Golf Club', location: 'Chonburi', country: 'Thailand', total_holes: 36, par: 72 },
    { id: 'greenwood', course_code: 'greenwood', name: 'Greenwood Golf & Resort', location: 'Chonburi', country: 'Thailand', total_holes: 27, par: 72 },
    { id: 'khao_kheow', course_code: 'khao_kheow', name: 'Khao Kheow Country Club', location: 'Chonburi', country: 'Thailand', total_holes: 27, par: 72 },
    { id: 'phoenix', course_code: 'phoenix', name: 'Phoenix Gold Golf & Country Club', location: 'Chonburi', country: 'Thailand', total_holes: 27, par: 72 }
  ];

  for (const course of missingCourses) {
    const existing = await supaFetch(`courses?id=eq.${course.id}&select=id`);
    if (existing && existing.length > 0) {
      console.log(`  ${course.id} already exists, skipping`);
      continue;
    }

    const result = await supaFetch('courses', {
      method: 'POST',
      body: JSON.stringify(course)
    });
    if (result) {
      console.log(`  ✅ Inserted ${course.id} (${course.name})`);
    }
  }

  // Step 2: Insert the failed rounds
  console.log('\n=== Inserting failed rounds ===');
  const rounds = [
    {
      golfer_id: 'U2b6d976f19bca4b2f4374ae0e10ed873',
      course_id: 'burapha',
      course_name: 'Burapha Golf Club (A+B)',
      type: 'society',
      society_event_id: 'e492db2e-c76c-4277-bea3-21391a0a5d1e',
      played_at: '2026-01-30T04:00:00.000Z',
      started_at: '2026-01-30T00:41:07.000Z',
      completed_at: '2026-01-30T04:00:00.000Z',
      status: 'completed',
      total_gross: 76,
      total_net: null,
      total_stableford: 35,
      handicap_used: 1.9,
      tee_marker: 'white',
      course_rating: 72.0,
      slope_rating: 113,
      holes_played: 18,
      scoring_formats: ['stableford'],
      format_scores: { stableford: 35 },
      player_name: 'Pete Park'
    },
    {
      golfer_id: 'TRGG-GUEST-0487',
      course_id: 'burapha',
      course_name: 'Burapha Golf Club (A+B)',
      type: 'society',
      society_event_id: 'e492db2e-c76c-4277-bea3-21391a0a5d1e',
      played_at: '2026-01-30T04:00:00.000Z',
      started_at: '2026-01-30T03:57:37.000Z',
      completed_at: '2026-01-30T04:00:00.000Z',
      status: 'completed',
      total_gross: 77,
      total_net: null,
      total_stableford: 31,
      handicap_used: 0,
      tee_marker: 'white',
      course_rating: 72.0,
      slope_rating: 113,
      holes_played: 18,
      scoring_formats: ['stableford'],
      format_scores: { stableford: 31 },
      player_name: 'Jeff Jung'
    }
  ];

  for (const round of rounds) {
    const existing = await supaFetch(`rounds?golfer_id=eq.${round.golfer_id}&played_at=gte.2026-01-30T00:00:00&played_at=lte.2026-01-30T23:59:59&course_id=eq.burapha&select=id`);
    if (existing && existing.length > 0) {
      console.log(`  ${round.player_name} already has a round today, skipping`);
      continue;
    }

    const result = await supaFetch('rounds', {
      method: 'POST',
      body: JSON.stringify(round)
    });
    if (result) {
      const r = Array.isArray(result) ? result[0] : result;
      console.log(`  ✅ ${round.player_name}: round ${r.id} (gross: ${round.total_gross}, stableford: ${round.total_stableford})`);
    }
  }

  // Step 3: Verify
  console.log('\n=== Verification ===');
  const todayRounds = await supaFetch('rounds?played_at=gte.2026-01-30&select=id,golfer_id,player_name,course_name,total_gross,total_stableford');
  if (todayRounds) {
    todayRounds.forEach(r => console.log(`  ${r.player_name || r.golfer_id}: gross=${r.total_gross}, stableford=${r.total_stableford} at ${r.course_name}`));
  }
}

main().catch(console.error);
