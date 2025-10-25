#!/usr/bin/env python3
"""
Add 2-man team match play format with best ball and tie-breaker.

NEW FEATURES:
1. Match Play Teams mode (2v2)
2. Best ball counts first, second ball breaks ties
3. Front 9, Back 9, and Overall scoring (like Nassau)
4. Works with both stroke play and stableford

RULES:
- Team A: Player 1 + Player 2
- Team B: Player 3 + Player 4
- Each hole: Compare best balls first
  - If tied, compare second balls
  - Winner gets the hole
- Track: Front 9 (holes 1-9), Back 9 (holes 10-18), Overall

EXAMPLE:
Hole 1 (Par 4):
- Team A: Player 1 = 4, Player 2 = 5
- Team B: Player 3 = 4, Player 4 = 6
- Best balls: 4 vs 4 (tied)
- Second balls: 5 vs 6 → Team A wins hole
"""

import re

# Read the file
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# STEP 1: Add team match play configuration UI in the match play section
# Find the match play configuration section (around line 21350)

old_matchplay_config = r'''                                    <!-- Match Play Configuration -->
                                    <div id="matchPlayConfig" class="hidden mt-3 p-3 bg-yellow-50 border border-yellow-300 rounded">
                                        <p class="text-sm text-gray-700">
                                            <strong>Match Play:</strong> Individual vs field competition. Each player compares their net score on each hole against all other players.
                                        </p>
                                    </div>'''

new_matchplay_config = '''                                    <!-- Match Play Configuration -->
                                    <div id="matchPlayConfig" class="hidden mt-3 p-3 bg-yellow-50 border border-yellow-300 rounded">
                                        <label class="block text-sm font-semibold text-gray-900 mb-2">Match Play Format</label>

                                        <div class="flex gap-2 mb-3">
                                            <label class="flex-1 flex items-center justify-center p-2 border-2 border-blue-500 bg-blue-50 rounded-lg cursor-pointer">
                                                <input type="radio" name="matchPlayType" value="individual" checked class="mr-2" onchange="updateMatchPlayType()">
                                                <span class="text-xs font-medium">Individual vs Field</span>
                                            </label>
                                            <label class="flex-1 flex items-center justify-center p-2 border-2 border-gray-300 rounded-lg cursor-pointer hover:border-blue-400">
                                                <input type="radio" name="matchPlayType" value="teams" class="mr-2" onchange="updateMatchPlayType()">
                                                <span class="text-xs font-medium">2-Man Teams</span>
                                            </label>
                                        </div>

                                        <!-- Individual Match Play Info -->
                                        <div id="matchPlayIndividual" class="text-sm text-gray-700">
                                            <strong>Individual:</strong> Each player compares their net score on each hole against all other players.
                                        </div>

                                        <!-- Team Match Play Info -->
                                        <div id="matchPlayTeams" class="hidden text-sm text-gray-700">
                                            <strong>2-Man Teams:</strong> Best ball vs best ball, second ball breaks ties.<br>
                                            <span class="text-xs">• Scored as Front 9, Back 9, and Overall<br>
                                            • Example: If both teams have 4 (best ball tied), then 5 beats 6 (second ball)<br>
                                            • Can use stroke or stableford scoring</span>
                                        </div>
                                    </div>'''

content = re.sub(old_matchplay_config, new_matchplay_config, content, flags=re.DOTALL)

# STEP 2: Add updateMatchPlayType function to toggle between individual and team mode
# Find the updateScrambleHcpMethod function and add after it

insertion_point = r"(window\.updateScrambleHcpMethod = function\(\) \{[\s\S]*?\};)"

new_function = r'''\1

window.updateMatchPlayType = function() {
    const selected = document.querySelector('input[name="matchPlayType"]:checked')?.value;

    const individualDiv = document.getElementById('matchPlayIndividual');
    const teamsDiv = document.getElementById('matchPlayTeams');

    if (selected === 'teams') {
        individualDiv.classList.add('hidden');
        teamsDiv.classList.remove('hidden');
    } else {
        individualDiv.classList.remove('hidden');
        teamsDiv.classList.add('hidden');
    }

    // Update radio button styling
    document.querySelectorAll('input[name="matchPlayType"]').forEach(radio => {
        const label = radio.closest('label');
        if (radio.checked) {
            label.classList.remove('border-gray-300', 'bg-white');
            label.classList.add('border-blue-500', 'bg-blue-50');
        } else {
            label.classList.remove('border-blue-500', 'bg-blue-50');
            label.classList.add('border-gray-300', 'bg-white');
        }
    });
};'''

content = re.sub(insertion_point, new_function, content)

# STEP 3: Add team match play calculation to GolfScoringEngine
# Find the calculateMatchPlay method and add new method after it

old_match_play_end = r"(    calculateMatchPlay\(allPlayerData, courseHoles, useNet = true\) \{[\s\S]*?return matchResults;\s+\})"

