/**
 * ===========================================================================
 * HOLE-BY-HOLE LEADERBOARD & SCORE DISPLAY ENHANCEMENT
 * ===========================================================================
 * Date: October 20, 2025
 * Purpose: Add real-time score display and hole-by-hole leaderboard to scoring input section
 *
 * FEATURES:
 * 1. Live score display showing current player's running totals by format
 * 2. Hole-by-hole leaderboard showing all players' scores for each hole
 * 3. Real-time updates as scores are entered
 * 4. Mobile-responsive design with Tailwind CSS
 * 5. Multi-format support (Stableford, Stroke Play, Nassau, etc.)
 * ===========================================================================
 */

// Wait for LiveScorecardManager to be available
(function() {
    function initLeaderboardEnhancement() {
        // Check if LiveScorecardManager exists
        if (typeof LiveScorecardManager === 'undefined' || typeof LiveScorecardSystem === 'undefined') {
            console.log('[Leaderboard Enhancement] Waiting for LiveScorecardManager...');
            setTimeout(initLeaderboardEnhancement, 100);
            return;
        }

        console.log('[Leaderboard Enhancement] Initializing...');

        // CRITICAL: Prevent double-initialization (script loaded twice causes infinite recursion)
        if (LiveScorecardManager._leaderboardEnhancementLoaded) {
            console.log('[Leaderboard Enhancement] Already initialized, skipping');
            return;
        }
        // SECOND GUARD: Check if renderGroupLeaderboardEnhanced already exists (prevents infinite recursion)
        if (typeof LiveScorecardManager.renderGroupLeaderboardEnhanced === 'function') {
            console.log('[Leaderboard Enhancement] renderGroupLeaderboardEnhanced already exists, skipping');
            LiveScorecardManager._leaderboardEnhancementLoaded = true;
            return;
        }
        LiveScorecardManager._leaderboardEnhancementLoaded = true;
LiveScorecardManager.updatePlayerScoreDisplay = function() {
    const displayCard = document.getElementById('currentPlayerScoreDisplay');
    const formatScoresDiv = document.getElementById('playerFormatScores');
    const holesCompletedSpan = document.getElementById('playerHolesCompleted');
    const progressBar = document.getElementById('playerProgressBar');

    // Hide if no player selected
    if (!this.currentPlayerId || !displayCard) {
        if (displayCard) displayCard.style.display = 'none';
        return;
    }

    // Show the display card
    displayCard.style.display = 'block';

    const player = this.players.find(p => p.id === this.currentPlayerId);
    if (!player) return;

    // Get player's scores
    const playerScores = this.scoresCache[this.currentPlayerId] || {};
    const scoresArray = Object.entries(playerScores).map(([hole, score]) => ({
        hole_number: parseInt(hole),
        gross_score: score
    }));

    const holesPlayed = scoresArray.length;
    const progressPercent = Math.round((holesPlayed / 18) * 100);

    // Update progress
    holesCompletedSpan.textContent = `${holesPlayed}/18 holes`;
    progressBar.style.width = `${progressPercent}%`;

    // Calculate scores for each format
    let totalGross = 0;
    for (const s of scoresArray) {
        totalGross += s.gross_score;
    }

    const engine = LiveScorecardSystem.GolfScoringEngine;
    const formatScoresHtml = [];

    for (const format of this.scoringFormats) {
        let formatName = '';
        let formatScore = '';
        let formatIcon = 'emoji_events';
        let formatColor = 'text-gray-900';

        switch (format) {
            case 'stableford':
                formatName = 'Thailand Stableford';
                formatIcon = 'star';
                if (this.courseData && this.courseData.holes) {
                    const points = engine.calculateStablefordTotal(
                        scoresArray,
                        this.courseData.holes,
                        player.handicap,
                        true
                    );
                    formatScore = `${points} pts`;
                    formatColor = 'text-green-700';
                } else {
                    formatScore = '-';
                }
                break;

            case 'strokeplay':
                formatName = 'Stroke Play';
                formatIcon = 'sports_golf';
                formatScore = `${totalGross} strokes`;
                formatColor = 'text-blue-700';
                break;

            case 'modifiedstableford':
                formatName = 'Modified Stableford';
                formatIcon = 'auto_awesome';
                if (this.courseData && this.courseData.holes) {
                    const points = engine.calculateStablefordTotal(
                        scoresArray,
                        this.courseData.holes,
                        player.handicap,
                        true,
                        engine.modifiedStablefordPoints
                    );
                    formatScore = `${points} pts`;
                    formatColor = 'text-teal-700';
                } else {
                    formatScore = '-';
                }
                break;

            case 'nassau':
                formatName = 'Nassau';
                formatIcon = 'grid_on';
                if (this.courseData && this.courseData.holes) {
                    const nassauResult = engine.calculateNassau([{
                        player_id: player.id,
                        scores: scoresArray
                    }], this.courseData.holes);
                    const n = nassauResult[0] || { front: 0, back: 0, total: 0 };
                    formatScore = `${n.total > 0 ? '+' : ''}${n.total}`;
                    formatColor = n.total > 0 ? 'text-green-700' : (n.total < 0 ? 'text-red-700' : 'text-gray-700');
                } else {
                    formatScore = '-';
                }
                break;

            case 'scramble':
                formatName = 'Scramble (Team)';
                formatIcon = 'groups';
                // Calculate team handicap (sum of all players * 0.375 for 2-person teams)
                const teamHandicapSum = this.players.reduce((sum, p) => sum + (p.handicap || 0), 0);
                const teamHandicap = Math.round(teamHandicapSum * 0.375); // 2-person scramble formula
                
                // Calculate stableford points for team using team handicap
                let scrambleStableford = '-';
                if (this.courseData && this.courseData.holes) {
                    const teamStablefordPoints = engine.calculateStablefordTotal(
                        scoresArray,
                        this.courseData.holes,
                        teamHandicap,
                        true
                    );
                    scrambleStableford = `${teamStablefordPoints} pts`;
                }
                
                formatScore = `${totalGross} strokes • ${scrambleStableford}`;
                formatColor = 'text-orange-700';
                break;

            case 'bestball':
                formatName = 'Best Ball';
                formatIcon = 'filter_list';
                formatScore = `${totalGross}`;
                formatColor = 'text-blue-700';
                break;

            case 'matchplay':
                formatName = 'Match Play';
                formatIcon = 'compare_arrows';
                formatScore = 'vs opponent';
                formatColor = 'text-gray-700';
                break;

            case 'skins':
                formatName = 'Skins';
                formatIcon = 'local_fire_department';
                formatScore = '0 skins';
                formatColor = 'text-red-700';
                break;
        }

        formatScoresHtml.push(`
            <div class="flex justify-between items-center py-1.5 px-2 bg-white rounded border border-gray-200">
                <div class="flex items-center gap-2">
                    <span class="material-symbols-outlined text-sm ${formatColor}">${formatIcon}</span>
                    <span class="font-medium text-gray-700 text-xs">${formatName}</span>
                </div>
                <span class="font-bold ${formatColor} text-sm">${formatScore}</span>
            </div>
        `);
    }

    formatScoresDiv.innerHTML = formatScoresHtml.join('');
};

// ===========================================================================
// PART 2: HOLE-BY-HOLE LEADERBOARD
// ===========================================================================

/**
 * Render hole-by-hole leaderboard showing scores for each hole
 * Inserted into the existing leaderboard section
 */
LiveScorecardManager.renderHoleByHoleLeaderboard = function(leaderboard) {
    if (leaderboard.length === 0) {
        return '<p class="text-center py-8 text-gray-500">No scores yet</p>';
    }

    // Determine how many holes have been played by at least one player
    let maxHole = 0;
    for (const entry of leaderboard) {
        if (entry.scores && entry.scores.length > 0) {
            for (const score of entry.scores) {
                if (score.hole_number > maxHole) {
                    maxHole = score.hole_number;
                }
            }
        }
    }

    if (maxHole === 0) {
        return '<p class="text-center py-8 text-gray-500">No holes completed yet</p>';
    }

    // Build hole-by-hole table
    let html = `
        <div class="overflow-x-auto">
            <h4 class="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span class="material-symbols-outlined text-green-600">grid_view</span>
                Hole-by-Hole Scores
            </h4>
            <table class="w-full text-sm border-collapse">
                <thead>
                    <tr class="bg-gray-100 border-b-2 border-gray-300">
                        <th class="px-3 py-2 text-left font-semibold text-gray-700 sticky left-0 bg-gray-100 z-10">Player</th>
                        <th class="px-2 py-2 text-center font-semibold text-gray-700">HCP</th>
    `;

    // Add column headers for each hole
    for (let hole = 1; hole <= maxHole; hole++) {
        // FIXED: Filter by selected tee marker (same logic as renderHole())
        let holeData = this.courseData?.holes?.find(h =>
            h.hole_number === hole &&
            h.tee_marker?.toLowerCase() === this.selectedTeeMarker?.toLowerCase()
        );
        // Fallback to any tee marker if no match
        if (!holeData) {
            holeData = this.courseData?.holes?.find(h => h.hole_number === hole);
        }
        const par = holeData?.par || 4;
        html += `
            <th class="px-2 py-2 text-center font-semibold text-gray-700 border-l border-gray-200 min-w-[50px]">
                <div class="text-xs">${hole}</div>
                <div class="text-xs text-gray-500">Par ${par}</div>
            </th>
        `;
    }

    html += `
                        <th class="px-3 py-2 text-center font-semibold text-gray-700 border-l-2 border-gray-300 bg-green-50">Thru</th>
                        <th class="px-3 py-2 text-center font-semibold text-gray-700 bg-green-50">Total</th>
                    </tr>
                </thead>
                <tbody>
    `;

    // Add row for each player
    for (const entry of leaderboard) {
        // Create score map for quick lookup
        const scoreMap = {};
        if (entry.scores) {
            for (const score of entry.scores) {
                scoreMap[score.hole_number] = score.gross_score;
            }
        }

        const holesPlayed = entry.holes_played || entry.scores?.length || 0;
        const totalScore = entry.total_gross || 0;

        html += `
            <tr class="border-b border-gray-200">
                <td class="px-3 py-2 font-semibold text-gray-900 sticky left-0 bg-white z-10">${entry.player_name}</td>
                <td class="px-2 py-2 text-center text-gray-600">${entry.handicap || 0}</td>
        `;

        // Add score for each hole
        for (let hole = 1; hole <= maxHole; hole++) {
            const score = scoreMap[hole];
            // FIXED: Filter by selected tee marker (same logic as renderHole())
            let holeData = this.courseData?.holes?.find(h =>
                h.hole_number === hole &&
                h.tee_marker?.toLowerCase() === this.selectedTeeMarker?.toLowerCase()
            );
            // Fallback to any tee marker if no match
            if (!holeData) {
                holeData = this.courseData?.holes?.find(h => h.hole_number === hole);
            }
            const par = holeData?.par || 4;

            if (score !== undefined) {
                // Color code based on par
                let scoreClass = 'text-gray-900';
                let bgClass = '';
                if (score < par - 1) {
                    scoreClass = 'text-white font-bold';
                    bgClass = 'bg-yellow-500'; // Eagle or better
                } else if (score === par - 1) {
                    scoreClass = 'text-white font-bold';
                    bgClass = 'bg-red-500'; // Birdie
                } else if (score === par) {
                    scoreClass = 'text-gray-900';
                    bgClass = 'bg-gray-200'; // Par
                } else if (score === par + 1) {
                    scoreClass = 'text-gray-900';
                    bgClass = 'bg-blue-100'; // Bogey
                } else {
                    scoreClass = 'text-gray-900 font-bold';
                    bgClass = 'bg-blue-200'; // Double bogey or worse
                }

                html += `<td class="px-2 py-2 text-center border-l border-gray-200 ${bgClass} ${scoreClass}">${score}</td>`;
            } else {
                html += `<td class="px-2 py-2 text-center border-l border-gray-200 text-gray-400">-</td>`;
            }
        }

        html += `
                <td class="px-3 py-2 text-center font-semibold text-gray-700 border-l-2 border-gray-300 bg-gray-50">${holesPlayed}</td>
                <td class="px-3 py-2 text-center font-bold text-gray-900 bg-green-50">${totalScore}</td>
            </tr>
        `;
    }

    html += `
                </tbody>
            </table>
        </div>

        <!-- Legend -->
        <div class="mt-4 flex flex-wrap gap-3 text-xs">
            <div class="flex items-center gap-1">
                <div class="w-6 h-6 rounded bg-yellow-500"></div>
                <span class="text-gray-600">Eagle or better</span>
            </div>
            <div class="flex items-center gap-1">
                <div class="w-6 h-6 rounded bg-red-500"></div>
                <span class="text-gray-600">Birdie</span>
            </div>
            <div class="flex items-center gap-1">
                <div class="w-6 h-6 rounded bg-gray-200"></div>
                <span class="text-gray-600">Par</span>
            </div>
            <div class="flex items-center gap-1">
                <div class="w-6 h-6 rounded bg-blue-100 border border-blue-200"></div>
                <span class="text-gray-600">Bogey</span>
            </div>
            <div class="flex items-center gap-1">
                <div class="w-6 h-6 rounded bg-blue-200 border border-blue-300"></div>
                <span class="text-gray-600">Double+ bogey</span>
            </div>
        </div>
    `;

    return html;
};

// ===========================================================================
// PART 3: ENHANCED LEADERBOARD RENDERING
// ===========================================================================

/**
 * Override the renderGroupLeaderboard function to include hole-by-hole view
 * CRITICAL: Use _originalRenderGroupLeaderboard to prevent infinite recursion if script loads twice
 */
// Only save original ONCE - check if we already have it
if (!LiveScorecardManager._originalRenderGroupLeaderboard) {
    LiveScorecardManager._originalRenderGroupLeaderboard = LiveScorecardManager.renderGroupLeaderboard;
}
LiveScorecardManager.renderGroupLeaderboard = function(leaderboard) {
    if (leaderboard.length === 0) {
        return '<p class="text-center py-8 text-gray-500">No scores yet</p>';
    }

    // Call the ORIGINAL function (not renderGroupLeaderboardEnhanced which could be circular)
    const originalOutput = LiveScorecardManager._originalRenderGroupLeaderboard.call(this, leaderboard);

    // Add toggle buttons for different views
    let html = `
        <div class="mb-4">
            <div class="flex gap-2 border-b border-gray-200">
                <button onclick="LiveScorecardManager.switchLeaderboardView('summary')"
                        id="leaderboardViewSummary"
                        class="px-4 py-2 text-sm font-medium border-b-2 border-green-500 text-green-600">
                    <span class="material-symbols-outlined text-xs align-middle">leaderboard</span>
                    Summary
                </button>
                <button onclick="LiveScorecardManager.switchLeaderboardView('holeByHole')"
                        id="leaderboardViewHoleByHole"
                        class="px-4 py-2 text-sm font-medium border-b-2 border-transparent text-gray-600">
                    <span class="material-symbols-outlined text-xs align-middle">grid_view</span>
                    Hole-by-Hole
                </button>
            </div>
        </div>

        <div id="leaderboardViewSummaryContent">
            ${originalOutput}
        </div>

        <div id="leaderboardViewHoleByHoleContent" style="display: none;">
            ${this.renderHoleByHoleLeaderboard(leaderboard)}
        </div>
    `;

    return html;
};
// Keep legacy reference for compatibility but point to the safe original
LiveScorecardManager.renderGroupLeaderboardEnhanced = LiveScorecardManager._originalRenderGroupLeaderboard;

/**
 * Switch between summary and hole-by-hole views
 */
LiveScorecardManager.switchLeaderboardView = function(view) {
    const summaryBtn = document.getElementById('leaderboardViewSummary');
    const holeByHoleBtn = document.getElementById('leaderboardViewHoleByHole');
    const summaryContent = document.getElementById('leaderboardViewSummaryContent');
    const holeByHoleContent = document.getElementById('leaderboardViewHoleByHoleContent');

    if (view === 'summary') {
        summaryBtn.classList.add('border-green-500', 'text-green-600');
        summaryBtn.classList.remove('border-transparent', 'text-gray-600');
        holeByHoleBtn.classList.remove('border-green-500', 'text-green-600');
        holeByHoleBtn.classList.add('border-transparent', 'text-gray-600');
        summaryContent.style.display = 'block';
        holeByHoleContent.style.display = 'none';
    } else {
        holeByHoleBtn.classList.add('border-green-500', 'text-green-600');
        holeByHoleBtn.classList.remove('border-transparent', 'text-gray-600');
        summaryBtn.classList.remove('border-green-500', 'text-green-600');
        summaryBtn.classList.add('border-transparent', 'text-gray-600');
        summaryContent.style.display = 'none';
        holeByHoleContent.style.display = 'block';
    }
};

// ===========================================================================
// PART 4: HOOK INTO EXISTING FUNCTIONS
// ===========================================================================

/**
 * Extend renderHole to update score display
 */
const originalRenderHole = LiveScorecardManager.renderHole;
LiveScorecardManager.renderHole = function() {
    originalRenderHole.call(this);
    // Update score display after rendering hole
    this.updatePlayerScoreDisplay();
};

/**
 * Extend selectPlayer to update score display
 */
const originalSelectPlayer = LiveScorecardManager.selectPlayer;
LiveScorecardManager.selectPlayer = function(playerId) {
    originalSelectPlayer.call(this, playerId);
    // Update score display for newly selected player
    this.updatePlayerScoreDisplay();
};

/**
 * Extend saveCurrentScore to update score display
 */
const originalSaveCurrentScore = LiveScorecardManager.saveCurrentScore;
LiveScorecardManager.saveCurrentScore = async function() {
    await originalSaveCurrentScore.call(this);
    // Update score display after saving score
    this.updatePlayerScoreDisplay();
};

console.log('[HoleByHoleLeaderboard] Enhancement loaded successfully');
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initLeaderboardEnhancement);
    } else {
        initLeaderboardEnhancement();
    }
})();
