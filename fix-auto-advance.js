const fs = require('fs');

// Read the file
let content = fs.readFileSync('index.html', 'utf8');

// Old auto-advance logic
const oldLogic = `            // All players done, check if should advance hole
            const allDone = this.players.every(p => this.getPlayerScore(p.id, this.currentHole));
            if (allDone && this.currentHole < 18) {
                setTimeout(() => {
                    this.nextHole();
                }, 500);
            }`;

// New auto-advance logic with Scramble check
const newLogic = `            // All players done, check if Scramble tracking or advance hole
            const allDone = this.players.every(p => this.getPlayerScore(p.id, this.currentHole));
            if (allDone) {
                // Check if Scramble tracking is needed
                if (this.scoringFormats.includes('scramble') &&
                    (this.scrambleConfig?.trackDrives || this.scrambleConfig?.trackPutts)) {
                    setTimeout(() => {
                        this.showScrambleTracking();
                    }, 500);
                } else if (this.currentHole < 18) {
                    setTimeout(() => {
                        this.nextHole();
                    }, 500);
                }
            }`;

// Check if already modified
if (content.includes('showScrambleTracking()') && content.includes('check if Scramble tracking or advance hole')) {
    console.log('Auto-advance logic already modified - skipping');
    process.exit(0);
}

// Replace
if (content.includes(oldLogic)) {
    content = content.replace(oldLogic, newLogic);
    fs.writeFileSync('index.html', content, 'utf8');
    console.log('✅ Auto-advance logic modified to check for Scramble tracking');
} else {
    console.error('ERROR: Could not find old auto-advance logic');
    process.exit(1);
}
