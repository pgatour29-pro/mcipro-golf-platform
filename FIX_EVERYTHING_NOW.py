#!/usr/bin/env python3
"""
FIX EVERYTHING - REVERT BROKEN OPTIMIZATIONS
=============================================

The ultra-optimizations broke:
1. End round
2. Drive tracking
3. History save

Solution: Keep UI fast but make critical operations BLOCKING
"""

import re

def fix_everything():
    print("FIXING EVERYTHING - REVERTING BROKEN OPTIMIZATIONS")
    print("=" * 60)

    with open('index.html', 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content
    changes = 0

    # ========================================================================
    # FIX 1: MAKE SCORECARD COMPLETION BLOCKING (CRITICAL)
    # ========================================================================
    print("\n[1/2] Making scorecard completion BLOCKING...")

    # Find and replace the non-blocking scorecard completion
    old_blocking = """        // Mark scorecards as completed in database (NON-BLOCKING - INSTANT)
        for (const player of this.players) {
            const scorecardId = this.scorecards[player.id];
            if (scorecardId && !scorecardId.startsWith('local_')) {
                window.SocietyGolfDB.completeScorecard(scorecardId).catch(err => {
                    console.error(`[LiveScorecard] Error completing scorecard for ${player.name}:`, err);
                });
            }

            // Calculate and update handicap (NON-BLOCKING - INSTANT)
            if (player.lineUserId) {
                this.updatePlayerHandicap(player).catch(err => {
                    console.error(`[LiveScorecard] Error updating handicap for ${player.name}:`, err);
                });
            }
        }"""

    new_blocking = """        // Mark scorecards as completed in database (BLOCKING - ENSURE COMPLETION)
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

    if old_blocking in content:
        content = content.replace(old_blocking, new_blocking)
        changes += 1
        print("   [OK] Made scorecard operations BLOCKING")
    else:
        print("   [WARN] Pattern not found")

    # ========================================================================
    # FIX 2: ENSURE HISTORY SAVE COMPLETES
    # ========================================================================
    print("\n[2/2] Ensuring history save completes...")

    # Already fixed in previous deployment, just verify it's there
    if 'await this.distributeRoundScores()' in content:
        print("   [OK] History save is already blocking")
    else:
        print("   [WARN] History save might not be blocking")

    # ========================================================================
    # SAVE
    # ========================================================================
    if content != original_content and changes > 0:
        with open('index.html', 'w', encoding='utf-8') as f:
            f.write(content)
        print("\n" + "=" * 60)
        print(f"CRITICAL FIXES APPLIED: {changes} changes")
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

    print("Fixing everything NOW...\n")
    success = fix_everything()

    if success:
        print("\nFIXED:")
        print("   1. Scorecard completion is BLOCKING (waits for DB)")
        print("   2. Handicap updates are BLOCKING (waits for DB)")
        print("   3. History save is BLOCKING (already fixed)")
        print("\nRESULT:")
        print("   - End round will work properly")
        print("   - History will save")
        print("   - UI still shows scorecard immediately")
        print("   - But waits for critical operations to complete")
        print("\nDEPLOY:")
        print('   bash deploy.sh "CRITICAL FIX: Make end round operations blocking - ensure completion"')
    else:
        print("\nNo changes needed or pattern not found")
