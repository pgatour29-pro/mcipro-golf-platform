/**
 * ===========================================================================
 * LIVE SCORECARD ENHANCEMENTS
 * ===========================================================================
 * Date: October 17, 2025
 * Purpose: Multi-format scoring, Scramble configuration, and Round History fixes
 *
 * FEATURES:
 * 1. Scramble configuration UI (team size, drive requirements)
 * 2. Scramble tracking during play (whose drive, who putted)
 * 3. Multi-format score calculation and display
 * 4. Database-backed round history (not localStorage)
 * 5. Score distribution to all players and organizers
 * 6. Selective posting checkboxes for handicap
 * ===========================================================================
 */

// ===========================================================================
// PART 1: FORMAT TOGGLE HANDLER (Show/Hide Configuration Sections)
// ===========================================================================

/**
 * Toggle format-specific configuration sections based on checkbox selection
 * Called when any scoring format checkbox is clicked
 */
function toggleFormatSections() {
    const formats = {
        skins: document.querySelector('input[value="skins"]')?.checked || false,
        scramble: document.querySelector('input[value="scramble"]')?.checked || false
    };

    // Show/hide Skins value input
    document.getElementById('skinsValueSection').style.display = formats.skins ? 'block' : 'none';

    // Show/hide Scramble configuration
    document.getElementById('scrambleConfigSection').style.display = formats.scramble ? 'block' : 'none';
}

// ===========================================================================
// PART 2: ENHANCED saveRoundToHistory() - USE DATABASE INSTEAD OF LOCALSTORAGE
// ===========================================================================

/**
 * REPLACEMENT FOR LiveScorecardManager.saveRoundToHistory()
 * Saves round to Supabase database with multi-format support
 */
