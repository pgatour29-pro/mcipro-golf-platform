/**
 * Deploy Buddy System SQL to Supabase
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://ccqydamycfekrnobupux.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjcXlkYW15Y2Zla3Jub2J1cHV4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNzg1NjQ4MywiZXhwIjoyMDQzNDMyNDgzfQ.DzmKBZe88Sxr24xgHcYT-cZC1nMJdOygmhtqy5CIdVk';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function deployBuddySystem() {
    console.log('🚀 Deploying Buddy System to Supabase...\n');

    try {
        // Read SQL file
        const sqlPath = path.join(__dirname, '../sql/create_buddy_system.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');

        console.log(`📄 SQL file loaded: ${(sqlContent.length / 1024).toFixed(2)} KB\n`);

        // Split by semicolons and execute each statement
        // (This is a simple approach - production would need better SQL parsing)
        const statements = sqlContent
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        console.log(`📝 Executing ${statements.length} SQL statements...\n`);

        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < statements.length; i++) {
            const stmt = statements[i] + ';';

            // Skip comments
            if (stmt.trim().startsWith('--')) {
                continue;
            }

            try {
                // Use raw SQL execution via RPC if available, otherwise try direct query
                const { data, error } = await supabase.rpc('exec_sql', { sql: stmt }).catch(async () => {
                    // Fallback: Try using the postgREST query method
                    return { data: null, error: { message: 'RPC not available, please use Supabase Dashboard' } };
                });

                if (error) {
                    console.error(`❌ Statement ${i + 1} failed:`, error.message);
                    console.error(`   SQL: ${stmt.substring(0, 100)}...`);
                    errorCount++;
                } else {
                    successCount++;
                    if ((i + 1) % 5 === 0) {
                        console.log(`✅ Executed ${i + 1}/${statements.length} statements...`);
                    }
                }
            } catch (err) {
                console.error(`❌ Statement ${i + 1} exception:`, err.message);
                errorCount++;
            }
        }

        console.log(`\n${'='.repeat(70)}`);
        console.log('DEPLOYMENT SUMMARY');
        console.log('='.repeat(70));
        console.log(`✅ Successful: ${successCount}`);
        console.log(`❌ Failed: ${errorCount}`);

        if (errorCount > 0) {
            console.log('\n⚠️  Some statements failed. Please deploy manually:');
            console.log('1. Go to Supabase Dashboard > SQL Editor');
            console.log('2. Open: sql/create_buddy_system.sql');
            console.log('3. Copy and paste the contents');
            console.log('4. Click "Run"');
        } else {
            console.log('\n🎉 Buddy System deployed successfully!');
        }

    } catch (error) {
        console.error('❌ Deployment failed:', error.message);
        console.log('\n📝 Please deploy manually via Supabase Dashboard');
    }
}

deployBuddySystem();