new_team_match_method = r'''\1

    calculateTeamMatchPlay(team1Data, team2Data, courseHoles, useNet = true, useSt ableford = false) {
        // 2-man team match play: best ball vs best ball, second ball breaks ties
        // Returns: { front9: +/-, back9: +/-, overall: +/-, holeResults: [...] }

        const team1Results = { front9: 0, back9: 0, overall: 0 };
        const holeResults = [];

        for (let holeNum = 1; holeNum <= 18; holeNum++) {
            const hole = courseHoles.find(h => (h.hole || h.hole_number || h.number) === holeNum);
            if (!hole) continue;

            const par = hole.par;
            const strokeIndex = hole.strokeIndex || hole.stroke_index || holeNum;

            // Get both players' scores for each team
            const team1Player1 = team1Data[0];
            const team1Player2 = team1Data[1];
            const team2Player1 = team2Data[0];
            const team2Player2 = team2Data[1];

            const t1p1Score = team1Player1.scores.find(s => s.hole_number === holeNum);
            const t1p2Score = team1Player2.scores.find(s => s.hole_number === holeNum);
            const t2p1Score = team2Player1.scores.find(s => s.hole_number === holeNum);
            const t2p2Score = team2Player2.scores.find(s => s.hole_number === holeNum);

            if (!t1p1Score || !t1p2Score || !t2p1Score || !t2p2Score) {
                holeResults.push({ hole: holeNum, result: 'AS', team1Best: null, team2Best: null });
                continue;
            }

            let team1Scores = [];
            let team2Scores = [];

            if (useStableford) {
                // Calculate stableford points for each player
                const getStablefordPoints = (grossScore, playerHcp) => {
                    const shotsReceived = playerHcp >= strokeIndex ? 1 : 0;
                    const netScore = grossScore - shotsReceived;
                    const diff = netScore - par;

                    if (diff <= -2) return 4;      // Eagle or better
                    else if (diff === -1) return 3; // Birdie
                    else if (diff === 0) return 2;  // Par
                    else if (diff === 1) return 1;  // Bogey
                    else return 0;                  // Double bogey+
                };

                team1Scores = [
                    getStablefordPoints(t1p1Score.gross_score, team1Player1.handicap),
                    getStablefordPoints(t1p2Score.gross_score, team1Player2.handicap)
                ].sort((a, b) => b - a); // Sort descending (best first)

                team2Scores = [
                    getStablefordPoints(t2p1Score.gross_score, team2Player1.handicap),
                    getStablefordPoints(t2p2Score.gross_score, team2Player2.handicap)
                ].sort((a, b) => b - a);
            } else {
                // Stroke play - use net scores
                const getNetScore = (grossScore, playerHcp) => {
                    const shotsReceived = playerHcp >= strokeIndex ? 1 : 0;
                    return grossScore - shotsReceived;
                };

                team1Scores = [
                    getNetScore(t1p1Score.gross_score, team1Player1.handicap),
                    getNetScore(t1p2Score.gross_score, team1Player2.handicap)
                ].sort((a, b) => a - b); // Sort ascending (best first for strokes)

                team2Scores = [
                    getNetScore(t2p1Score.gross_score, team2Player1.handicap),
                    getNetScore(t2p2Score.gross_score, team2Player2.handicap)
                ].sort((a, b) => a - b);
            }

            // Compare best balls
            let holeResult;
            if (useStableford) {
                // Higher is better for stableford
                if (team1Scores[0] > team2Scores[0]) {
                    holeResult = 'W';  // Team 1 wins
                    team1Results.overall++;
                    if (holeNum <= 9) team1Results.front9++;
                    else team1Results.back9++;
                } else if (team1Scores[0] < team2Scores[0]) {
                    holeResult = 'L';  // Team 2 wins
                    team1Results.overall--;
                    if (holeNum <= 9) team1Results.front9--;
                    else team1Results.back9--;
                } else {
                    // Best balls tied - check second ball
                    if (team1Scores[1] > team2Scores[1]) {
                        holeResult = 'W';
                        team1Results.overall++;
                        if (holeNum <= 9) team1Results.front9++;
                        else team1Results.back9++;
                    } else if (team1Scores[1] < team2Scores[1]) {
                        holeResult = 'L';
                        team1Results.overall--;
                        if (holeNum <= 9) team1Results.front9--;
                        else team1Results.back9--;
                    } else {
                        holeResult = 'AS';  // All square
                    }
                }
            } else {
                // Lower is better for stroke play
                if (team1Scores[0] < team2Scores[0]) {
                    holeResult = 'W';
                    team1Results.overall++;
                    if (holeNum <= 9) team1Results.front9++;
                    else team1Results.back9++;
                } else if (team1Scores[0] > team2Scores[0]) {
                    holeResult = 'L';
                    team1Results.overall--;
                    if (holeNum <= 9) team1Results.front9--;
                    else team1Results.back9--;
                } else {
                    // Best balls tied - check second ball
                    if (team1Scores[1] < team2Scores[1]) {
                        holeResult = 'W';
                        team1Results.overall++;
                        if (holeNum <= 9) team1Results.front9++;
                        else team1Results.back9++;
                    } else if (team1Scores[1] > team2Scores[1]) {
                        holeResult = 'L';
                        team1Results.overall--;
                        if (holeNum <= 9) team1Results.front9--;
                        else team1Results.back9--;
                    } else {
                        holeResult = 'AS';
                    }
                }
            }

            holeResults.push({
                hole: holeNum,
                result: holeResult,
                team1Best: team1Scores[0],
                team1Second: team1Scores[1],
                team2Best: team2Scores[0],
                team2Second: team2Scores[1]
            });
        }

        return {
            front9: team1Results.front9,
            back9: team1Results.back9,
            overall: team1Results.overall,
            holeResults: holeResults
        };
    }'''

content = re.sub(old_match_play_end, new_team_match_method, content)

# Write the fixed content
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("[ADDED] 2-man team match play format")
print("[ADDED] updateMatchPlayType() function")
print("[ADDED] calculateTeamMatchPlay() method")
print("")
print("NEW FEATURES:")
print("1. Match Play Teams mode (2v2)")
print("2. Best ball vs best ball comparison")
print("3. Second ball breaks ties")
print("4. Front 9 / Back 9 / Overall scoring")
print("5. Works with stroke or stableford")
print("")
print("NEXT: Need to integrate rendering in leaderboard")
