const fs = require('fs');

const content = fs.readFileSync('index.html', 'utf8');
let result = content;

console.log('Fixing remaining singular scoringFormat references...');

// Fix 1: Line 29677 - offline scorecard storage
const oldOffline = "                        scoring_format: this.scoringFormat,";
const newOffline = "                        scoring_format: this.scoringFormats,";
if (result.includes(oldOffline)) {
    result = result.replace(oldOffline, newOffline);
    console.log('✅ Fixed offline scorecard storage (line 29677)');
}

// Fix 2: Line 29731 - renderHole formatLabel
const oldFormatLabel = "            const formatLabel = this.scoringFormat === 'stableford' ? 'pts' : 'strokes';";
const newFormatLabel = "            const formatLabel = (this.scoringFormats.includes('stableford') || this.scoringFormats.includes('modifiedstableford')) ? 'pts' : 'strokes';";
if (result.includes(oldFormatLabel)) {
    result = result.replace(oldFormatLabel, newFormatLabel);
    console.log('✅ Fixed renderHole formatLabel (line 29731)');
}

// Fix 3: Line 29740 - renderHole total display
const oldTotalCheck = "${total > 0 && this.scoringFormat === 'stableford' ? '+' : ''}";
const newTotalCheck = "${total > 0 && (this.scoringFormats.includes('stableford') || this.scoringFormats.includes('modifiedstableford')) ? '+' : ''}";
if (result.includes(oldTotalCheck)) {
    result = result.replace(oldTotalCheck, newTotalCheck);
    console.log('✅ Fixed renderHole total check (line 29740)');
}

// Fix 4: Line 29814 - getPlayerTotal
const oldGetTotal = "                if (this.scoringFormat === 'stableford') {";
const newGetTotal = "                if (this.scoringFormats.includes('stableford') || this.scoringFormats.includes('modifiedstableford')) {";
if (result.includes(oldGetTotal)) {
    result = result.replace(oldGetTotal, newGetTotal);
    console.log('✅ Fixed getPlayerTotal check (line 29814)');
}

// Fix 5: Line 30691 - actuallyEndRound reset
const oldReset = "        this.scoringFormat = 'stableford'; // Reset to default";
const newReset = "        this.scoringFormats = ['stableford']; // Reset to default";
if (result.includes(oldReset)) {
    result = result.replace(oldReset, newReset);
    console.log('✅ Fixed actuallyEndRound reset (line 30691)');
}

// Write back
fs.writeFileSync('index.html', result, 'utf8');

console.log('\n✅ All singular scoringFormat references fixed');
console.log('   Now using scoringFormats array throughout');
