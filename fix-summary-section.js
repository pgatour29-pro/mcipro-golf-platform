const fs = require('fs');

const content = fs.readFileSync('index.html', 'utf8');

// Find and replace the summary conditional
const oldSummary = "${this.scoringFormat === 'stableford' ? `";
const newSummary = "${(this.scoringFormats.includes('stableford') || this.scoringFormats.includes('modifiedstableford')) ? `";

if (content.includes(oldSummary)) {
    const result = content.replace(oldSummary, newSummary);
    fs.writeFileSync('index.html', result, 'utf8');
    console.log('✅ Fixed summary section to check scoringFormats array');
} else {
    console.log('⚠️  Summary already fixed or not found');
}