LiveScorecardManager.saveRoundToHistoryNew = async function(player) {
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

        // Get course and event info
        const courseName = this.courseData?.name || 'Unknown Course';
        const courseId = document.getElementById('scorecardCourseSelect')?.value || '';
        const teeMarker = document.querySelector('input[name="teeMarker"]:checked')?.value || 'white';
        const roundType = this.isPrivateRound ? 'private' : 'society';
        const eventId = this.eventId;
        const scorecardId = this.scorecards[player.id];

        // Calculate scores for ALL selected formats
        const formatScores = {};
        let totalGross = 0;
        let totalStableford = 0;

        // Build scores array for engine
        const scoresArray = [];
        for (let hole = 1; hole <= 18; hole++) {
            const score = this.scoresCache[player.id]?.[hole];
            if (score) {
                totalGross += score;
                scoresArray.push({ hole_number: hole, gross_score: score });
            }
        }

        const engine = LiveScorecardSystem.GolfScoringEngine;

        // Calculate each selected format
        for (const format of this.scoringFormats) {
            switch (format) {
                case 'stableford':
                    formatScores.stableford = engine.calculateStablefordTotal(
                        scoresArray,
                        this.courseData.holes,
                        player.handicap,
                        true
                    );
                    totalStableford = formatScores.stableford;
                    break;

                case 'strokeplay':
                    formatScores.strokeplay = totalGross;
                    break;

                case 'modifiedstableford':
                    formatScores.modifiedstableford = engine.calculateStablefordTotal(
                        scoresArray,
                        this.courseData.holes,
                        player.handicap,
                        true,
                        engine.modifiedStablefordPoints
                    );
                    break;

                case 'nassau':
                    const nassauResult = engine.calculateNassau([{
                        player_id: player.id,
                        scores: scoresArray
                    }], this.courseData.holes);
                    formatScores.nassau = nassauResult[0] || { front: 0, back: 0, total: 0 };
                    break;

                case 'skins':
                    // Skins requires group calculation
                    formatScores.skins = { holes_won: 0, points: 0 };
                    break;

                case 'scramble':
                    // Scramble uses team score
                    formatScores.scramble = totalGross; // Team score, not individual
                    break;

                case 'matchplay':
                    // Match play requires opponent
                    formatScores.matchplay = { holes_won: 0, holes_lost: 0, holes_tied: 0 };
                    break;

                case 'bestball':
                    // Best ball is team format
                    formatScores.bestball = totalGross;
                    break;
            }
        }

        // Get Scramble config if selected
        let scrambleConfig = null;
        if (this.scoringFormats.includes('scramble')) {
            const teamSize = document.querySelector('input[name="scrambleTeamSize"]:checked')?.value || '4';
            const trackDrives = document.getElementById('scrambleTrackDrives')?.checked || false;
            const trackPutts = document.getElementById('scrambleTrackPutts')?.checked || false;
            const minDrives = document.getElementById('scrambleMinDrives')?.value || '4';

            scrambleConfig = {
                teamSize: parseInt(teamSize),
                trackDrives: trackDrives,
                trackPutts: trackPutts,
                minDrivesPerPlayer: parseInt(minDrives),
                driveUsage: this.scrambleDriveUsage || {}
            };
        }

        // Only save for current logged-in user OR if player has LINE ID
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const isCurrentPlayer = (currentUser.userId === player.lineUserId || player.id === currentUser.userId);

        if (!isCurrentPlayer && !player.lineUserId) {
            console.log(`[LiveScorecard] Skipping database save for ${player.name} - not logged in and no LINE ID`);
            return null;
        }

        // Use Supabase database function to save
        const { data: roundId, error } = await window.SupabaseDB.client.rpc(
            'archive_scorecard_to_history',
            {
                p_scorecard_id: scorecardId && !scorecardId.startsWith('local_') ? scorecardId : null,
                p_golfer_id: player.lineUserId || player.id,
                p_round_type: roundType,
                p_society_event_id: eventId,
                p_scoring_formats: this.scoringFormats,
                p_format_scores: formatScores,
                p_posted_formats: this.scoringFormats, // Default: post all formats
                p_scramble_config: scrambleConfig
            }
        );

        if (error) {
            console.error('[LiveScorecard] Error saving to round history:', error);
            // FALLBACK: If database function fails, create round manually
            return await this.saveRoundManually(player, {
                courseId,
                courseName,
                teeMarker,
                roundType,
                eventId,
                formatScores,
                scrambleConfig,
                totalGross,
                totalStableford,
                holesPlayed
            });
        }

        console.log(`[LiveScorecard] ✅ Saved round to database for ${player.name}. Round ID: ${roundId}`);
        return roundId;

    } catch (error) {
        console.error('[LiveScorecard] Error in saveRoundToHistoryNew:', error);
        return null;
    }
};

/**
 * FALLBACK: Manual round creation if RPC function fails
 */
LiveScorecardManager.saveRoundManually = async function(player, roundData) {
    try {
        const { data: round, error } = await window.SupabaseDB.client
            .from('rounds')
            .insert({
                golfer_id: player.lineUserId || player.id,
                course_id: roundData.courseId,
                course_name: roundData.courseName,
                type: roundData.roundType,
                society_event_id: roundData.eventId,
                started_at: new Date().toISOString(),
                completed_at: new Date().toISOString(),
                status: 'completed',
                total_gross: roundData.totalGross,
                total_stableford: roundData.totalStableford,
                handicap_used: player.handicap,
                tee_marker: roundData.teeMarker,
                scoring_formats: roundData.formatScores ? Object.keys(roundData.formatScores) : this.scoringFormats,
                format_scores: roundData.formatScores,
                posted_formats: this.scoringFormats,
                scramble_config: roundData.scrambleConfig
            })
            .select()
            .single();

        if (error) throw error;

        console.log(`[LiveScorecard] ✅ Manually created round for ${player.name}. Round ID: ${round.id}`);
        return round.id;

    } catch (error) {
        console.error('[LiveScorecard] Error in manual round creation:', error);
        return null;
    }
};

// ===========================================================================
// PART 3: DISTRIBUTE SCORES TO PLAYERS AND ORGANIZERS
// ===========================================================================

/**
 * Distribute completed round to all players in the group and organizer
 */
