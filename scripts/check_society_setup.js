const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://pyeeplwsnupmhgbguwqs.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTg0MzY2OSwiZXhwIjoyMDc1NDE5NjY5fQ.yz1WTV7h_qpaJu3kQ0pEKHMF3rw-_fSLmdne_3Rb6Yc');

async function check() {
  // Check all tables that might contain society data
  const tables = ['society_profiles', 'societies', 'golf_societies'];

  for (const table of tables) {
    console.log(`\n=== Checking ${table} ===`);
    const { data, error } = await supabase.from(table).select('*').limit(10);
    if (error) {
      console.log('Error or table not found:', error.message);
    } else {
      console.log('Found', data?.length, 'records');
      for (const row of data || []) {
        console.log(' -', row);
      }
    }
  }

  // Check the specific society ID from rounds
  const societyId = '7c0e4b72-d925-44bc-afda-38259a7ba346';
  console.log('\n=== Checking society ID:', societyId, '===');

  // Check society_handicaps table exists and structure
  console.log('\n=== society_handicaps table ===');
  const { data: shData, error: shErr } = await supabase.from('society_handicaps').select('*').limit(5);
  if (shErr) {
    console.log('Error:', shErr.message);
  } else {
    console.log('Found', shData?.length, 'records');
    for (const row of shData || []) {
      console.log(' -', row);
    }
  }

  // Check handicap_history table
  console.log('\n=== handicap_history table ===');
  const { data: hhData, error: hhErr } = await supabase.from('handicap_history').select('*').limit(5);
  if (hhErr) {
    console.log('Error:', hhErr.message);
  } else {
    console.log('Found', hhData?.length, 'records');
    for (const row of hhData || []) {
      console.log(' -', row);
    }
  }

  // Check if trigger exists via info_schema (won't work via API, but worth trying)
  console.log('\n=== Checking triggers (via RPC) ===');
  const { data: trigData, error: trigErr } = await supabase.rpc('get_trigger_info');
  if (trigErr) {
    console.log('Cannot check triggers via API:', trigErr.message);
  } else {
    console.log('Triggers:', trigData);
  }

  // Test handicap calculation manually
  console.log('\n=== Testing manual handicap calculation ===');
  const PETE_ID = 'U2b6d976f19bca4b2f4374ae0e10ed873';

  // Call the calculate function if it exists
  const { data: calcData, error: calcErr } = await supabase.rpc('calculate_society_handicap_index', {
    p_golfer_id: PETE_ID,
    p_society_id: null  // Universal handicap
  });

  if (calcErr) {
    console.log('Cannot call calculate function:', calcErr.message);
  } else {
    console.log('Calculation result:', calcData);
  }

  // Check course tee ratings
  console.log('\n=== Course tee ratings sample ===');
  const { data: courses } = await supabase
    .from('courses')
    .select('id, name, tees')
    .in('id', ['bangpakong', 'pattavia', 'royal_lakeside'])
    .limit(3);

  for (const c of courses || []) {
    console.log('\n', c.name);
    for (const tee of c.tees || []) {
      console.log('  ', tee.name, '- Rating:', tee.rating, 'Slope:', tee.slope);
    }
  }
}

check().catch(console.error);
