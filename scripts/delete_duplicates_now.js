/**
 * Delete duplicate rounds for Alan Thomas and Pluto
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://pyeeplwsnupmhgbguwqs.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTg0MzY2OSwiZXhwIjoyMDc1NDE5NjY5fQ.yz1WTV7h_qpaJu3kQ0pEKHMF3rw-_fSLmdne_3Rb6Yc';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const DUPLICATES_TO_DELETE = [
  { id: 'df939097-b347-4a9e-a3a6-c813ebc7cfd5', player: 'Alan Thomas', course: 'Mountain Shadow', gross: 87 },
  { id: '07b76190-7f95-44d9-baa2-c5f92789933a', player: 'Alan Thomas', course: 'BRC', gross: 79 },
  { id: '66118e91-2c17-4890-80da-505fda24185c', player: 'Alan Thomas', course: 'Eastern Star', gross: 86 },
  { id: '6f4e47ac-1ea0-4975-9aca-55d24e385449', player: 'Alan Thomas', course: 'Treasure Hill', gross: 84 },
  { id: '4f1fab12-d3eb-4b65-a549-3c70ef6f881a', player: 'Alan Thomas', course: 'Greenwood', gross: 86 },
  { id: '2dadc418-c1d1-4d98-ab8d-6e99d0d5ce49', player: 'Pluto', course: 'Green Valley', gross: 7 }
];

async function deleteDuplicates() {
  console.log('='.repeat(70));
  console.log('DELETING DUPLICATE ROUNDS');
  console.log('='.repeat(70));

  let deleted = 0;
  let failed = 0;

  for (const dup of DUPLICATES_TO_DELETE) {
    console.log(`\nDeleting: ${dup.player} | ${dup.course} | Gross: ${dup.gross}`);
    console.log(`   ID: ${dup.id}`);

    const { error } = await supabase
      .from('rounds')
      .delete()
      .eq('id', dup.id);

    if (error) {
      console.log(`   ❌ Error: ${error.message}`);
      failed++;
    } else {
      console.log(`   ✅ Deleted`);
      deleted++;
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));
  console.log(`✅ Deleted: ${deleted}`);
  console.log(`❌ Failed: ${failed}`);

  // Verify remaining rounds
  console.log('\n📊 VERIFICATION:');

  // Alan Thomas
  const { data: alanRounds } = await supabase
    .from('rounds')
    .select('id, course_name, total_gross, completed_at')
    .eq('golfer_id', 'U214f2fe47e1681fbb26f0aba95930d64')
    .order('completed_at', { ascending: false });

  console.log(`\nAlan Thomas: ${alanRounds?.length || 0} rounds`);
  if (alanRounds) {
    const dec14 = alanRounds.filter(r => r.completed_at?.startsWith('2025-12-14'));
    console.log(`   Dec 14, 2025: ${dec14.length} round(s)`);
    dec14.forEach(r => console.log(`      ${r.course_name} | Gross: ${r.total_gross}`));
  }

  // Pluto
  const { data: plutoRounds } = await supabase
    .from('rounds')
    .select('id, course_name, total_gross, completed_at')
    .eq('golfer_id', 'MANUAL-1768008205248-jvtubbk')
    .order('completed_at', { ascending: false });

  console.log(`\nPluto: ${plutoRounds?.length || 0} rounds`);
  if (plutoRounds) {
    const jan13 = plutoRounds.filter(r => r.completed_at?.startsWith('2026-01-13'));
    console.log(`   Jan 13, 2026: ${jan13.length} round(s)`);
    jan13.forEach(r => console.log(`      ${r.course_name} | Gross: ${r.total_gross}`));
  }
}

deleteDuplicates().catch(console.error);