LiveScorecardManager.distributeRoundScores = async function() {
    try {
        // Get all player LINE IDs (excluding guest players with no LINE account)
        const playerIds = this.players
            .filter(p => p.lineUserId && p.lineUserId.trim() !== '')
            .map(p => p.lineUserId);

        if (playerIds.length === 0) {
            console.log('[LiveScorecard] No players with LINE IDs to distribute to');
            return;
        }

        // Save round for each player and collect round IDs
        const roundIds = [];
        for (const player of this.players) {
            const roundId = await this.saveRoundToHistoryNew(player);
            if (roundId) {
                roundIds.push(roundId);

                // Distribute this round to all players
                const { error } = await window.SupabaseDB.client.rpc(
                    'distribute_round_to_players',
                    {
                        p_round_id: roundId,
                        p_player_ids: playerIds
                    }
                );

                if (error) {
                    console.error(`[LiveScorecard] Error distributing round ${roundId}:`, error);
                } else {
                    console.log(`[LiveScorecard] ✅ Distributed round ${roundId} to ${playerIds.length} players`);
                }
            }
        }

        // Notify organizer if this is a society event
        if (!this.isPrivateRound && this.eventId) {
            await this.notifyOrganizerOfCompletion(roundIds);
        }

        NotificationManager.show(`Scores shared with ${playerIds.length} player${playerIds.length !== 1 ? 's' : ''}!`, 'success');

    } catch (error) {
        console.error('[LiveScorecard] Error distributing scores:', error);
    }
};

/**
 * Notify society organizer that round is complete
 */
LiveScorecardManager.notifyOrganizerOfCompletion = async function(roundIds) {
    try {
        // Get organizer ID from event
        const { data: event, error } = await window.SupabaseDB.client
            .from('society_events')
            .select('organizer_id')
            .eq('id', this.eventId)
            .single();

        if (error || !event) {
            console.warn('[LiveScorecard] Could not fetch event organizer');
            return;
        }

        console.log(`[LiveScorecard] ✅ Round completion recorded for organizer: ${event.organizer_id}`);
        // Organizer will see rounds in their dashboard via organizer_id field

    } catch (error) {
        console.error('[LiveScorecard] Error notifying organizer:', error);
    }
};

// ===========================================================================
// PART 4: SCRAMBLE DRIVE AND PUTT TRACKING
// ===========================================================================

/**
 * Initialize Scramble tracking
 */
LiveScorecardManager.initScrambleTracking = function() {
    this.scrambleDriveUsage = {}; // { playerId: count }
    this.scrambleHoleData = {};   // { holeNumber: { drivePlayer, puttPlayer } }

    // Initialize counters for each player
    for (const player of this.players) {
        this.scrambleDriveUsage[player.id] = 0;
    }
};

/**
 * Show Scramble tracking UI for current hole
 * Called when Scramble format is selected
 */
LiveScorecardManager.renderScrambleTracking = function() {
    if (!this.scoringFormats.includes('scramble')) return '';

    const minDrives = parseInt(document.getElementById('scrambleMinDrives')?.value || '4');
    const trackDrives = document.getElementById('scrambleTrackDrives')?.checked || false;
    const trackPutts = document.getElementById('scrambleTrackPutts')?.checked || false;

    if (!trackDrives && !trackPutts) return '';

    let html = '<div class="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">';
    html += '<div class="text-sm font-semibold text-blue-900 mb-2">🏌️ Scramble Tracking - Hole ' + this.currentHole + '</div>';

    // Drive selection
    if (trackDrives) {
        html += '<div class="mb-3">';
        html += '<label class="block text-xs font-medium text-gray-700 mb-1">Whose drive are you using?</label>';
        html += '<select id="scrambleDrivePlayer" class="w-full text-sm border rounded px-2 py-1">';
        html += '<option value="">-- Select player --</option>';

        for (const player of this.players) {
            const used = this.scrambleDriveUsage[player.id] || 0;
            const remaining = Math.max(0, minDrives - used);
            const status = remaining > 0 ? ` (${remaining} more needed)` : ` (${used} used)`;
            html += `<option value="${player.id}">${player.name}${status}</option>`;
        }
        html += '</select>';
        html += '</div>';
    }

    // Putt selection
    if (trackPutts) {
        html += '<div>';
        html += '<label class="block text-xs font-medium text-gray-700 mb-1">Who made the putt?</label>';
        html += '<select id="scramblePuttPlayer" class="w-full text-sm border rounded px-2 py-1">';
        html += '<option value="">-- Select player --</option>';
        for (const player of this.players) {
            html += `<option value="${player.id}">${player.name}</option>`;
        }
        html += '</select>';
        html += '</div>';
    }

    html += '</div>';
    return html;
};

