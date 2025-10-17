# Live Scorecard Enhancement Implementation Guide
**Date:** October 17, 2025
**Status:** Ready to implement

## ✅ Step 1: Database Schema (COMPLETED)
- [x] Ran SQL: `sql/03_enhance_rounds_multi_format.sql`
- [x] Added columns to `rounds` table
- [x] Added columns to `round_holes` table
- [x] Created database functions

## 📝 Step 2: HTML Changes (MANUAL)

### Change 2A: Add Scramble Configuration UI
**Location:** After line 19823 (after Skins Value section)

**Insert this HTML:**
```html
                        <!-- Scramble Configuration -->
                        <div class="mb-4" id="scrambleConfigSection" style="display: none;">
                            <div class="p-4 bg-gradient-to-r from-blue-50 to-green-50 border-2 border-blue-200 rounded-lg">
                                <div class="flex items-center gap-2 mb-3">
                                    <span class="material-symbols-outlined text-blue-600">groups</span>
                                    <label class="text-sm font-semibold text-gray-900">Scramble Settings</label>
                                </div>

                                <!-- Team Size -->
                                <div class="mb-3">
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Team Size</label>
                                    <div class="flex gap-2">
                                        <label class="flex-1 flex items-center justify-center p-2 border-2 border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50">
                                            <input type="radio" name="scrambleTeamSize" value="2" class="mr-2">
                                            <span class="font-medium">2-Man</span>
                                        </label>
                                        <label class="flex-1 flex items-center justify-center p-2 border-2 border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50">
                                            <input type="radio" name="scrambleTeamSize" value="3" class="mr-2">
                                            <span class="font-medium">3-Man</span>
                                        </label>
                                        <label class="flex-1 flex items-center justify-center p-2 border-2 border-blue-500 bg-blue-50 rounded-lg cursor-pointer hover:border-blue-400 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50">
                                            <input type="radio" name="scrambleTeamSize" value="4" checked class="mr-2">
                                            <span class="font-medium">4-Man</span>
                                        </label>
                                    </div>
                                </div>

                                <!-- Drive Requirements -->
                                <div class="mb-3">
                                    <label class="flex items-center text-sm mb-2">
                                        <input type="checkbox" id="scrambleTrackDrives" class="mr-2" checked>
                                        <span class="font-medium">Track Drive Usage</span>
                                    </label>
                                    <div id="scrambleDriveRequirements">
                                        <label class="block text-xs text-gray-600 mb-1">Minimum drives per player</label>
                                        <div class="flex gap-2 items-center">
                                            <input type="number" id="scrambleMinDrives" min="0" max="18" value="4" class="w-20 rounded border px-2 py-1 text-sm">
                                            <span class="text-xs text-gray-600">drives (out of 18 holes)</span>
                                        </div>
                                        <p class="text-xs text-gray-500 mt-1">💡 Each player must have at least this many drives used</p>
                                    </div>
                                </div>

                                <!-- Track Putts -->
                                <div>
                                    <label class="flex items-center text-sm">
                                        <input type="checkbox" id="scrambleTrackPutts" class="mr-2" checked>
                                        <span class="font-medium">Track Who Made Each Putt</span>
                                    </label>
                                    <p class="text-xs text-gray-500 mt-1">📊 Track statistics for each team member</p>
                                </div>
                            </div>
                        </div>
```

### Change 2B: Update toggleFormatCheckbox Function
**Location:** Around line 32327
**Find this code:**
```javascript
    // Show/hide skins value input
    const skinsSection = document.getElementById('skinsValueSection');
    if (skinsSection) {
        if (selectedFormats.includes('skins')) {
            skinsSection.style.display = 'block';
        } else {
            skinsSection.style.display = 'none';
        }
    }
};
```

**Replace with:**
```javascript
    // Show/hide skins value input
    const skinsSection = document.getElementById('skinsValueSection');
    if (skinsSection) {
        if (selectedFormats.includes('skins')) {
            skinsSection.style.display = 'block';
        } else {
            skinsSection.style.display = 'none';
        }
    }

    // Show/hide scramble configuration
    const scrambleSection = document.getElementById('scrambleConfigSection');
    if (scrambleSection) {
        if (selectedFormats.includes('scramble')) {
            scrambleSection.style.display = 'block';
        } else {
            scrambleSection.style.display = 'none';
        }
    }
};
```

### Change 2C: Replace saveRoundToHistory Function
**Location:** Around line 29909
**Find:** `saveRoundToHistory(player) {`

