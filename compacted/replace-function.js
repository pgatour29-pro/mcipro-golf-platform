const fs = require('fs');

// Read the file
let content = fs.readFileSync('index.html', 'utf8');

// Define the old function (exact match)
const oldFunction = `    saveRoundToHistory(player) {
        try {
            // Calculate total gross score
            let totalGross = 0;
            let holesPlayed = 0;

            for (let hole = 1; hole <= 18; hole++) {
                const scoreData = this.scoresCache[player.id]?.[hole];
                if (scoreData) {
                    totalGross += scoreData;
                    holesPlayed++;
                }
            }

            if (holesPlayed === 0) {
                console.log(\`[LiveScorecard] Skipping history save for \${player.name} - no scores recorded\`);
                return;
            }

            // Get course and tee info
            const courseName = this.courseData?.name || 'Unknown Course';
            const courseId = document.getElementById('scorecardCourseSelect')?.value || '';
            const teeMarker = document.querySelector('input[name="teeMarker"]:checked')?.value || 'white';
            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

            // Calculate course rating and slope (defaults if not available)
            let courseRating = 72.0;
            let slopeRating = 113;

            if (this.courseData?.holes) {
                // Calculate par as course rating approximation
                courseRating = this.courseData.holes.reduce((sum, hole) => sum + (hole.par || 4), 0);
            }

            // Only save for current logged-in user
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            if (currentUser.userId === player.lineUserId || player.id === currentUser.userId) {
                // Save to GolfScoreSystem
                if (typeof GolfScoreSystem !== 'undefined') {
                    GolfScoreSystem.saveScore({
                        course: courseName,
                        courseId: courseId,
                        score: totalGross,
                        holes: holesPlayed,
                        courseRating: courseRating,
                        slopeRating: slopeRating,
                        date: today,
                        tee: teeMarker,
                        notes: \`Completed via Live Scorecard. Format: \${this.scoringFormats.join(', ')}\`
                    });

                    console.log(\`[LiveScorecard] ✅ Saved round to history for \${player.name}: \${totalGross} (\${holesPlayed} holes)\`);
                } else {
                    console.warn('[LiveScorecard] GolfScoreSystem not available - round not saved to history');
                }
            }
        } catch (error) {
            console.error('[LiveScorecard] Error saving round to history:', error);
        }
    }`;

// Check if function exists
if (!content.includes(oldFunction)) {
    console.error('ERROR: Could not find exact old function to replace');
    process.exit(1);
}

// New async function with database support
const newFunction = `    async saveRoundToHistory(player) {
        try {
            // Skip if no scores recorded
            let holesPlayed = 0;
            for (let hole = 1; hole <= 18; hole++) {
                if (this.scoresCache[player.id]?.[hole]) holesPlayed++;
            }

            if (holesPlayed === 0) {
                console.log(\`[LiveScorecard] Skipping history save for \${player.name} - no scores recorded\`);
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
                console.log(\`[LiveScorecard] Skipping database save for \${player.name} - no LINE ID\`);
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

            console.log(\`[LiveScorecard] ✅ Saved round to database for \${player.name}. Round ID: \${round.id}\`);
            return round.id;

        } catch (error) {
            console.error('[LiveScorecard] Error in saveRoundToHistory:', error);
            return null;
        }
    }`;

// Replace the function
content = content.replace(oldFunction, newFunction);

// Write back to file
fs.writeFileSync('index.html', content, 'utf8');

console.log('✅ saveRoundToHistory function replaced with async database version');