/**
 * Save Scramble hole data when score is entered
 */
LiveScorecardManager.saveScrambleHoleData = function(holeNumber) {
    if (!this.scoringFormats.includes('scramble')) return;

    const drivePlayerId = document.getElementById('scrambleDrivePlayer')?.value;
    const puttPlayerId = document.getElementById('scramblePuttPlayer')?.value;

    if (drivePlayerId) {
        this.scrambleDriveUsage[drivePlayerId] = (this.scrambleDriveUsage[drivePlayerId] || 0) + 1;
    }

    this.scrambleHoleData[holeNumber] = {
        drivePlayer: drivePlayerId ? this.players.find(p => p.id === drivePlayerId) : null,
        puttPlayer: puttPlayerId ? this.players.find(p => p.id === puttPlayerId) : null
    };

    console.log(`[Scramble] Hole ${holeNumber} - Drive: ${drivePlayerId || 'none'}, Putt: ${puttPlayerId || 'none'}`);
};

// ===========================================================================
// PART 5: MULTI-FORMAT SCORECARD DISPLAY
// ===========================================================================

/**
 * Generate multi-format scorecard display
 * Shows separate rows for each selected scoring format
 */
LiveScorecardManager.getMultiFormatScoreDisplay = function(player) {
    let html = '';

    // Build scores array
    const scoresArray = [];
    let totalGross = 0;
    for (let hole = 1; hole <= 18; hole++) {
        const score = this.scoresCache[player.id]?.[hole];
        if (score) {
            totalGross += score;
            scoresArray.push({ hole_number: hole, gross_score: score });
        }
    }

    const engine = LiveScorecardSystem.GolfScoringEngine;

    // Display each format
    for (const format of this.scoringFormats) {
        let formatName = '';
        let formatScore = '';

        switch (format) {
            case 'stableford':
                formatName = 'Thailand Stableford';
                formatScore = engine.calculateStablefordTotal(scoresArray, this.courseData.holes, player.handicap, true) + ' pts';
                break;

            case 'strokeplay':
                formatName = 'Stroke Play';
                formatScore = totalGross + ' strokes';
                break;

            case 'modifiedstableford':
                formatName = 'Modified Stableford';
                formatScore = engine.calculateStablefordTotal(scoresArray, this.courseData.holes, player.handicap, true, engine.modifiedStablefordPoints) + ' pts';
                break;

            case 'nassau':
                formatName = 'Nassau';
                const nassauResult = engine.calculateNassau([{ player_id: player.id, scores: scoresArray }], this.courseData.holes);
                const n = nassauResult[0] || { front: 0, back: 0, total: 0 };
                formatScore = `F9: ${n.front > 0 ? '+' : ''}${n.front}, B9: ${n.back > 0 ? '+' : ''}${n.back}, Total: ${n.total > 0 ? '+' : ''}${n.total}`;
                break;

            case 'scramble':
                formatName = 'Scramble (Team)';
                formatScore = totalGross + ' (team score)';
                break;

            case 'bestball':
                formatName = 'Best Ball (Team)';
                formatScore = totalGross;
                break;

            case 'matchplay':
                formatName = 'Match Play';
                formatScore = 'vs opponent';
                break;

            case 'skins':
                formatName = 'Skins';
                formatScore = '0 skins';
                break;
        }

        html += `
            <div class="flex justify-between items-center py-1 text-sm border-b border-gray-100">
                <span class="font-medium text-gray-700">${formatName}:</span>
                <span class="font-bold text-gray-900">${formatScore}</span>
            </div>
        `;
    }

    return html;
};

