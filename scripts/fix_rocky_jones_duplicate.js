// Fix Rocky Jones duplicate user issue
// Delete "Rocky Jones" (+1.5 HCP) and update "Rocky Jones54" to have +1.5 HCP

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://pyeeplwsnupmhgbguwqs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function fixRockyJonesDuplicate() {
  console.log('🔍 Searching for Rocky Jones users...\n');

  // Step 1: Find all Rocky Jones users (including "Jones, Rocky" format)
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
    console.log('⚠️ No Rocky Jones users found');
    return;
  }

  console.log(`✅ Found ${users.length} Rocky Jones user(s):\n`);

  // Display all users
  users.forEach((user, index) => {
    const handicap = user.profile_data?.golfInfo?.handicap || 'No handicap';
    console.log(`${index + 1}. Name: "${user.name}"`);
    console.log(`   LINE User ID: ${user.line_user_id}`);
    console.log(`   Handicap: ${handicap}`);
    console.log(`   Created: ${user.created_at}`);
    console.log('');
  });

  // Step 2: Identify which user to delete and which to keep
  let userToDelete = null;
  let userToUpdate = null;
  let targetHandicap = null;

  users.forEach(user => {
    const handicap = user.profile_data?.golfInfo?.handicap;

    // Check if this is a guest account (TRGG-GUEST) or "Jones, Rocky" with handicap
    if ((user.line_user_id.includes('GUEST') || user.name.includes('Jones, Rocky')) && handicap && handicap !== 0) {
      // This is the guest account with +1.5 HCP - DELETE
      userToDelete = user;
      targetHandicap = handicap;
    } else if (user.name === 'Rocky Jones54' && user.line_user_id.startsWith('U0')) {
      // This is "Rocky Jones54" with proper LINE ID - KEEP and UPDATE
      userToUpdate = user;
    }
  });

  if (!userToDelete) {
    console.log('⚠️ Could not identify user to delete (Rocky Jones with handicap)');
    return;
  }

  if (!userToUpdate) {
    console.log('⚠️ Could not identify user to update (Rocky Jones54)');
    return;
  }

  if (!targetHandicap) {
    console.log('⚠️ No handicap found to transfer');
    return;
  }

  console.log('📋 Action Plan:');
  console.log(`  • DELETE: "${userToDelete.name}" (${userToDelete.line_user_id}) with handicap ${targetHandicap}`);
  console.log(`  • UPDATE: "${userToUpdate.name}" (${userToUpdate.line_user_id}) to have handicap ${targetHandicap}`);
  console.log('');

  // Step 3: Update Rocky Jones54 to have the handicap
  console.log(`⚙️ Updating "${userToUpdate.name}" to have handicap ${targetHandicap}...`);

  const updatedProfileData = {
    ...userToUpdate.profile_data,
    golfInfo: {
      ...(userToUpdate.profile_data?.golfInfo || {}),
      handicap: targetHandicap
    }
  };

  const { error: updateError } = await supabase
    .from('user_profiles')
    .update({ profile_data: updatedProfileData })
    .eq('line_user_id', userToUpdate.line_user_id);

  if (updateError) {
    console.error('❌ Error updating user:', updateError);
    return;
  }

  console.log(`✅ Successfully updated "${userToUpdate.name}" to have handicap ${targetHandicap}\n`);

  // Step 4: Check for related data before deletion
  console.log(`🔍 Checking for related data for "${userToDelete.name}"...`);

  // Check society_members
  const { data: societyMembers, error: societyError } = await supabase
    .from('society_members')
    .select('*')
    .eq('golfer_id', userToDelete.line_user_id);

  if (societyError) {
    console.warn('⚠️ Error checking society_members:', societyError);
  } else if (societyMembers && societyMembers.length > 0) {
    console.log(`   • Found ${societyMembers.length} society membership(s)`);
  }

  // Check event_registrations
  const { data: eventRegs, error: eventError } = await supabase
    .from('event_registrations')
    .select('*')
    .eq('player_id', userToDelete.line_user_id);

  if (eventError) {
    console.warn('⚠️ Error checking event_registrations:', eventError);
  } else if (eventRegs && eventRegs.length > 0) {
    console.log(`   • Found ${eventRegs.length} event registration(s)`);
  }

  // Check rounds
  const { data: rounds, error: roundsError } = await supabase
    .from('rounds')
    .select('*')
    .eq('golfer_id', userToDelete.line_user_id);

  if (roundsError) {
    console.warn('⚠️ Error checking rounds:', roundsError);
  } else if (rounds && rounds.length > 0) {
    console.log(`   • Found ${rounds.length} round(s)`);
  }

  const hasRelatedData = (societyMembers?.length || 0) + (eventRegs?.length || 0) + (rounds?.length || 0) > 0;

  if (hasRelatedData) {
    console.log('\n⚠️ User has related data. These records will become orphaned or may cause foreign key errors.');
    console.log('   Consider migrating this data to the kept user before deletion.');
  } else {
    console.log('\n✅ No related data found - safe to delete.');
  }

  // Step 5: Delete the duplicate user
  console.log(`\n🗑️ Deleting "${userToDelete.name}" (${userToDelete.line_user_id})...`);

  const { error: deleteError } = await supabase
    .from('user_profiles')
    .delete()
    .eq('line_user_id', userToDelete.line_user_id);

  if (deleteError) {
    console.error('❌ Error deleting user:', deleteError);
    return;
  }

  console.log(`✅ Successfully deleted "${userToDelete.name}"\n`);

  // Step 6: Verify the fix
  console.log('✅ Verifying changes...\n');

  const { data: verifyUsers, error: verifyError } = await supabase
    .from('user_profiles')
    .select('line_user_id, name, profile_data')
    .ilike('name', '%rocky%');

  if (verifyError) {
    console.error('❌ Error verifying:', verifyError);
    return;
  }

  console.log(`Final result: ${verifyUsers.length} Rocky Jones user(s) remaining:\n`);

  verifyUsers.forEach((user, index) => {
    const handicap = user.profile_data?.golfInfo?.handicap || 'No handicap';
    console.log(`${index + 1}. Name: "${user.name}"`);
    console.log(`   LINE User ID: ${user.line_user_id}`);
    console.log(`   Handicap: ${handicap}`);
    console.log('');
  });

  console.log('✅ Fix complete!\n');
  console.log('📝 Summary:');
  console.log(`   • Deleted: "Rocky Jones" with +1.5 handicap`);
  console.log(`   • Updated: "Rocky Jones54" now has +1.5 handicap`);
  console.log(`   • Remaining users: ${verifyUsers.length}`);
}

// Run the fix
fixRockyJonesDuplicate().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
