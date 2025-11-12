/**
 * Check rounds data and manually trigger handicap calculations
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ccqydamycfekrnobupux.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjcXlkYW15Y2Zla3Jub2J1cHV4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNzg1NjQ4MywiZXhwIjoyMDQzNDMyNDgzfQ.DzmKBZe88Sxr24xgHcYT-cZC1nMJdOygmhtqy5CIdVk';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkRoundsAndHandicaps() {
  console.log('='.repeat(70));
  console.log('CHECKING ROUNDS AND HANDICAP DATA');
  console.log('='.repeat(70));

  try {
    // Check total rounds
    console.log('\n📊 Checking rounds table...');

    const { data: allRounds, error: roundsError } = await supabase
      .from('rounds')
      .select('id, golfer_id, total_gross, course_id, tee_marker, status, completed_at')
      .order('completed_at', { ascending: false })
      .limit(20);

    if (roundsError) {
      console.error('❌ Error fetching rounds:', roundsError.message);
      return;
    }

    console.log(`\n✅ Found ${allRounds.length} recent rounds (showing up to 20)`);

    // Count by status
    const byStatus = {
      completed: allRounds.filter(r => r.status === 'completed').length,
      in_progress: allRounds.filter(r => r.status === 'in_progress').length,
      abandoned: allRounds.filter(r => r.status === 'abandoned').length
    };

    console.log(`   Completed: ${byStatus.completed}`);
    console.log(`   In Progress: ${byStatus.in_progress}`);
    console.log(`   Abandoned: ${byStatus.abandoned}`);

    // Check which have tee_marker data
    const withTeeMarker = allRounds.filter(r => r.tee_marker && r.tee_marker !== null);
    const withoutTeeMarker = allRounds.filter(r => !r.tee_marker || r.tee_marker === null);

    console.log(`\n   With tee_marker: ${withTeeMarker.length}`);
    console.log(`   Without tee_marker: ${withoutTeeMarker.length}`);

    if (withoutTeeMarker.length > 0) {
      console.log('\n⚠️  WARNING: Some rounds missing tee_marker data!');
      console.log('   Handicap calculation requires tee_marker (white, blue, black, etc.)');
      console.log('   These rounds will not be included in handicap calculations.');
    }

    // Show sample rounds
    if (allRounds.length > 0) {
      console.log('\n📋 Sample rounds:');
      allRounds.slice(0, 5).forEach((round, idx) => {
        console.log(`\n${idx + 1}. Round ID: ${round.id}`);
        console.log(`   Golfer: ${round.golfer_id}`);
        console.log(`   Gross: ${round.total_gross || 'N/A'}`);
        console.log(`   Course: ${round.course_id || 'N/A'}`);
        console.log(`   Tee: ${round.tee_marker || '❌ MISSING'}`);
        console.log(`   Status: ${round.status}`);
        console.log(`   Date: ${round.completed_at ? new Date(round.completed_at).toLocaleString() : 'N/A'}`);
      });
    }

    // Get unique golfers
    const uniqueGolfers = [...new Set(allRounds.map(r => r.golfer_id))];
    console.log(`\n\n👥 Unique golfers with rounds: ${uniqueGolfers.length}`);

    // For each golfer, show their rounds
    for (const golferId of uniqueGolfers.slice(0, 3)) {
      const golferRounds = allRounds.filter(r => r.golfer_id === golferId);

      console.log(`\n📍 Golfer: ${golferId}`);
      console.log(`   Total rounds: ${golferRounds.length}`);

      // Get current handicap from user_profiles
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('name, profile_data')
        .eq('line_user_id', golferId)
        .single();

      const currentHandicap = profile?.profile_data?.golfInfo?.handicap;
      console.log(`   Name: ${profile?.name || 'Unknown'}`);
      console.log(`   Current handicap: ${currentHandicap || 'Not set'}`);

      // Show their last 5 rounds
      console.log(`   Last 5 rounds:`);
      golferRounds.slice(0, 5).forEach((round, idx) => {
        console.log(`     ${idx + 1}. ${round.total_gross || 'N/A'} (${round.tee_marker || 'no tee'}) - ${round.course_id}`);
      });
    }

    // Check handicap_history table
    console.log('\n\n📜 Checking handicap_history table...');

    const { data: history, error: historyError } = await supabase
      .from('handicap_history')
      .select('*')
      .order('calculated_at', { ascending: false })
      .limit(10);

    if (historyError) {
      console.error('❌ Error fetching history:', historyError.message);
    } else {
      console.log(`✅ Found ${history.length} handicap history entries`);

      if (history.length > 0) {
        console.log('\nRecent changes:');
        history.slice(0, 5).forEach((entry, idx) => {
          console.log(`\n${idx + 1}. ${entry.golfer_id.substring(0, 20)}...`);
          console.log(`   ${entry.old_handicap || 'N/A'} → ${entry.new_handicap} (${entry.change >= 0 ? '+' : ''}${entry.change})`);
          console.log(`   Rounds used: ${entry.rounds_used}`);
          console.log(`   Date: ${new Date(entry.calculated_at).toLocaleString()}`);
        });
      } else {
        console.log('⚠️  No handicap history yet');
        console.log('   Run the recalculate_all_handicaps function in Supabase SQL Editor:');
        console.log('   SELECT * FROM recalculate_all_handicaps();');
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('SUMMARY');
    console.log('='.repeat(70));
    console.log(`✅ Rounds in database: ${allRounds.length}`);
    console.log(`✅ Unique golfers: ${uniqueGolfers.length}`);
    console.log(`✅ Handicap history entries: ${history?.length || 0}`);
    console.log(`\n⚠️  Rounds missing tee_marker: ${withoutTeeMarker.length}`);

    if (withoutTeeMarker.length > 0) {
      console.log('\n💡 To fix missing tee markers, update rounds:');
      console.log('   UPDATE rounds SET tee_marker = \'blue\' WHERE tee_marker IS NULL;');
    }

    console.log('\n📝 To manually recalculate all handicaps:');
    console.log('   Go to Supabase SQL Editor and run:');
    console.log('   SELECT * FROM recalculate_all_handicaps();');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('   Stack:', error.stack);
  }
}

checkRoundsAndHandicaps();
