const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient('https://pyeeplwsnupmhgbguwqs.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTg0MzY2OSwiZXhwIjoyMDc1NDE5NjY5fQ.yz1WTV7h_qpaJu3kQ0pEKHMF3rw-_fSLmdne_3Rb6Yc');

const TRGG_SOCIETY_ID = '7c0e4b72-d925-44bc-afda-38259a7ba346';

(async () => {
  console.log('Fixing ALL December 2025 rounds from society_handicaps...\n');

  // Get all December rounds
  const { data: rounds } = await supabase.from('rounds')
    .select('id, golfer_id, handicap_used, player_name, created_at')
    .gte('created_at', '2025-12-01')
    .order('created_at', { ascending: false });

  console.log('Total December rounds:', rounds ? rounds.length : 0);

  let updated = 0;
  let checked = 0;

  for (const r of rounds || []) {
    checked++;

    // Get correct handicap from society_handicaps (TRGG)
    const { data: hcp } = await supabase.from('society_handicaps')
      .select('handicap_index')
      .eq('golfer_id', r.golfer_id)
      .eq('society_id', TRGG_SOCIETY_ID)
      .single();

    if (hcp && hcp.handicap_index !== null) {
      const correctHcp = hcp.handicap_index;

      if (r.handicap_used !== correctHcp) {
        // Get player name for logging
        const { data: profile } = await supabase.from('user_profiles')
          .select('name')
          .eq('line_user_id', r.golfer_id)
          .single();

        const name = profile?.name || r.player_name || r.golfer_id.substring(0,10);

        console.log(name + ': ' + r.handicap_used + ' -> ' + correctHcp);

        // Update
        const { error } = await supabase.from('rounds')
          .update({ handicap_used: correctHcp })
          .eq('id', r.id);

        if (!error) updated++;
      }
    }

    // Progress
    if (checked % 20 === 0) {
      process.stdout.write('Checked ' + checked + '/' + rounds.length + '\r');
    }
  }

  console.log('\n\n---');
  console.log('Checked:', checked);
  console.log('Updated:', updated);
})();
