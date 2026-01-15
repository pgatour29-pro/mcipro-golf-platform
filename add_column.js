// Quick script to add is_live_spectatable column to scorecards table
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function addColumn() {
  console.log('Adding is_live_spectatable column to scorecards table...');

  const { data, error } = await supabase.rpc('exec_sql', {
    query: `
      ALTER TABLE scorecards
      ADD COLUMN IF NOT EXISTS is_live_spectatable BOOLEAN DEFAULT false;

      COMMENT ON COLUMN scorecards.is_live_spectatable IS 'Enables live spectating for public viewing of this scorecard';

      CREATE INDEX IF NOT EXISTS idx_scorecards_live_spectatable
      ON scorecards(is_live_spectatable)
      WHERE is_live_spectatable = true;
    `
  });

  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }

  console.log('Success! Column added.');
  process.exit(0);
}

addColumn();
