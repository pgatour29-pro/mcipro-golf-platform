const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient('https://pyeeplwsnupmhgbguwqs.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTg0MzY2OSwiZXhwIjoyMDc1NDE5NjY5fQ.yz1WTV7h_qpaJu3kQ0pEKHMF3rw-_fSLmdne_3Rb6Yc');

async function deploy() {
  console.log('=== DEPLOYING WHS 8-of-20 FUNCTION ===\n');

  const sqlPath = path.join(__dirname, '..', 'sql', 'whs_8of20_handicap_function.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  // Split into individual statements (by semicolon followed by newline)
  const statements = sql
    .split(/;\s*\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log('Found', statements.length, 'SQL statements to execute\n');

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.substring(0, 60).replace(/\n/g, ' ');
    console.log(`[${i + 1}/${statements.length}] ${preview}...`);

    const { error } = await supabase.rpc('exec_sql', { sql: stmt + ';' });

    if (error) {
      // Try raw query if exec_sql doesn't exist
      console.log('  exec_sql failed, trying direct...');

      // Unfortunately Supabase JS client doesn't support raw SQL
      // We need to use the Management API or run this via Supabase CLI
      console.log('  Note: Deploy SQL via Supabase Dashboard SQL Editor');
    } else {
      console.log('  ✓ Success');
    }
  }

  console.log('\n=== DEPLOYMENT NOTES ===');
  console.log('The SQL file needs to be run directly in Supabase SQL Editor:');
  console.log('1. Go to: https://supabase.com/dashboard/project/pyeeplwsnupmhgbguwqs/sql');
  console.log('2. Copy and paste the contents of sql/whs_8of20_handicap_function.sql');
  console.log('3. Click "Run"');
}

deploy().catch(console.error);
