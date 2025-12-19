#!/usr/bin/env python3
"""
Fix stableford mismatches and history saving issues.

BUGS:
1. saveRoundToHistory() uses player.handicap for scramble (WRONG)
   - Should use team handicap like the leaderboard does
2. Final scorecard might also use wrong handicap
3. History not saving (need to add better error logging)

FIX:
- Change saveRoundToHistory to use team handicap for scramble
- Add error alerts so user knows why history didn't save
"""

import re

# Read the file
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# FIX #1: Use team handicap in saveRoundToHistory for scramble stableford
old_save_stableford = r'''                    case 'stableford':
                        formatScores\.stableford = engine\.calculateStablefordTotal\(
                            scoresArray,
                            this\.courseData\.holes,
                            player\.handicap,
                            true
                        \);
                        totalStableford = formatScores\.stableford;
                        break;'''

new_save_stableford = '''                    case 'stableford':
                        // For scramble: use team handicap, not individual
                        const handicapForStableford = this.scoringFormats.includes('scramble')
                            ? this.calculateTeamHandicap()
                            : player.handicap;
                        formatScores.stableford = engine.calculateStablefordTotal(
                            scoresArray,
                            this.courseData.holes,
                            handicapForStableford,
                            true
                        );
                        totalStableford = formatScores.stableford;
                        break;'''

content = re.sub(old_save_stableford, new_save_stableford, content, flags=re.DOTALL)

# FIX #2: Better error logging when history save fails
old_error_log = r'''            if \(error\) \{
                console\.error\('\[LiveScorecard\] Error saving to round history:', error\);
                return null;'''

new_error_log = '''            if (error) {
                console.error('[LiveScorecard] Error saving to round history:', error);
                alert(`ERROR saving round to history for ${player.name}:\\n\\n${error.message}\\n\\nPlease screenshot this and contact support.`);
                return null;'''

content = re.sub(old_error_log, new_error_log, content)

# FIX #3: Add success logging
old_success = r'''            if \(error\) \{
                console\.error\('\[LiveScorecard\] Error saving to round history:', error\);
                alert\(`ERROR saving round to history for \$\{player\.name\}:\\n\\n\$\{error\.message\}\\n\\nPlease screenshot this and contact support\.`\);
                return null;
            \}

            console\.log\(`\[LiveScorecard\] ✅ Round saved to history for \$\{player\.name\}`, round\);'''

new_success = '''            if (error) {
                console.error('[LiveScorecard] Error saving to round history:', error);
                alert(`ERROR saving round to history for ${player.name}:\\n\\n${error.message}\\n\\nPlease screenshot this and contact support.`);
                return null;
            }

            console.log(`[LiveScorecard] ✅ Round saved to history for ${player.name}`, round);
            console.log(`[LiveScorecard] Saved stableford: ${totalStableford}, Gross: ${totalGross}, Team HCP used: ${this.scoringFormats.includes('scramble') ? this.calculateTeamHandicap() : player.handicap}`);'''

content = re.sub(old_success, new_success, content, flags=re.DOTALL)

# Write the fixed content
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("[FIXED] Stableford calculation in saveRoundToHistory now uses team handicap for scramble")
print("[FIXED] Added error alerts when history save fails")
print("[FIXED] Added detailed logging for debugging")
print("")
print("CHANGES:")
print("- Line ~35086: Use team handicap for scramble stableford calculation")
print("- Line ~35182: Alert user when save fails with error details")
print("- Added logging to show which handicap was used")
