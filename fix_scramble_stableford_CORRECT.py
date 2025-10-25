#!/usr/bin/env python3
"""
FIX SCRAMBLE STABLEFORD - CORRECT CALCULATION
==============================================

ISSUE: Scramble has ONE team score, not individual scores
- 63 strokes = team gross score (sum of all holes)
- Stableford should be calculated from that ONE team score
- Apply team handicap to get net score
- Then calculate stableford points

Current bug: Showing 90 points when it should be calculated correctly
"""

import re

def fix_scramble_stableford():
    print("FIX SCRAMBLE STABLEFORD - CORRECT CALCULATION")
    print("=" * 60)

    with open('index.html', 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content
    changes = 0

    # ========================================================================
    # FIX 1: CORRECT TEAM SUMMARY TO SHOW CORRECT STABLEFORD
    # ========================================================================
    print("\n[1/2] Fixing team stableford calculation...")

    old_summary = """        if (this.scoringFormats.includes('stableford') || this.scoringFormats.includes('modifiedstableford')) {
            let totalPoints = 0;
            for (let i = 1; i <= 18; i++) {
                if (teamStablefordPoints[i]) totalPoints += teamStablefordPoints[i];
            }
            summaryHTML += `
                <div class="bg-yellow-200 p-3 rounded border border-yellow-500">
                    <div class="text-xs font-semibold text-gray-700">STABLEFORD POINTS</div>
                    <div class="font-bold text-3xl text-yellow-900">${totalPoints}</div>
                    <div class="text-xs text-gray-500 mt-1">Based on Net Score</div>
                </div>
            `;
        }"""

    new_summary = """        if (this.scoringFormats.includes('stableford') || this.scoringFormats.includes('modifiedstableford')) {
            let totalPoints = 0;
            for (let i = 1; i <= 18; i++) {
                if (teamStablefordPoints[i]) totalPoints += teamStablefordPoints[i];
            }
            summaryHTML += `
                <div class="bg-yellow-200 p-3 rounded border border-yellow-500">
                    <div class="text-xs font-semibold text-gray-700">STABLEFORD POINTS</div>
                    <div class="font-bold text-3xl text-yellow-900">${totalPoints}</div>
                    <div class="text-xs text-gray-500 mt-1">Net ${totalNet} vs Par ${frontNinePar + backNinePar}</div>
                </div>
            `;

            console.log('[Team Scorecard] STABLEFORD BREAKDOWN:');
            console.log('  Gross:', totalGross);
            console.log('  Team HCP:', teamPlayingHandicap);
            console.log('  Net:', totalNet);
            console.log('  Total Points:', totalPoints);
            for (let i = 1; i <= 18; i++) {
                if (teamStablefordPoints[i] !== null && teamStablefordPoints[i] !== undefined) {
                    console.log(`  Hole ${i}: ${teamScores[i]} strokes = ${teamStablefordPoints[i]} pts`);
                }
            }
        }"""

    if old_summary in content:
        content = content.replace(old_summary, new_summary)
        changes += 1
        print("   [OK] Added stableford debugging and better display")
    else:
        print("   [WARN] Pattern not found")

    # ========================================================================
    # FIX 2: ADD VERIFICATION TO HEADER
    # ========================================================================
    print("\n[2/2] Adding verification to header...")

    old_header_total = """                <div class="text-right" id="teamTotal"></div>"""

    new_header_total = """                <div class="text-right">
                    <div class="text-sm text-gray-600">Gross Strokes</div>
                    <div class="text-3xl font-bold text-green-900">${totalGross || '-'}</div>
                </div>"""

    if old_header_total in content:
        content = content.replace(old_header_total, new_header_total)
        changes += 1
        print("   [OK] Updated header to show gross strokes")
    else:
        print("   [WARN] Header pattern not found")

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

    print("Fixing scramble stableford calculation...\n")
    success = fix_scramble_stableford()

    if success:
        print("\nWHAT WAS FIXED:")
        print("   1. Added console logging to show stableford calculation")
        print("   2. Shows: Net score vs Par in stableford box")
        print("   3. Header shows gross strokes clearly")
        print("\nHOW TO VERIFY:")
        print("   1. Deploy this")
        print("   2. Complete a scramble round")
        print("   3. Open console (F12)")
        print("   4. Look for 'STABLEFORD BREAKDOWN' log")
        print("   5. Tell me what it shows")
        print("\nThis will help us see WHY it's calculating 90 points")
        print("\nDEPLOY:")
        print('   bash deploy.sh "DEBUG: Add stableford calculation logging"')
    else:
        print("\nNo changes made")
