/**
 * Remove incorrectly synced universal handicaps
 * Universal handicaps should be calculated from non-society rounds only,
 * NOT copied from TRGG society handicaps
 */
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://pyeeplwsnupmhgbguwqs.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTg0MzY2OSwiZXhwIjoyMDc1NDE5NjY5fQ.yz1WTV7h_qpaJu3kQ0pEKHMF3rw-_fSLmdne_3Rb6Yc');

const TRGG_SOCIETY_ID = '7c0e4b72-d925-44bc-afda-38259a7ba346';

(async () => {
  console.log('Checking universal handicaps that were incorrectly synced...\n');

  // Get all universal handicaps (society_id IS NULL)
  const { data: universals } = await supabase.from('society_handicaps')
    .select('id, golfer_id, handicap_index, created_at, updated_at')
    .is('society_id', null);

  console.log('Total universal handicap records:', universals?.length || 0);

  // Check how many were created/updated today (the bad sync)
  const today = new Date().toISOString().substring(0, 10);
  const todayRecords = universals?.filter(u =>
    u.created_at?.substring(0, 10) === today ||
    u.updated_at?.substring(0, 10) === today
  ) || [];

  console.log('Records created/updated today:', todayRecords.length);

  // These were created by my incorrect sync - delete them
  // Only delete ones that have matching TRGG handicap (were copied)
  let deleted = 0;

  for (const u of todayRecords) {
    // Check if there's a matching TRGG handicap
    const { data: trgg } = await supabase.from('society_handicaps')
      .select('handicap_index')
      .eq('golfer_id', u.golfer_id)
      .eq('society_id', TRGG_SOCIETY_ID)
      .single();

    // If universal matches TRGG exactly, it was incorrectly synced
    if (trgg && trgg.handicap_index === u.handicap_index) {
      const { error } = await supabase.from('society_handicaps')
        .delete()
        .eq('id', u.id);

      if (!error) deleted++;
    }
  }

  console.log('Deleted incorrectly synced universal records:', deleted);
  console.log('\nUniversal handicaps should be recalculated from non-society rounds.');
})();
