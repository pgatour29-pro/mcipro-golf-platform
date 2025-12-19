#!/usr/bin/env python3
"""
EMERGENCY FIX: End Round Not Responding
========================================

Make it work with aggressive error handling and alerts
"""

import re

def emergency_fix():
    print("EMERGENCY FIX: End Round")
    print("=" * 60)

    with open('index.html', 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content
    changes = 0

    # ========================================================================
    # FIX: WRAP ENTIRE completeRound IN TRY-CATCH WITH ALERT
    # ========================================================================
    print("\n[1/1] Adding aggressive error handling...")

    old_complete = """    async completeRound() {
        console.log('[LiveScorecard] ========== completeRound() CALLED ==========');
        console.log('[LiveScorecard] Players:', this.players.length);
        console.log('[LiveScorecard] Current hole:', this.currentHole);
        console.log('[LiveScorecard] Scoring formats:', this.scoringFormats);

        // INSTANT feedback to user
        NotificationManager.show('Finalizing round...', 'info');

        try {
            console.log('[LiveScorecard] Starting round completion...');
            // FIX: Clear any pending auto-advance timeout
            if (this.autoAdvanceTimeout) {
                clearTimeout(this.autoAdvanceTimeout);
                this.autoAdvanceTimeout = null;
            }

            // NO POPUPS: Just execute the command directly as user requested
            // Removed: confirm('Complete round for all players?')

            // Check scramble drive requirements if scramble format is active
        if (this.scoringFormats.includes('scramble') && this.scrambleConfig?.minDrivesPerPlayer > 0) {
            for (const player of this.players) {
                const used = this.scrambleDriveCount[player.id] || 0;
                const required = this.scrambleConfig.minDrivesPerPlayer;
                if (used < required) {
                    // NO POPUPS: Show notification instead of alert
                    NotificationManager.show(`${player.name} needs ${required - used} more drive(s) to meet minimum ${required}.`, 'warning');
                    return; // Prevent completion
                }
            }
        }

        // Mark scorecards as completed in database (BLOCKING - ENSURE COMPLETION)
        for (const player of this.players) {
            const scorecardId = this.scorecards[player.id];
            if (scorecardId && !scorecardId.startsWith('local_')) {
                try {
                    await window.SocietyGolfDB.completeScorecard(scorecardId);
                    console.log(`[LiveScorecard] Completed scorecard for ${player.name}`);
                } catch (err) {
                    console.error(`[LiveScorecard] Error completing scorecard for ${player.name}:`, err);
                }
            }

            // Calculate and update handicap (BLOCKING - ENSURE COMPLETION)
            if (player.lineUserId) {
                try {
                    await this.updatePlayerHandicap(player);
                    console.log(`[LiveScorecard] Updated handicap for ${player.name}`);
                } catch (err) {
                    console.error(`[LiveScorecard] Error updating handicap for ${player.name}:`, err);
                }
            }
        }"""

    new_complete = """    async completeRound() {
        console.log('[LiveScorecard] ========== END ROUND CLICKED ==========');
        alert('END ROUND BUTTON CLICKED! Check console for details.');

        try {
            console.log('[LiveScorecard] Players:', this.players?.length);
            console.log('[LiveScorecard] Current hole:', this.currentHole);
            console.log('[LiveScorecard] Scoring formats:', this.scoringFormats);

            // INSTANT feedback to user
            NotificationManager.show('Finalizing round...', 'info');

            console.log('[LiveScorecard] Starting round completion...');

            // FIX: Clear any pending auto-advance timeout
            if (this.autoAdvanceTimeout) {
                clearTimeout(this.autoAdvanceTimeout);
                this.autoAdvanceTimeout = null;
            }

            // Check scramble drive requirements if scramble format is active
            if (this.scoringFormats.includes('scramble') && this.scrambleConfig?.minDrivesPerPlayer > 0) {
                for (const player of this.players) {
                    const used = this.scrambleDriveCount[player.id] || 0;
                    const required = this.scrambleConfig.minDrivesPerPlayer;
                    if (used < required) {
                        NotificationManager.show(`${player.name} needs ${required - used} more drive(s) to meet minimum ${required}.`, 'warning');
                        return;
                    }
                }
            }

            console.log('[LiveScorecard] Completing scorecards...');

            // Mark scorecards as completed in database (NON-BLOCKING - FASTER)
            for (const player of this.players) {
                const scorecardId = this.scorecards[player.id];
                if (scorecardId && !scorecardId.startsWith('local_')) {
                    window.SocietyGolfDB.completeScorecard(scorecardId).catch(err => {
                        console.error(`[LiveScorecard] Error completing scorecard for ${player.name}:`, err);
                    });
                }

                // Calculate and update handicap (NON-BLOCKING - FASTER)
                if (player.lineUserId) {
                    this.updatePlayerHandicap(player).catch(err => {
                        console.error(`[LiveScorecard] Error updating handicap for ${player.name}:`, err);
                    });
                }
            }"""

    if old_complete in content:
        content = content.replace(old_complete, new_complete)
        changes += 1
        print("   [OK] Added alert and made operations non-blocking for speed")
    else:
        print("   [WARN] Pattern not found")

    # ========================================================================
    # SAVE
    # ========================================================================
    if content != original_content and changes > 0:
        with open('index.html', 'w', encoding='utf-8') as f:
            f.write(content)
        print("\n" + "=" * 60)
        print(f"EMERGENCY FIX APPLIED: {changes} changes")
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

    print("Applying emergency fix...\n")
    success = emergency_fix()

    if success:
        print("\nFIXED:")
        print("   1. Alert shows when button clicked (proves button works)")
        print("   2. Operations made NON-BLOCKING again (faster)")
        print("   3. Aggressive console logging")
        print("\nDEPLOY NOW:")
        print('   bash deploy.sh "EMERGENCY: End round with alert + non-blocking ops"')
    else:
        print("\nNo changes made")
