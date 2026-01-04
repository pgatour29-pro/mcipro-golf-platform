const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://pyeeplwsnupmhgbguwqs.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTg0MzY2OSwiZXhwIjoyMDc1NDE5NjY5fQ.yz1WTV7h_qpaJu3kQ0pEKHMF3rw-_fSLmdne_3Rb6Yc');

const PETE_ID = 'U2b6d976f19bca4b2f4374ae0e10ed873';

(async () => {
    console.log('=== PETE PARK HANDICAP CHECK ===\n');

    const { data: profile, error: profErr } = await supabase
        .from('user_profiles')
        .select('handicap_index, profile_data')
        .eq('line_user_id', PETE_ID)
        .single();

    if (profErr) {
        console.log('Error:', profErr);
    } else {
        console.log('user_profiles.handicap_index:', profile?.handicap_index);
        console.log('profile_data.handicap:', profile?.profile_data?.handicap);
        console.log('profile_data.golfInfo.handicap:', profile?.profile_data?.golfInfo?.handicap);
    }

    const { data: hcps } = await supabase
        .from('society_handicaps')
        .select('*')
        .eq('golfer_id', PETE_ID);

    console.log('\nsociety_handicaps:');
    for (const h of hcps || []) {
        console.log('  ', h.society_id || 'UNIVERSAL', ':', h.handicap_index);
    }

    // Search for any value of 1.0 or -1 in profile_data
    console.log('\nSearching for 1.0 or -1 in profile_data...');
    const pdStr = JSON.stringify(profile?.profile_data || {});
    if (pdStr.includes('1.0') || pdStr.includes('-1')) {
        console.log('FOUND! Profile data contains 1.0 or -1');
        console.log('Full profile_data:', pdStr);
    } else {
        console.log('No 1.0 or -1 found in profile_data');
    }

    process.exit(0);
})();
