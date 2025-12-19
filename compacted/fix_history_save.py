#!/usr/bin/env python3
"""
FIX HISTORY SAVE: Ensure rounds are saved properly
===================================================

Issue: distributeRoundScores is non-blocking (fire and forget)
       If it fails, rounds don't save to history and user never knows

Fix:
1. Make distributeRoundScores blocking (wait for it)
2. Add user notification if save fails
3. Keep UI fast by showing finalized scorecard immediately
4. But ENSURE the save happens and report errors
"""

import re

def fix_history_save():
    print("FIX HISTORY SAVE: Ensure rounds save properly")
    print("=" * 60)

    with open('index.html', 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content
    changes = 0

    # ========================================================================
    # FIX 1: MAKE DISTRIBUTE SCORES BLOCKING BUT SHOW UI FIRST
    # ========================================================================
    print("\n[1/2] Making distributeRoundScores blocking...")

    old_distribute = """        // Distribute scores to all players and organizers
            // Distribute scores in background (NON-BLOCKING)
            this.distributeRoundScores().catch(err => {
                console.error('[LiveScorecard] Error distributing scores:', err);
            });

            // Show finalized scorecard IMMEDIATELY (no waiting)
            this.showFinalizedScorecard();

            NotificationManager.show('Round completed! Scores saving...', 'success');"""

    new_distribute = """        // Show finalized scorecard IMMEDIATELY (no waiting)
            this.showFinalizedScorecard();

            NotificationManager.show('Round completed! Saving to history...', 'info');

            // Distribute scores and save to history (WAIT for this to complete)
            try {
                await this.distributeRoundScores();
                console.log('[LiveScorecard] Successfully saved to history');
                NotificationManager.show('Round saved to history!', 'success');
            } catch (err) {
                console.error('[LiveScorecard] FAILED to save to history:', err);
                NotificationManager.show('ERROR: Round not saved to history! Check console.', 'error');
            }"""

    if old_distribute in content:
        content = content.replace(old_distribute, new_distribute)
        changes += 1
        print("   [OK] Made distributeRoundScores blocking with error notification")
    else:
        print("   [WARN] Pattern not found")

    # ========================================================================
    # FIX 2: ADD DETAILED LOGGING TO saveRoundToHistory
    # ========================================================================
    print("\n[2/2] Adding detailed logging to saveRoundToHistory...")

    old_save_start = """    async saveRoundToHistory(player) {
        try {
            // Skip if no scores recorded
            let holesPlayed = 0;
            for (let hole = 1; hole <= 18; hole++) {
                if (this.scoresCache[player.id]?.[hole]) holesPlayed++;
            }

            if (holesPlayed === 0) {
                console.log(`[LiveScorecard] Skipping history save for ${player.name} - no scores recorded`);
                return null;
            }"""

    new_save_start = """    async saveRoundToHistory(player) {
        console.log(`[LiveScorecard] saveRoundToHistory called for ${player.name}`);
        try {
            // Skip if no scores recorded
            let holesPlayed = 0;
            for (let hole = 1; hole <= 18; hole++) {
                if (this.scoresCache[player.id]?.[hole]) holesPlayed++;
            }

            if (holesPlayed === 0) {
                console.log(`[LiveScorecard] Skipping history save for ${player.name} - no scores recorded`);
                return null;
            }

            console.log(`[LiveScorecard] Saving ${holesPlayed} holes for ${player.name}`);"""

    if old_save_start in content:
        content = content.replace(old_save_start, new_save_start)
        changes += 1
        print("   [OK] Added detailed logging")
    else:
        print("   [WARN] saveRoundToHistory pattern not found")

    # ========================================================================
    # SAVE
    # ========================================================================
    if content != original_content and changes > 0:
        with open('index.html', 'w', encoding='utf-8') as f:
            f.write(content)
        print("\n" + "=" * 60)
        print(f"FIXES APPLIED: {changes} changes")
        print("=" * 60)
        return True
    else:
        print("\n" + "=" * 60)
        print("NO CHANGES MADE")
        print("=" * 60)
        return False

if __name__ == '__main__':
    import os
    os.chdir(r'C:\Users\pete\Documents\MciPro')

    print("Fixing history save...\n")
    success = fix_history_save()

    if success:
        print("\nWHAT WAS FIXED:")
        print("   1. distributeRoundScores now WAITS to complete (blocking)")
        print("   2. Shows finalized scorecard FIRST (instant)")
        print("   3. THEN saves to history (user sees progress)")
        print("   4. Clear error notification if save fails")
        print("   5. Success notification when saved")
        print("\nNOW:")
        print("   - UI still instant (scorecard shows immediately)")
        print("   - But save is guaranteed to complete or show error")
        print("   - User gets clear feedback: 'Round saved to history!'")
        print("\nDEPLOY:")
        print('   bash deploy.sh "FIX: Ensure rounds save to history with error notification"')
    else:
        print("\nNo changes made - check patterns")
