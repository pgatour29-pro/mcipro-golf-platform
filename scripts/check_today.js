const SUPABASE_URL = 'https://pyeeplwsnupmhgbguwqs.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk';

async function check() {
  // Get scores for today's scorecards
  const resp = await fetch(
    `${SUPABASE_URL}/rest/v1/scores?scorecard_id=in.(70baaee4-7774-4db1-8805-e34cf7b95330,58089652-3efd-4274-9a15-e9aa582b4c3b)&select=scorecard_id,hole_number,gross_score,par,stroke_index,stableford_points,net_score&order=scorecard_id,hole_number`,
    { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
  );
  const data = await resp.json();

  const groups = {};
  data.forEach(h => {
    if (!groups[h.scorecard_id]) groups[h.scorecard_id] = [];
    groups[h.scorecard_id].push(h);
  });

  for (const [scId, holes] of Object.entries(groups)) {
    const name = scId === '70baaee4-7774-4db1-8805-e34cf7b95330' ? 'Jeff Jung' : 'Pete Park';
    console.log(`\n=== ${name} (${holes.length} holes) ===`);
    let tg = 0, tp = 0, ts = 0;
    holes.forEach(h => {
      tg += h.gross_score || 0;
      tp += h.par || 0;
      ts += h.stableford_points || 0;
      console.log(`H${h.hole_number}: gross=${h.gross_score} par=${h.par} SI=${h.stroke_index} stab=${h.stableford_points} net=${h.net_score}`);
    });
    console.log(`TOTALS: gross=${tg} par=${tp} stableford=${ts}`);
  }

  if (Object.keys(groups).length === 0) {
    console.log('NO SCORES FOUND in scores table for these scorecards');
  }

  // Also check rounds table for today
  const roundsResp = await fetch(
    `${SUPABASE_URL}/rest/v1/rounds?played_at=gte.2026-01-30&select=id,golfer_id,player_name,course_name,total_gross,total_stableford,handicap_used,holes_played`,
    { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
  );
  const rounds = await roundsResp.json();
  console.log('\n=== ROUNDS FROM TODAY ===');
  if (Array.isArray(rounds) && rounds.length > 0) {
    rounds.forEach(r => console.log(JSON.stringify(r)));
  } else {
    console.log('NO ROUNDS FOUND for today');
  }
}

check().catch(console.error);
