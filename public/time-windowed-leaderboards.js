// ============================================================================
// TIME-WINDOWED LEADERBOARDS (FedEx Cup Style)
// ============================================================================
// Created: 2025-12-11
// Purpose: Daily, Weekly, Monthly, Yearly standings like PGA TOUR FedEx Cup
// ============================================================================

class TimeWindowedLeaderboards {
    constructor() {
        this.supabase = null;
        this.currentUserId = null;
        this.currentSociety = null;
        this.currentPeriod = 'weekly';
        this.currentFilter = 'my_societies'; // 'platform', 'my_societies', or specific society ID
        this.userSocieties = [];
        this.refreshInterval = null;
    }

    async init(supabaseClient, userId, societyId = null) {
        this.supabase = supabaseClient;
        this.currentUserId = userId;
        this.currentSociety = societyId;
        console.log('[TimeWindowedLeaderboards] Initialized');

        // Load user's societies for the filter dropdown
        await this.loadUserSocieties();
        this.populateSocietyDropdown();
    }

    async loadUserSocieties() {
        if (!this.supabase || !this.currentUserId) return;

        try {
            const { data, error } = await this.supabase
                .from('society_members')
                .select('society_id, societies(id, name)')
                .eq('golfer_id', this.currentUserId)
                .eq('status', 'active');

            if (!error && data) {
                this.userSocieties = data
                    .filter(m => m.societies)
                    .map(m => ({
                        id: m.societies.id,
                        name: m.societies.name
                    }));
                console.log('[TimeWindowedLeaderboards] Loaded societies:', this.userSocieties.length);
            }
        } catch (err) {
            console.error('[TimeWindowedLeaderboards] Error loading societies:', err);
        }
    }

    populateSocietyDropdown() {
        const select = document.getElementById('leaderboardSocietyFilter');
        if (!select) return;

        // Keep the first two options (Entire Platform, All My Societies)
        while (select.options.length > 2) {
            select.remove(2);
        }

        // Add separator if there are societies
        if (this.userSocieties.length > 0) {
            const separator = document.createElement('option');
            separator.disabled = true;
            separator.textContent = '── My Societies ──';
            select.add(separator);

            // Add each society
            this.userSocieties.forEach(society => {
                const option = document.createElement('option');
                option.value = society.id;
                option.textContent = society.name;
                select.add(option);
            });
        }

        // Set default selection
        select.value = this.currentFilter;
    }

    async setSocietyFilter(value) {
        this.currentFilter = value;

        if (value === 'platform') {
            this.currentSociety = null; // All platform
        } else if (value === 'my_societies') {
            this.currentSociety = 'my_societies'; // Special marker for user's societies
        } else {
            this.currentSociety = value; // Specific society ID
        }

        // Reload the leaderboard
        await this.showPeriod(this.currentPeriod);
    }

    // =========================================================================
    // GET STANDINGS BY PERIOD
    // =========================================================================

    async getDailyStandings(societyFilter = null) {
        return await this.getStandings('daily', societyFilter);
    }

    async getWeeklyStandings(societyFilter = null) {
        return await this.getStandings('weekly', societyFilter);
    }

    async getMonthlyStandings(societyFilter = null) {
        return await this.getStandings('monthly', societyFilter);
    }

    async getYearlyStandings(year = null, societyFilter = null) {
        const result = await this.getStandings('yearly', societyFilter);
        result.year = year || new Date().getFullYear();
        return result;
    }

