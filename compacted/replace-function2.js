const fs = require('fs');

// Read the file
const content = fs.readFileSync('index.html', 'utf8');
const lines = content.split('\n');

// Find the function start
let startLine = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === 'saveRoundToHistory(player) {') {
        startLine = i;
        break;
    }
}

if (startLine === -1) {
    console.error('ERROR: Could not find saveRoundToHistory function start');
    process.exit(1);
}

console.log(`Found function start at line ${startLine + 1}`);

// Find the function end (matching closing brace at same indentation level)
let endLine = -1;
let braceCount = 0;
const startIndent = lines[startLine].match(/^(\s*)/)[1];

for (let i = startLine; i < lines.length; i++) {
    const line = lines[i];
    // Count braces
    for (const char of line) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
    }

    // Check if we've closed all braces
    if (braceCount === 0 && i > startLine) {
        endLine = i;
        break;
    }
}

if (endLine === -1) {
    console.error('ERROR: Could not find function end');
    process.exit(1);
}

console.log(`Found function end at line ${endLine + 1}`);
console.log(`Function spans ${endLine - startLine + 1} lines`);

// New async function
const newFunctionLines = [
    `${startIndent}async saveRoundToHistory(player) {`,
    `${startIndent}    try {`,
    `${startIndent}        // Skip if no scores recorded`,
    `${startIndent}        let holesPlayed = 0;`,
    `${startIndent}        for (let hole = 1; hole <= 18; hole++) {`,
    `${startIndent}            if (this.scoresCache[player.id]?.[hole]) holesPlayed++;`,
    `${startIndent}        }`,
    `${startIndent}`,
    `${startIndent}        if (holesPlayed === 0) {`,
    `${startIndent}            console.log(\`[LiveScorecard] Skipping history save for \${player.name} - no scores recorded\`);`,
    `${startIndent}            return null;`,
    `${startIndent}        }`,
    `${startIndent}`,
    `${startIndent}        // Get course and event info`,
    `${startIndent}        const courseName = this.courseData?.name || 'Unknown Course';`,
    `${startIndent}        const courseId = document.getElementById('scorecardCourseSelect')?.value || '';`,
    `${startIndent}        const teeMarker = document.querySelector('input[name="teeMarker"]:checked')?.value || 'white';`,
    `${startIndent}        const roundType = this.isPrivateRound ? 'private' : 'society';`,
    `${startIndent}        const eventId = this.eventId;`,
    `${startIndent}        const scorecardId = this.scorecards[player.id];`,
    `${startIndent}`,
    `${startIndent}        // Calculate scores for ALL selected formats`,
    `${startIndent}        const formatScores = {};`,
    `${startIndent}        let totalGross = 0;`,
    `${startIndent}        let totalStableford = 0;`,
    `${startIndent}`,
    `${startIndent}        // Build scores array for engine`,
    `${startIndent}        const scoresArray = [];`,
    `${startIndent}        for (let hole = 1; hole <= 18; hole++) {`,
    `${startIndent}            const score = this.scoresCache[player.id]?.[hole];`,
    `${startIndent}            if (score) {`,
    `${startIndent}                totalGross += score;`,
    `${startIndent}                scoresArray.push({ hole_number: hole, gross_score: score });`,
    `${startIndent}            }`,
    `${startIndent}        }`,
    `${startIndent}`,
    `${startIndent}        const engine = LiveScorecardSystem.GolfScoringEngine;`,
    `${startIndent}`,
    `${startIndent}        // Calculate each selected format`,
    `${startIndent}        for (const format of this.scoringFormats) {`,
    `${startIndent}            switch (format) {`,
    `${startIndent}                case 'stableford':`,
    `${startIndent}                    formatScores.stableford = engine.calculateStablefordTotal(`,
    `${startIndent}                        scoresArray,`,
    `${startIndent}                        this.courseData.holes,`,
    `${startIndent}                        player.handicap,`,
    `${startIndent}                        true`,
    `${startIndent}                    );`,
    `${startIndent}                    totalStableford = formatScores.stableford;`,
    `${startIndent}                    break;`,
    `${startIndent}`,
    `${startIndent}                case 'strokeplay':`,
    `${startIndent}                    formatScores.strokeplay = totalGross;`,
    `${startIndent}                    break;`,
    `${startIndent}`,
    `${startIndent}                case 'modifiedstableford':`,
    `${startIndent}                    formatScores.modifiedstableford = engine.calculateStablefordTotal(`,
    `${startIndent}                        scoresArray,`,
    `${startIndent}                        this.courseData.holes,`,
    `${startIndent}                        player.handicap,`,
    `${startIndent}                        true,`,
    `${startIndent}                        engine.modifiedStablefordPoints`,
    `${startIndent}                    );`,
    `${startIndent}                    break;`,
    `${startIndent}`,
    `${startIndent}                case 'nassau':`,
    `${startIndent}                    const nassauResult = engine.calculateNassau([{`,
    `${startIndent}                        player_id: player.id,`,
    `${startIndent}                        scores: scoresArray`,
    `${startIndent}                    }], this.courseData.holes);`,
    `${startIndent}                    formatScores.nassau = nassauResult[0] || { front: 0, back: 0, total: 0 };`,
    `${startIndent}                    break;`,
    `${startIndent}`,
    `${startIndent}                case 'skins':`,
    `${startIndent}                    formatScores.skins = { holes_won: 0, points: 0 };`,
    `${startIndent}                    break;`,
    `${startIndent}`,
    `${startIndent}                case 'scramble':`,
    `${startIndent}                    formatScores.scramble = totalGross;`,
    `${startIndent}                    break;`,
    `${startIndent}`,
    `${startIndent}                case 'matchplay':`,
    `${startIndent}                    formatScores.matchplay = { holes_won: 0, holes_lost: 0, holes_tied: 0 };`,
    `${startIndent}                    break;`,
    `${startIndent}`,
    `${startIndent}                case 'bestball':`,
    `${startIndent}                    formatScores.bestball = totalGross;`,
    `${startIndent}                    break;`,
    `${startIndent}            }`,
    `${startIndent}        }`,
    `${startIndent}`,
    `${startIndent}        // Get Scramble config if selected`,
    `${startIndent}        let scrambleConfig = null;`,
    `${startIndent}        if (this.scoringFormats.includes('scramble')) {`,
    `${startIndent}            const teamSize = document.querySelector('input[name="scrambleTeamSize"]:checked')?.value || '4';`,
    `${startIndent}            const trackDrives = document.getElementById('scrambleTrackDrives')?.checked || false;`,
    `${startIndent}            const trackPutts = document.getElementById('scrambleTrackPutts')?.checked || false;`,
    `${startIndent}            const minDrives = document.getElementById('scrambleMinDrives')?.value || '4';`,
    `${startIndent}`,
    `${startIndent}            scrambleConfig = {`,
    `${startIndent}                teamSize: parseInt(teamSize),`,
    `${startIndent}                trackDrives: trackDrives,`,
    `${startIndent}                trackPutts: trackPutts,`,
    `${startIndent}                minDrivesPerPlayer: parseInt(minDrives)`,
    `${startIndent}            };`,
    `${startIndent}        }`,
    `${startIndent}`,
    `${startIndent}        // Only save for players with LINE IDs`,
    `${startIndent}        if (!player.lineUserId || player.lineUserId.trim() === '') {`,
    `${startIndent}            console.log(\`[LiveScorecard] Skipping database save for \${player.name} - no LINE ID\`);`,
    `${startIndent}            return null;`,
    `${startIndent}        }`,
    `${startIndent}`,
    `${startIndent}        // Save to Supabase database`,
    `${startIndent}        const { data: round, error } = await window.SupabaseDB.client`,
    `${startIndent}            .from('rounds')`,
    `${startIndent}            .insert({`,
    `${startIndent}                golfer_id: player.lineUserId,`,
    `${startIndent}                course_id: courseId,`,
    `${startIndent}                course_name: courseName,`,
    `${startIndent}                type: roundType,`,
    `${startIndent}                society_event_id: eventId,`,
    `${startIndent}                started_at: new Date().toISOString(),`,
    `${startIndent}                completed_at: new Date().toISOString(),`,
    `${startIndent}                status: 'completed',`,
    `${startIndent}                total_gross: totalGross,`,
    `${startIndent}                total_stableford: totalStableford,`,
    `${startIndent}                handicap_used: player.handicap,`,
    `${startIndent}                tee_marker: teeMarker,`,
    `${startIndent}                scoring_formats: this.scoringFormats,`,
    `${startIndent}                format_scores: formatScores,`,
    `${startIndent}                posted_formats: this.postedFormats || this.scoringFormats,`,
    `${startIndent}                scramble_config: scrambleConfig`,
    `${startIndent}            })`,
    `${startIndent}            .select()`,
    `${startIndent}            .single();`,
    `${startIndent}`,
    `${startIndent}        if (error) {`,
    `${startIndent}            console.error('[LiveScorecard] Error saving to round history:', error);`,
    `${startIndent}            return null;`,
    `${startIndent}        }`,
    `${startIndent}`,
    `${startIndent}        console.log(\`[LiveScorecard] ✅ Saved round to database for \${player.name}. Round ID: \${round.id}\`);`,
    `${startIndent}        return round.id;`,
    `${startIndent}`,
    `${startIndent}    } catch (error) {`,
    `${startIndent}        console.error('[LiveScorecard] Error in saveRoundToHistory:', error);`,
    `${startIndent}        return null;`,
    `${startIndent}    }`,
    `${startIndent}}`
];

// Replace the function
const newLines = [
    ...lines.slice(0, startLine),
    ...newFunctionLines,
    ...lines.slice(endLine + 1)
];

// Write back to file
fs.writeFileSync('index.html', newLines.join('\n'), 'utf8');

console.log('✅ saveRoundToHistory function replaced with async database version');
console.log(`   Removed ${endLine - startLine + 1} lines, added ${newFunctionLines.length} lines`);
