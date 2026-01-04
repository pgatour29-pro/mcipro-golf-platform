const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://pyeeplwsnupmhgbguwqs.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTg0MzY2OSwiZXhwIjoyMDc1NDE5NjY5fQ.yz1WTV7h_qpaJu3kQ0pEKHMF3rw-_fSLmdne_3Rb6Yc');

async function checkSchema() {
  console.log('=== CHECKING SOCIETY_MEMBERS SCHEMA ===\n');

  // Get one row to see the columns
  const { data, error } = await supabase
    .from('society_members')
    .select('*')
    .limit(1);

  if (error) {
    console.log('Error:', error.message);
    return;
  }

  if (data && data.length > 0) {
    console.log('Columns in society_members:');
    Object.keys(data[0]).forEach(col => {
      console.log(`  - ${col}: ${typeof data[0][col]} = ${JSON.stringify(data[0][col]).substring(0, 50)}`);
    });
  } else {
    console.log('No rows found, checking via information_schema...');
  }
}

checkSchema().catch(console.error);
