/**
 * Check ALL rounds in database regardless of status
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://pyeeplwsnupmhgbguwqs.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTg0MzY2OSwiZXhwIjoyMDc1NDE5NjY5fQ.yz1WTV7h_qpaJu3kQ0pEKHMF3rw-_fSLmdne_3Rb6Yc';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkAllRounds() {
    console.log('\n' + '='.repeat(80));
    console.log('CHECKING ALL ROUNDS IN DATABASE');
    console.log('='.repeat(80) + '\n');

    try {
        // Get ALL rounds
        const { data: allRounds, error } = await supabase
            .from('rounds')
            .select('id, golfer_id, total_gross, tee_marker, status, completed_at, created_at')
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) {
            console.log('❌ Error fetching rounds:', error.message);
            return;
        }

        console.log(`Total rounds in database: ${allRounds.length}\n`);

        if (allRounds.length === 0) {
            console.log('❌ NO ROUNDS FOUND IN DATABASE!\n');
            console.log('   This means:');
            console.log('   1. Rounds are not being saved to Supabase at all');
            console.log('   2. The saveRoundToHistory() function is failing silently');
            console.log('   3. OR rounds are being saved to a different database\n');
            return;
        }

        // Group by status
        const byStatus = {};
        allRounds.forEach(r => {
            const status = r.status || 'null';
            byStatus[status] = (byStatus[status] || 0) + 1;
        });

        console.log('Rounds by status:');
        Object.keys(byStatus).forEach(status => {
            console.log(`  ${status}: ${byStatus[status]}`);
        });
        console.log('');

        // Check data quality
        const withGross = allRounds.filter(r => r.total_gross && r.total_gross > 0);
        const withTee = allRounds.filter(r => r.tee_marker);
        const withCompleted = allRounds.filter(r => r.completed_at);

        console.log('Data quality:');
        console.log(`  Has total_gross: ${withGross.length}/${allRounds.length}`);
        console.log(`  Has tee_marker: ${withTee.length}/${allRounds.length}`);
        console.log(`  Has completed_at: ${withCompleted.length}/${allRounds.length}\n`);

        // Show sample rounds
        console.log('Sample rounds (most recent):');
        allRounds.slice(0, 10).forEach((round, i) => {
            console.log(`\n${i + 1}. Round ID: ${round.id}`);
            console.log(`   Golfer: ${round.golfer_id ? round.golfer_id.substring(0, 30) + '...' : 'MISSING'}`);
            console.log(`   Status: ${round.status || 'NULL'}`);
            console.log(`   Total Gross: ${round.total_gross || 'NULL'}`);
            console.log(`   Tee Marker: ${round.tee_marker || 'NULL'}`);
            console.log(`   Completed: ${round.completed_at ? new Date(round.completed_at).toLocaleString() : 'NULL'}`);
            console.log(`   Created: ${round.created_at ? new Date(round.created_at).toLocaleString() : 'NULL'}`);
        });

        console.log('\n' + '='.repeat(80));
        console.log('DIAGNOSIS');
        console.log('='.repeat(80) + '\n');

        const completedRounds = allRounds.filter(r => r.status === 'completed');

        if (allRounds.length > 0 && completedRounds.length === 0) {
            console.log('❌ PROBLEM: Rounds exist but NONE have status = \'completed\'\n');
            console.log('   Current statuses found:', Object.keys(byStatus).join(', '));
            console.log('\n   CAUSES:');
            console.log('   1. completeRound() is not setting status = \'completed\'');
            console.log('   2. Rounds are being saved with wrong status');
            console.log('   3. Status column has wrong value\n');

            console.log('   FIX IN CODE: Check saveRoundToHistory() function');
            console.log('   Around line 41451 in public/index.html:');
            console.log('   status: \'completed\', // ← Make sure this is set!\n');
        } else if (completedRounds.length > 0) {
            const needsTrigger = completedRounds.filter(r => r.total_gross && r.tee_marker);
            console.log(`✅ Found ${completedRounds.length} completed rounds`);
            console.log(`   ${needsTrigger.length} have all required data for handicap calculation\n`);

            if (needsTrigger.length > 0) {
                console.log('   These rounds SHOULD have triggered handicap updates!');
                console.log('   → Run manual recalculation:');
                console.log('   SELECT * FROM recalculate_all_handicaps();\n');
            }
        }

        console.log('='.repeat(80) + '\n');

    } catch (err) {
        console.error('❌ Error:', err.message);
    }
}

checkAllRounds().catch(console.error);
