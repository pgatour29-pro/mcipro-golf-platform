// Check society membership status for Rocky Jones54
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://pyeeplwsnupmhgbguwqs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkSocietyMembership() {
  console.log('🔍 Checking society membership for Rocky Jones54...\n');

  const rockyJones54Id = 'U044fd835263fc6c0c596cf1d6c2414af';
  const deletedGuestId = 'TRGG-GUEST-0474';

  // Check Rocky Jones54's current memberships
  const { data: currentMemberships, error: currentError } = await supabase
    .from('society_members')
    .select('*')
    .eq('golfer_id', rockyJones54Id);

  if (currentError) {
    console.error('❌ Error checking current memberships:', currentError);
  } else {
    console.log(`✅ Rocky Jones54 current memberships: ${currentMemberships?.length || 0}`);
    if (currentMemberships && currentMemberships.length > 0) {
      currentMemberships.forEach(m => {
        console.log(`   • Society: ${m.society_name}, Status: ${m.status}, Since: ${m.joined_date}`);
      });
    }
  }

  // Check if there are any orphaned memberships from the deleted guest account
  const { data: orphanedMemberships, error: orphanedError } = await supabase
    .from('society_members')
    .select('*')
    .eq('golfer_id', deletedGuestId);

  if (orphanedError) {
    console.error('\n❌ Error checking orphaned memberships:', orphanedError);
  } else {
    console.log(`\n🔍 Orphaned memberships from deleted account: ${orphanedMemberships?.length || 0}`);
    if (orphanedMemberships && orphanedMemberships.length > 0) {
      console.log('\n⚠️ Found orphaned membership records:');
      orphanedMemberships.forEach((m, index) => {
        console.log(`\n${index + 1}. Society: ${m.society_name}`);
        console.log(`   Organizer ID: ${m.organizer_id}`);
        console.log(`   Member Number: ${m.member_number}`);
        console.log(`   Status: ${m.status}`);
        console.log(`   Joined: ${m.joined_date}`);
        console.log(`   Division: ${m.division || 'None'}`);
      });

      console.log('\n💡 Recommendation:');
      console.log('These membership records should be either:');
      console.log('1. Deleted (if Rocky Jones54 already has membership in same society)');
      console.log('2. Migrated to Rocky Jones54 (if Rocky Jones54 should inherit this membership)');
    } else {
      console.log('✅ No orphaned memberships found. The deletion was clean.');
    }
  }

  // Check event registrations
  const { data: orphanedRegistrations, error: regError } = await supabase
    .from('event_registrations')
    .select('*')
    .eq('player_id', deletedGuestId);

  if (regError) {
    console.error('\n❌ Error checking orphaned registrations:', regError);
  } else {
    console.log(`\n🔍 Orphaned event registrations from deleted account: ${orphanedRegistrations?.length || 0}`);
    if (orphanedRegistrations && orphanedRegistrations.length > 0) {
      console.log('⚠️ Found orphaned event registration records - these may need migration');
    }
  }

  // Check rounds
  const { data: orphanedRounds, error: roundsError } = await supabase
    .from('rounds')
    .select('*')
    .eq('golfer_id', deletedGuestId);

  if (roundsError) {
    console.error('\n❌ Error checking orphaned rounds:', roundsError);
  } else {
    console.log(`🔍 Orphaned rounds from deleted account: ${orphanedRounds?.length || 0}`);
    if (orphanedRounds && orphanedRounds.length > 0) {
      console.log('⚠️ Found orphaned round records - these may need migration');
    }
  }
}

checkSocietyMembership().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
