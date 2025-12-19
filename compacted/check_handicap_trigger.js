// Check if handicap system is working
// Run with: node check_handicap_trigger.js

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://pyeeplwsnupmhgbguwqs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjczNzYzODcsImV4cCI6MjA0Mjk1MjM4N30.SjQEcLYEq3YF9a9mJrJPPPWXcvSJ2k7XTDWQU8ZsQlU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkHandicapSystem() {
    console.log('\n========================================');
    console.log('HANDICAP TRIGGER DIAGNOSTIC');
    console.log('========================================\n');

    // 1. Check if handicap_history table exists
    console.log('1. Checking if handicap_history table exists...');
    try {
        const { data, error } = await supabase
            .from('handicap_history')
            .select('count')
            .limit(1);

        if (error) {
            console.log('❌ handicap_history table NOT FOUND');
            console.log('   Error:', error.message);
            console.log('   → NEED TO RUN: sql/create_automatic_handicap_system.sql');
        } else {
            console.log('✅ handicap_history table EXISTS');
        }
    } catch (err) {
        console.log('❌ Error checking table:', err.message);
    }

    // 2. Check recent completed rounds
    console.log('\n2. Checking recent completed rounds...');
    try {
        const { data: rounds, error } = await supabase
            .from('rounds')
            .select('id, golfer_id, total_gross, tee_marker, course_rating, slope_rating, status, completed_at')
            .eq('status', 'completed')
            .not('total_gross', 'is', null)
            .order('completed_at', { ascending: false })
            .limit(10);

        if (error) {
            console.log('❌ Error fetching rounds:', error.message);
        } else {
            console.log(`✅ Found ${rounds.length} completed rounds`);

            if (rounds.length > 0) {
                console.log('\n   Sample round data:');
                const sample = rounds[0];
                console.log('   - Round ID:', sample.id);
                console.log('   - Golfer ID:', sample.golfer_id);
                console.log('   - Total Gross:', sample.total_gross);
                console.log('   - Tee Marker:', sample.tee_marker || '❌ MISSING');
                console.log('   - Course Rating:', sample.course_rating || '❌ MISSING');
                console.log('   - Slope Rating:', sample.slope_rating || '❌ MISSING');
                console.log('   - Completed:', sample.completed_at);

                // Check how many rounds are missing tee_marker
                const missingTee = rounds.filter(r => !r.tee_marker || r.tee_marker === '');
                if (missingTee.length > 0) {
                    console.log(`\n   ⚠️  WARNING: ${missingTee.length} out of ${rounds.length} rounds missing tee_marker`);
                    console.log('   → Trigger cannot calculate handicap without tee_marker!');
                }

                // Check how many rounds are missing course/slope rating
                const missingRatings = rounds.filter(r => !r.course_rating || !r.slope_rating);
                if (missingRatings.length > 0) {
                    console.log(`\n   ⚠️  WARNING: ${missingRatings.length} out of ${rounds.length} rounds missing course/slope ratings`);
                    console.log('   → Using default ratings (72.0/113)');
                }
            } else {
                console.log('   ℹ️  No completed rounds found in database');
            }
        }
    } catch (err) {
        console.log('❌ Error checking rounds:', err.message);
    }

    // 3. Check handicap_history for recent updates
    console.log('\n3. Checking handicap_history for recent updates...');
    try {
        const { data: history, error } = await supabase
            .from('handicap_history')
            .select('*')
            .order('calculated_at', { ascending: false })
            .limit(5);

        if (error) {
            console.log('❌ Cannot query handicap_history:', error.message);
        } else {
            console.log(`✅ Found ${history.length} handicap history entries`);

            if (history.length > 0) {
                console.log('\n   Recent handicap changes:');
                history.forEach((h, i) => {
                    console.log(`\n   ${i + 1}. Golfer: ${h.golfer_id}`);
                    console.log(`      Old: ${h.old_handicap} → New: ${h.new_handicap} (Change: ${h.change})`);
                    console.log(`      Rounds Used: ${h.rounds_used}`);
                    console.log(`      Calculated: ${h.calculated_at}`);
                });
            } else {
                console.log('   ⚠️  NO handicap updates recorded');
                console.log('   → This means the trigger is NOT firing!');
            }
        }
    } catch (err) {
        console.log('❌ Error checking history:', err.message);
    }

    // 4. Check user_profiles for handicaps
    console.log('\n4. Checking user_profiles for handicap data...');
    try {
        const { data: profiles, error } = await supabase
            .from('user_profiles')
            .select('line_user_id, display_name, profile_data')
            .not('profile_data', 'is', null)
            .limit(5);

        if (error) {
            console.log('❌ Error fetching profiles:', error.message);
        } else {
            console.log(`✅ Found ${profiles.length} profiles with data`);

            if (profiles.length > 0) {
                console.log('\n   Sample profile handicaps:');
                profiles.forEach((p, i) => {
                    const handicap = p.profile_data?.golfInfo?.handicap;
                    console.log(`   ${i + 1}. ${p.display_name || p.line_user_id}: Handicap ${handicap || 'NOT SET'}`);
                });
            }
        }
    } catch (err) {
        console.log('❌ Error checking profiles:', err.message);
    }

    // 5. DIAGNOSIS
    console.log('\n========================================');
    console.log('DIAGNOSIS');
    console.log('========================================\n');

    try {
        const { data: historyCheck } = await supabase
            .from('handicap_history')
            .select('count')
            .limit(1);

        const { data: roundsCheck } = await supabase
            .from('rounds')
            .select('id, tee_marker')
            .eq('status', 'completed')
            .not('total_gross', 'is', null)
            .limit(10);

        if (historyCheck === null) {
            console.log('❌ PROBLEM: handicap_history table does not exist');
            console.log('   FIX: Run sql/create_automatic_handicap_system.sql in Supabase');
            console.log('\n   Steps:');
            console.log('   1. Go to Supabase SQL Editor');
            console.log('   2. Open sql/create_automatic_handicap_system.sql');
            console.log('   3. Run the entire SQL file');
            console.log('   4. Verify trigger with: SELECT * FROM pg_trigger WHERE tgname = \'trigger_auto_update_handicap\';');
        } else if (!roundsCheck || roundsCheck.length === 0) {
            console.log('ℹ️  No completed rounds in database yet');
            console.log('   → Handicap system will activate when rounds are completed');
        } else {
            const missingTee = roundsCheck.filter(r => !r.tee_marker);
            if (missingTee.length > 0) {
                console.log('⚠️  PROBLEM: Rounds are missing tee_marker data');
                console.log(`   ${missingTee.length} out of ${roundsCheck.length} rounds have no tee_marker`);
                console.log('\n   FIX: Update rounds to include tee_marker:');
                console.log('   UPDATE rounds SET tee_marker = \'blue\' WHERE tee_marker IS NULL;');
            }

            const { data: historyData } = await supabase
                .from('handicap_history')
                .select('count');

            if (!historyData || historyData.length === 0) {
                console.log('⚠️  PROBLEM: Trigger exists but not firing');
                console.log('   Possible causes:');
                console.log('   1. Trigger not enabled');
                console.log('   2. Rounds inserted before trigger was created');
                console.log('\n   FIX: Run manual recalculation:');
                console.log('   SELECT * FROM recalculate_all_handicaps();');
            } else {
                console.log('✅ Handicap system is WORKING!');
                console.log('   Trigger is active and updating handicaps automatically');
            }
        }
    } catch (err) {
        console.log('❌ Diagnostic error:', err.message);
    }

    console.log('\n========================================\n');
}

checkHandicapSystem().catch(console.error);
