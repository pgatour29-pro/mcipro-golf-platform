/**
 * Diagnose Handicap Adjustment System
 * Run with: node diagnose_handicap_system.js
 */

const { createClient } = require('@supabase/supabase-js');

// Correct Supabase credentials from supabase-config.js
const SUPABASE_URL = 'https://pyeeplwsnupmhgbguwqs.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTg0MzY2OSwiZXhwIjoyMDc1NDE5NjY5fQ.yz1WTV7h_qpaJu3kQ0pEKHMF3rw-_fSLmdne_3Rb6Yc';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function diagnoseHandicapSystem() {
    console.log('\n' + '='.repeat(80));
    console.log('HANDICAP ADJUSTMENT SYSTEM DIAGNOSTIC');
    console.log('='.repeat(80) + '\n');

    try {
        // ==================================================================
        // STEP 1: Check if handicap_history table exists
        // ==================================================================
        console.log('STEP 1: Checking if handicap_history table exists...\n');

        const { data: historyCheck, error: historyError } = await supabase
            .from('handicap_history')
            .select('count')
            .limit(1);

        if (historyError) {
            console.log('❌ PROBLEM: handicap_history table does NOT exist');
            console.log('   Error:', historyError.message);
            console.log('\n   SOLUTION:');
            console.log('   1. Open Supabase SQL Editor');
            console.log('   2. Run: sql/create_automatic_handicap_system.sql');
            console.log('   3. Re-run this diagnostic\n');
            return;
        } else {
            console.log('✅ handicap_history table EXISTS\n');
        }

        // ==================================================================
        // STEP 2: Check if trigger exists (skip - not critical)
        // ==================================================================
        console.log('STEP 2: Checking database trigger... (skipping technical check)\n');
        console.log('   Will verify trigger by checking if handicap_history has entries\n');

        // ==================================================================
        // STEP 3: Check completed rounds
        // ==================================================================
        console.log('STEP 3: Checking completed rounds in database...\n');

        const { data: rounds, error: roundsError } = await supabase
            .from('rounds')
            .select('id, golfer_id, total_gross, tee_marker, course_rating, slope_rating, status, completed_at')
            .eq('status', 'completed')
            .not('total_gross', 'is', null)
            .order('completed_at', { ascending: false })
            .limit(10);

        if (roundsError) {
            console.log('❌ Error fetching rounds:', roundsError.message + '\n');
        } else {
            console.log(`✅ Found ${rounds.length} completed rounds\n`);

            if (rounds.length === 0) {
                console.log('   ℹ️  No completed rounds yet - handicap system will activate when rounds are saved\n');
            } else {
                // Check data quality
                const missingTee = rounds.filter(r => !r.tee_marker);
                const missingGross = rounds.filter(r => !r.total_gross);

                console.log('   Data Quality Check:');
                console.log(`   - Rounds with tee_marker: ${rounds.length - missingTee.length}/${rounds.length}`);
                console.log(`   - Rounds with total_gross: ${rounds.length - missingGross.length}/${rounds.length}\n`);

                if (missingTee.length > 0) {
                    console.log(`   ⚠️  WARNING: ${missingTee.length} rounds missing tee_marker!`);
                    console.log('      Trigger CANNOT calculate handicap without tee_marker\n');
                }

                // Show sample round
                console.log('   Sample Round (most recent):');
                const sample = rounds[0];
                console.log(`   - ID: ${sample.id}`);
                console.log(`   - Golfer: ${sample.golfer_id.substring(0, 30)}...`);
                console.log(`   - Gross: ${sample.total_gross}`);
                console.log(`   - Tee: ${sample.tee_marker || '❌ MISSING'}`);
                console.log(`   - Course Rating: ${sample.course_rating || 'default 72.0'}`);
                console.log(`   - Slope Rating: ${sample.slope_rating || 'default 113'}`);
                console.log(`   - Completed: ${new Date(sample.completed_at).toLocaleString()}\n`);
            }
        }

        // ==================================================================
        // STEP 4: Check handicap_history for updates
        // ==================================================================
        console.log('STEP 4: Checking if handicap calculations have been made...\n');

        const { data: history, error: histError } = await supabase
            .from('handicap_history')
            .select('*')
            .order('calculated_at', { ascending: false })
            .limit(5);

        if (histError) {
            console.log('❌ Error fetching history:', histError.message + '\n');
        } else {
            console.log(`   Found ${history.length} handicap history entries\n`);

            if (history.length === 0) {
                console.log('   ❌ PROBLEM: NO handicap adjustments have been made!');
                console.log('      This means the trigger is either:');
                console.log('      1. Not deployed to database');
                console.log('      2. Not firing when rounds are completed');
                console.log('      3. Rounds were added before trigger was installed\n');
            } else {
                console.log('   ✅ Handicap system HAS made updates!\n');
                console.log('   Recent handicap changes:');
                history.forEach((h, i) => {
                    console.log(`\n   ${i + 1}. Golfer: ${h.golfer_id.substring(0, 30)}...`);
                    console.log(`      Old → New: ${h.old_handicap || 'N/A'} → ${h.new_handicap}`);
                    console.log(`      Change: ${h.change >= 0 ? '+' : ''}${h.change}`);
                    console.log(`      Rounds Used: ${h.rounds_used}`);
                    console.log(`      When: ${new Date(h.calculated_at).toLocaleString()}`);
                });
                console.log('');
            }
        }

        // ==================================================================
        // STEP 5: Check user_profiles for handicap data
        // ==================================================================
        console.log('STEP 5: Checking user profiles for handicap data...\n');

        const { data: profiles, error: profilesError } = await supabase
            .from('user_profiles')
            .select('line_user_id, display_name, profile_data')
            .not('profile_data', 'is', null)
            .limit(5);

        if (profilesError) {
            console.log('❌ Error fetching profiles:', profilesError.message + '\n');
        } else {
            console.log(`   Found ${profiles.length} profiles with data\n`);

            console.log('   Sample handicaps:');
            profiles.forEach((p, i) => {
                const handicap = p.profile_data?.golfInfo?.handicap;
                console.log(`   ${i + 1}. ${p.display_name || 'Unknown'}: ${handicap !== undefined ? handicap : 'NOT SET'}`);
            });
            console.log('');
        }

        // ==================================================================
        // FINAL DIAGNOSIS
        // ==================================================================
        console.log('='.repeat(80));
        console.log('DIAGNOSIS & RECOMMENDATIONS');
        console.log('='.repeat(80) + '\n');

        if (!historyCheck) {
            console.log('❌ CRITICAL: Handicap system NOT deployed');
            console.log('   → Run sql/create_automatic_handicap_system.sql in Supabase\n');
        } else if (!rounds || rounds.length === 0) {
            console.log('✅ System deployed but no rounds completed yet');
            console.log('   → System will activate automatically when golfers complete rounds\n');
        } else if (history.length === 0) {
            console.log('⚠️  PROBLEM: System deployed, rounds exist, but NO handicap updates!');
            console.log('\n   Possible causes:');
            console.log('   1. Trigger not properly installed');
            console.log('   2. Rounds completed before trigger was created');
            console.log('   3. Rounds missing required data (tee_marker)\n');

            const missingTee = rounds.filter(r => !r.tee_marker);
            if (missingTee.length > 0) {
                console.log(`   → FOUND ISSUE: ${missingTee.length} rounds missing tee_marker!`);
                console.log('\n   FIX #1: Update existing rounds to add tee_marker:');
                console.log('   UPDATE rounds SET tee_marker = \'blue\' WHERE tee_marker IS NULL AND status = \'completed\';\n');
            }

            console.log('   FIX #2: Manually trigger handicap recalculation:');
            console.log('   Run in Supabase SQL Editor:');
            console.log('   SELECT * FROM recalculate_all_handicaps();\n');
        } else {
            console.log('✅ SUCCESS: Handicap system is WORKING!');
            console.log(`   - ${history.length} handicap updates recorded`);
            console.log('   - Trigger is active and functioning');
            console.log('   - Handicaps update automatically after each round\n');

            // Check if recent rounds have corresponding history
            if (rounds.length > history.length) {
                console.log(`   ℹ️  Note: ${rounds.length} rounds but only ${history.length} history entries`);
                console.log('      This is normal if:');
                console.log('      - Some rounds are from the same golfer');
                console.log('      - Some rounds are missing tee_marker');
                console.log('      - Trigger was installed after some rounds completed\n');
            }
        }

        console.log('='.repeat(80) + '\n');

    } catch (error) {
        console.error('\n❌ DIAGNOSTIC ERROR:', error.message);
        console.error('   Stack:', error.stack);
    }
}

// Run diagnostic
diagnoseHandicapSystem().catch(console.error);
