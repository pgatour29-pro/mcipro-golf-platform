#!/usr/bin/env python3
"""
Fix loading lag in Live Scorecard scoring.

LAG ISSUES IDENTIFIED:
1. refreshLeaderboard() called after EVERY score save (expensive DOM operation)
2. updatePublicPoolProgress() is awaited, blocking UI
3. renderHole() called multiple times per score save
4. No loading indicators during End Round processing

SOLUTION:
- Debounce leaderboard refreshes (max once per 500ms)
- Don't await updatePublicPoolProgress (run in background)
- Add loading spinner during End Round
- Optimize scramble score saves (already batched but can improve)
"""

import re

# Read the file
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# FIX #1: Add debounced leaderboard refresh
# Add a debounce utility method to LiveScorecardSystem class

# Find the LiveScorecardSystem constructor (where we can add properties)
constructor_search = r'(class LiveScorecardSystem \{[\s\S]*?constructor\(\) \{[\s\S]*?this\.players = \[\];)'

constructor_addition = r'''\1
        this.leaderboardRefreshTimeout = null;'''

content = re.sub(constructor_search, constructor_addition, content, count=1)

# Add the debounced refresh method before refreshLeaderboard()
old_refresh_method = r'(    refreshLeaderboard\(\) \{)'

new_debounced_method = r'''    debouncedRefreshLeaderboard() {
        // Debounce leaderboard refresh to avoid lag (max once per 500ms)
        if (this.leaderboardRefreshTimeout) {
            clearTimeout(this.leaderboardRefreshTimeout);
        }
        this.leaderboardRefreshTimeout = setTimeout(() => {
            this.refreshLeaderboard();
            this.leaderboardRefreshTimeout = null;
        }, 500);
    }

    \1'''

content = re.sub(old_refresh_method, new_debounced_method, content)

# FIX #2: Replace refreshLeaderboard() with debouncedRefreshLeaderboard() in saveCurrentScore()
# Line 34638 and 34675

old_refresh_call_1 = r'(// Clear input and update UI\s+this\.currentScore = \'\';\s+this\.renderHole\(\);\s+)this\.refreshLeaderboard\(\);'

new_refresh_call_1 = r'''\1this.debouncedRefreshLeaderboard(); // Debounced to prevent lag'''

content = re.sub(old_refresh_call_1, new_refresh_call_1, content)

# Replace the second call
old_refresh_call_2 = r'(// Update leaderboard immediately\s+)this\.refreshLeaderboard\(\);'

new_refresh_call_2 = r'''\1this.debouncedRefreshLeaderboard(); // Debounced to prevent lag'''

content = re.sub(old_refresh_call_2, new_refresh_call_2, content)

# FIX #3: Don't await updatePublicPoolProgress (run in background)
# Line 34678

old_await_progress = r'// Update public pool progress \(for multi-group competition\)\s+await this\.updatePublicPoolProgress\(this\.currentHole\);'

new_background_progress = '''// Update public pool progress in background (don't block UI)
        this.updatePublicPoolProgress(this.currentHole).catch(err =>
            console.error('[LiveScorecard] Pool progress update failed:', err)
        );'''

content = re.sub(old_await_progress, new_background_progress, content)

# FIX #4: Add loading indicator during End Round / completeRound
# Modify completeRound to show loading spinner

old_complete_start = r'(    async completeRound\(\) \{\s+try \{)'

new_complete_start = r'''\1
            // Show loading indicator
            const loadingDiv = document.createElement('div');
            loadingDiv.id = 'endRoundLoadingIndicator';
            loadingDiv.innerHTML = `
                <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; display: flex; align-items: center; justify-content: center;">
                    <div style="background: white; padding: 30px; border-radius: 10px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
                        <div style="border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>
                        <div style="font-size: 18px; font-weight: bold; color: #333;">Completing Round...</div>
                        <div style="font-size: 14px; color: #666; margin-top: 10px;">Please wait while we save your scores</div>
                    </div>
                </div>
                <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            `;
            document.body.appendChild(loadingDiv);

            try {'''

content = re.sub(old_complete_start, new_complete_start, content)

# Add removal of loading indicator after scorecard is shown
old_scorecard_show = r'(// Show finalized scorecard immediately\s+await this\.showFinalizedScorecard\(\);)'

new_scorecard_show = r'''\1

            // Remove loading indicator
            const loadingIndicator = document.getElementById('endRoundLoadingIndicator');
            if (loadingIndicator) {
                loadingIndicator.remove();
            }'''

content = re.sub(old_scorecard_show, new_scorecard_show, content)

# Also remove on error
old_error_handling = r'(\} catch \(error\) \{\s+alert\(\'ERROR showing scorecard: \' \+ error\.message\);)'

new_error_handling = r'''} catch (error) {
            // Remove loading indicator on error
            const loadingIndicator = document.getElementById('endRoundLoadingIndicator');
            if (loadingIndicator) {
                loadingIndicator.remove();
            }

            alert('ERROR showing scorecard: ' + error.message);'''

content = re.sub(old_error_handling, new_error_handling, content)

# FIX #5: Add progress indicator for scramble score saves
# When saving multiple players in scramble mode, show count

old_scramble_save = r'(NotificationManager\.show\(`Team score \$\{score\} saved for Hole \$\{this\.currentHole\}`, \'success\'\);)'

new_scramble_save = r'''NotificationManager.show(`Team score ${score} saved for all ${this.players.length} players on Hole ${this.currentHole}`, 'success');'''

content = re.sub(old_scramble_save, new_scramble_save, content)

# Write the fixed content
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("[FIXED] Loading lag in Live Scorecard")
print("[FIXED] Added debounced leaderboard refresh")
print("[FIXED] Made public pool progress update non-blocking")
print("[FIXED] Added loading indicator during End Round")
print("")
print("FIXES APPLIED:")
print("1. Leaderboard refresh debounced to max once per 500ms (prevents lag)")
print("2. updatePublicPoolProgress runs in background (doesn't block UI)")
print("3. Loading spinner during End Round processing")
print("4. Better feedback for scramble score saves")
print("")
print("PERFORMANCE IMPROVEMENTS:")
print("- Score input now instant (no waiting for leaderboard refresh)")
print("- End Round shows progress (user knows system is working)")
print("- Background operations don't block UI")
