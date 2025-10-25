#!/usr/bin/env python3
"""
FIX SCRAMBLE: Team Score Only
==============================

In scramble format:
- Only TEAM scorecard matters
- Individual player scorecards are NOT needed
- Team handicap is used (not individual handicaps)
- Don't show individual scorecards in finalized view

Fixes:
1. Hide individual player scorecards when scramble format is active
2. Only show team scorecard in finalized modal
3. Make it clear: TEAM HANDICAP ONLY
"""

import re

def fix_scramble_team_only():
    print("FIX SCRAMBLE: Team Score Only")
    print("=" * 60)

    with open('index.html', 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content
    changes = 0

    # ========================================================================
    # FIX 1: HIDE INDIVIDUAL SCORECARDS IN SCRAMBLE FORMAT
    # ========================================================================
    print("\n[1/2] Hiding individual scorecards in scramble...")

    old_render = """        // If scramble format, render team scorecard first
        if (this.scoringFormats.includes('scramble')) {
            const teamCard = this.renderTeamScrambleScorecard();
            playersContainer.appendChild(teamCard);
        }

        this.players.forEach(player => {
            const playerCard = this.renderPlayerFinalizedScorecard(player);
            playersContainer.appendChild(playerCard);
        });"""

    new_render = """        // If scramble format, ONLY show team scorecard (not individual players)
        if (this.scoringFormats.includes('scramble')) {
            const teamCard = this.renderTeamScrambleScorecard();
            playersContainer.appendChild(teamCard);

            // Add explanation note
            const note = document.createElement('div');
            note.className = 'mt-4 p-4 bg-blue-50 border border-blue-300 rounded-lg text-sm text-blue-800';
            note.innerHTML = `
                <p class="font-semibold">Scramble Format - Team Score Only</p>
                <p class="text-xs mt-1">Individual player scores are not shown. Only the team score is used for scoring and does not affect individual handicaps.</p>
            `;
            playersContainer.appendChild(note);
        } else {
            // For non-scramble formats, show individual player scorecards
            this.players.forEach(player => {
                const playerCard = this.renderPlayerFinalizedScorecard(player);
                playersContainer.appendChild(playerCard);
            });
        }"""

    if old_render in content:
        content = content.replace(old_render, new_render)
        changes += 1
        print("   [OK] Hidden individual scorecards in scramble")
    else:
        print("   [WARN] Pattern not found")

    # ========================================================================
    # FIX 2: CLARIFY TEAM HANDICAP IN HEADER
    # ========================================================================
    print("\n[2/2] Clarifying team handicap usage...")

    old_header = """                    <h3 class="text-2xl font-bold text-green-900">🏆 SCRAMBLE TEAM SCORE</h3>
                    <p class="text-sm text-green-800 mt-1">Best Ball • ${this.players.length} Players: ${this.players.map(p => p.name).join(', ')}</p>
                    <p class="text-xs text-green-700 mt-1">Team Handicap: ${teamHandicap.toFixed(1)} (Playing: ${teamPlayingHandicap})</p>"""

    new_header = """                    <h3 class="text-2xl font-bold text-green-900">🏆 SCRAMBLE TEAM SCORE</h3>
                    <p class="text-sm text-green-800 mt-1">Best Ball • ${this.players.length} Players: ${this.players.map(p => p.name).join(', ')}</p>
                    <p class="text-xs font-semibold text-green-800 mt-1">TEAM HANDICAP ONLY: ${teamHandicap.toFixed(1)} (Playing: ${teamPlayingHandicap})</p>
                    <p class="text-xs text-green-600 mt-1">Individual handicaps not used • Team score only</p>"""

    if old_header in content:
        content = content.replace(old_header, new_header)
        changes += 1
        print("   [OK] Clarified team handicap usage")
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

    print("Fixing scramble to show team score only...\n")
    success = fix_scramble_team_only()

    if success:
        print("\nWHAT WAS FIXED:")
        print("   1. Individual player scorecards HIDDEN in scramble format")
        print("   2. Only TEAM scorecard shown")
        print("   3. Clear note: Team handicap only, individual handicaps not used")
        print("   4. Clear note: Team score does not affect individual handicaps")
        print("\nNOW:")
        print("   - Scramble finalized view shows ONLY team scorecard")
        print("   - No confusion with individual scores")
        print("   - Team handicap clearly displayed")
        print("\nDEPLOY:")
        print('   bash deploy.sh "SCRAMBLE: Show team scorecard only, hide individual players"')
    else:
        print("\nNo changes made - check patterns")
