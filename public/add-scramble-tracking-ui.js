const fs = require('fs');

// Read the file
const content = fs.readFileSync('index.html', 'utf8');
const lines = content.split('\n');

// Find the line "<!-- Hole Navigation -->" after the keypad section
let insertLine = -1;
for (let i = 19900; i < 20000; i++) {
    if (lines[i] && lines[i].trim() === '<!-- Hole Navigation -->') {
        insertLine = i;
        break;
    }
}

if (insertLine === -1) {
    console.error('ERROR: Could not find <!-- Hole Navigation --> comment');
    process.exit(1);
}

console.log(`Found insertion point at line ${insertLine + 1}`);

// Check if already added
if (content.includes('scrambleTrackingSection')) {
    console.log('Scramble tracking UI already exists - skipping');
    process.exit(0);
}

// Scramble tracking HTML to insert
const scrambleHTML = [
    '',
    '                        <!-- Scramble Tracking (shown after all players score) -->',
    '                        <div id="scrambleTrackingSection" class="metric-card bg-gradient-to-r from-blue-50 to-green-50 border-2 border-blue-300" style="display: none;">',
    '                            <div class="flex items-center gap-2 mb-3">',
    '                                <span class="material-symbols-outlined text-blue-600">groups</span>',
    '                                <h3 class="font-bold text-gray-900">Scramble - Hole <span id="scrambleHoleNumber"></span></h3>',
    '                            </div>',
    '',
    '                            <div class="mb-4">',
    '                                <label class="block text-sm font-semibold text-gray-700 mb-2">',
    '                                    <span class="material-symbols-outlined text-sm">golf_course</span>',
    '                                    Whose drive was used?',
    '                                </label>',
    '                                <select id="scrambleDrivePlayer" class="w-full rounded-lg border-gray-300 p-2 text-sm">',
    '                                    <option value="">Select player...</option>',
    '                                </select>',
    '                                <div id="driveCounters" class="mt-2 text-xs text-gray-600">',
    '                                    <!-- Drive counters will be populated here -->',
    '                                </div>',
    '                            </div>',
    '',
    '                            <div class="mb-4">',
    '                                <label class="block text-sm font-semibold text-gray-700 mb-2">',
    '                                    <span class="material-symbols-outlined text-sm">flag</span>',
    '                                    Who made the putt?',
    '                                </label>',
    '                                <select id="scramblePuttPlayer" class="w-full rounded-lg border-gray-300 p-2 text-sm">',
    '                                    <option value="">Select player...</option>',
    '                                </select>',
    '                            </div>',
    '',
    '                            <button onclick="LiveScorecardManager.saveScrambleTracking()" class="w-full btn-primary py-3">',
    '                                <span class="material-symbols-outlined">check_circle</span>',
    '                                Save & Continue',
    '                            </button>',
    '                        </div>',
    ''
];

// Insert the HTML before the Hole Navigation comment
const newLines = [
    ...lines.slice(0, insertLine),
    ...scrambleHTML,
    ...lines.slice(insertLine)
];

// Write back to file
fs.writeFileSync('index.html', newLines.join('\n'), 'utf8');

console.log('✅ Scramble tracking UI added');
console.log(`   Added ${scrambleHTML.length} lines before line ${insertLine + 1}`);
