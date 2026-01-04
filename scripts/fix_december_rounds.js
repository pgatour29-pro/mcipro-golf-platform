const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient('https://pyeeplwsnupmhgbguwqs.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTg0MzY2OSwiZXhwIjoyMDc1NDE5NjY5fQ.yz1WTV7h_qpaJu3kQ0pEKHMF3rw-_fSLmdne_3Rb6Yc');

// Load January handicaps
const januaryFile = path.join(__dirname, '..', 'TRGGplayers', 'trgghcpjanuary', 'TRGG_Handicap_List.json');
const januaryData = JSON.parse(fs.readFileSync(januaryFile, 'utf8'));

// Build handicap lookup by normalized name
const handicapByName = {};
for (const p of januaryData.players) {
  // Convert "Lastname, Firstname" to "Firstname Lastname" for matching
  const parts = p.name.split(',').map(s => s.trim());
  if (parts.length === 2) {
    const normalized = (parts[1] + ' ' + parts[0]).toLowerCase();
    handicapByName[normalized] = p.handicap;
    // Also add original format
    handicapByName[p.name.toLowerCase()] = p.handicap;
  }
}

(async () => {
  console.log('Checking December 2025 rounds with handicap_used...\n');

  // Get December 2025 rounds
  const { data: rounds } = await supabase.from('rounds')
    .select('id, golfer_id, handicap_used, player_name, created_at')
    .gte('created_at', '2025-12-01')
    .order('created_at', { ascending: false });

  console.log('Total December rounds:', rounds ? rounds.length : 0);
  console.log('');

  let needsUpdate = 0;
  let updated = 0;

  for (const r of rounds || []) {
    // Get golfer name from profile
    const { data: profile } = await supabase.from('user_profiles')
      .select('name')
      .eq('line_user_id', r.golfer_id)
      .single();

    const name = profile?.name || r.player_name || 'Unknown';
    const nameLower = name.toLowerCase();

    // Find correct handicap from January data
    const correctHcp = handicapByName[nameLower];

    if (correctHcp !== undefined && r.handicap_used !== correctHcp) {
      console.log(name + ': ' + r.handicap_used + ' -> ' + correctHcp);
      needsUpdate++;

      // Update the round
      const { error } = await supabase.from('rounds')
        .update({ handicap_used: correctHcp })
        .eq('id', r.id);

      if (!error) updated++;
    }
  }

  console.log('\n---');
  console.log('Rounds needing update:', needsUpdate);
  console.log('Rounds updated:', updated);
})();
