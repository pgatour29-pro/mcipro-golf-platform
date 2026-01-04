const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://pyeeplwsnupmhgbguwqs.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTg0MzY2OSwiZXhwIjoyMDc1NDE5NjY5fQ.yz1WTV7h_qpaJu3kQ0pEKHMF3rw-_fSLmdne_3Rb6Yc');

(async () => {
  // Get one round to see columns
  const { data: sample, error } = await supabase.from('rounds')
    .select('*')
    .limit(1)
    .single();

  if (error) {
    console.log('Error:', error.message);
    return;
  }

  console.log('Round columns:', Object.keys(sample));

  // Get December 2025 rounds
  const { data: rounds } = await supabase.from('rounds')
    .select('*')
    .gte('created_at', '2025-12-01')
    .order('created_at', { ascending: false })
    .limit(20);

  console.log('\nDecember 2025 rounds:', rounds ? rounds.length : 0);

  if (rounds && rounds.length > 0) {
    for (const r of rounds) {
      // Get golfer name
      const { data: profile } = await supabase.from('user_profiles')
        .select('name')
        .eq('line_user_id', r.golfer_id)
        .single();

      console.log('\n' + (profile?.name || r.golfer_id));
      console.log('  playing_handicap:', r.playing_handicap);
      console.log('  handicap_index:', r.handicap_index);
      console.log('  date:', r.created_at);
    }
  }
})();
