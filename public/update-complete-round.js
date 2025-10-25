const fs = require('fs');

// Read the file
const content = fs.readFileSync('index.html', 'utf8');
const lines = content.split('\n');

// Find completeRound function start
let startLine = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === 'async completeRound() {') {
        startLine = i;
        break;
    }
}

if (startLine === -1) {
    console.error('ERROR: Could not find async completeRound function');
    process.exit(1);
}

console.log(`Found completeRound function start at line ${startLine + 1}`);

// Find the function end
let endLine = -1;
let braceCount = 0;
const startIndent = lines[startLine].match(/^(\s*)/)[1];

for (let i = startLine; i < lines.length; i++) {
    const line = lines[i];
    for (const char of line) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
    }
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

// Check if old function calls saveRoundToHistory in loop - we need to replace this
const oldFunctionContains = lines.slice(startLine, endLine + 1).join('\n');
const hasOldPattern = oldFunctionContains.includes('this.saveRoundToHistory(player)');

if (!hasOldPattern) {
    console.error('WARNING: Function does not contain old pattern - may already be updated');
    console.log('Skipping update...');
    process.exit(0);
}

// New function
const newFunctionLines = [
    `${startIndent}async completeRound() {`,
    `${startIndent}    if (!confirm('Complete round for all players?')) return;`,
    `${startIndent}`,
    `${startIndent}    // Mark scorecards as completed in database`,
    `${startIndent}    for (const player of this.players) {`,
    `${startIndent}        const scorecardId = this.scorecards[player.id];`,
    `${startIndent}        if (scorecardId && !scorecardId.startsWith('local_')) {`,
    `${startIndent}            await window.SocietyGolfDB.completeScorecard(scorecardId);`,
    `${startIndent}        }`,
    `${startIndent}`,
    `${startIndent}        // Calculate and update handicap for each player with a linked profile`,
    `${startIndent}        if (player.lineUserId) {`,
    `${startIndent}            await this.updatePlayerHandicap(player);`,
    `${startIndent}        }`,
    `${startIndent}    }`,
    `${startIndent}`,
    `${startIndent}    // Distribute scores to all players and organizers`,
    `${startIndent}    await this.distributeRoundScores();`,
    `${startIndent}`,
    `${startIndent}    NotificationManager.show('Round completed! Scores saved and distributed.', 'success');`,
    `${startIndent}`,
    `${startIndent}    // Show finalized scorecard BEFORE resetting`,
    `${startIndent}    this.showFinalizedScorecard();`,
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

console.log('✅ completeRound function updated');
console.log(`   Removed ${endLine - startLine + 1} lines, added ${newFunctionLines.length} lines`);
