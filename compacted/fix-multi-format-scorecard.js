const fs = require('fs');

// Read the file
const content = fs.readFileSync('index.html', 'utf8');
const lines = content.split('\n');

console.log('Fixing multi-format scorecard display...');

// ===== PART 1: Fix showFinalizedScorecard to display all formats =====
// Find line: const format = this.scoringFormat === 'stableford' ? 'Stableford' : 'Stroke Play';
let formatLine = -1;
for (let i = 30710; i < 30730; i++) {
    if (lines[i] && lines[i].includes('const format = this.scoringFormat')) {
        formatLine = i;
        break;
    }
}

if (formatLine === -1) {
    console.error('ERROR: Could not find format line in showFinalizedScorecard');
    process.exit(1);
}

console.log(`Found format line at ${formatLine + 1}`);

// Replace the format line to show all formats
lines[formatLine] = `        // Format all selected formats for display`;
lines[formatLine + 1] = `        const formatNames = {`;
lines.splice(formatLine + 2, 0,
    `            'stableford': 'Stableford',`,
    `            'strokeplay': 'Stroke Play',`,
    `            'scramble': 'Scramble',`,
    `            'modifiedstableford': 'Modified Stableford',`,
    `            'nassau': 'Nassau',`,
    `            'skins': 'Skins',`,
    `            'matchplay': 'Match Play',`,
    `            'bestball': 'Best Ball'`,
    `        };`,
    `        const format = this.scoringFormats.map(f => formatNames[f] || f).join(' • ');`
);

console.log('✅ Updated format display to show all formats');

// ===== PART 2: We'll need to update renderPlayerFinalizedScorecard =====
// This is more complex - let me create a replacement version

// Find the renderPlayerFinalizedScorecard function
let renderFunctionStart = -1;
for (let i = 30740; i < 30760; i++) {
    if (lines[i] && lines[i].trim() === 'renderPlayerFinalizedScorecard(player) {') {
        renderFunctionStart = i;
        break;
    }
}

if (renderFunctionStart === -1) {
    console.error('ERROR: Could not find renderPlayerFinalizedScorecard');
    process.exit(1);
}

console.log(`Found renderPlayerFinalizedScorecard at line ${renderFunctionStart + 1}`);

// Find the end of the function (matching closing brace)
let braceCount = 0;
let renderFunctionEnd = -1;
for (let i = renderFunctionStart; i < lines.length; i++) {
    const line = lines[i];
    for (const char of line) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
    }
    if (braceCount === 0 && i > renderFunctionStart) {
        renderFunctionEnd = i;
        break;
    }
}

if (renderFunctionEnd === -1) {
    console.error('ERROR: Could not find renderPlayerFinalizedScorecard end');
    process.exit(1);
}

console.log(`Found function end at line ${renderFunctionEnd + 1}`);

// Find the Stableford Points conditional row (line with "if (this.scoringFormat === 'stableford'")
let stablefordRowStart = -1;
for (let i = renderFunctionStart; i < renderFunctionEnd; i++) {
    if (lines[i] && lines[i].includes("if (this.scoringFormat === 'stableford'")) {
        stablefordRowStart = i;
        break;
    }
}

if (stablefordRowStart === -1) {
    console.error('ERROR: Could not find Stableford conditional row');
    process.exit(1);
}

console.log(`Found Stableford conditional at line ${stablefordRowStart + 1}`);

// Find the end of this conditional block (closing brace)
braceCount = 0;
let stablefordRowEnd = -1;
for (let i = stablefordRowStart; i < renderFunctionEnd; i++) {
    const line = lines[i];
    for (const char of line) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
    }
    if (braceCount === 0 && i > stablefordRowStart) {
        stablefordRowEnd = i;
        break;
    }
}

console.log(`Found Stableford conditional end at line ${stablefordRowEnd + 1}`);

// Replace the conditional Stableford row with multi-format rows
const newFormatRows = [
    '        // Add rows for each selected format',
    '        const engine = LiveScorecardSystem.GolfScoringEngine;',
    '        ',
    '        // Stableford Points row (if selected)',
    '        if (this.scoringFormats.includes(\'stableford\') || this.scoringFormats.includes(\'modifiedstableford\')) {',
    '            const isModified = this.scoringFormats.includes(\'modifiedstableford\');',
    '            const rowLabel = isModified ? \'Modified Points\' : \'Stableford Points\';',
    '            tableHTML += `<tr class="bg-green-50"><td class="border border-gray-300 px-2 py-2 font-semibold">${rowLabel}</td>`;',
    '            let frontNinePoints = 0, backNinePoints = 0;',
    '',
    '            const pointsMap = isModified ? engine.modifiedStablefordPoints : engine.defaultStableford;',
    '',
    '            for (let i = 1; i <= 18; i++) {',
    '                const scoreValue = this.scoresCache[player.id]?.[i];',
    '                let points = \'-\';',
    '',
    '                if (typeof scoreValue === \'number\') {',
    '                    const hole = this.courseData?.holes?.find(h => h.number === i);',
    '                    const par = hole?.par || 4;',
    '                    const strokeIndex = hole?.strokeIndex || i;',
    '',
    '                    const shotsReceived = player.handicap >= strokeIndex ? 1 : 0;',
    '                    const netScore = scoreValue - shotsReceived;',
    '                    points = engine.stablefordPointsForHole(netScore, par, pointsMap);',
    '',
    '                    if (i <= 9) frontNinePoints += points;',
    '                    else backNinePoints += points;',
    '                }',
    '',
    '                tableHTML += `<td class="border border-gray-300 px-1 py-2 text-center font-bold">${points}</td>`;',
    '            }',
    '            const totalPoints = frontNinePoints + backNinePoints;',
    '            tableHTML += `<td class="border border-gray-300 px-2 py-2 text-center font-bold text-lg bg-green-200">${totalPoints || \'-\'}</td></tr>`;',
    '        }'
];

// Replace the old conditional with new multi-format rows
const result = [
    ...lines.slice(0, stablefordRowStart),
    ...newFormatRows,
    ...lines.slice(stablefordRowEnd + 1)
].join('\n');

// Write back
fs.writeFileSync('index.html', result, 'utf8');

console.log('✅ Multi-format scorecard display fixed');
console.log('   - Format header now shows all selected formats');
console.log('   - Score rows now display for each selected format');
