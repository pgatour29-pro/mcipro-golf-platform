/**
 * TRGG Handicap Update Script
 * Updates Travellers Rest Golf Group player handicaps from official list
 *
 * SURGICAL PROCEDURE - DO NOT MESS THIS UP
 *
 * Created: 2025-12-27
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://pyeeplwsnupmhgbguwqs.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTg0MzY2OSwiZXhwIjoyMDc1NDE5NjY5fQ.yz1WTV7h_qpaJu3kQ0pEKHMF3rw-_fSLmdne_3Rb6Yc';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Read the handicap file
const HANDICAP_FILE = path.join(__dirname, '..', 'TRGGplayers', 'trgghcpjanuary', 'TRGG_Handicap_List.json');

// Stats tracking
let stats = {
  totalInFile: 0,
  societyMembersFound: 0,
  matched: 0,
  updated: 0,
  inserted: 0,
  unchanged: 0,
  notMatched: [],
  errors: []
};

/**
 * Normalize a name for matching
 * Handles: "Lastname, Firstname" -> "firstname lastname"
 */
function normalizeName(name) {
  if (!name) return '';

  let normalized = name.toLowerCase().trim();

  // Remove special suffixes like "(HH)"
  normalized = normalized.replace(/\s*\([^)]*\)\s*$/, '');

  // Handle "Lastname, Firstname" format
  if (normalized.includes(',')) {
    const parts = normalized.split(',').map(p => p.trim());
    if (parts.length === 2) {
      // Return as "firstname lastname"
      normalized = `${parts[1]} ${parts[0]}`;
    }
  }

  // Remove extra whitespace
  normalized = normalized.replace(/\s+/g, ' ').trim();

  return normalized;
}

/**
 * Generate multiple name variants for matching
 */
function getNameVariants(name) {
  const variants = new Set();
  const normalized = normalizeName(name);
  variants.add(normalized);

  // Also add original lowercase
  variants.add(name.toLowerCase().trim());

  // For "Lastname, Firstname", also try "Firstname Lastname"
  if (name.includes(',')) {
    const parts = name.split(',').map(p => p.trim().toLowerCase());
    if (parts.length === 2) {
      variants.add(`${parts[1]} ${parts[0]}`);
      // Try with middle names/initials removed
      const firstParts = parts[1].split(' ');
      if (firstParts.length > 1) {
        variants.add(`${firstParts[0]} ${parts[0]}`);
      }
    }
  }

  return [...variants];
}

