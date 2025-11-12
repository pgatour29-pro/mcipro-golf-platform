// Search for all Rocky Jones users more broadly
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://pyeeplwsnupmhgbguwqs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function searchRockyJones() {
  console.log('🔍 Searching for all users with "rocky" in name...\n');

  // Search case-insensitive for "rocky"
  const { data: users, error } = await supabase
    .from('user_profiles')
    .select('line_user_id, name, profile_data, created_at')
    .ilike('name', '%rocky%')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ Error querying users:', error);
    return;
  }

  if (!users || users.length === 0) {
    console.log('⚠️ No users found with "rocky" in name');
    return;
  }

  console.log(`✅ Found ${users.length} user(s) with "rocky" in name:\n`);

  users.forEach((user, index) => {
    const handicap = user.profile_data?.golfInfo?.handicap;
    const handicapStr = handicap !== undefined && handicap !== null ? handicap : 'No handicap';

    console.log(`${index + 1}. Name: "${user.name}" (length: ${user.name.length} chars)`);
    console.log(`   LINE User ID: ${user.line_user_id}`);
    console.log(`   Handicap: ${handicapStr}`);
    console.log(`   Created: ${user.created_at}`);
    console.log(`   Full profile_data.golfInfo:`, JSON.stringify(user.profile_data?.golfInfo || {}, null, 2));
    console.log('');
  });

  // Also check by looking at the exact name bytes
  console.log('\n📋 Name analysis:');
  users.forEach((user, index) => {
    console.log(`${index + 1}. Name bytes: [${Array.from(user.name).map(c => c.charCodeAt(0)).join(', ')}]`);
    console.log(`   Name repr: "${user.name}"`);
    console.log(`   Trimmed: "${user.name.trim()}"`);
    console.log('');
  });
}

searchRockyJones().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
