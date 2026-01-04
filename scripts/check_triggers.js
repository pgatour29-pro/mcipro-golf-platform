const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://pyeeplwsnupmhgbguwqs.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTg0MzY2OSwiZXhwIjoyMDc1NDE5NjY5fQ.yz1WTV7h_qpaJu3kQ0pEKHMF3rw-_fSLmdne_3Rb6Yc');

async function checkTriggers() {
  console.log('=== CHECKING DATABASE TRIGGERS ===\n');

  // Check triggers on rounds table
  const { data: triggers, error } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT
        trigger_name,
        event_manipulation,
        event_object_table,
        action_statement
      FROM information_schema.triggers
      WHERE event_object_table = 'rounds'
      ORDER BY trigger_name;
    `
  });

  if (error) {
    console.log('Cannot query triggers directly. Trying alternative...');

    // Try checking if functions exist
    const { data: funcs, error: funcErr } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT routine_name
        FROM information_schema.routines
        WHERE routine_type = 'FUNCTION'
          AND routine_name LIKE '%handicap%'
        ORDER BY routine_name;
      `
    });

    if (funcErr) {
      console.log('Also cannot query functions.');
      console.log('Error:', funcErr.message);
    } else {
      console.log('Handicap-related functions:', funcs);
    }
  } else {
    console.log('Triggers on rounds table:');
    for (const t of triggers || []) {
      console.log(' -', t.trigger_name, ':', t.event_manipulation, '->', t.action_statement?.substring(0, 50));
    }
  }

  // Test if trigger fires by simulating a round update
  console.log('\n=== TESTING TRIGGER BY UPDATING A ROUND ===');

  const PETE_ID = 'U2b6d976f19bca4b2f4374ae0e10ed873';

  // Get Pete's most recent completed round
  const { data: rounds } = await supabase
    .from('rounds')
    .select('id, total_gross, status')
    .eq('golfer_id', PETE_ID)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(1);

  if (rounds && rounds.length > 0) {
    const round = rounds[0];
    console.log('Testing with round:', round.id);
    console.log('Current gross:', round.total_gross);

    // Record current handicap
    const { data: beforeHcp } = await supabase
      .from('society_handicaps')
      .select('handicap_index')
      .eq('golfer_id', PETE_ID)
      .is('society_id', null)
      .single();

    console.log('Handicap before:', beforeHcp?.handicap_index);

    // Update the round's total_gross to itself (triggers UPDATE event)
    console.log('\nTriggering UPDATE on round...');
    const { error: updateErr } = await supabase
      .from('rounds')
      .update({
        total_gross: round.total_gross,
        updated_at: new Date().toISOString()
      })
      .eq('id', round.id);

    if (updateErr) {
      console.log('Update error:', updateErr);
    } else {
      console.log('Round updated (should trigger handicap recalc)');
    }

    // Wait a moment for trigger to execute
    await new Promise(r => setTimeout(r, 2000));

    // Check handicap after
    const { data: afterHcp } = await supabase
      .from('society_handicaps')
      .select('handicap_index, last_calculated_at')
      .eq('golfer_id', PETE_ID)
      .is('society_id', null)
      .single();

    console.log('\nHandicap after:', afterHcp?.handicap_index);
    console.log('Last calculated:', afterHcp?.last_calculated_at);

    if (beforeHcp?.handicap_index === afterHcp?.handicap_index) {
      console.log('\n⚠️  Handicap unchanged - trigger may not be firing!');
    } else {
      console.log('\n✅ Handicap changed - trigger is working!');
    }
  }
}

checkTriggers().catch(console.error);
