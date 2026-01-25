/**
 * Backfill event_results for all events that have rounds but no results
 * This will populate standings for all past events
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://pyeeplwsnupmhgbguwqs.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTg0MzY2OSwiZXhwIjoyMDc1NDE5NjY5fQ.yz1WTV7h_qpaJu3kQ0pEKHMF3rw-_fSLmdne_3Rb6Yc';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function backfillResults() {
  console.log('='.repeat(70));
  console.log('BACKFILLING EVENT_RESULTS FOR ALL EVENTS WITH ROUNDS');
  console.log('='.repeat(70));

  // Get all events that have rounds linked to them
  const { data: eventsWithRounds } = await supabase
    .from('rounds')
    .select('society_event_id')
    .not('society_event_id', 'is', null)
    .eq('status', 'completed');

  // Get unique event IDs
  const uniqueEventIds = [...new Set(eventsWithRounds?.map(r => r.society_event_id) || [])];
  console.log(`\nFound ${uniqueEventIds.length} events with completed rounds\n`);

  let processed = 0;
  let saved = 0;
  let skipped = 0;
  let errors = 0;

  for (const eventId of uniqueEventIds) {
    processed++;

    // Check if event already has results
    const { count: existingCount } = await supabase
      .from('event_results')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId);

    if (existingCount > 0) {
      console.log(`[${processed}/${uniqueEventIds.length}] Event ${eventId.substring(0, 8)}... already has ${existingCount} results - SKIP`);
      skipped++;
      continue;
    }

    // Get event details
    const { data: event } = await supabase
      .from('society_events')
      .select('id, title, event_date, organizer_id, organizer_name')
      .eq('id', eventId)
      .single();

    if (!event) {
      console.log(`[${processed}/${uniqueEventIds.length}] Event ${eventId.substring(0, 8)}... not found - SKIP`);
      skipped++;
      continue;
    }

    // Get rounds for this event
    const { data: rounds } = await supabase
      .from('rounds')
      .select('id, golfer_id, player_name, total_gross, total_stableford, status')
      .eq('society_event_id', eventId)
      .eq('status', 'completed');

    if (!rounds || rounds.length === 0) {
      console.log(`[${processed}/${uniqueEventIds.length}] ${event.title} - No completed rounds - SKIP`);
      skipped++;
      continue;
    }

    // Sort by stableford (most events are stableford)
    rounds.sort((a, b) => (b.total_stableford || 0) - (a.total_stableford || 0));

    // Prepare results with default points (10, 9, 8, 7...)
    // Note: event_results table doesn't have organizer_id/organizer_name columns
    const resultsToSave = rounds.map((r, i) => ({
      event_id: eventId,
      round_id: r.id,
      player_id: r.golfer_id,
      player_name: r.player_name || 'Unknown',
      position: i + 1,
      score: r.total_stableford || r.total_gross,
      score_type: r.total_stableford ? 'stableford' : 'strokeplay',
      points_earned: Math.max(0, 11 - (i + 1)), // Default: 10, 9, 8, 7...
      status: 'completed',
      is_counted: true,
      event_date: event.event_date ? event.event_date.split('T')[0] : null
    }));

    // Insert results
    const { error: insertError } = await supabase
      .from('event_results')
      .insert(resultsToSave);

    if (insertError) {
      console.log(`[${processed}/${uniqueEventIds.length}] ${event.title} - ERROR: ${insertError.message}`);
      errors++;
    } else {
      console.log(`[${processed}/${uniqueEventIds.length}] ${event.title} - SAVED ${resultsToSave.length} results`);
      saved++;
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('BACKFILL COMPLETE');
  console.log('='.repeat(70));
  console.log(`Events processed: ${processed}`);
  console.log(`Events with new results: ${saved}`);
  console.log(`Events skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);

  // Final count
  const { count: totalResults } = await supabase
    .from('event_results')
    .select('*', { count: 'exact', head: true });

  console.log(`\nTotal event_results now: ${totalResults}`);
}

backfillResults().catch(console.error);
