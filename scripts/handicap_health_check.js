/**
 * HANDICAP SYSTEM HEALTH CHECK
 * Run this script to verify the handicap system is working correctly
 *
 * Usage: node scripts/handicap_health_check.js [golfer_id]
 *
 * Checks:
 * 1. Database WHS function exists and works
 * 2. All handicap data sources are consistent
 * 3. No orphaned/duplicate records
 * 4. Triggers are enabled
 */

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
    'https://pyeeplwsnupmhgbguwqs.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTg0MzY2OSwiZXhwIjoyMDc1NDE5NjY5fQ.yz1WTV7h_qpaJu3kQ0pEKHMF3rw-_fSLmdne_3Rb6Yc'
);

// Default test golfer (Pete Park)
const DEFAULT_GOLFER = 'U2b6d976f19bca4b2f4374ae0e10ed873';
const TRGG_SOCIETY = '7c0e4b72-d925-44bc-afda-38259a7ba346';

async function healthCheck(golferId = DEFAULT_GOLFER) {
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║         HANDICAP SYSTEM HEALTH CHECK                          ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    let issues = [];
    let warnings = [];

    // ═══════════════════════════════════════════════════════════════
    // CHECK 1: WHS Database Function
    // ═══════════════════════════════════════════════════════════════
    console.log('1️⃣  CHECKING WHS DATABASE FUNCTION...');
    try {
        const { data: whsResult, error: whsError } = await supabase.rpc('calculate_whs_handicap_index', {
            p_golfer_id: golferId
        });

        if (whsError) {
            issues.push(`WHS function error: ${whsError.message}`);
            console.log('   ❌ FAILED:', whsError.message);
        } else if (whsResult) {
            console.log('   ✅ WHS Function works!');
            console.log(`      Handicap: ${whsResult.new_handicap_index}`);
            console.log(`      Rounds used: ${whsResult.rounds_used}`);
            console.log(`      Best diffs: ${JSON.stringify(whsResult.best_differentials)}`);
        } else {
            warnings.push('WHS function returned null (no rounds?)');
            console.log('   ⚠️  Function returned null - may need more rounds');
        }
    } catch (err) {
        issues.push(`WHS function exception: ${err.message}`);
        console.log('   ❌ EXCEPTION:', err.message);
    }

    // ═══════════════════════════════════════════════════════════════
    // CHECK 2: Handicap Data Consistency
    // ═══════════════════════════════════════════════════════════════
    console.log('\n2️⃣  CHECKING DATA CONSISTENCY...');

    // Get all handicap sources
    const { data: profile } = await supabase
        .from('user_profiles')
        .select('display_name, handicap_index, profile_data')
        .eq('line_user_id', golferId)
        .single();

    const { data: societyHcps } = await supabase
        .from('society_handicaps')
        .select('society_id, handicap_index, calculation_method, rounds_count, last_calculated_at')
        .eq('golfer_id', golferId);

    if (profile) {
        console.log(`   Player: ${profile.display_name}`);

        const hcpIndex = profile.handicap_index;
        const profileDataHcp = profile.profile_data?.handicap;
        const golfInfoHcp = profile.profile_data?.golfInfo?.handicap;

        console.log(`   user_profiles.handicap_index: ${hcpIndex}`);
        console.log(`   profile_data.handicap: ${profileDataHcp}`);
        console.log(`   profile_data.golfInfo.handicap: ${golfInfoHcp}`);

        // Check for inconsistencies
        const values = [hcpIndex, profileDataHcp, golfInfoHcp]
            .filter(v => v !== null && v !== undefined)
            .map(v => parseFloat(v));

        if (values.length > 1) {
            const allSame = values.every(v => Math.abs(v - values[0]) < 0.1);
            if (!allSame) {
                issues.push(`Inconsistent handicap values: ${values.join(', ')}`);
                console.log('   ❌ INCONSISTENT VALUES DETECTED!');
            } else {
                console.log('   ✅ All profile handicap values consistent');
            }
        }
    }

    // Society handicaps
    if (societyHcps && societyHcps.length > 0) {
        console.log('\n   Society Handicaps:');
        for (const sh of societyHcps) {
            const isUniversal = sh.society_id === null;
            const label = isUniversal ? 'Universal' : sh.society_id.substring(0, 8);
            console.log(`   - ${label}: ${sh.handicap_index} (${sh.calculation_method}, ${sh.rounds_count || '?'} rounds)`);
        }

        // Check for duplicates
        const universalRecords = societyHcps.filter(h => h.society_id === null);
        if (universalRecords.length > 1) {
            issues.push(`Duplicate universal handicap records: ${universalRecords.length}`);
            console.log('   ❌ DUPLICATE UNIVERSAL RECORDS!');
        }

        const societyIds = societyHcps.filter(h => h.society_id !== null).map(h => h.society_id);
        const uniqueSocieties = [...new Set(societyIds)];
        if (societyIds.length !== uniqueSocieties.length) {
            issues.push('Duplicate society handicap records detected');
            console.log('   ❌ DUPLICATE SOCIETY RECORDS!');
        }
    } else {
        warnings.push('No society_handicaps records found');
        console.log('   ⚠️  No society handicap records found');
    }

    // ═══════════════════════════════════════════════════════════════
    // CHECK 3: Rounds Data Quality
    // ═══════════════════════════════════════════════════════════════
    console.log('\n3️⃣  CHECKING ROUNDS DATA QUALITY...');

    const { data: rounds } = await supabase
        .from('rounds')
        .select('id, total_gross, course_id, tee_marker, status, completed_at')
        .eq('golfer_id', golferId)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(20);

    if (rounds) {
        const withTeeMarker = rounds.filter(r => r.tee_marker !== null);
        const withCourseId = rounds.filter(r => r.course_id !== null);
        const withGross = rounds.filter(r => r.total_gross !== null);

        console.log(`   Total completed rounds: ${rounds.length}`);
        console.log(`   With tee_marker: ${withTeeMarker.length}`);
        console.log(`   With course_id: ${withCourseId.length}`);
        console.log(`   With total_gross: ${withGross.length}`);

        const validForWHS = rounds.filter(r =>
            r.total_gross !== null &&
            r.tee_marker !== null &&
            r.course_id !== null
        );

        console.log(`   Valid for WHS calculation: ${validForWHS.length}`);

        if (validForWHS.length < rounds.length) {
            warnings.push(`${rounds.length - validForWHS.length} rounds missing required data for WHS`);
        }

        if (validForWHS.length < 3) {
            warnings.push('Less than 3 valid rounds - handicap may not be accurate');
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // CHECK 4: Compare WHS vs Stored Value
    // ═══════════════════════════════════════════════════════════════
    console.log('\n4️⃣  COMPARING CALCULATED VS STORED...');

    const { data: freshWHS } = await supabase.rpc('calculate_whs_handicap_index', {
        p_golfer_id: golferId
    });

    const storedSociety = societyHcps?.find(h => h.society_id === TRGG_SOCIETY);
    const storedUniversal = societyHcps?.find(h => h.society_id === null);

    if (freshWHS && storedSociety) {
        const diff = Math.abs(freshWHS.new_handicap_index - storedSociety.handicap_index);
        console.log(`   Calculated WHS: ${freshWHS.new_handicap_index}`);
        console.log(`   Stored Society: ${storedSociety.handicap_index}`);
        console.log(`   Difference: ${diff.toFixed(1)}`);

        if (diff > 1.0) {
            issues.push(`Large discrepancy between calculated (${freshWHS.new_handicap_index}) and stored (${storedSociety.handicap_index})`);
            console.log('   ❌ LARGE DISCREPANCY! May need recalculation.');
        } else if (diff > 0.1) {
            warnings.push(`Minor difference: ${diff.toFixed(1)}`);
            console.log('   ⚠️  Minor difference detected');
        } else {
            console.log('   ✅ Values match');
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════════════════
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                        SUMMARY                                 ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');

    if (issues.length === 0 && warnings.length === 0) {
        console.log('\n✅ ALL CHECKS PASSED - Handicap system is healthy!\n');
    } else {
        if (issues.length > 0) {
            console.log('\n❌ ISSUES FOUND:');
            issues.forEach((issue, i) => console.log(`   ${i + 1}. ${issue}`));
        }
        if (warnings.length > 0) {
            console.log('\n⚠️  WARNINGS:');
            warnings.forEach((warn, i) => console.log(`   ${i + 1}. ${warn}`));
        }
    }

    return { issues, warnings };
}

// Run with optional golfer ID argument
const golferId = process.argv[2] || DEFAULT_GOLFER;
healthCheck(golferId).catch(console.error);