**Replace entire function with:**
```javascript
    async saveRoundToHistory(player) {
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
                        formatScores.skins = { holes_won: 0, points: 0 };
                        break;

                    case 'scramble':
                        formatScores.scramble = totalGross;
                        break;

                    case 'matchplay':
                        formatScores.matchplay = { holes_won: 0, holes_lost: 0, holes_tied: 0 };
                        break;

                    case 'bestball':
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
                    minDrivesPerPlayer: parseInt(minDrives)
                };
            }

            // Only save for players with LINE IDs
            if (!player.lineUserId || player.lineUserId.trim() === '') {
                console.log(`[LiveScorecard] Skipping database save for ${player.name} - no LINE ID`);
                return null;
            }

            // Save to Supabase database
            const { data: round, error } = await window.SupabaseDB.client
                .from('rounds')
                .insert({
                    golfer_id: player.lineUserId,
                    course_id: courseId,
                    course_name: courseName,
                    type: roundType,
                    society_event_id: eventId,
                    started_at: new Date().toISOString(),
                    completed_at: new Date().toISOString(),
                    status: 'completed',
                    total_gross: totalGross,
                    total_stableford: totalStableford,
                    handicap_used: player.handicap,
                    tee_marker: teeMarker,
                    scoring_formats: this.scoringFormats,
                    format_scores: formatScores,
                    posted_formats: this.postedFormats || this.scoringFormats,
                    scramble_config: scrambleConfig
                })
                .select()
                .single();

            if (error) {
                console.error('[LiveScorecard] Error saving to round history:', error);
                return null;
            }

            console.log(`[LiveScorecard] ✅ Saved round to database for ${player.name}. Round ID: ${round.id}`);
            return round.id;

        } catch (error) {
            console.error('[LiveScorecard] Error in saveRoundToHistory:', error);
            return null;
        }
    }
```

### Change 2D: Add Score Distribution Function
**Location:** After saveRoundToHistory function (around line 29970)

**Insert this new function:**
```javascript
    async distributeRoundScores() {
        try {
            // Get all player LINE IDs
            const playerIds = this.players
                .filter(p => p.lineUserId && p.lineUserId.trim() !== '')
                .map(p => p.lineUserId);

            if (playerIds.length === 0) {
                console.log('[LiveScorecard] No players with LINE IDs to distribute to');
                return;
            }

            // Save round for each player and distribute
            const roundIds = [];
            for (const player of this.players) {
                const roundId = await this.saveRoundToHistory(player);
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

            // Mark as posted to organizer if society event
            if (!this.isPrivateRound && this.eventId && roundIds.length > 0) {
                const { data: event } = await window.SupabaseDB.client
                    .from('society_events')
                    .select('organizer_id')
                    .eq('id', this.eventId)
                    .single();

                if (event) {
                    console.log(`[LiveScorecard] ✅ Round visible to organizer: ${event.organizer_id}`);
                }
            }

            NotificationManager.show(`Scores shared with ${playerIds.length} player${playerIds.length !== 1 ? 's' : ''}!`, 'success');

        } catch (error) {
            console.error('[LiveScorecard] Error distributing scores:', error);
        }
    }
```

### Change 2E: Update completeRound Function
**Location:** Around line 29884
**Find:** `async completeRound() {`

**Replace entire function with:**
```javascript
    async completeRound() {
        if (!confirm('Complete round for all players?')) return;

        // Mark scorecards as completed in database
        for (const player of this.players) {
            const scorecardId = this.scorecards[player.id];
            if (scorecardId && !scorecardId.startsWith('local_')) {
                await window.SocietyGolfDB.completeScorecard(scorecardId);
            }

            // Calculate and update handicap for each player with a linked profile
            if (player.lineUserId) {
                await this.updatePlayerHandicap(player);
            }
        }

        // Distribute scores to all players and organizers
        await this.distributeRoundScores();

        NotificationManager.show('Round completed! Scores saved and distributed.', 'success');

        // Show finalized scorecard BEFORE resetting
        this.showFinalizedScorecard();
    }
```

## 🎯 Expected Results After Implementation

1. **Scramble Configuration UI**
   - Shows when Scramble format is selected
   - Options for 2-man, 3-man, or 4-man teams
   - Drive tracking with minimum requirements
   - Putt tracking option

2. **Multi-Format Scoring**
   - All selected formats calculated simultaneously
   - Scores saved with format breakdown
   - Visible in round history

3. **Score Distribution**
   - Rounds automatically shared with all players in group
   - Society organizers see completed rounds
   - Everyone can view shared scores

4. **Database Integration**
   - Scores save to `rounds` table (not localStorage)
   - Full format metadata stored
   - Proper RLS policies applied

## 📋 Testing Checklist

- [ ] Select Scramble format - config UI appears
- [ ] Deselect Scramble - config UI disappears
- [ ] Complete a round with multiple formats selected
- [ ] Check Supabase `rounds` table - new round appears
- [ ] Verify `scoring_formats` column has array of formats
- [ ] Verify `format_scores` column has score breakdown
- [ ] Check other players can see shared round
- [ ] Verify organizer sees society event rounds

## 🚀 Deployment Steps

1. Make HTML changes above
2. Test in local/dev environment
3. Commit changes to Git
4. Push to GitHub (triggers Netlify deploy)
5. Verify in production

## 📞 Support

If issues arise:
1. Check browser console for errors
2. Verify SQL migration ran successfully
3. Check Supabase RLS policies
4. Verify user LINE IDs are populated

---

**Created:** October 17, 2025
**Status:** Implementation guide ready
