#!/usr/bin/env python3
"""
Fix scramble leaderboard to show ONE team row instead of individual players.

CRITICAL BUG:
- Scramble leaderboard shows 4 individual player rows
- Should show 1 team row with combined team name
- All players have same scores (team scores), so showing them separately is confusing

SOLUTION:
- Detect scramble format in renderGroupLeaderboard
- Group all players into single team entry
- Show team name as "Team: Player1, Player2, Player3, Player4"
- Display ONE row with team gross and team stableford
"""

import re

# Read the file
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# FIX: Add team grouping logic in renderGroupLeaderboard before sorting
# Find the location in renderGroupLeaderboard where we handle formats

old_format_handling = r'''        // Render multiple leaderboards - one for each selected format
        const leaderboardsHtml = this\.scoringFormats\.map\(\(format, formatIndex\) => \{
            // Clone and sort leaderboard for this specific format
            const sortedLeaderboard = \[\.\.\.leaderboard\];

            // Sort based on format
            switch \(format\) \{'''

new_format_handling = '''        // Render multiple leaderboards - one for each selected format
        const leaderboardsHtml = this.scoringFormats.map((format, formatIndex) => {
            // Clone and sort leaderboard for this specific format
            let sortedLeaderboard = [...leaderboard];

            // SPECIAL HANDLING FOR SCRAMBLE: Show ONE team row, not individual players
            if (format === 'scramble' && sortedLeaderboard.length > 0) {
                // In scramble, all players have the SAME scores (team scores)
                // So we combine them into ONE team entry
                const firstPlayer = sortedLeaderboard[0];
                const teamEntry = {
                    player_id: 'team_' + this.groupId,
                    player_name: 'Team: ' + this.players.map(p => p.name).join(', '),
                    handicap: this.calculateTeamHandicap(),
                    holes_played: firstPlayer.holes_played,
                    total_gross: firstPlayer.total_gross,
                    total_stableford: firstPlayer.total_stableford,
                    team_handicap: this.calculateTeamHandicap(),
                    scores: firstPlayer.scores,
                    isTeam: true
                };

                // Replace entire leaderboard with single team entry
                sortedLeaderboard = [teamEntry];
            }

            // Sort based on format
            switch (format) {'''

content = re.sub(old_format_handling, new_format_handling, content, flags=re.DOTALL)

# FIX #2: Update the scramble rendering to handle team entry correctly
# The existing scramble rendering code (line 37490+) needs to handle the team entry

old_scramble_render_body = r'''                                <tbody>
                                    \$\{sortedLeaderboard\.map\(\(entry, index\) => \{
                                        const holesPlayed = entry\.holes_played \|\| 0;
                                        const thru = holesPlayed === 18 \? 'F' : holesPlayed === 0 \? '-' : holesPlayed\.toString\(\);
                                        const teamHcp = teamHandicap; // Use calculated team handicap
                                        const grossScore = entry\.total_gross \|\| 0;
                                        const stablefordPoints = entry\.total_stableford \|\| 0; // Assume calculated with team HCP

                                        return `
                                            <tr class="border-b border-gray-200">
                                                <td class="py-2 px-2 font-bold">\$\{index \+ 1\}</td>
                                                <td class="py-2 px-2">\$\{entry\.player_name \|\| 'Team'\}</td>
                                                <td class="py-2 px-2">\$\{thru\}</td>
                                                <td class="py-2 px-2 text-center font-semibold text-gray-600">\$\{teamHcp\}</td>
                                                <td class="py-2 px-2 text-center font-bold text-lg">\$\{grossScore\}</td>
                                                <td class="py-2 px-2 text-center font-bold text-lg bg-orange-50 text-orange-700">\$\{stablefordPoints\} pts</td>
                                            </tr>
                                        `;
                                    \}\)\.join\(''\)\}
                                </tbody>'''

new_scramble_render_body = r'''                                <tbody>
                                    ${sortedLeaderboard.map((entry, index) => {
                                        const holesPlayed = entry.holes_played || 0;
                                        const thru = holesPlayed === 18 ? 'F' : holesPlayed === 0 ? '-' : holesPlayed.toString();
                                        const teamHcp = entry.team_handicap || teamHandicap; // Use team's handicap
                                        const grossScore = entry.total_gross || 0;
                                        const stablefordPoints = entry.total_stableford || 0;

                                        return `
                                            <tr class="border-b border-gray-200 ${entry.isTeam ? 'bg-blue-50' : ''}">
                                                <td class="py-2 px-2 font-bold">${index + 1}</td>
                                                <td class="py-2 px-2 ${entry.isTeam ? 'font-bold text-blue-900' : ''}">${entry.player_name || 'Team'}</td>
                                                <td class="py-2 px-2">${thru}</td>
                                                <td class="py-2 px-2 text-center font-semibold text-gray-600">${teamHcp}</td>
                                                <td class="py-2 px-2 text-center font-bold text-lg">${grossScore}</td>
                                                <td class="py-2 px-2 text-center font-bold text-lg bg-orange-50 text-orange-700">${stablefordPoints} pts</td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>'''

content = re.sub(old_scramble_render_body, new_scramble_render_body, content, flags=re.DOTALL)

# Write the fixed content
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("[FIXED] Scramble leaderboard team display")
print("[FIXED] Grouped all players into single team row")
print("[FIXED] Team name shows all player names")
print("")
print("FIXES APPLIED:")
print("1. Scramble leaderboard shows ONE team row (not 4 individual players)")
print("2. Team name: 'Team: Player1, Player2, Player3, Player4'")
print("3. Team row highlighted with blue background")
print("4. Team handicap displayed correctly")
print("")
print("USER EXPERIENCE:")
print("- Clear that this is a TEAM event (not individual)")
print("- No confusion about why all players have same scores")
print("- Leaderboard shows what matters: the TEAM's performance")
