const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://pyeeplwsnupmhgbguwqs.supabase.co', 'REDACTED_SERVICE_ROLE_KEY_ROTATED_2026_09_06');

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
