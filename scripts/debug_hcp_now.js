const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://pyeeplwsnupmhgbguwqs.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTg0MzY2OSwiZXhwIjoyMDc1NDE5NjY5fQ.yz1WTV7h_qpaJu3kQ0pEKHMF3rw-_fSLmdne_3Rb6Yc');

const PETE = 'U2b6d976f19bca4b2f4374ae0e10ed873';

async function debug() {
    console.log('=== DEBUGGING PETE\'S HANDICAP RIGHT NOW ===\n');

    // 1. Check user_profiles
    const { data: profile } = await supabase
        .from('user_profiles')
        .select('handicap_index, profile_data')
        .eq('line_user_id', PETE)
        .single();

    console.log('USER_PROFILES:');
    console.log('  handicap_index:', profile?.handicap_index);
    console.log('  profile_data.handicap:', profile?.profile_data?.handicap);
    console.log('  profile_data.golfInfo.handicap:', profile?.profile_data?.golfInfo?.handicap);

    // 2. Check ALL society_handicaps records
    const { data: shRecords } = await supabase
        .from('society_handicaps')
        .select('*')
        .eq('golfer_id', PETE)
        .order('last_calculated_at', { ascending: false });

    console.log('\nSOCIETY_HANDICAPS (ALL RECORDS):');
    if (shRecords) {
        shRecords.forEach((r, i) => {
            console.log(`  [${i}] society_id: ${r.society_id || 'NULL (universal)'}`);
            console.log(`      handicap_index: ${r.handicap_index}`);
            console.log(`      method: ${r.calculation_method}`);
            console.log(`      rounds: ${r.rounds_count}`);
            console.log(`      updated: ${r.last_calculated_at}`);
            console.log('');
        });
    }

    // 3. Check for any recent rounds that might have triggered updates
    const { data: recentRounds } = await supabase
        .from('rounds')
        .select('id, total_gross, status, completed_at, created_at')
        .eq('golfer_id', PETE)
        .order('created_at', { ascending: false })
        .limit(5);

    console.log('RECENT ROUNDS:');
    recentRounds?.forEach(r => {
        console.log(`  ${r.id.substring(0,8)}... gross:${r.total_gross} status:${r.status} completed:${r.completed_at}`);
    });

    // 4. Calculate what WHS says it should be
    const { data: whs } = await supabase.rpc('calculate_whs_handicap_index', {
        p_golfer_id: PETE
    });

    console.log('\nWHS FUNCTION SAYS:');
    console.log('  handicap:', whs?.new_handicap_index);
    console.log('  rounds_used:', whs?.rounds_used);

    // 5. Check handicap_history for any recent changes
    const { data: history } = await supabase
        .from('handicap_history')
        .select('*')
        .eq('golfer_id', PETE)
        .order('calculated_at', { ascending: false })
        .limit(10);

    if (history && history.length > 0) {
        console.log('\nHANDICAP_HISTORY (last 10):');
        history.forEach(h => {
            console.log(`  ${h.calculated_at}: ${h.old_index} -> ${h.new_index} (${h.change_reason})`);
        });
    }
}

debug().catch(console.error);