    async getStandings(period, societyFilter = null) {
        // LEADERBOARD RESET: Starting fresh from 2025-12-12
        // Only count rounds from today onwards
        const LEADERBOARD_START_DATE = '2025-12-12T00:00:00.000Z';

        if (!this.supabase) {
            return { success: false, error: 'Supabase not initialized' };
        }

        try {
            // Calculate period start date
            const now = new Date();
            let startDate;

            switch (period) {
                case 'daily':
                    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    break;
                case 'weekly':
                    // Week starts on Monday
                    const dayOfWeek = now.getDay();
                    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
                    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset);
                    break;
                case 'monthly':
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    break;
                case 'yearly':
                    startDate = new Date(now.getFullYear(), 0, 1);
                    break;
                default:
                    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            }

            // Use the later of period start or leaderboard reset date
            let startDateStr = startDate.toISOString();
            if (startDateStr < LEADERBOARD_START_DATE) {
                startDateStr = LEADERBOARD_START_DATE;
            }

            // Query scorecards WITH scores to calculate stableford (like live leaderboard)
            const { data: scorecards, error } = await this.supabase
                .from('scorecards')
                .select('id, player_id, total_gross, total_net, created_at, scores(*)')
                .gte('created_at', startDateStr);

            console.log('[TimeWindowedLeaderboards] Query:', { startDateStr, count: scorecards?.length || 0 });

            if (error) {
                console.error('[TimeWindowedLeaderboards] Query error:', error);
                return { success: false, error: error.message };
            }

            if (!scorecards || scorecards.length === 0) {
                return { success: true, standings: [] };
            }

            // Aggregate by player - track gross, net, and stableford
            const playerStats = {};
            for (const card of scorecards) {
                if (!card.player_id) continue;
                // Skip scorecards without scores
                if (!card.total_gross && !card.total_net) continue;

                // Calculate stableford from individual hole scores (like live leaderboard)
                let totalStableford = 0;
                if (card.scores && Array.isArray(card.scores)) {
                    for (const score of card.scores) {
                        totalStableford += score.stableford_points || 0;
                    }
                }

                if (!playerStats[card.player_id]) {
                    playerStats[card.player_id] = {
                        player_id: card.player_id,
                        total_gross: 0,
                        total_net: 0,
                        total_stableford: 0,
                        rounds_played: 0
                    };
                }

                playerStats[card.player_id].total_gross += card.total_gross || 0;
                playerStats[card.player_id].total_net += card.total_net || 0;
                playerStats[card.player_id].total_stableford += totalStableford;
                playerStats[card.player_id].rounds_played += 1;
            }

            // Convert to array and sort by total stableford (higher is better)
            let standings = Object.values(playerStats)
                .filter(p => p.rounds_played > 0)
                .map(p => ({
                    ...p,
                    // For single round, show actual score. For multiple, show average
                    display_gross: p.rounds_played === 1 ? p.total_gross : Math.round(p.total_gross / p.rounds_played * 10) / 10,
                    display_net: p.rounds_played === 1 ? p.total_net : Math.round(p.total_net / p.rounds_played * 10) / 10,
                    display_stableford: p.total_stableford // Total stableford points
                }))
                .sort((a, b) => b.total_stableford - a.total_stableford); // Higher stableford = better ranking

            // Get player names
            const playerIdsList = standings.map(s => s.player_id);
            if (playerIdsList.length > 0) {
                const { data: profiles } = await this.supabase
                    .from('user_profiles')
                    .select('line_user_id, name, display_name')
                    .in('line_user_id', playerIdsList);

                const nameMap = {};
                if (profiles) {
                    profiles.forEach(p => {
                        nameMap[p.line_user_id] = p.display_name || p.name || 'Unknown';
                    });
                }

                standings = standings.map((s, index) => ({
                    ...s,
                    player_name: nameMap[s.player_id] || 'Unknown',
                    rank: index + 1,
                    rank_change: 0,
                    total_points: s.display_stableford // Stableford for ranking
                }));
            }

            console.log(`[TimeWindowedLeaderboards] ${period} standings:`, standings.length, `players (from ${startDateStr})`);
            return { success: true, standings };

        } catch (err) {
            console.error('[TimeWindowedLeaderboards] Error:', err);
            return { success: false, error: err.message };
        }
    }

    // =========================================================================
    // MOVERS & SHAKERS
    // =========================================================================

    async getMoversAndShakers(periodType = 'weekly', societyId = null) {
        const society = societyId || this.currentSociety;

        const { data, error } = await this.supabase.rpc('get_movers_and_shakers', {
            p_period_type: periodType,
            p_society_id: society,
            p_limit: 10
        });

        if (error) {
            console.error('[TimeWindowedLeaderboards] Movers error:', error);
            return { success: false, error: error.message };
        }

        return { success: true, movers: data || [] };
    }

    // =========================================================================
    // PLAYER STANDINGS
    // =========================================================================

    async getPlayerStandings(playerId = null) {
        const player = playerId || this.currentUserId;

        // Get all period standings for a player
        const [daily, weekly, monthly, yearly] = await Promise.all([
            this.getDailyStandings(),
            this.getWeeklyStandings(),
            this.getMonthlyStandings(),
            this.getYearlyStandings()
        ]);

        const findPlayerRank = (standings, pid) => {
            if (!standings.success) return null;
            const found = standings.standings.find(s => s.player_id === pid);
            return found ? {
                rank: found.rank,
                points: found.total_points,
                rounds: found.rounds_played
            } : null;
        };

        return {
            success: true,
            daily: findPlayerRank(daily, player),
            weekly: findPlayerRank(weekly, player),
            monthly: findPlayerRank(monthly, player),
            yearly: findPlayerRank(yearly, player)
        };
    }

    // =========================================================================
    // CALCULATE STANDINGS (Manual Trigger)
    // =========================================================================

    async calculatePeriodStandings(periodType, periodStart, periodEnd, societyId = null) {
        const society = societyId || this.currentSociety;

        const { data, error } = await this.supabase.rpc('calculate_period_standings', {
            p_period_type: periodType,
            p_period_start: periodStart,
            p_period_end: periodEnd,
            p_society_id: society
        });

        if (error) {
            console.error('[TimeWindowedLeaderboards] Calculate error:', error);
            return { success: false, error: error.message };
        }

        return { success: true, standings: data };
    }

    // =========================================================================
    // SNAPSHOTS
    // =========================================================================

    async createSnapshot(snapshotName, description = '') {
        const { data, error } = await this.supabase.rpc('create_leaderboard_snapshot', {
            p_snapshot_name: snapshotName,
            p_description: description,
            p_society_id: this.currentSociety
        });

        if (error) {
            console.error('[TimeWindowedLeaderboards] Snapshot error:', error);
            return { success: false, error: error.message };
        }

        return { success: true, snapshotId: data };
    }

    async getSnapshots(societyId = null) {
        const society = societyId || this.currentSociety;

        const { data, error } = await this.supabase
            .from('leaderboard_snapshots')
            .select('*')
            .eq('society_id', society)
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) {
            console.error('[TimeWindowedLeaderboards] Get snapshots error:', error);
            return { success: false, error: error.message };
        }

        return { success: true, snapshots: data || [] };
    }

    // =========================================================================
    // UI RENDERING
    // =========================================================================

    renderStandingsTable(standings, containerId, options = {}) {
        console.log('[TimeWindowedLeaderboards] renderStandingsTable called:', {
            containerId,
            standingsCount: standings?.length,
            standings: standings?.slice(0, 3) // First 3 for debugging
        });

        const container = document.getElementById(containerId);
        if (!container) {
            console.error('[TimeWindowedLeaderboards] Container not found:', containerId);
            return;
        }

        const { title = 'Standings', showMovement = true, highlightPlayerId = null } = options;

        if (!standings || standings.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="material-symbols-outlined text-4xl mb-2">leaderboard</i>
                    <p>No rounds played yet this period</p>
                    <p class="text-sm mt-2">Complete a round to appear on the leaderboard!</p>
                </div>
            `;
            return;
        }

        let html = `
            <div class="bg-white rounded-xl shadow-lg overflow-hidden">
                <div class="bg-gradient-to-r from-emerald-600 to-emerald-700 px-4 py-3">
                    <h3 class="text-white font-bold text-lg">${title}</h3>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-2 py-2 text-left text-xs font-semibold text-gray-600">Rank</th>
                                <th class="px-2 py-2 text-left text-xs font-semibold text-gray-600">Player</th>
                                <th class="px-2 py-2 text-center text-xs font-semibold text-gray-600">Gross</th>
                                <th class="px-2 py-2 text-center text-xs font-semibold text-gray-600">Net</th>
                                <th class="px-2 py-2 text-center text-xs font-semibold text-gray-600">Pts</th>
                                <th class="px-2 py-2 text-center text-xs font-semibold text-gray-600">Rds</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100">
        `;

        standings.forEach((player, index) => {
            const isHighlighted = player.player_id === highlightPlayerId;
            const rankDisplay = this.getRankBadge(player.rank || index + 1);

            html += `
                <tr class="${isHighlighted ? 'bg-emerald-50' : (index % 2 === 0 ? 'bg-white' : 'bg-gray-50')}">
                    <td class="px-2 py-2">${rankDisplay}</td>
                    <td class="px-2 py-2">
                        <div class="flex items-center gap-2">
                            <div class="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs">
                                ${(player.player_name || 'U')[0].toUpperCase()}
                            </div>
                            <span class="font-medium text-gray-800 text-sm ${isHighlighted ? 'text-emerald-700' : ''}">${player.player_name || 'Unknown'}</span>
                        </div>
                    </td>
                    <td class="px-2 py-2 text-center text-gray-700">${player.display_gross || player.total_gross || '-'}</td>
                    <td class="px-2 py-2 text-center text-gray-700">${player.display_net || player.total_net || '-'}</td>
                    <td class="px-2 py-2 text-center font-bold text-emerald-600">${player.display_stableford || player.total_points || 0}</td>
                    <td class="px-2 py-2 text-center text-gray-500 text-sm">${player.rounds_played || 0}</td>
                </tr>
            `;
        });

        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    getRankBadge(rank) {
        if (rank === 1) {
            return '<span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-yellow-400 text-yellow-900 font-bold">1</span>';
        } else if (rank === 2) {
            return '<span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-300 text-gray-700 font-bold">2</span>';
        } else if (rank === 3) {
            return '<span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-600 text-white font-bold">3</span>';
        }
        return `<span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-600 font-semibold">${rank}</span>`;
    }

    getMovementIndicator(change) {
        if (change > 0) {
            return `<span class="text-green-600 font-bold">↑${change}</span>`;
        } else if (change < 0) {
            return `<span class="text-red-600 font-bold">↓${Math.abs(change)}</span>`;
        }
        return '<span class="text-gray-400">-</span>';
    }

    // =========================================================================
    // PERIOD TAB UI
    // =========================================================================

    renderPeriodTabs(containerId, onTabChange) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const periods = [
            { id: 'daily', label: 'Today', icon: 'today' },
            { id: 'weekly', label: 'This Week', icon: 'date_range' },
            { id: 'monthly', label: 'This Month', icon: 'calendar_month' },
            { id: 'yearly', label: 'Season', icon: 'emoji_events' }
        ];

        container.innerHTML = `
            <div class="flex gap-2 overflow-x-auto pb-2">
                ${periods.map(p => `
                    <button
                        onclick="timeWindowedLeaderboards.switchPeriod('${p.id}')"
                        id="period-tab-${p.id}"
                        class="flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all
                               ${p.id === this.currentPeriod ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}">
                        <i class="material-symbols-outlined text-lg">${p.icon}</i>
                        ${p.label}
                    </button>
                `).join('')}
            </div>
        `;

        this.onTabChange = onTabChange;
    }

    async switchPeriod(periodId) {
        this.currentPeriod = periodId;

        // Update tab styles
        document.querySelectorAll('[id^="period-tab-"]').forEach(tab => {
            if (tab.id === `period-tab-${periodId}`) {
                tab.classList.remove('bg-gray-100', 'text-gray-600', 'hover:bg-gray-200');
                tab.classList.add('bg-emerald-600', 'text-white');
            } else {
                tab.classList.remove('bg-emerald-600', 'text-white');
                tab.classList.add('bg-gray-100', 'text-gray-600', 'hover:bg-gray-200');
            }
        });

        // Fetch and render new data
        if (this.onTabChange) {
            await this.onTabChange(periodId);
        }
    }

    async loadAndRenderPeriod(periodId, containerId) {
        let result;
        let title;

        switch (periodId) {
            case 'daily':
                result = await this.getDailyStandings();
                title = "Today's Standings";
                break;
            case 'weekly':
                result = await this.getWeeklyStandings();
                title = 'This Week';
                break;
            case 'monthly':
                result = await this.getMonthlyStandings();
                title = 'This Month';
                break;
            case 'yearly':
                result = await this.getYearlyStandings();
                title = `${result.year || new Date().getFullYear()} Season`;
                break;
            default:
                result = await this.getWeeklyStandings();
                title = 'This Week';
        }

        if (result.success) {
            this.renderStandingsTable(result.standings, containerId, {
                title,
                highlightPlayerId: this.currentUserId
            });
        }
    }

    // =========================================================================
    // AUTO-REFRESH
    // =========================================================================

    startAutoRefresh(intervalMs = 60000) {
        this.stopAutoRefresh();
        this.refreshInterval = setInterval(() => {
            this.loadAndRenderPeriod(this.currentPeriod, 'standings-container');
        }, intervalMs);
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }
}

// Global instance
window.timeWindowedLeaderboards = new TimeWindowedLeaderboards();

// Add convenience methods that HTML can call
window.timeWindowedLeaderboards.showPeriod = async function(period) {
    // Initialize with Supabase if not already done
    if (!this.supabase && window.SupabaseDB) {
        await window.SupabaseDB.waitForReady();
        const userId = window.AppState?.currentUser?.userId ||
                       window.AppState?.currentUser?.lineUserId ||
                       localStorage.getItem('lineUserId');
        await this.init(window.SupabaseDB.client, userId);
    }

    // Update button styles
    document.querySelectorAll('.leaderboard-period-btn').forEach(btn => {
        btn.classList.remove('bg-green-600', 'text-white');
        btn.classList.add('bg-gray-100', 'text-gray-600');
    });
    const activeBtn = document.getElementById(`leaderboardPeriod${period.charAt(0).toUpperCase() + period.slice(1)}`);
    if (activeBtn) {
        activeBtn.classList.remove('bg-gray-100', 'text-gray-600');
        activeBtn.classList.add('bg-green-600', 'text-white');
    }

    // Load the specified period
    await this.loadAndRenderPeriod(period, 'timeWindowedLeaderboardContainer');
};
