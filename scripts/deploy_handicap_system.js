/**
 * Deploy Automatic Handicap System to Database
 * Reads SQL file and executes it using Supabase admin connection
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Get Supabase credentials from environment
const SUPABASE_URL = 'https://ccqydamycfekrnobupux.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'REDACTED_SERVICE_ROLE_KEY_ROTATED_2026_09_06';

// Create Supabase client with service role
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function deploySQLFile() {
  console.log('='.repeat(70));
  console.log('DEPLOYING AUTOMATIC HANDICAP SYSTEM');
  console.log('='.repeat(70));

  try {
    // Read SQL file
    const sqlFilePath = path.join(__dirname, '../sql/create_automatic_handicap_system.sql');
    console.log('\n📄 Reading SQL file:', sqlFilePath);
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    console.log('✅ SQL file loaded successfully');
    console.log(`   File size: ${(sqlContent.length / 1024).toFixed(2)} KB`);

    // Execute SQL using Supabase RPC
    // Note: Supabase doesn't have direct SQL execution via the JS client
    // We need to split the SQL into individual statements and execute them
    // OR use the REST API directly

    console.log('\n⚠️  IMPORTANT: Direct SQL execution requires admin access');
    console.log('    Please run this SQL manually via Supabase Dashboard:');
    console.log('    1. Go to https://supabase.com/dashboard/project/ccqydamycfekrnobupux/editor');
    console.log('    2. Click "SQL Editor"');
    console.log('    3. Copy and paste the SQL from:');
    console.log(`       ${sqlFilePath}`);
    console.log('    4. Click "Run"');
    console.log('\n    OR use psql command line:');
    console.log('    psql "postgresql://postgres:[PASSWORD]@db.ccqydamycfekrnobupux.supabase.co:5432/postgres" < sql/create_automatic_handicap_system.sql');

    console.log('\n✅ SQL file is ready for deployment');
    console.log('   Location:', sqlFilePath);

    // Alternative: Use fetch to call Supabase REST API directly
    console.log('\n📡 Attempting deployment via Supabase REST API...');

    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      },
      body: JSON.stringify({ sql: sqlContent })
    });

    if (response.ok) {
      console.log('✅ SQL deployed successfully via API!');
    } else {
      const error = await response.text();
      console.log('❌ API deployment failed:', error);
      console.log('   Please use manual deployment method above.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run deployment
deploySQLFile();
