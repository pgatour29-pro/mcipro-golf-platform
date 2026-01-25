/**
 * Check Alan Thomas, Ryan Thomas, and Pluto:
 * 1. Profile handicaps
 * 2. Society handicaps
 * 3. Round history with duplicates
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://pyeeplwsnupmhgbguwqs.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTg0MzY2OSwiZXhwIjoyMDc1NDE5NjY5fQ.yz1WTV7h_qpaJu3kQ0pEKHMF3rw-_fSLmdne_3Rb6Yc';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// Player IDs from fix_alan_ryan_pluto_handicaps.sql
const PLAYERS = [
  { name: 'Alan Thomas', id: 'U214f2fe47e1681fbb26f0aba95930d64' },
  { name: 'Ryan Thomas', id: 'TRGG-GUEST-1002' },
  { name: 'Pluto', id: 'MANUAL-1768008205248-jvtubbk' }
];

async function checkPlayers() {
  console.log('='.repeat(70));
  console.log('CHECKING ALAN THOMAS, RYAN THOMAS, AND PLUTO');
  console.log('='.repeat(70));

  const duplicatesToDelete = [];

  for (const player of PLAYERS) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`PLAYER: ${player.name}`);
    console.log(`ID: ${player.id}`);
    console.log('='.repeat(70));

    // 1. Check user_profiles handicap
    console.log('\n📋 USER PROFILE:');
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('name, handicap_index, profile_data')
      .eq('line_user_id', player.id)
      .single();

    if (profileError) {
      console.log(`   ❌ Error: ${profileError.message}`);
    } else if (profile) {
      console.log(`   Name: ${profile.name}`);
      console.log(`   handicap_index: ${profile.handicap_index ?? 'NULL'}`);
      console.log(`   profile_data.handicap: ${profile.profile_data?.handicap ?? 'NULL'}`);
      console.log(`   profile_data.golfInfo.handicap: ${profile.profile_data?.golfInfo?.handicap ?? 'NULL'}`);
    } else {
      console.log(`   ⚠️ No profile found`);
    }

    // 2. Check society_handicaps
    console.log('\n🏌️ SOCIETY HANDICAPS:');
    const { data: societyHcps, error: shError } = await supabase
      .from('society_handicaps')
      .select('society_id, handicap_index, rounds_count, last_calculated_at')
      .eq('golfer_id', player.id);

    if (shError) {
      console.log(`   ❌ Error: ${shError.message}`);
    } else if (societyHcps && societyHcps.length > 0) {
      for (const sh of societyHcps) {
        const societyName = sh.society_id === null ? 'Universal' : sh.society_id.substring(0, 8) + '...';
        const hcpDisplay = sh.handicap_index < 0 ? `+${Math.abs(sh.handicap_index)}` : sh.handicap_index;
        console.log(`   ${societyName}: ${hcpDisplay} (${sh.rounds_count} rounds)`);
      }
    } else {
      console.log(`   ⚠️ No society handicaps found`);
    }

    // 3. Check rounds and find duplicates
    console.log('\n📊 ROUND HISTORY:');
    const { data: rounds, error: roundsError } = await supabase
      .from('rounds')
      .select('id, course_name, total_gross, completed_at, status, created_at')
      .eq('golfer_id', player.id)
      .order('completed_at', { ascending: false });

    if (roundsError) {
      console.log(`   ❌ Error: ${roundsError.message}`);
    } else if (rounds && rounds.length > 0) {
      console.log(`   Total rounds: ${rounds.length}`);

      // Group by date to find duplicates
      const byDate = {};
      for (const round of rounds) {
        const dateKey = round.completed_at
          ? new Date(round.completed_at).toISOString().split('T')[0]
          : round.created_at
            ? new Date(round.created_at).toISOString().split('T')[0]
            : 'unknown';

        if (!byDate[dateKey]) {
          byDate[dateKey] = [];
        }
        byDate[dateKey].push(round);
      }

      console.log('\n   Rounds by date:');
      for (const [date, dateRounds] of Object.entries(byDate).sort((a, b) => b[0].localeCompare(a[0]))) {
        const isDuplicate = dateRounds.length > 1;
        const marker = isDuplicate ? '⚠️ DUPLICATE' : '✅';

        console.log(`\n   ${date}: ${dateRounds.length} round(s) ${marker}`);

        for (let i = 0; i < dateRounds.length; i++) {
          const r = dateRounds[i];
          const prefix = isDuplicate && i > 0 ? '      🗑️ DELETE:' : '      ';
          console.log(`${prefix} ID: ${r.id.substring(0, 8)}... | ${r.course_name || 'Unknown'} | Gross: ${r.total_gross ?? 'N/A'} | ${r.status}`);

          // Mark for deletion (keep first, delete rest)
          if (isDuplicate && i > 0) {
            duplicatesToDelete.push({
              player: player.name,
              id: r.id,
              date,
              course: r.course_name,
              gross: r.total_gross
            });
          }
        }
      }
    } else {
      console.log(`   ⚠️ No rounds found`);
    }
  }

  // Summary of duplicates to delete
  if (duplicatesToDelete.length > 0) {
    console.log('\n\n' + '='.repeat(70));
    console.log('DUPLICATES TO DELETE');
    console.log('='.repeat(70));
    console.log(`Found ${duplicatesToDelete.length} duplicate round(s) to delete:\n`);

    for (const dup of duplicatesToDelete) {
      console.log(`  ${dup.player} | ${dup.date} | ${dup.course} | Gross: ${dup.gross}`);
      console.log(`    ID: ${dup.id}`);
    }

    // Generate DELETE SQL
    console.log('\n\n📝 SQL TO DELETE DUPLICATES:');
    console.log('-'.repeat(70));
    console.log('-- Run this in Supabase SQL Editor to delete duplicates\n');
    console.log('DELETE FROM rounds WHERE id IN (');
    duplicatesToDelete.forEach((dup, i) => {
      const comma = i < duplicatesToDelete.length - 1 ? ',' : '';
      console.log(`  '${dup.id}'${comma}  -- ${dup.player} ${dup.date}`);
    });
    console.log(');');
    console.log('-'.repeat(70));
  } else {
    console.log('\n\n✅ No duplicate rounds found!');
  }
}

checkPlayers().catch(console.error);
