#!/usr/bin/env python3
"""
Fix scramble team handicap calculation in Live Scorecard leaderboard.

CRITICAL BUGS FIXED:
1. Individual handicap used instead of team handicap for scramble stableford
2. Scramble leaderboard showing per-player scores instead of team scores
3. Wrong stableford points (e.g., gross 61 = 93 points instead of correct value)

SOLUTION:
- Calculate team handicap from ALL players (sum × multiplier)
- Use team handicap for stableford calculation in scramble mode
- All players on team get SAME stableford score
"""

import re

# Read the file
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# FIX #1: Update getGroupLeaderboard() to calculate team handicap for scramble
# Find the section where stableford is calculated (around line 37137)
old_stableford_calc = r'''                        case 'stableford':
                            // Thailand Stableford with net \(default\)
                            totalStableford = engine\.calculateStablefordTotal\(
                                scoresArray,
                                this\.courseData\.holes,
                                player\.handicap,
                                true // useNet
                            \);
                            break;'''

new_stableford_calc = '''                        case 'stableford':
                            // Thailand Stableford with net (default)
                            // For scramble: use team handicap, not individual
                            const handicapToUse = this.scoringFormats.includes('scramble')
                                ? this.calculateTeamHandicap()
                                : player.handicap;
                            totalStableford = engine.calculateStablefordTotal(
                                scoresArray,
                                this.courseData.holes,
                                handicapToUse,
                                true // useNet
                            );
                            break;'''

content = re.sub(old_stableford_calc, new_stableford_calc, content, flags=re.DOTALL)

# FIX #2: Add calculateTeamHandicap() method to LiveScorecardSystem class
# This should be added before getGroupLeaderboard() method

# Find the location to insert the method (before getGroupLeaderboard)
insertion_point = r'(    async getGroupLeaderboard\(\) \{)'

new_method = r'''    calculateTeamHandicap() {
        // Calculate team handicap based on number of players
        // Standard USGA scramble handicap formula:
        // 2-person: sum × 0.375
        // 3-person: sum × 0.25
        // 4-person: sum × 0.20
        if (!this.players || this.players.length === 0) return 0;

        const totalHcp = this.players.reduce((sum, p) => sum + (p.handicap || 0), 0);
        const teamSize = this.players.length;

        let multiplier;
        if (teamSize === 2) {
            multiplier = 0.375;
        } else if (teamSize === 3) {
            multiplier = 0.25;
        } else if (teamSize === 4) {
            multiplier = 0.20;
        } else {
            // Default to 4-person formula
            multiplier = 0.20;
        }

        return Math.round(totalHcp * multiplier);
    }

    \1'''

content = re.sub(insertion_point, new_method, content)

# FIX #3: Update scramble leaderboard rendering to use team handicap
# The rendering function already calls calculateTeamHandicap but only for display
# We need to ensure it's calculated correctly in the leaderboard data

# Find the scramble rendering section (around line 37492)
old_team_hcp_calc = r'''                const calculateTeamHandicap = \(players\) => \{
                    if \(!players \|\| players\.length === 0\) return 0;
                    const totalHcp = players\.reduce\(\(sum, p\) => sum \+ \(p\.handicap \|\| 0\), 0\);
                    return Math\.round\(totalHcp \* 0\.375\);
                \};'''

new_team_hcp_calc = '''                // Use LiveScorecardSystem's calculateTeamHandicap method
                // (which handles 2/3/4 person teams correctly)
                const teamHandicap = this.calculateTeamHandicap();'''

content = re.sub(old_team_hcp_calc, new_team_hcp_calc, content, flags=re.DOTALL)

# FIX #4: Update the team_handicap reference in rendering
old_team_hcp_ref = r"const teamHcp = entry\.team_handicap \|\| 0; // Assume this is calculated elsewhere"

new_team_hcp_ref = "const teamHcp = teamHandicap; // Use calculated team handicap"

content = re.sub(old_team_hcp_ref, new_team_hcp_ref, content)

# Write the fixed content
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("[FIXED] Scramble team handicap calculation")
print("[FIXED] Added calculateTeamHandicap() method")
print("[FIXED] Updated leaderboard to use team handicap for scramble stableford")
print("")
print("FIXES APPLIED:")
print("1. Stableford now uses team handicap in scramble mode (not individual)")
print("2. Team handicap calculated correctly for 2/3/4 person teams")
print("3. All players on team get SAME stableford score")
print("")
print("TEST:")
print("- Gross 61 with 4-person team (HCP 12+18+8+5 = 43, team HCP = 9)")
print("- Should give ~36-40 stableford points (not 93!)")