async function main() {
  console.log('='.repeat(70));
  console.log('TRGG HANDICAP UPDATE - SURGICAL PROCEDURE');
  console.log('='.repeat(70));
  console.log('');

  // Step 1: Read the handicap file
  console.log('Step 1: Reading handicap file...');

  if (!fs.existsSync(HANDICAP_FILE)) {
    console.error(`ERROR: File not found: ${HANDICAP_FILE}`);
    process.exit(1);
  }

  const fileData = JSON.parse(fs.readFileSync(HANDICAP_FILE, 'utf8'));
  const players = fileData.players;
  stats.totalInFile = players.length;

  console.log(`   Found ${stats.totalInFile} players in file`);
  console.log(`   Last updated: ${fileData.lastUpdated}`);
  console.log('');

  // Step 2: Get Travellers Rest society ID
  console.log('Step 2: Finding Travellers Rest society...');

  const { data: societies, error: societyError } = await supabase
    .from('society_profiles')
    .select('id, society_name')
    .ilike('society_name', '%travellers%rest%');

  if (societyError) {
    console.error('ERROR: Failed to query societies:', societyError.message);
    process.exit(1);
  }

  if (!societies || societies.length === 0) {
    console.error('ERROR: Travellers Rest society not found!');
    process.exit(1);
  }

  const trggSociety = societies[0];
  console.log(`   Found: ${trggSociety.society_name}`);
  console.log(`   ID: ${trggSociety.id}`);
  console.log('');

  // Step 3: Get all TRGG society members with LINE IDs
  console.log('Step 3: Fetching society members...');

  // Get society members
  const { data: members, error: membersError } = await supabase
    .from('society_members')
    .select('golfer_id, status')
    .eq('society_id', trggSociety.id)
    .eq('status', 'active');

  if (membersError) {
    console.error('ERROR: Failed to query members:', membersError.message);
    process.exit(1);
  }

  const memberIds = members?.map(m => m.golfer_id).filter(Boolean) || [];
  console.log(`   Found ${memberIds.length} active society members`);

  // Get user profiles in batches (avoid oversized queries)
  const BATCH_SIZE = 100;
  const profiles = [];

  for (let i = 0; i < memberIds.length; i += BATCH_SIZE) {
    const batch = memberIds.slice(i, i + BATCH_SIZE);
    const { data: batchProfiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('line_user_id, name, profile_data')
      .in('line_user_id', batch);

    if (profilesError) {
      console.error(`ERROR: Failed to query profiles batch ${i}:`, profilesError.message);
      process.exit(1);
    }

    if (batchProfiles) {
      profiles.push(...batchProfiles);
    }

    // Progress indicator
    process.stdout.write(`   Fetched ${Math.min(i + BATCH_SIZE, memberIds.length)}/${memberIds.length} profiles\r`);
  }

  console.log('');
  stats.societyMembersFound = profiles?.length || 0;
  console.log(`   Found ${stats.societyMembersFound} member profiles in database`);
  console.log('');

  // Build lookup map: normalized name -> member data
  const membersByName = new Map();
  const membersByLineId = new Map();

  for (const profile of profiles || []) {
    if (!profile?.line_user_id) continue;

    const lineId = profile.line_user_id;
    let displayName = profile.name || '';

    // Also check profile_data for name
    if (!displayName && profile.profile_data?.displayName) {
      displayName = profile.profile_data.displayName;
    }

    membersByLineId.set(lineId, { lineId, name: displayName });

    // Add all name variants
    if (displayName) {
      const normalized = displayName.toLowerCase().trim();
      membersByName.set(normalized, { lineId, name: displayName });

      // Also add reversed name
      const parts = normalized.split(' ');
      if (parts.length === 2) {
        membersByName.set(`${parts[1]} ${parts[0]}`, { lineId, name: displayName });
        membersByName.set(`${parts[1]}, ${parts[0]}`, { lineId, name: displayName });
      }
    }
  }

  console.log(`   Built name lookup with ${membersByName.size} entries`);
  console.log('');

  // Step 4: Get existing society_handicaps for TRGG
  console.log('Step 4: Fetching existing handicaps...');

  const { data: existingHandicaps, error: hcpError } = await supabase
    .from('society_handicaps')
    .select('golfer_id, handicap_index')
    .eq('society_id', trggSociety.id);

  if (hcpError) {
    console.error('ERROR: Failed to query handicaps:', hcpError.message);
    process.exit(1);
  }

  const existingHcpMap = new Map();
  for (const h of existingHandicaps || []) {
    existingHcpMap.set(h.golfer_id, h.handicap_index);
  }

  console.log(`   Found ${existingHcpMap.size} existing handicap records`);
  console.log('');

  // Step 5: Match and update
  console.log('Step 5: Matching players and preparing updates...');
  console.log('');

  const updates = [];
  const inserts = [];

  for (const player of players) {
    const variants = getNameVariants(player.name);
    let matched = null;

    for (const variant of variants) {
      if (membersByName.has(variant)) {
        matched = membersByName.get(variant);
        break;
      }
    }

    if (!matched) {
      stats.notMatched.push(player.name);
      continue;
    }

    stats.matched++;

    const existingHcp = existingHcpMap.get(matched.lineId);
    const newHcp = player.handicap;

    if (existingHcp !== undefined) {
      if (Math.abs(existingHcp - newHcp) > 0.01) {
        updates.push({
          lineId: matched.lineId,
          name: matched.name,
          oldHcp: existingHcp,
          newHcp: newHcp
        });
      } else {
        stats.unchanged++;
      }
    } else {
      inserts.push({
        lineId: matched.lineId,
        name: matched.name,
        newHcp: newHcp
      });
    }
  }

  console.log(`   Matched: ${stats.matched}`);
  console.log(`   Updates needed: ${updates.length}`);
  console.log(`   Inserts needed: ${inserts.length}`);
  console.log(`   Unchanged: ${stats.unchanged}`);
  console.log(`   Not matched: ${stats.notMatched.length}`);
  console.log('');

  // Step 6: Execute updates to society_handicaps
  if (updates.length > 0) {
    console.log('Step 6: Executing society_handicaps updates...');
    console.log('');

    for (const u of updates) {
      const { error } = await supabase
        .from('society_handicaps')
        .update({
          handicap_index: u.newHcp,
          calculation_method: 'MANUAL',
          last_calculated_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('golfer_id', u.lineId)
        .eq('society_id', trggSociety.id);

      if (error) {
        console.log(`   ERROR updating ${u.name}: ${error.message}`);
        stats.errors.push({ name: u.name, error: error.message });
      } else {
        console.log(`   Updated ${u.name}: ${u.oldHcp} -> ${u.newHcp}`);
        stats.updated++;
      }
    }
    console.log('');
  }

  // Step 7: Execute inserts to society_handicaps
  if (inserts.length > 0) {
    console.log('Step 7: Executing society_handicaps inserts...');
    console.log('');

    for (const i of inserts) {
      const { error } = await supabase
        .from('society_handicaps')
        .insert({
          golfer_id: i.lineId,
          society_id: trggSociety.id,
          handicap_index: i.newHcp,
          calculation_method: 'MANUAL',
          last_calculated_at: new Date().toISOString()
        });

      if (error) {
        console.log(`   ERROR inserting ${i.name}: ${error.message}`);
        stats.errors.push({ name: i.name, error: error.message });
      } else {
        console.log(`   Inserted ${i.name}: ${i.newHcp}`);
        stats.inserted++;
      }
    }
    console.log('');
  }

  // Step 8: Update profile_data for ALL matched players
  console.log('Step 8: Updating profile_data for all matched players...');
  console.log('');

  let profileUpdates = 0;
  const allMatched = [...updates, ...inserts];

  // Also include unchanged players that need profile sync
  for (const player of players) {
    const variants = getNameVariants(player.name);
    let matched = null;

    for (const variant of variants) {
      if (membersByName.has(variant)) {
        matched = membersByName.get(variant);
        break;
      }
    }

    if (matched) {
      // Get current profile
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('profile_data')
        .eq('line_user_id', matched.lineId)
        .single();

      if (profile?.profile_data) {
        const currentHcp = profile.profile_data.golfInfo?.handicap || profile.profile_data.handicap;
        const newHcpStr = String(player.handicap);

        // Only update if different
        if (currentHcp !== newHcpStr) {
          const updatedData = { ...profile.profile_data };
          updatedData.handicap = newHcpStr;
          if (!updatedData.golfInfo) updatedData.golfInfo = {};
          updatedData.golfInfo.handicap = newHcpStr;
          updatedData.golfInfo.lastHandicapUpdate = new Date().toISOString();

          const { error } = await supabase
            .from('user_profiles')
            .update({ profile_data: updatedData })
            .eq('line_user_id', matched.lineId);

          if (!error) {
            profileUpdates++;
            if (profileUpdates <= 20) {
              console.log(`   Profile updated ${matched.name}: ${currentHcp} -> ${newHcpStr}`);
            }
          }
        }
      }
    }
  }

  if (profileUpdates > 20) {
    console.log(`   ... and ${profileUpdates - 20} more`);
  }
  console.log(`   Total profile updates: ${profileUpdates}`);
  console.log('');

  // Summary
  console.log('='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));
  console.log(`Total in file:        ${stats.totalInFile}`);
  console.log(`Society members:      ${stats.societyMembersFound}`);
  console.log(`Matched:              ${stats.matched}`);
  console.log(`Updated:              ${stats.updated}`);
  console.log(`Inserted:             ${stats.inserted}`);
  console.log(`Unchanged:            ${stats.unchanged}`);
  console.log(`Not matched:          ${stats.notMatched.length}`);
  console.log(`Errors:               ${stats.errors.length}`);
  console.log('');

  if (stats.notMatched.length > 0 && stats.notMatched.length <= 50) {
    console.log('Not matched players (first 50):');
    stats.notMatched.slice(0, 50).forEach(n => console.log(`   - ${n}`));
    console.log('');
  }

  if (stats.errors.length > 0) {
    console.log('Errors:');
    stats.errors.forEach(e => console.log(`   - ${e.name}: ${e.error}`));
    console.log('');
  }

  console.log('='.repeat(70));
  console.log('DONE');
  console.log('='.repeat(70));
}

main().catch(err => {
  console.error('FATAL ERROR:', err);
  process.exit(1);
});
