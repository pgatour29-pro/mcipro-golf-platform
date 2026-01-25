/**
 * Check where event scores are stored
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://pyeeplwsnupmhgbguwqs.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTg0MzY2OSwiZXhwIjoyMDc1NDE5NjY5fQ.yz1WTV7h_qpaJu3kQ0pEKHMF3rw-_fSLmdne_3Rb6Yc';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function check() {
  // Check scorecards for a recent event
  console.log('=== CHECK SCORECARDS TABLE ===\n');

  const { data: scorecards, count: scCount } = await supabase
    .from('scorecards')
    .select('*', { count: 'exact' })
    .limit(5);

  console.log('Total scorecards:', scCount);
  if (scorecards && scorecards.length > 0) {
    console.log('Sample columns:', Object.keys(scorecards[0]).join(', '));
    console.log('\nRecent scorecards:');
    scorecards.forEach(s => {
      console.log(` - ${s.golfer_name || s.player_name} | Event: ${s.event_id ? 'Yes' : 'No'} | Score: ${s.total_score || s.total_gross || 'N/A'}`);
    });
  }

  // Check rounds linked to society events
  console.log('\n=== ROUNDS WITH SOCIETY_EVENT_ID ===\n');
  const { data: linkedRounds, count: linkedCount } = await supabase
    .from('rounds')
    .select('id, golfer_id, course_name, total_gross, total_stableford, society_event_id, completed_at', { count: 'exact' })
    .not('society_event_id', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(10);

  console.log('Rounds linked to society events:', linkedCount);
  if (linkedRounds && linkedRounds.length > 0) {
    linkedRounds.forEach(r => {
      const date = r.completed_at ? r.completed_at.split('T')[0] : 'unknown';
      console.log(` - ${date} | ${r.course_name} | Gross: ${r.total_gross} | Stableford: ${r.total_stableford} | Event: ${r.society_event_id.substring(0, 8)}...`);
    });
  }

  // Check event_registrations
  console.log('\n=== EVENT_REGISTRATIONS TABLE ===\n');
  const { data: regs, count: regCount } = await supabase
    .from('event_registrations')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(10);

  console.log('Total registrations:', regCount);
  if (regs && regs.length > 0) {
    console.log('Sample columns:', Object.keys(regs[0]).join(', '));
    console.log('\nRecent registrations:');
    regs.forEach(r => {
      console.log(` - ${r.golfer_name} | Status: ${r.status} | Score: ${r.final_score || r.score || 'N/A'} | Event: ${r.event_id?.substring(0, 8) || 'None'}`);
    });
  }

  // Check the Jan 7 event that DOES have results
  console.log('\n=== JAN 7 EVENT (HAS RESULTS) ===\n');
  const { data: jan7Event } = await supabase
    .from('society_events')
    .select('*')
    .eq('event_date', '2026-01-07')
    .single();

  if (jan7Event) {
    console.log('Event:', jan7Event.title);
    console.log('ID:', jan7Event.id);
    console.log('point_allocation:', jan7Event.point_allocation);

    // Get its results
    const { data: jan7Results } = await supabase
      .from('event_results')
      .select('*')
      .eq('event_id', jan7Event.id);

    console.log('\nResults:', jan7Results?.length);
    jan7Results?.forEach(r => {
      console.log(` - Pos ${r.position}: ${r.player_name} | Score: ${r.score} | Points: ${r.points_earned}`);
    });
  }

  // Check a recent event without results
  console.log('\n=== JAN 23 TREASURE HILL (NO RESULTS) ===\n');
  const { data: jan23Events } = await supabase
    .from('society_events')
    .select('*')
    .gte('event_date', '2026-01-23')
    .lte('event_date', '2026-01-23');

  for (const event of jan23Events || []) {
    console.log('Event:', event.title);
    console.log('ID:', event.id);

    // Check for rounds
    const { data: rounds } = await supabase
      .from('rounds')
      .select('golfer_id, total_gross, total_stableford')
      .eq('society_event_id', event.id);

    console.log('Rounds linked:', rounds?.length || 0);

    // Check for registrations
    const { data: eventRegs } = await supabase
      .from('event_registrations')
      .select('golfer_name, status, final_score')
      .eq('event_id', event.id);

    console.log('Registrations:', eventRegs?.length || 0);
    eventRegs?.forEach(r => console.log(` - ${r.golfer_name} | ${r.status} | Score: ${r.final_score || 'N/A'}`));
  }
}

check().catch(console.error);
