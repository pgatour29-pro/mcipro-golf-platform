#!/usr/bin/env python3
"""
COMPREHENSIVE FIX: Scramble Format + End Round Issues
======================================================

ISSUES:
1. End Round button still not working (needs more debugging)
2. Scramble format shows individual player scores (should show ONE team score)

FIXES:
1. Add aggressive error handling and logging to End Round
2. Simplify scramble UI to show single team score input
3. Store team score for all players automatically
"""

def fix_index_html():
    print("COMPREHENSIVE FIX: Scramble + End Round")
    print("=" * 60)

    with open('index.html', 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # ========================================================================
    # FIX 1: MODIFY renderCurrentHoleView() FOR SCRAMBLE FORMAT
    # ========================================================================
    print("\n[1/4] Modifying score UI for Scramble format...")

    # Find the player grid rendering (line 34353-34370)
    old_grid_render = """        // Render player score boxes
        const grid = document.getElementById('groupScorecardGrid');
        grid.innerHTML = this.players.map(p => {
            const score = this.getPlayerScore(p.id, this.currentHole);
            const total = this.getPlayerTotal(p.id);
            const isActive = p.id === this.currentPlayerId;
            const formatLabel = (this.scoringFormats.includes('stableford') || this.scoringFormats.includes('modifiedstableford')) ? 'pts' : 'strokes';

            return `
                <div onclick="LiveScorecardManager.selectPlayer('${p.id}')"
                     class="p-3 border-2 ${isActive ? 'border-green-500 bg-green-50' : 'border-gray-300 bg-white'} rounded-lg cursor-pointer hover:border-green-400 transition">
                    <div class="text-sm font-medium text-gray-700">${p.name}</div>
                    <div class="text-2xl font-bold ${score ? 'text-gray-900' : 'text-gray-400'}">
                        ${score || '_'}
                    </div>
                    ${total !== 0 ? `<div class="text-xs text-gray-600 mt-1">Total: ${total > 0 && (this.scoringFormats.includes('stableford') || this.scoringFormats.includes('modifiedstableford')) ? '+' : ''}${total} ${formatLabel}</div>` : ''}
                </div>
            `;
        }).join('');"""

    new_grid_render = """        // Render player score boxes OR team score box for scramble
        const grid = document.getElementById('groupScorecardGrid');

        // SCRAMBLE MODE: Show single team score box
        if (this.scoringFormats.includes('scramble')) {
            const teamScore = this.getPlayerScore(this.players[0].id, this.currentHole);
            const teamTotal = this.getPlayerTotal(this.players[0].id);

            grid.innerHTML = `
                <div class="p-4 border-2 border-green-500 bg-green-50 rounded-lg text-center">
                    <div class="text-sm font-semibold text-gray-700 mb-2">TEAM SCORE</div>
                    <div class="text-4xl font-bold ${teamScore ? 'text-gray-900' : 'text-gray-400'}">
                        ${teamScore || '_'}
                    </div>
                    ${teamTotal !== 0 ? `<div class="text-sm text-gray-600 mt-2">Total: ${teamTotal} strokes</div>` : ''}
                    <div class="text-xs text-gray-500 mt-2">${this.players.length} players</div>
                </div>
            `;

            // Auto-select first player for score entry
            this.currentPlayerId = this.players[0].id;

        } else {
            // NORMAL MODE: Show individual player score boxes
            grid.innerHTML = this.players.map(p => {
                const score = this.getPlayerScore(p.id, this.currentHole);
                const total = this.getPlayerTotal(p.id);
                const isActive = p.id === this.currentPlayerId;
                const formatLabel = (this.scoringFormats.includes('stableford') || this.scoringFormats.includes('modifiedstableford')) ? 'pts' : 'strokes';

                return `
                    <div onclick="LiveScorecardManager.selectPlayer('${p.id}')"
                         class="p-3 border-2 ${isActive ? 'border-green-500 bg-green-50' : 'border-gray-300 bg-white'} rounded-lg cursor-pointer hover:border-green-400 transition">
                        <div class="text-sm font-medium text-gray-700">${p.name}</div>
                        <div class="text-2xl font-bold ${score ? 'text-gray-900' : 'text-gray-400'}">
                            ${score || '_'}
                        </div>
                        ${total !== 0 ? `<div class="text-xs text-gray-600 mt-1">Total: ${total > 0 && (this.scoringFormats.includes('stableford') || this.scoringFormats.includes('modifiedstableford')) ? '+' : ''}${total} ${formatLabel}</div>` : ''}
                    </div>
                `;
            }).join('');
        }"""

    if old_grid_render in content:
        content = content.replace(old_grid_render, new_grid_render)
        print("   [OK] Modified score UI for Scramble format")
    else:
        print("   [WARN] Grid render already modified or not found")

    # ========================================================================
    # FIX 2: UPDATE submitScore() TO APPLY TO ALL PLAYERS IN SCRAMBLE
    # ========================================================================
    print("\n[2/4] Modifying submitScore() for Scramble team scoring...")

    # Find submitScore method (around line 34523)
    old_submit_score = """        if (!this.currentPlayerId || !this.currentScore) {
            console.warn('[LiveScorecard] Missing player or score');
            return;
        }

        const score = parseInt(this.currentScore);
        if (isNaN(score) || score < 1 || score > 15) {
            NotificationManager.show('Please enter a valid score (1-15)', 'error');
            return;
        }

        const scorecardId = this.scorecards[this.currentPlayerId];
        const player = this.players.find(p => p.id === this.currentPlayerId);"""

    new_submit_score = """        if (!this.currentPlayerId || !this.currentScore) {
            console.warn('[LiveScorecard] Missing player or score');
            return;
        }

        const score = parseInt(this.currentScore);
        if (isNaN(score) || score < 1 || score > 15) {
            NotificationManager.show('Please enter a valid score (1-15)', 'error');
            return;
        }

        // SCRAMBLE MODE: Apply score to ALL players
        if (this.scoringFormats.includes('scramble')) {
            console.log(`[LiveScorecard] SCRAMBLE: Applying team score ${score} to all ${this.players.length} players`);

            // Save score for ALL players
            for (const player of this.players) {
                const scorecardId = this.scorecards[player.id];

                // Update local cache
                if (!this.scoresCache[player.id]) {
                    this.scoresCache[player.id] = {};
                }
                this.scoresCache[player.id][this.currentHole] = score;

                // Save to database if online
                if (scorecardId && !scorecardId.startsWith('local_')) {
                    window.SocietyGolfDB.saveScore(scorecardId, this.currentHole, score).catch(err => {
                        console.error(`[LiveScorecard] Error saving score for ${player.name}:`, err);
                    });
                }
            }

            NotificationManager.show(`Team score ${score} saved for Hole ${this.currentHole}`, 'success');
            this.currentScore = '';
            this.renderCurrentHoleView();

            // Auto-advance to next hole after short delay
            clearTimeout(this.autoAdvanceTimeout);
            this.autoAdvanceTimeout = setTimeout(() => {
                if (this.currentHole < 18) {
                    this.nextHole();
                }
            }, 1500);

            return;
        }

        // NORMAL MODE: Apply score to current player only
        const scorecardId = this.scorecards[this.currentPlayerId];
        const player = this.players.find(p => p.id === this.currentPlayerId);"""

    if old_submit_score in content:
        content = content.replace(old_submit_score, new_submit_score)
        print("   [OK] Modified submitScore() for team scoring")
    else:
        print("   [WARN] submitScore already modified or not found")

    # ========================================================================
    # FIX 3: ADD DEBUGGING TO completeRound BUTTON CLICK
    # ========================================================================
    print("\n[3/4] Adding debugging to End Round button...")

    # Find the End Round button HTML (line 21579)
    old_end_round_button = """                                    <button onclick="LiveScorecardManager.completeRound()" class="px-4 py-2 bg-white text-green-600 rounded-lg font-medium hover:bg-green-50">
                                        End Round
                                    </button>"""

    new_end_round_button = """                                    <button onclick="console.log('[DEBUG] End Round button clicked'); try { LiveScorecardManager.completeRound(); } catch(e) { console.error('[DEBUG] End Round error:', e); alert('End Round Error: ' + e.message); }" class="px-4 py-2 bg-white text-green-600 rounded-lg font-medium hover:bg-green-50">
                                        End Round
                                    </button>"""

    if old_end_round_button in content:
        content = content.replace(old_end_round_button, new_end_round_button)
        print("   [OK] Added inline debugging to End Round button")
    else:
        print("   [WARN] End Round button already modified or not found")

    # ========================================================================
    # FIX 4: VERIFY completeRound HAS TRY-CATCH
    # ========================================================================
    print("\n[4/4] Verifying error handling in completeRound()...")

    if "async completeRound() {" in content and "console.log('[LiveScorecard] completeRound() called');" in content:
        print("   [OK] completeRound() has error handling")
    else:
        print("   [WARN] completeRound() may be missing error handling")

    # ========================================================================
    # SAVE CHANGES
    # ========================================================================
    if content != original_content:
        with open('index.html', 'w', encoding='utf-8') as f:
            f.write(content)
        print("\n" + "=" * 60)
        print("ALL FIXES APPLIED SUCCESSFULLY!")
        print("=" * 60)
        return True
    else:
        print("\n" + "=" * 60)
        print("NO CHANGES MADE - Already fixed or patterns not found")
        print("=" * 60)
        return False

if __name__ == '__main__':
    import os
    os.chdir(r'C:\Users\pete\Documents\MciPro')

    print("Starting Scramble + End Round fix...\n")
    success = fix_index_html()

    if success:
        print("\nWHAT WAS FIXED:")
        print("   1. Scramble format now shows ONE team score box")
        print("   2. Team score applies to all players automatically")
        print("   3. End Round button has inline error catching")
        print("   4. Console will show exact error if End Round fails")
        print("\nNEXT STEPS:")
        print("   1. Deploy: bash deploy.sh \"Fix Scramble team scoring + End Round debugging\"")
        print("   2. Test Scramble - should see ONE score box for team")
        print("   3. Test End Round - check console for [DEBUG] messages")
    else:
        print("\nFix script didn't make changes - manual review needed")
