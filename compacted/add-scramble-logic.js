const fs = require('fs');

// Read the file
const content = fs.readFileSync('index.html', 'utf8');
let lines = content.split('\n');

console.log('Adding Scramble tracking logic...');

// ===== STEP 1: Modify auto-advance logic to check for Scramble =====
// Find the auto-advance section
let autoAdvanceStart = -1;
for (let i = 29900; i < 29920; i++) {
    if (lines[i] && lines[i].includes('// All players done, check if should advance hole')) {
        autoAdvanceStart = i;
        break;
    }
}

if (autoAdvanceStart === -1) {
    console.error('ERROR: Could not find auto-advance section');
    process.exit(1);
}

console.log(`Found auto-advance at line ${autoAdvanceStart + 1}`);

// Replace the auto-advance logic
const oldAutoAdvance = [
    '            // All players done, check if should advance hole',
    '            const allDone = this.players.every(p => this.getPlayerScore(p.id, this.currentHole));',
    '            if (allDone && this.currentHole < 18) {',
    '                setTimeout(() => {',
    '                    this.nextHole();',
    '                }, 500);',
    '            }'
].join('\n');

const newAutoAdvance = [
    '            // All players done, check if Scramble tracking or advance hole',
    '            const allDone = this.players.every(p => this.getPlayerScore(p.id, this.currentHole));',
    '            if (allDone) {',
    '                // Check if Scramble tracking is needed',
    '                if (this.scoringFormats.includes(\'scramble\') && ',
    '                    (this.scrambleConfig?.trackDrives || this.scrambleConfig?.trackPutts)) {',
    '                    setTimeout(() => {',
    '                        this.showScrambleTracking();',
    '                    }, 500);',
    '                } else if (this.currentHole < 18) {',
    '                    setTimeout(() => {',
    '                        this.nextHole();',
    '                    }, 500);',
    '                }',
    '            }'
].join('\n');

let contentStr = lines.join('\n');
if (contentStr.includes(oldAutoAdvance)) {
    contentStr = contentStr.replace(oldAutoAdvance, newAutoAdvance);
    console.log('✅ Modified auto-advance logic');
} else {
    console.log('⚠️  Auto-advance logic already modified or not found');
}

// ===== STEP 2: Add Scramble tracking methods after nextHole() =====
// Find nextHole method end
lines = contentStr.split('\n');
let nextHoleEnd = -1;
for (let i = 29950; i < 29970; i++) {
    if (lines[i] && lines[i].trim() === '}' &&
        lines[i-1] && lines[i-1].includes('completeRound')) {
        nextHoleEnd = i;
        break;
    }
}

if (nextHoleEnd === -1) {
    console.error('ERROR: Could not find nextHole method end');
    process.exit(1);
}

console.log(`Found nextHole end at line ${nextHoleEnd + 1}`);

// Check if methods already exist
if (contentStr.includes('showScrambleTracking()')) {
    console.log('Scramble methods already exist - skipping');
    process.exit(0);
}

// New Scramble methods
const scrambleMethods = [
    '',
    '    // ===== SCRAMBLE TRACKING =====',
    '    showScrambleTracking() {',
    '        // Populate player dropdowns',
    '        const driveSelect = document.getElementById(\'scrambleDrivePlayer\');',
    '        const puttSelect = document.getElementById(\'scramblePuttPlayer\');',
    '        ',
    '        if (!driveSelect || !puttSelect) return;',
    '        ',
    '        // Clear and populate',
    '        driveSelect.innerHTML = \'<option value="">Select player...</option>\';',
    '        puttSelect.innerHTML = \'<option value="">Select player...</option>\';',
    '        ',
    '        this.players.forEach(player => {',
    '            driveSelect.innerHTML += `<option value="${player.id}">${player.name}</option>`;',
    '            puttSelect.innerHTML += `<option value="${player.id}">${player.name}</option>`;',
    '        });',
    '        ',
    '        // Update hole number',
    '        document.getElementById(\'scrambleHoleNumber\').textContent = this.currentHole;',
    '        ',
    '        // Show drive counters if tracking',
    '        if (this.scrambleConfig?.trackDrives) {',
    '            const counters = this.players.map(p => {',
    '                const used = this.scrambleDriveCount[p.id] || 0;',
    '                const remaining = 18 - used;',
    '                return `${p.name}: ${used} used, ${remaining} remaining`;',
    '            }).join(\' • \');',
    '            document.getElementById(\'driveCounters\').textContent = counters;',
    '        }',
    '        ',
    '        // Show the tracking section',
    '        document.getElementById(\'scrambleTrackingSection\').style.display = \'block\';',
    '    }',
    '    ',
    '    saveScrambleTracking() {',
    '        const drivePlayerId = document.getElementById(\'scrambleDrivePlayer\')?.value;',
    '        const puttPlayerId = document.getElementById(\'scramblePuttPlayer\')?.value;',
    '        ',
    '        // Validate if tracking is enabled',
    '        if (this.scrambleConfig?.trackDrives && !drivePlayerId) {',
    '            NotificationManager.show(\'Please select whose drive was used\', \'warning\');',
    '            return;',
    '        }',
    '        ',
    '        if (this.scrambleConfig?.trackPutts && !puttPlayerId) {',
    '            NotificationManager.show(\'Please select who made the putt\', \'warning\');',
    '            return;',
    '        }',
    '        ',
    '        // Initialize tracking objects if needed',
    '        if (!this.scrambleDriveData) this.scrambleDriveData = {};',
    '        if (!this.scramblePuttData) this.scramblePuttData = {};',
    '        if (!this.scrambleDriveCount) this.scrambleDriveCount = {};',
    '        ',
    '        // Save selections',
    '        if (drivePlayerId) {',
    '            const player = this.players.find(p => p.id === drivePlayerId);',
    '            this.scrambleDriveData[this.currentHole] = {',
    '                player_id: drivePlayerId,',
    '                player_name: player.name',
    '            };',
    '            // Increment drive counter',
    '            this.scrambleDriveCount[drivePlayerId] = (this.scrambleDriveCount[drivePlayerId] || 0) + 1;',
    '        }',
    '        ',
    '        if (puttPlayerId) {',
    '            const player = this.players.find(p => p.id === puttPlayerId);',
    '            this.scramblePuttData[this.currentHole] = {',
    '                player_id: puttPlayerId,',
    '                player_name: player.name',
    '            };',
    '        }',
    '        ',
    '        // Hide the section',
    '        document.getElementById(\'scrambleTrackingSection\').style.display = \'none\';',
    '        ',
    '        // Continue to next hole or finish',
    '        if (this.currentHole < 18) {',
    '            this.nextHole();',
    '        } else {',
    '            this.completeRound();',
    '        }',
    '    }',
    ''
];

// Insert methods after nextHole
lines = contentStr.split('\n');
const newLines = [
    ...lines.slice(0, nextHoleEnd + 1),
    ...scrambleMethods,
    ...lines.slice(nextHoleEnd + 1)
];

// Write back
fs.writeFileSync('index.html', newLines.join('\n'), 'utf8');

console.log('✅ Scramble tracking methods added');
console.log(`   Added ${scrambleMethods.length} lines after nextHole method`);
