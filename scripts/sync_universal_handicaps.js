/**
 * Sync universal handicaps to match TRGG handicaps
 */
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient('https://pyeeplwsnupmhgbguwqs.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTg0MzY2OSwiZXhwIjoyMDc1NDE5NjY5fQ.yz1WTV7h_qpaJu3kQ0pEKHMF3rw-_fSLmdne_3Rb6Yc');

const TRGG_SOCIETY_ID = '7c0e4b72-d925-44bc-afda-38259a7ba346';

(async () => {
  console.log('Syncing universal handicaps to match TRGG...\n');

  // Get all TRGG handicaps
  const { data: trggHandicaps, error } = await supabase
    .from('society_handicaps')
    .select('golfer_id, handicap_index')
    .eq('society_id', TRGG_SOCIETY_ID);

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  console.log(`Found ${trggHandicaps.length} TRGG handicaps\n`);

  let updated = 0;
  let inserted = 0;

  for (const h of trggHandicaps) {
    // Check if universal exists
    const { data: existing } = await supabase
      .from('society_handicaps')
      .select('handicap_index')
      .eq('golfer_id', h.golfer_id)
      .is('society_id', null)
      .single();

    if (existing) {
      // Update if different
      if (existing.handicap_index !== h.handicap_index) {
        const { error: updateError } = await supabase
          .from('society_handicaps')
          .update({
            handicap_index: h.handicap_index,
            calculation_method: 'MANUAL',
            last_calculated_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('golfer_id', h.golfer_id)
          .is('society_id', null);

        if (!updateError) updated++;
      }
    } else {
      // Insert universal
      const { error: insertError } = await supabase
        .from('society_handicaps')
        .insert({
          golfer_id: h.golfer_id,
          society_id: null,
          handicap_index: h.handicap_index,
          calculation_method: 'MANUAL',
          last_calculated_at: new Date().toISOString()
        });

      if (!insertError) inserted++;
    }
  }

  console.log(`Updated: ${updated}`);
  console.log(`Inserted: ${inserted}`);
  console.log('\nDone.');
})();
