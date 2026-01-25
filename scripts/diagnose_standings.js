/**
 * Diagnose Standings Issues
 * Check event_results, points assignment, and data consistency
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://pyeeplwsnupmhgbguwqs.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTg0MzY2OSwiZXhwIjoyMDc1NDE5NjY5fQ.yz1WTV7h_qpaJu3kQ0pEKHMF3rw-_fSLmdne_3Rb6Yc';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function diagnose() {
  console.log('='.repeat(70));
  console.log('DIAGNOSING STANDINGS & LEADERBOARD ISSUES');
  console.log('='.repeat(70));

  // 1. Check event_results table
  console.log('\n📊 1. EVENT_RESULTS TABLE:');
  const { data: results, error: resultsErr } = await supabase
    .from('event_results')
    .select('*')
    .order('event_date', { ascending: false })
    .limit(50);

  if (resultsErr) {
    console.log(`   ❌ Error: ${resultsErr.message}`);
  } else {
    console.log(`   Total records fetched: ${results?.length || 0}`);

    if (results && results.length > 0) {
      // Check for NULL points
      const nullPoints = results.filter(r => r.points_earned === null);
      const zeroPoints = results.filter(r => r.points_earned === 0);
      const hasPoints = results.filter(r => r.points_earned > 0);

      console.log(`   With points > 0: ${hasPoints.length}`);
      console.log(`   With points = 0: ${zeroPoints.length}`);
      console.log(`   With points NULL: ${nullPoints.length}`);

      // Show sample records
      console.log('\n   Recent event_results:');
      results.slice(0, 10).forEach(r => {
        console.log(`   ${r.event_date || 'no date'} | Pos: ${r.position || 'N/A'} | Pts: ${r.points_earned ?? 'NULL'} | ${r.player_name || r.player_id?.substring(0,15)}`);
      });
    }
  }

  // 2. Check total count
  console.log('\n📊 2. TOTAL EVENT_RESULTS COUNT:');
  const { count: totalCount, error: countErr } = await supabase
    .from('event_results')
    .select('*', { count: 'exact', head: true });

  if (countErr) {
    console.log(`   ❌ Error: ${countErr.message}`);
  } else {
    console.log(`   Total records: ${totalCount}`);
  }

  // 3. Check society_events that have results
  console.log('\n📊 3. SOCIETY EVENTS WITH RESULTS:');
  const { data: events, error: eventsErr } = await supabase
    .from('society_events')
    .select('id, title, event_date, results_published, point_allocation')
    .order('event_date', { ascending: false })
    .limit(20);

  if (eventsErr) {
    console.log(`   ❌ Error: ${eventsErr.message}`);
  } else {
    console.log(`   Recent events: ${events?.length || 0}`);

    if (events && events.length > 0) {
      const published = events.filter(e => e.results_published);
      console.log(`   Results published: ${published.length}`);
      console.log(`   Results NOT published: ${events.length - published.length}`);

      console.log('\n   Event details:');
      events.slice(0, 10).forEach(e => {
        const hasPoints = e.point_allocation ? 'Has point config' : 'No point config';
        const status = e.results_published ? '✅ Published' : '❌ Not published';
        console.log(`   ${e.event_date || 'no date'} | ${e.title?.substring(0,30) || 'Untitled'} | ${status} | ${hasPoints}`);
      });
    }
  }

  // 4. Check if event_results links properly to events
  console.log('\n📊 4. EVENT_RESULTS <-> SOCIETY_EVENTS LINKAGE:');
  const { data: linkedResults, error: linkErr } = await supabase
    .from('event_results')
    .select(`
      id,
      event_id,
      player_name,
      points_earned,
      society_events!inner(id, title, event_date)
    `)
    .limit(10);

  if (linkErr) {
    console.log(`   ❌ Error joining tables: ${linkErr.message}`);
    console.log(`   This might indicate a foreign key issue or missing data`);
  } else {
    console.log(`   Successfully linked records: ${linkedResults?.length || 0}`);
  }

  // 5. Check unique players in event_results
  console.log('\n📊 5. UNIQUE PLAYERS IN STANDINGS:');
  const { data: uniquePlayers, error: playersErr } = await supabase
    .from('event_results')
    .select('player_id, player_name')
    .limit(100);

  if (playersErr) {
    console.log(`   ❌ Error: ${playersErr.message}`);
  } else {
    const uniqueIds = [...new Set(uniquePlayers?.map(p => p.player_id) || [])];
    console.log(`   Unique player IDs: ${uniqueIds.length}`);

    // Show sample player IDs to check format
    console.log('\n   Sample player IDs:');
    uniqueIds.slice(0, 5).forEach(id => {
      console.log(`   - ${id}`);
    });
  }

  // 6. Check point values distribution
  console.log('\n📊 6. POINTS DISTRIBUTION:');
  const { data: pointDist, error: pointErr } = await supabase
    .from('event_results')
    .select('position, points_earned')
    .not('points_earned', 'is', null)
    .order('position', { ascending: true })
    .limit(50);

  if (pointErr) {
    console.log(`   ❌ Error: ${pointErr.message}`);
  } else if (pointDist && pointDist.length > 0) {
    // Group by position
    const byPosition = {};
    pointDist.forEach(r => {
      const pos = r.position || 'unknown';
      if (!byPosition[pos]) byPosition[pos] = [];
      byPosition[pos].push(r.points_earned);
    });

    console.log('   Points by position:');
    Object.entries(byPosition).slice(0, 10).forEach(([pos, pts]) => {
      const uniquePts = [...new Set(pts)];
      console.log(`   Position ${pos}: ${uniquePts.join(', ')} pts`);
    });
  } else {
    console.log('   ⚠️ No records with points found!');
  }

  // 7. Check if standings query would work
  console.log('\n📊 7. SIMULATED STANDINGS QUERY:');
  const currentYear = new Date().getFullYear();
  const { data: standings, error: standingsErr } = await supabase
    .from('event_results')
    .select('player_id, player_name, points_earned, position')
    .gte('event_date', `${currentYear}-01-01`)
    .lte('event_date', `${currentYear}-12-31`);

  if (standingsErr) {
    console.log(`   ❌ Error: ${standingsErr.message}`);
  } else {
    console.log(`   Records for ${currentYear}: ${standings?.length || 0}`);

    if (standings && standings.length > 0) {
      // Aggregate by player
      const playerTotals = {};
      standings.forEach(s => {
        if (!playerTotals[s.player_id]) {
          playerTotals[s.player_id] = {
            name: s.player_name,
            total_points: 0,
            events: 0,
            wins: 0
          };
        }
        playerTotals[s.player_id].total_points += (s.points_earned || 0);
        playerTotals[s.player_id].events++;
        if (s.position === 1) playerTotals[s.player_id].wins++;
      });

      // Sort by total points
      const sorted = Object.entries(playerTotals)
        .sort((a, b) => b[1].total_points - a[1].total_points)
        .slice(0, 10);

      console.log(`\n   Top 10 standings for ${currentYear}:`);
      sorted.forEach(([id, data], idx) => {
        console.log(`   ${idx + 1}. ${data.name || id.substring(0,15)} | ${data.total_points} pts | ${data.events} events | ${data.wins} wins`);
      });
    } else {
      console.log(`   ⚠️ No event results for ${currentYear}!`);
    }
  }

  // 8. Check RLS policies
  console.log('\n📊 8. CHECKING TABLE ACCESS:');

  // Try as anon user
  const anonClient = createClient(SUPABASE_URL, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.mCRWL22s9KNg-PWx3PvgGltJeyyyh6NBjTxmV-mWN3s');

  const { data: anonData, error: anonErr } = await anonClient
    .from('event_results')
    .select('id')
    .limit(1);

  if (anonErr) {
    console.log(`   ⚠️ Anon access blocked: ${anonErr.message}`);
    console.log(`   This could prevent frontend from reading standings!`);
  } else {
    console.log(`   ✅ Anon access works`);
  }

  console.log('\n' + '='.repeat(70));
  console.log('DIAGNOSIS COMPLETE');
  console.log('='.repeat(70));
}

diagnose().catch(console.error);
