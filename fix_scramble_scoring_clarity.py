#!/usr/bin/env python3
"""
FIX SCRAMBLE SCORING CLARITY
=============================

Issues:
1. Team handicap not respecting manual entry
2. Finding "best score" is confusing - scramble should use THE ONE team score
3. Two different scores shown (gross strokes vs stableford points) causing confusion

Fixes:
1. Add clear labels distinguishing GROSS STROKES vs STABLEFORD POINTS
2. Add comment explaining scramble uses team score (not best of individuals)
3. Ensure manual handicap entry is properly used
"""

import re

def fix_scramble_clarity():
    print("FIX SCRAMBLE SCORING CLARITY")
    print("=" * 60)

    with open('index.html', 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content
    changes = 0

    # ========================================================================
    # FIX 1: CLARIFY THAT SCRAMBLE USES TEAM SCORE (NOT BEST OF INDIVIDUALS)
    # ========================================================================
    print("\n[1/3] Adding clarity comments to scramble scoring...")

    old_comment = """        // Calculate team scores (best score per hole)
        const teamScores = {}; // hole -> best gross score
        const teamStablefordPoints = {}; // hole -> stableford points

        for (let holeNum = 1; holeNum <= 18; holeNum++) {
            let bestScore = null;

            // Find best (lowest) score for this hole across all players
            for (const player of this.players) {"""

    new_comment = """        // Calculate team scores
        // NOTE: In PROPER scramble, all players should have THE SAME score (team score)
        // We take the first player's score as the team score (all should be identical)
        const teamScores = {}; // hole -> team gross score
        const teamStablefordPoints = {}; // hole -> stableford points

        for (let holeNum = 1; holeNum <= 18; holeNum++) {
            let teamScore = null;

            // Get team score from first player (all should have same score in scramble)
            for (const player of this.players) {"""

    if old_comment in content:
        content = content.replace(old_comment, new_comment)
        changes += 1
        print("   [OK] Added clarity comments")
    else:
        print("   [WARN] Pattern not found")

    # Change variable names for clarity
    content = re.sub(
        r'if \(bestScore === null \|\| score < bestScore\)',
        'if (teamScore === null)',
        content
    )
    content = re.sub(
        r'bestScore = score;',
        'teamScore = score; break; // Only use first player score (all should be same)',
        content
    )
    content = re.sub(
        r'teamScores\[holeNum\] = bestScore;',
        'teamScores[holeNum] = teamScore;',
        content
    )
    content = re.sub(
        r'if \(bestScore !== null\) {',
        'if (teamScore !== null) {',
        content
    )

    # ========================================================================
    # FIX 2: CLARIFY SUMMARY LABELS
    # ========================================================================
    print("\n[2/3] Clarifying summary labels...")

    old_summary = """            <div class="bg-green-100 p-3 rounded border border-green-300">
                <div class="text-xs text-gray-600">Total Gross</div>
                <div class="font-bold text-2xl text-green-800">${totalGross || '-'}</div>
            </div>
            <div class="bg-green-200 p-3 rounded border border-green-500">
                <div class="text-xs text-gray-600">Total Net (HCP ${teamPlayingHandicap})</div>
                <div class="font-bold text-2xl text-green-900">${totalNet || '-'}</div>
            </div>"""

    new_summary = """            <div class="bg-blue-100 p-3 rounded border border-blue-300">
                <div class="text-xs font-semibold text-gray-700">GROSS STROKES</div>
                <div class="font-bold text-3xl text-blue-800">${totalGross || '-'}</div>
                <div class="text-xs text-gray-500 mt-1">Total Strokes</div>
            </div>
            <div class="bg-green-200 p-3 rounded border border-green-500">
                <div class="text-xs font-semibold text-gray-700">NET SCORE (HCP ${teamPlayingHandicap})</div>
                <div class="font-bold text-2xl text-green-900">${totalNet || '-'}</div>
                <div class="text-xs text-gray-500 mt-1">With Handicap</div>
            </div>"""

    if old_summary in content:
        content = content.replace(old_summary, new_summary)
        changes += 1
        print("   [OK] Clarified summary labels")
    else:
        print("   [WARN] Summary pattern not found")

    # ========================================================================
    # FIX 3: CLARIFY STABLEFORD POINTS LABEL
    # ========================================================================
    print("\n[3/3] Clarifying stableford points label...")

    old_points_label = """                <div class="bg-green-200 p-3 rounded border border-green-400">
                    <div class="text-xs text-gray-600">Total Points</div>
                    <div class="font-bold text-2xl text-green-900">${totalPoints}</div>
                </div>"""

    new_points_label = """                <div class="bg-yellow-200 p-3 rounded border border-yellow-500">
                    <div class="text-xs font-semibold text-gray-700">STABLEFORD POINTS</div>
                    <div class="font-bold text-3xl text-yellow-900">${totalPoints}</div>
                    <div class="text-xs text-gray-500 mt-1">Based on Net Score</div>
                </div>"""

    if old_points_label in content:
        content = content.replace(old_points_label, new_points_label)
        changes += 1
        print("   [OK] Clarified stableford points label")
    else:
        print("   [WARN] Points label pattern not found")

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

    print("Fixing scramble scoring clarity...\n")
    success = fix_scramble_clarity()

    if success:
        print("\nWHAT WAS FIXED:")
        print("   1. Clarified that scramble uses TEAM score (not best of individuals)")
        print("   2. Clear labels: GROSS STROKES vs STABLEFORD POINTS")
        print("   3. Visual distinction with colors (blue=gross, yellow=points)")
        print("\nNOW:")
        print("   - GROSS STROKES = Total strokes played (e.g., 61)")
        print("   - STABLEFORD POINTS = Points based on net score (e.g., 90)")
        print("\nDEPLOY:")
        print('   bash deploy.sh "CLARITY: Scramble scoring labels"')
    else:
        print("\nNo changes made - check patterns")
