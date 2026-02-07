const SUPABASE_URL = 'https://pyeeplwsnupmhgbguwqs.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk';

async function testInsert() {
  // Simulate EXACTLY what saveRoundToHistory does for Pete Park
  const testRound = {
    golfer_id: 'TEST-DELETE-ME',
    course_id: 'burapha',
    course_name: 'Burapha Golf Club (A+B)',
    type: 'practice',
    society_event_id: null,
    primary_society_id: null,
    organizer_id: null,
    played_at: new Date().toISOString(),
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    status: 'completed',
    total_gross: 76,
    total_net: null,
    total_stableford: 35,
    handicap_used: 1.9,
    tee_marker: 'white',
    course_rating: 72.0,
    slope_rating: 113,
    game_config: { formats: ['stableford'], points: {}, scramble: null },
    format_scores: { stableford: 35 }
  };

  console.log('Testing canonical insert...');
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/rounds`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(testRound)
  });

  const text = await resp.text();
  console.log('Status:', resp.status);
  console.log('Response:', text);

  if (resp.ok) {
    // Clean up test data
    const data = JSON.parse(text);
    const id = Array.isArray(data) ? data[0].id : data.id;
    console.log('SUCCESS! Cleaning up test round:', id);
    await fetch(`${SUPABASE_URL}/rest/v1/rounds?id=eq.${id}`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    console.log('Test round deleted');
  }
}

testInsert().catch(console.error);
