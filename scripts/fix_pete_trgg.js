const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://pyeeplwsnupmhgbguwqs.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTg0MzY2OSwiZXhwIjoyMDc1NDE5NjY5fQ.yz1WTV7h_qpaJu3kQ0pEKHMF3rw-_fSLmdne_3Rb6Yc');

const PETE_ID = 'U2b6d976f19bca4b2f4374ae0e10ed873';
const TRGG_ID = '7c0e4b72-d925-44bc-afda-38259a7ba346';

async function fix() {
  console.log('Fixing Pete TRGG handicap to 2.7 (WHS best 4 of 10)...');

  const { error } = await supabase
    .from('society_handicaps')
    .update({
      handicap_index: 2.7,
      rounds_count: 10,
      last_calculated_at: new Date().toISOString(),
      calculation_method: 'WHS-8of20',
      updated_at: new Date().toISOString()
    })
    .eq('golfer_id', PETE_ID)
    .eq('society_id', TRGG_ID);

  if (error) {
    console.log('Error:', error);
  } else {
    console.log('Done!');
  }

  // Verify
  const { data: hcps } = await supabase
    .from('society_handicaps')
    .select('society_id, handicap_index, calculation_method')
    .eq('golfer_id', PETE_ID);

  console.log('\nPete Park handicaps:');
  for (const h of hcps || []) {
    console.log(' -', h.society_id || 'Universal', ':', h.handicap_index, '(', h.calculation_method, ')');
  }
}

fix().catch(console.error);
