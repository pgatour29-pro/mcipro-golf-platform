// Insert TRGG February 2026 Events into Supabase
// Run with: node scripts/insert_trgg_feb_2026.js

const SUPABASE_URL = 'https://pyeeplwsnupmhgbguwqs.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk';

const events = [
  // Week 1
  { title: 'TRGG - Bangpakong', event_date: '2026-02-02', start_time: '09:45', departure_time: '08:30', course_name: 'Bangpakong Riverside Country Club', entry_fee: 1850, description: 'Caddy & Cart Included', organizer_name: 'TRGG Pattaya', creator_type: 'organizer' },
  { title: 'TRGG - Bangpra', event_date: '2026-02-03', start_time: '11:30', departure_time: '10:15', course_name: 'Bangpra International Golf Club', entry_fee: 2150, description: 'Caddy & Cart Included', organizer_name: 'TRGG Pattaya', creator_type: 'organizer' },
  { title: 'TRGG - Eastern Star', event_date: '2026-02-04', start_time: '11:30', departure_time: '10:15', course_name: 'Eastern Star Country Club', entry_fee: 2050, description: '2-WAY. Caddy & Cart Included', organizer_name: 'TRGG Pattaya', creator_type: 'organizer' },
  { title: 'TRGG - Phoenix', event_date: '2026-02-05', start_time: '11:28', departure_time: '10:30', course_name: 'Phoenix Gold Golf & Country Club', entry_fee: 2650, description: 'Ocean (6) / Mountain (6). Caddy & Cart Included', organizer_name: 'TRGG Pattaya', creator_type: 'organizer' },
  { title: 'TRGG - Burapha (FFF)', event_date: '2026-02-06', start_time: '10:00', departure_time: '09:00', course_name: 'Burapha Golf Club', entry_fee: 2750, description: 'Free Food Friday. Caddy & Cart Included', organizer_name: 'TRGG Pattaya', creator_type: 'organizer' },
  { title: 'TRGG - Plutaluang', event_date: '2026-02-07', start_time: '10:00', departure_time: '08:45', course_name: 'Plutaluang Navy Golf Course', entry_fee: 1850, description: 'N-W. Caddy & Cart Included', organizer_name: 'TRGG Pattaya', creator_type: 'organizer' },

  // Week 2
  { title: 'TRGG - Bangpakong', event_date: '2026-02-09', start_time: '10:45', departure_time: '09:30', course_name: 'Bangpakong Riverside Country Club', entry_fee: 1850, description: 'Caddy & Cart Included', organizer_name: 'TRGG Pattaya', creator_type: 'organizer' },
  { title: 'TRGG - Khao Kheow', event_date: '2026-02-10', start_time: '11:35', departure_time: '10:20', course_name: 'Khao Kheow Country Club', entry_fee: 2250, description: 'Caddy & Cart Included', organizer_name: 'TRGG Pattaya', creator_type: 'organizer' },
  { title: 'TRGG - Pattaya C.C.', event_date: '2026-02-11', start_time: '10:24', departure_time: '09:15', course_name: 'Pattaya Country Club', entry_fee: 2650, description: 'Caddy & Cart Included', organizer_name: 'TRGG Pattaya', creator_type: 'organizer' },
  { title: 'TRGG - Greenwood', event_date: '2026-02-12', start_time: '11:04', departure_time: '09:50', course_name: 'Greenwood Golf Club', entry_fee: 1750, description: 'Caddy & Cart Included', organizer_name: 'TRGG Pattaya', creator_type: 'organizer' },
  { title: 'TRGG - Burapha (FFF)', event_date: '2026-02-13', start_time: '10:00', departure_time: '09:00', course_name: 'Burapha Golf Club', entry_fee: 2750, description: 'Free Food Friday. Caddy & Cart Included', organizer_name: 'TRGG Pattaya', creator_type: 'organizer' },
  { title: 'TRGG - Mountain Shadow', event_date: '2026-02-14', start_time: '10:15', departure_time: '09:00', course_name: 'Mountain Shadow Golf Club', entry_fee: 1850, description: 'Caddy & Cart Included', organizer_name: 'TRGG Pattaya', creator_type: 'organizer' },

  // Week 3
  { title: 'TRGG - Bangpakong', event_date: '2026-02-16', start_time: '09:45', departure_time: '08:30', course_name: 'Bangpakong Riverside Country Club', entry_fee: 1850, description: 'Caddy & Cart Included', organizer_name: 'TRGG Pattaya', creator_type: 'organizer' },
  { title: 'TRGG - Greenwood', event_date: '2026-02-17', start_time: '11:20', departure_time: '10:00', course_name: 'Greenwood Golf Club', entry_fee: 1750, description: 'Caddy & Cart Included', organizer_name: 'TRGG Pattaya', creator_type: 'organizer' },
  { title: 'TRGG - Pattaya C.C.', event_date: '2026-02-18', start_time: '10:24', departure_time: '09:15', course_name: 'Pattaya Country Club', entry_fee: 2650, description: 'Caddy & Cart Included', organizer_name: 'TRGG Pattaya', creator_type: 'organizer' },
  { title: 'TRGG - Phoenix', event_date: '2026-02-19', start_time: '11:35', departure_time: '10:35', course_name: 'Phoenix Gold Golf & Country Club', entry_fee: 2650, description: 'Caddy & Cart Included', organizer_name: 'TRGG Pattaya', creator_type: 'organizer' },
  { title: 'TRGG - Burapha (FFF)', event_date: '2026-02-20', start_time: '10:00', departure_time: '09:00', course_name: 'Burapha Golf Club', entry_fee: 2750, description: 'Free Food Friday. Caddy & Cart Included', organizer_name: 'TRGG Pattaya', creator_type: 'organizer' },
  { title: 'TRGG - Plutaluang', event_date: '2026-02-21', start_time: '10:00', departure_time: '08:45', course_name: 'Plutaluang Navy Golf Course', entry_fee: 1850, description: 'S-E. Caddy & Cart Included', organizer_name: 'TRGG Pattaya', creator_type: 'organizer' },

  // Week 4
  { title: 'TRGG - Pattaya C.C.', event_date: '2026-02-23', start_time: '09:20', departure_time: '08:10', course_name: 'Pattaya Country Club', entry_fee: 2650, description: 'Caddy & Cart Included', organizer_name: 'TRGG Pattaya', creator_type: 'organizer' },
  { title: 'TRGG - Phoenix', event_date: '2026-02-24', start_time: '11:52', departure_time: '10:50', course_name: 'Phoenix Gold Golf & Country Club', entry_fee: 2650, description: 'Caddy & Cart Included', organizer_name: 'TRGG Pattaya', creator_type: 'organizer' },
  { title: 'TRGG - Eastern Star (Medal)', event_date: '2026-02-25', start_time: '10:00', departure_time: '09:00', course_name: 'Eastern Star Country Club', entry_fee: 2050, description: 'Monthly Medal Stroke. Caddy & Cart Included', organizer_name: 'TRGG Pattaya', creator_type: 'organizer' },
  { title: 'TRGG - Bangpakong', event_date: '2026-02-26', start_time: '09:45', departure_time: '08:30', course_name: 'Bangpakong Riverside Country Club', entry_fee: 1850, description: 'Caddy & Cart Included', organizer_name: 'TRGG Pattaya', creator_type: 'organizer' },
  { title: 'TRGG - Burapha (FFF + Scramble)', event_date: '2026-02-27', start_time: '10:00', departure_time: '09:00', course_name: 'Burapha Golf Club', entry_fee: 2950, description: 'Free Food Friday + Two Man Scramble. Caddy & Cart Included', organizer_name: 'TRGG Pattaya', creator_type: 'organizer' },
  { title: 'TRGG - Pleasant Valley', event_date: '2026-02-28', start_time: '11:40', departure_time: '10:30', course_name: 'Pleasant Valley Golf Club', entry_fee: 2350, description: 'Caddy & Cart Included', organizer_name: 'TRGG Pattaya', creator_type: 'organizer' }
];

async function insertEvents() {
  console.log(`Inserting ${events.length} TRGG February 2026 events...`);

  const response = await fetch(`${SUPABASE_URL}/rest/v1/society_events`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(events)
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Error inserting events:', error);
    return;
  }

  const data = await response.json();
  console.log(`Successfully inserted ${data.length} events!`);

  // Show summary
  data.forEach(e => {
    console.log(`  ${e.event_date} - ${e.title} @ ${e.start_time}`);
  });
}

insertEvents().catch(console.error);
