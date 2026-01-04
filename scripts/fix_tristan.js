const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://pyeeplwsnupmhgbguwqs.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTg0MzY2OSwiZXhwIjoyMDc1NDE5NjY5fQ.yz1WTV7h_qpaJu3kQ0pEKHMF3rw-_fSLmdne_3Rb6Yc');

(async () => {
  const lineId = 'U533f2301ff76d319e0086e8340e4051c';
  const societyId = '7c0e4b72-d925-44bc-afda-38259a7ba346';

  // Add to society_members
  const { error: memberError } = await supabase.from('society_members').upsert({
    golfer_id: lineId,
    society_id: societyId,
    status: 'active'
  }, { onConflict: 'golfer_id,society_id' });

  if (memberError) console.log('Member error:', memberError.message);
  else console.log('Added Tristan to society_members');

  // Add to society_handicaps
  const { error: hcpError } = await supabase.from('society_handicaps').upsert({
    golfer_id: lineId,
    society_id: societyId,
    handicap_index: 11.6,
    calculation_method: 'MANUAL',
    last_calculated_at: new Date().toISOString()
  }, { onConflict: 'golfer_id,society_id' });

  if (hcpError) console.log('Handicap error:', hcpError.message);
  else console.log('Added Tristan handicap: 11.6');

  // Update profile_data
  const { data: profile } = await supabase.from('user_profiles')
    .select('profile_data')
    .eq('line_user_id', lineId)
    .single();

  const updatedData = profile && profile.profile_data ? profile.profile_data : {};
  updatedData.handicap = '11.6';
  if (!updatedData.golfInfo) {
    updatedData.golfInfo = {};
  }
  updatedData.golfInfo.handicap = '11.6';
  updatedData.golfInfo.lastHandicapUpdate = new Date().toISOString();

  const { error: profileError } = await supabase.from('user_profiles')
    .update({ profile_data: updatedData })
    .eq('line_user_id', lineId);

  if (profileError) console.log('Profile error:', profileError.message);
  else console.log('Updated Tristan profile: 11.6');

  // Verify
  const { data: verify } = await supabase.from('user_profiles')
    .select('profile_data')
    .eq('line_user_id', lineId)
    .single();
  console.log('Verified:', verify.profile_data.handicap);
})();
