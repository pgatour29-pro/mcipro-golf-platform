const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://pyeeplwsnupmhgbguwqs.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTg0MzY2OSwiZXhwIjoyMDc1NDE5NjY5fQ.yz1WTV7h_qpaJu3kQ0pEKHMF3rw-_fSLmdne_3Rb6Yc');

const PETE_ID = 'U2b6d976f19bca4b2f4374ae0e10ed873';

async function diagnose() {
  console.log('=== ROUNDS DIAGNOSIS ===\n');

  // Get all Pete's rounds with full data
  const { data: rounds, error } = await supabase
    .from('rounds')
    .select('*')
    .eq('golfer_id', PETE_ID)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.log('Error:', error);
    return;
  }

  console.log('Found', rounds?.length, 'rounds for Pete\n');

  for (const r of rounds || []) {
    console.log('---');
    console.log('ID:', r.id);
    console.log('Status:', r.status);
    console.log('Total Gross:', r.total_gross);
    console.log('Course ID:', r.course_id);
    console.log('Tee Marker:', r.tee_marker);
    console.log('Primary Society:', r.primary_society_id);
    console.log('Created:', r.created_at);
    console.log('Completed:', r.completed_at);

    // Check if course exists
    if (r.course_id) {
      const { data: course } = await supabase
        .from('courses')
        .select('id, name, tees')
        .eq('id', r.course_id)
        .single();

      if (course) {
        console.log('Course Name:', course.name);
        console.log('Available Tees:', course.tees?.map(t => t.name).join(', ') || 'none');
      } else {
        console.log('Course NOT FOUND in database!');
      }
    }
  }

  // Check rounds table schema
  console.log('\n\n=== CHECKING ALL ROUNDS WITH MISSING DATA ===');
  const { data: allRounds, count } = await supabase
    .from('rounds')
    .select('*', { count: 'exact' })
    .eq('status', 'completed');

  let missingTee = 0;
  let missingCourse = 0;
  let missingSociety = 0;

  for (const r of allRounds || []) {
    if (!r.tee_marker) missingTee++;
    if (!r.course_id) missingCourse++;
    if (!r.primary_society_id) missingSociety++;
  }

  console.log('Total completed rounds:', count);
  console.log('Missing tee_marker:', missingTee);
  console.log('Missing course_id:', missingCourse);
  console.log('Missing primary_society_id:', missingSociety);

  // Check courses table
  console.log('\n\n=== COURSES TABLE ===');
  const { data: courses } = await supabase
    .from('courses')
    .select('id, name')
    .limit(10);

  console.log('Sample courses:');
  for (const c of courses || []) {
    console.log(' -', c.id, ':', c.name);
  }

  // Check society_profiles table
  console.log('\n\n=== SOCIETY_PROFILES TABLE ===');
  const { data: societies } = await supabase
    .from('society_profiles')
    .select('id, name, society_name');

  if (!societies || societies.length === 0) {
    console.log('NO SOCIETIES FOUND!');
  } else {
    for (const s of societies) {
      console.log(' -', s.id, ':', s.name || s.society_name);
    }
  }

  // Check if there's a profiles table (different from user_profiles)
  console.log('\n\n=== CHECKING profiles TABLE ===');
  const { data: profiles, error: profErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('line_user_id', PETE_ID)
    .single();

  if (profErr) {
    console.log('profiles table error:', profErr.message);
  } else {
    console.log('Pete in profiles table:');
    console.log('  handicap:', profiles?.handicap);
    console.log('  profile_data:', JSON.stringify(profiles?.profile_data, null, 2));
  }
}

diagnose().catch(console.error);