// ===========================================================================
// PART 6: SELECTIVE POSTING CHECKBOXES FOR ROUND HISTORY
// ===========================================================================

/**
 * Show modal with selective posting options before completing round
 */
LiveScorecardManager.showPostingSelectionModal = function() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.id = 'postingSelectionModal';

    let checkboxes = '';
    for (const format of this.scoringFormats) {
        const formatNames = {
            stableford: 'Thailand Stableford',
            strokeplay: 'Stroke Play',
            modifiedstableford: 'Modified Stableford',
            nassau: 'Nassau',
            scramble: 'Scramble',
            bestball: 'Best Ball',
            matchplay: 'Match Play',
            skins: 'Skins'
        };

        const name = formatNames[format] || format;
        // By default, only post Stableford and Stroke Play to handicap
        const defaultChecked = (format === 'stableford' || format === 'strokeplay') ? 'checked' : '';

        checkboxes += `
            <label class="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input type="checkbox" name="postFormat" value="${format}" ${defaultChecked} class="mr-3 w-5 h-5">
                <div class="flex-1">
                    <div class="font-semibold text-gray-900">${name}</div>
                    <div class="text-xs text-gray-600">Post to official handicap record</div>
                </div>
            </label>
        `;
    }

    modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 class="text-xl font-bold text-gray-900 mb-4">📊 Post Scores to Round History</h3>

            <p class="text-sm text-gray-600 mb-4">
                Select which scoring formats to include in your official round history and handicap calculation:
            </p>

            <div class="space-y-2 mb-6">
                ${checkboxes}
            </div>

            <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <div class="text-xs font-medium text-blue-900 mb-1">💡 Tip</div>
                <div class="text-xs text-blue-800">
                    Only Stableford and Stroke Play typically count toward official handicaps. Other formats are saved for statistics.
                </div>
            </div>

            <div class="flex gap-3">
                <button onclick="LiveScorecardManager.closePostingModal()" class="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                    Cancel
                </button>
                <button onclick="LiveScorecardManager.confirmPostingAndComplete()" class="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                    Complete Round
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
};

/**
 * Close posting selection modal
 */
LiveScorecardManager.closePostingModal = function() {
    document.getElementById('postingSelectionModal')?.remove();
};

/**
 * Confirm posting selection and complete round
 */
LiveScorecardManager.confirmPostingAndComplete = async function() {
    // Get selected formats to post
    const selectedFormats = Array.from(
        document.querySelectorAll('input[name="postFormat"]:checked')
    ).map(input => input.value);

    console.log('[LiveScorecard] Posting formats:', selectedFormats);

    // Store for use in saveRoundToHistoryNew
    this.postedFormats = selectedFormats;

    // Close modal
    this.closePostingModal();

    // Continue with original complete round flow
    await this.completeRoundWithPosting();
};

/**
 * Enhanced complete round with posting selection
 */
LiveScorecardManager.completeRoundWithPosting = async function() {
    // Mark scorecards as completed in database
    for (const player of this.players) {
        const scorecardId = this.scorecards[player.id];
        if (scorecardId && !scorecardId.startsWith('local_')) {
            await window.SocietyGolfDB.completeScorecard(scorecardId);
        }

        // Calculate and update handicap
        if (player.lineUserId) {
            await this.updatePlayerHandicap(player);
        }

        // Save round to database with selected posting formats
        await this.saveRoundToHistoryNew(player);
    }

    // Distribute scores to all players and organizer
    await this.distributeRoundScores();

    NotificationManager.show('Round completed! Scores posted to round history.', 'success');

    // Show finalized scorecard
    this.showFinalizedScorecard();
};

console.log('[LiveScorecard] ✅ Enhancements loaded successfully');
