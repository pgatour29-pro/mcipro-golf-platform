// Migrate orphaned society membership to Rocky Jones54
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://pyeeplwsnupmhgbguwqs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function migrateMembership() {
  console.log('🔄 Migrating orphaned society membership to Rocky Jones54...\n');

  const rockyJones54Id = 'U044fd835263fc6c0c596cf1d6c2414af';
  const deletedGuestId = 'TRGG-GUEST-0474';

  // Get the orphaned membership
  const { data: orphanedMemberships, error: fetchError } = await supabase
    .from('society_members')
    .select('*')
    .eq('golfer_id', deletedGuestId);

  if (fetchError) {
    console.error('❌ Error fetching orphaned memberships:', fetchError);
    return;
  }

  if (!orphanedMemberships || orphanedMemberships.length === 0) {
    console.log('✅ No orphaned memberships to migrate');
    return;
  }

  console.log(`Found ${orphanedMemberships.length} orphaned membership(s)\n`);

  for (const membership of orphanedMemberships) {
    console.log(`📝 Migrating membership:`);
    console.log(`   Society: ${membership.society_name || 'Unknown'}`);
    console.log(`   Member Number: ${membership.member_number}`);
    console.log(`   Status: ${membership.status}`);
    console.log(`   FROM: ${deletedGuestId}`);
    console.log(`   TO: ${rockyJones54Id}`);

    // Update the golfer_id to point to Rocky Jones54
    const { error: updateError } = await supabase
      .from('society_members')
      .update({
        golfer_id: rockyJones54Id
      })
      .eq('golfer_id', deletedGuestId)
      .eq('member_number', membership.member_number);

    if (updateError) {
      console.error(`\n❌ Error migrating membership ${membership.member_number}:`, updateError);
    } else {
      console.log(`\n✅ Successfully migrated membership ${membership.member_number}`);
    }
  }

  // Verify migration
  console.log('\n🔍 Verifying migration...\n');

  const { data: newMemberships, error: verifyError } = await supabase
    .from('society_members')
    .select('*')
    .eq('golfer_id', rockyJones54Id);

  if (verifyError) {
    console.error('❌ Error verifying migration:', verifyError);
  } else {
    console.log(`✅ Rocky Jones54 now has ${newMemberships?.length || 0} society membership(s):`);
    if (newMemberships && newMemberships.length > 0) {
      newMemberships.forEach(m => {
        console.log(`   • Society: ${m.society_name || 'Unknown'}`);
        console.log(`     Member #: ${m.member_number}, Status: ${m.status}`);
      });
    }
  }

  // Check for any remaining orphaned records
  const { data: remaining, error: remainingError } = await supabase
    .from('society_members')
    .select('*')
    .eq('golfer_id', deletedGuestId);

  if (remainingError) {
    console.error('\n❌ Error checking remaining orphaned records:', remainingError);
  } else {
    console.log(`\n🔍 Orphaned records remaining: ${remaining?.length || 0}`);
    if (remaining && remaining.length > 0) {
      console.log('⚠️ Some records were not migrated - manual intervention may be needed');
    } else {
      console.log('✅ All memberships successfully migrated!');
    }
  }

  console.log('\n✅ Migration complete!');
}

migrateMembership().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
