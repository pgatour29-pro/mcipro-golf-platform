// Insert TRGG April 2026 Schedule into Supabase
const events = [
  {title:'TRGG - Hermes Links',event_date:'2026-04-01',start_time:'09:00',departure_time:'08:00',course_name:'Hermes Golf Club',entry_fee:2150,description:'Caddy & Cart Included',organizer_name:'TRGG Pattaya',format:'stableford',creator_type:'organizer'},
  {title:'TRGG - Phoenix',event_date:'2026-04-02',start_time:'11:05',departure_time:'10:05',course_name:'Phoenix Gold Golf & Country Club',entry_fee:2350,description:'Caddy & Cart Included',organizer_name:'TRGG Pattaya',format:'stableford',creator_type:'organizer'},
  {title:'TRGG - St Andrews (FFF)',event_date:'2026-04-03',start_time:'10:25',departure_time:'09:20',course_name:'St Andrews 2000',entry_fee:2250,description:'Free Food Friday. Caddy & Cart Included',organizer_name:'TRGG Pattaya',format:'stableford',creator_type:'organizer'},
  {title:'TRGG - Eastern Star',event_date:'2026-04-04',start_time:'10:00',departure_time:'09:00',course_name:'Eastern Star Country Club',entry_fee:2150,description:'Caddy & Cart Included',organizer_name:'TRGG Pattaya',format:'stableford',creator_type:'organizer'},
  {title:'TRGG - Greenwood (Holiday)',event_date:'2026-04-06',start_time:'12:10',departure_time:'11:00',course_name:'Greenwood Golf Club',entry_fee:1950,description:'Holiday. Caddy & Cart Included',organizer_name:'TRGG Pattaya',format:'stableford',creator_type:'organizer'},
  {title:'TRGG - Pleasant Valley',event_date:'2026-04-07',start_time:'09:35',departure_time:'08:25',course_name:'Pleasant Valley Golf Club',entry_fee:1850,description:'Caddy & Cart Included',organizer_name:'TRGG Pattaya',format:'stableford',creator_type:'organizer'},
  {title:'TRGG - Bangpakong',event_date:'2026-04-08',start_time:'11:20',departure_time:'10:00',course_name:'Bangpakong Riverside Country Club',entry_fee:1750,description:'Caddy & Cart Included',organizer_name:'TRGG Pattaya',format:'stableford',creator_type:'organizer'},
  {title:'TRGG - Phoenix',event_date:'2026-04-09',start_time:'10:40',departure_time:'09:40',course_name:'Phoenix Gold Golf & Country Club',entry_fee:2350,description:'Caddy & Cart Included',organizer_name:'TRGG Pattaya',format:'stableford',creator_type:'organizer'},
  {title:'TRGG - Green Valley (FFF)',event_date:'2026-04-10',start_time:'09:50',departure_time:'08:50',course_name:'Green Valley Country Club',entry_fee:2250,description:'Free Food Friday. Caddy & Cart Included',organizer_name:'TRGG Pattaya',format:'stableford',creator_type:'organizer'},
  {title:'TRGG - Plutaluang',event_date:'2026-04-11',start_time:'10:00',departure_time:'08:50',course_name:'Plutaluang Navy Golf Course',entry_fee:1750,description:'S-E. Caddy & Cart Included',organizer_name:'TRGG Pattaya',format:'stableford',creator_type:'organizer'},
  {title:'TRGG - Bangpra (Holiday)',event_date:'2026-04-13',start_time:'11:30',departure_time:'10:15',course_name:'Bangpra International Golf Club',entry_fee:2150,description:'Holiday. Caddy & Cart Included',organizer_name:'TRGG Pattaya',format:'stableford',creator_type:'organizer'},
  {title:'TRGG - Treasure Hill (Holiday)',event_date:'2026-04-14',start_time:'10:00',departure_time:'08:45',course_name:'Treasure Hill Golf & Country Club',entry_fee:1850,description:'Holiday. Caddy & Cart Included',organizer_name:'TRGG Pattaya',format:'stableford',creator_type:'organizer'},
  {title:'TRGG - Eastern Star (Holiday)',event_date:'2026-04-15',start_time:'11:00',departure_time:'10:00',course_name:'Eastern Star Country Club',entry_fee:2150,description:'Holiday. Caddy & Cart Included',organizer_name:'TRGG Pattaya',format:'stableford',creator_type:'organizer'},
  {title:'TRGG - Phoenix',event_date:'2026-04-16',start_time:'11:05',departure_time:'10:05',course_name:'Phoenix Gold Golf & Country Club',entry_fee:2350,description:'Caddy & Cart Included',organizer_name:'TRGG Pattaya',format:'stableford',creator_type:'organizer'},
  {title:'TRGG - St Andrews (FFF)',event_date:'2026-04-17',start_time:'10:40',departure_time:'09:40',course_name:'St Andrews 2000',entry_fee:2250,description:'Free Food Friday. Caddy & Cart Included',organizer_name:'TRGG Pattaya',format:'stableford',creator_type:'organizer'},
  {title:'TRGG - Mountain Shadow',event_date:'2026-04-18',start_time:'10:25',departure_time:'10:10',course_name:'Mountain Shadow Golf Club',entry_fee:1750,description:'Caddy & Cart Included',organizer_name:'TRGG Pattaya',format:'stableford',creator_type:'organizer'},
  {title:'TRGG - Pattaya C.C.',event_date:'2026-04-20',start_time:'09:45',departure_time:'08:45',course_name:'Pattaya Country Club',entry_fee:1950,description:'Caddy & Cart Included',organizer_name:'TRGG Pattaya',format:'stableford',creator_type:'organizer'},
  {title:'TRGG - Pleasant Valley',event_date:'2026-04-21',start_time:'09:35',departure_time:'08:25',course_name:'Pleasant Valley Golf Club',entry_fee:1850,description:'Caddy & Cart Included',organizer_name:'TRGG Pattaya',format:'stableford',creator_type:'organizer'},
  {title:'TRGG - Hermes Links',event_date:'2026-04-22',start_time:'10:00',departure_time:'09:00',course_name:'Hermes Golf Club',entry_fee:2150,description:'Caddy & Cart Included',organizer_name:'TRGG Pattaya',format:'stableford',creator_type:'organizer'},
  {title:'TRGG - Phoenix',event_date:'2026-04-23',start_time:'11:15',departure_time:'10:15',course_name:'Phoenix Gold Golf & Country Club',entry_fee:2350,description:'Caddy & Cart Included',organizer_name:'TRGG Pattaya',format:'stableford',creator_type:'organizer'},
  {title:'TRGG - Green Valley (Scramble)',event_date:'2026-04-24',start_time:'09:45',departure_time:'08:45',course_name:'Green Valley Country Club',entry_fee:2550,description:'Two Man Scramble. Caddy & Cart Included',organizer_name:'TRGG Pattaya',format:'scramble',creator_type:'organizer'},
  {title:'TRGG - Plutaluang',event_date:'2026-04-25',start_time:'10:00',departure_time:'08:50',course_name:'Plutaluang Navy Golf Course',entry_fee:1750,description:'N-W. Caddy & Cart Included',organizer_name:'TRGG Pattaya',format:'stableford',creator_type:'organizer'},
  {title:'TRGG - Pattaya C.C.',event_date:'2026-04-27',start_time:'09:45',departure_time:'08:45',course_name:'Pattaya Country Club',entry_fee:1950,description:'Caddy & Cart Included',organizer_name:'TRGG Pattaya',format:'stableford',creator_type:'organizer'},
  {title:'TRGG - Bangpakong',event_date:'2026-04-28',start_time:'11:10',departure_time:'09:50',course_name:'Bangpakong Riverside Country Club',entry_fee:1750,description:'Caddy & Cart Included',organizer_name:'TRGG Pattaya',format:'stableford',creator_type:'organizer'},
  {title:'TRGG - Greenwood (Medal)',event_date:'2026-04-29',start_time:'12:10',departure_time:'11:00',course_name:'Greenwood Golf Club',entry_fee:1750,description:'Monthly Medal Stroke. Caddy & Cart Included',organizer_name:'TRGG Pattaya',format:'stroke_play',creator_type:'organizer'},
  {title:'TRGG - Phoenix',event_date:'2026-04-30',start_time:'10:55',departure_time:'09:55',course_name:'Phoenix Gold Golf & Country Club',entry_fee:2350,description:'Caddy & Cart Included',organizer_name:'TRGG Pattaya',format:'stableford',creator_type:'organizer'}
];

async function insert() {
  const resp = await fetch('https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/society_events', {
    method: 'POST',
    headers: {
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTg0MzY2OSwiZXhwIjoyMDc1NDE5NjY5fQ.yz1WTV7h_qpaJu3kQ0pEKHMF3rw-_fSLmdne_3Rb6Yc',
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTg0MzY2OSwiZXhwIjoyMDc1NDE5NjY5fQ.yz1WTV7h_qpaJu3kQ0pEKHMF3rw-_fSLmdne_3Rb6Yc',
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(events)
  });
  const data = await resp.json();
  if (!resp.ok) { console.error('ERROR:', JSON.stringify(data, null, 2)); process.exit(1); }
  console.log(`Inserted ${data.length} events:`);
  data.forEach(e => console.log(`  ${e.event_date} ${e.title} (${e.format})`));
}
insert();
