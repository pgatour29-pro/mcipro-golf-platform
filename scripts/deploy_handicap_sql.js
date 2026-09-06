/**
 * Deploy Automatic Handicap System
 * Uses direct SQL execution via Supabase client
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://ccqydamycfekrnobupux.supabase.co';
const SUPABASE_SERVICE_KEY = 'REDACTED_SERVICE_ROLE_KEY_ROTATED_2026_09_06';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function deploySQLWithRPC() {
  console.log('🚀 Deploying Automatic Handicap System...\n');

  try {
    // Read SQL file
    const sqlPath = path.join(__dirname, '../sql/create_automatic_handicap_system.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log(`📄 SQL file loaded: ${(sqlContent.length / 1024).toFixed(2)} KB\n`);

    // Execute SQL by making direct postgres query
    // This uses PostgREST's rpc endpoint if available
    const { data, error } = await supabase.rpc('exec_sql', { sql: sqlContent });

    if (error) {
      console.error('❌ Error executing SQL:', error);
      console.log('\n⚠️  Manual deployment required:');
      console.log('1. Go to Supabase Dashboard > SQL Editor');
      console.log('2. Open: sql/create_automatic_handicap_system.sql');
      console.log('3. Copy and paste the contents');
      console.log('4. Click "Run"');
      return;
    }

    console.log('✅ SQL deployed successfully!');
    console.log('   Data:', data);

  } catch (err) {
    console.error('❌ Deployment failed:', err.message);
    console.log('\n📝 Please deploy manually via Supabase Dashboard');
  }
}

deploySQLWithRPC();
