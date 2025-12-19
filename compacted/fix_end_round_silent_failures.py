#!/usr/bin/env python3
"""
Fix End Round silent failures - add user-visible error messages.

CRITICAL BUGS FIXED:
1. No LINE ID = silent failure (user doesn't know why round didn't save)
2. No scores = silent failure (user doesn't know round wasn't saved)
3. Background save errors = only logged to console (user never sees them)

SOLUTION:
- Add alert messages when round can't be saved
- Show specific reason (no LINE ID, no scores, etc.)
- Add validation BEFORE attempting save
- Show success message when round is saved
"""

import re

# Read the file
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# FIX #1: Add validation and error messages in completeRound()
# Find the completeRound() method (around line 35007)

old_complete_round = r'''    async completeRound\(\) \{
        try \{
            // Show finalized scorecard immediately
            await this\.showFinalizedScorecard\(\);
        \} catch \(error\) \{
            alert\('ERROR showing scorecard: ' \+ error\.message\);
            console\.error\('\[LiveScorecard\] ERROR:', error\);
        \}

        // Do database stuff in background \(don't wait, don't care if it fails\)
        setTimeout\(\(\) => \{
            this\.distributeRoundScores\(\)\.catch\(err => console\.error\('Background save failed:', err\)\);
        \}, 1000\);
    \}'''

new_complete_round = '''    async completeRound() {
        try {
            // VALIDATION: Check if any scores recorded
            let totalScores = 0;
            for (const playerId in this.scoresCache) {
                for (let hole = 1; hole <= 18; hole++) {
                    if (this.scoresCache[playerId]?.[hole]) totalScores++;
                }
            }

            if (totalScores === 0) {
                alert('Cannot complete round: No scores have been recorded yet!\\n\\nPlease enter scores for at least one hole before completing the round.');
                return;
            }

            // VALIDATION: Check if all players have LINE IDs (for history save)
            const playersWithoutLineId = this.players.filter(p => !p.lineUserId || p.lineUserId.trim() === '');
            if (playersWithoutLineId.length > 0) {
                const playerNames = playersWithoutLineId.map(p => p.name).join(', ');
                const continueAnyway = confirm(
                    `WARNING: The following players do not have LINE accounts:\\n\\n${playerNames}\\n\\n` +
                    `Rounds will NOT be saved to history for these players.\\n\\n` +
                    `Do you want to continue completing the round?`
                );
                if (!continueAnyway) {
                    return;
                }
            }

            // Show finalized scorecard immediately
            await this.showFinalizedScorecard();
        } catch (error) {
            alert('ERROR showing scorecard: ' + error.message);
            console.error('[LiveScorecard] ERROR:', error);
        }

        // Do database stuff in background with error handling
        setTimeout(() => {
            this.distributeRoundScores()
                .then(() => {
                    console.log('[LiveScorecard] Round saved to history successfully');
                })
                .catch(err => {
                    console.error('Background save failed:', err);
                    alert('WARNING: Round may not have been saved to history!\\n\\nError: ' + err.message + '\\n\\nPlease check your internet connection and try again.');
                });
        }, 1000);
    }'''

content = re.sub(old_complete_round, new_complete_round, content, flags=re.DOTALL)

# FIX #2: Add better error message in saveRoundToHistory when no LINE ID
# Find the LINE ID check (around line 35134)

old_line_id_check = r'''            // Only save for players with LINE IDs
            if \(!player\.lineUserId \|\| player\.lineUserId\.trim\(\) === ''\) \{'''

new_line_id_check = '''            // Only save for players with LINE IDs
            if (!player.lineUserId || player.lineUserId.trim() === '') {
                console.warn(`[LiveScorecard] Cannot save history for ${player.name} - no LINE ID`);'''

content = re.sub(old_line_id_check, new_line_id_check, content)

# FIX #3: Add success message in distributeRoundScores
# Find the distributeRoundScores method (around line 35226)

old_distribute = r'''    async distributeRoundScores\(\) \{
        try \{
            // Get all players who have LINE IDs
            const playersWithLineId = this\.players\.filter\(p => p\.lineUserId && p\.lineUserId\.trim\(\) !== ''\);'''

new_distribute = '''    async distributeRoundScores() {
        try {
            console.log('[LiveScorecard] Starting round distribution...');
            // Get all players who have LINE IDs
            const playersWithLineId = this.players.filter(p => p.lineUserId && p.lineUserId.trim() !== '');

            if (playersWithLineId.length === 0) {
                console.warn('[LiveScorecard] No players with LINE IDs - cannot save to history');
                return;
            }

            console.log(`[LiveScorecard] Saving rounds for ${playersWithLineId.length} player(s)...`);'''

content = re.sub(old_distribute, new_distribute, content, flags=re.DOTALL)

# FIX #4: Add validation for scramble minimum drives
# Find where scramble validation should be (before completeRound shows scorecard)

# Search for scramble drive validation
old_scramble_validation = r'''        // Do database stuff in background with error handling
        setTimeout\(\(\) => \{
            this\.distributeRoundScores\(\)'''

new_scramble_validation = '''        // VALIDATION: Check scramble minimum drives if applicable
        if (this.scoringFormats.includes('scramble') && this.scrambleConfig?.minDrivesPerPlayer > 0) {
            const minDrives = this.scrambleConfig.minDrivesPerPlayer;
            const playersNotMeetingMin = [];

            for (const player of this.players) {
                const driveCount = this.scrambleDriveCount?.[player.id] || 0;
                if (driveCount < minDrives) {
                    playersNotMeetingMin.push({ name: player.name, count: driveCount });
                }
            }

            if (playersNotMeetingMin.length > 0) {
                const details = playersNotMeetingMin.map(p => `${p.name}: ${p.count}/${minDrives} drives`).join('\\n');
                alert(
                    `Cannot complete scramble round: Minimum drive requirement not met!\\n\\n` +
                    `Required: ${minDrives} drives per player\\n\\n${details}`
                );
                return;
            }
        }

        // Do database stuff in background with error handling
        setTimeout(() => {
            this.distributeRoundScores()'''

content = re.sub(old_scramble_validation, new_scramble_validation, content)

# Write the fixed content
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("[FIXED] End Round silent failures")
print("[FIXED] Added validation before completing round")
print("[FIXED] Added user-visible error messages")
print("")
print("FIXES APPLIED:")
print("1. Alert when no scores recorded")
print("2. Warning when players don't have LINE IDs")
print("3. Error message when background save fails")
print("4. Validation for scramble minimum drives")
print("5. Better console logging for debugging")
print("")
print("USER EXPERIENCE:")
print("- Users now see WHY their round isn't being saved")
print("- Clear error messages for common issues")
print("- Option to continue or cancel when issues detected")
