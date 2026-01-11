// CORRECT Supabase URL: pyeeplwsnupmhgbguwqs.supabase.co
// DO NOT USE: bptodqfwmnbmprqqyrcc.supabase.co (OLD/WRONG)

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://pyeeplwsnupmhgbguwqs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk'
);

(async () => {
  try {
    const { data: profiles, error: e1 } = await supabase.from('user_profiles').select('line_user_id, name, handicap_index, profile_data').order('name');
    const { data: handicaps, error: e2 } = await supabase.from('society_handicaps').select('golfer_id, society_id, handicap_index');

    if (e1) { console.error('Profile error:', e1); return; }
    if (e2) { console.error('Handicap error:', e2); return; }

    console.log('=== ALL USER HANDICAPS ===\n');
    for (const p of profiles || []) {
      if (!p.line_user_id) continue;
      const profileHcp = p.profile_data?.golfInfo?.handicap || p.profile_data?.handicap || 'NONE';
      const hcpIndex = p.handicap_index ?? 'NONE';
      const userHcps = (handicaps || []).filter(h => h.golfer_id === p.line_user_id);
      const universal = userHcps.find(h => h.society_id === null);
      const society = userHcps.filter(h => h.society_id !== null);

      console.log(p.name + ':');
      console.log('  handicap_index column: ' + hcpIndex);
      console.log('  profile_data.handicap: ' + (p.profile_data?.handicap || 'NONE'));
      console.log('  profile_data.golfInfo.handicap: ' + (p.profile_data?.golfInfo?.handicap || 'NONE'));
      console.log('  Universal (society_handicaps): ' + (universal ? universal.handicap_index : 'NONE'));
      if (society.length > 0) {
        society.forEach(s => console.log('  Society ' + s.society_id.substring(0,8) + ': ' + s.handicap_index));
      }
      console.log('');
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
