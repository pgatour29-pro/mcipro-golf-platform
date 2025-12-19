/**
 * Check the actual schema of the rounds table
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://pyeeplwsnupmhgbguwqs.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTg0MzY2OSwiZXhwIjoyMDc1NDE5NjY5fQ.yz1WTV7h_qpaJu3kQ0pEKHMF3rw-_fSLmdne_3Rb6Yc';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkSchema() {
    console.log('\n' + '='.repeat(80));
    console.log('ROUNDS TABLE SCHEMA CHECK');
    console.log('='.repeat(80) + '\n');

    try {
        // Get one round to see what columns exist
        const { data: round, error } = await supabase
            .from('rounds')
            .select('*')
            .limit(1)
            .single();

        if (error) {
            console.log('❌ Error fetching round:', error.message);
            return;
        }

        console.log('Columns in rounds table:');
        console.log('-----------------------------------');
        Object.keys(round).forEach(col => {
            const value = round[col];
            const type = typeof value;
            const display = value === null ? 'NULL' : (type === 'object' ? 'JSONB' : value);
            console.log(`  ${col.padEnd(25)} = ${display}`);
        });

        console.log('\n' + '='.repeat(80));
        console.log('CRITICAL COLUMNS FOR HANDICAP SYSTEM:');
        console.log('='.repeat(80) + '\n');

        const criticalCols = [
            'status',
            'total_gross',
            'tee_marker',
            'completed_at',
            'course_rating',
            'slope_rating'
        ];

        criticalCols.forEach(col => {
            if (col in round) {
                const value = round[col];
                const status = value !== null ? '✅ EXISTS' : '⚠️  NULL';
                console.log(`  ${col.padEnd(20)} ${status} (value: ${value})`);
            } else {
                console.log(`  ${col.padEnd(20)} ❌ COLUMN DOES NOT EXIST IN TABLE!`);
            }
        });

        console.log('\n' + '='.repeat(80));
        console.log('DIAGNOSIS:');
        console.log('='.repeat(80) + '\n');

        const missingCols = criticalCols.filter(col => !(col in round));

        if (missingCols.length > 0) {
            console.log('❌ CRITICAL PROBLEM: Required columns missing from table!\n');
            console.log('   Missing columns:', missingCols.join(', '));
            console.log('\n   SOLUTION:');
            console.log('   1. Run database migration to add missing columns');
            console.log('   2. Check sql/MIGRATE_ROUNDS_TO_CANONICAL.sql');
            console.log('   3. Or manually add columns:\n');

            missingCols.forEach(col => {
                let sqlType = 'TEXT';
                if (col.includes('_at')) sqlType = 'TIMESTAMPTZ';
                if (col.includes('gross') || col.includes('rating')) sqlType = 'DECIMAL';

                console.log(`   ALTER TABLE rounds ADD COLUMN ${col} ${sqlType};`);
            });
        } else {
            console.log('✅ All required columns exist in table\n');

            const nullCols = criticalCols.filter(col => round[col] === null);

            if (nullCols.length > 0) {
                console.log(`⚠️  ${nullCols.length} columns are NULL in this round:\n`);
                console.log('   ' + nullCols.join(', '));
                console.log('\n   This means the INSERT statement is not populating these columns!');
                console.log('   Possible causes:');
                console.log('   1. Variables in JavaScript are undefined/null');
                console.log('   2. Column name mismatch (e.g., tee_marker vs teeMarker)');
                console.log('   3. RLS policy blocking column updates\n');
            }
        }

        console.log('='.repeat(80) + '\n');

    } catch (err) {
        console.error('❌ Error:', err.message);
    }
}

checkSchema().catch(console.error);
