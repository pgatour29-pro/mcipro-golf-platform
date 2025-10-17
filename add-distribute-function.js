const fs = require('fs');

// Read the file
const content = fs.readFileSync('index.html', 'utf8');
const lines = content.split('\n');

// Find the end of saveRoundToHistory function (the new async version)
let insertLine = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === 'async saveRoundToHistory(player) {') {
        // Found the start, now find the end
        let braceCount = 0;
        for (let j = i; j < lines.length; j++) {
            const line = lines[j];
            for (const char of line) {
                if (char === '{') braceCount++;
                if (char === '}') braceCount--;
            }
            if (braceCount === 0 && j > i) {
                insertLine = j + 1; // Insert after the closing brace
                break;
            }
        }
        break;
    }
}

if (insertLine === -1) {
    console.error('ERROR: Could not find async saveRoundToHistory function');
    process.exit(1);
}

console.log(`Inserting distributeRoundScores function after line ${insertLine}`);

// Get the indentation from the previous function
const indent = '    '; // 4 spaces to match saveRoundToHistory

// New distributeRoundScores function
const newFunctionLines = [
    '',
    `${indent}async distributeRoundScores() {`,
    `${indent}    try {`,
    `${indent}        // Get all player LINE IDs`,
    `${indent}        const playerIds = this.players`,
    `${indent}            .filter(p => p.lineUserId && p.lineUserId.trim() !== '')`,
    `${indent}            .map(p => p.lineUserId);`,
    `${indent}`,
    `${indent}        if (playerIds.length === 0) {`,
    `${indent}            console.log('[LiveScorecard] No players with LINE IDs to distribute to');`,
    `${indent}            return;`,
    `${indent}        }`,
    `${indent}`,
    `${indent}        // Save round for each player and distribute`,
    `${indent}        const roundIds = [];`,
    `${indent}        for (const player of this.players) {`,
    `${indent}            const roundId = await this.saveRoundToHistory(player);`,
    `${indent}            if (roundId) {`,
    `${indent}                roundIds.push(roundId);`,
    `${indent}`,
    `${indent}                // Distribute this round to all players`,
    `${indent}                const { error } = await window.SupabaseDB.client.rpc(`,
    `${indent}                    'distribute_round_to_players',`,
    `${indent}                    {`,
    `${indent}                        p_round_id: roundId,`,
    `${indent}                        p_player_ids: playerIds`,
    `${indent}                    }`,
    `${indent}                );`,
    `${indent}`,
    `${indent}                if (error) {`,
    `${indent}                    console.error(\`[LiveScorecard] Error distributing round \${roundId}:\`, error);`,
    `${indent}                } else {`,
    `${indent}                    console.log(\`[LiveScorecard] ✅ Distributed round \${roundId} to \${playerIds.length} players\`);`,
    `${indent}                }`,
    `${indent}            }`,
    `${indent}        }`,
    `${indent}`,
    `${indent}        // Mark as posted to organizer if society event`,
    `${indent}        if (!this.isPrivateRound && this.eventId && roundIds.length > 0) {`,
    `${indent}            const { data: event } = await window.SupabaseDB.client`,
    `${indent}                .from('society_events')`,
    `${indent}                .select('organizer_id')`,
    `${indent}                .eq('id', this.eventId)`,
    `${indent}                .single();`,
    `${indent}`,
    `${indent}            if (event) {`,
    `${indent}                console.log(\`[LiveScorecard] ✅ Round visible to organizer: \${event.organizer_id}\`);`,
    `${indent}            }`,
    `${indent}        }`,
    `${indent}`,
    `${indent}        NotificationManager.show(\`Scores shared with \${playerIds.length} player\${playerIds.length !== 1 ? 's' : ''}!\`, 'success');`,
    `${indent}`,
    `${indent}    } catch (error) {`,
    `${indent}        console.error('[LiveScorecard] Error distributing scores:', error);`,
    `${indent}    }`,
    `${indent}}`
];

// Insert the function
const newLines = [
    ...lines.slice(0, insertLine),
    ...newFunctionLines,
    ...lines.slice(insertLine)
];

// Write back to file
fs.writeFileSync('index.html', newLines.join('\n'), 'utf8');

console.log('✅ distributeRoundScores function added');
console.log(`   Added ${newFunctionLines.length} lines`);
