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
            // Load ALL societies (not just user's memberships) so JOA and others appear
            const { data: allSocieties, error: societiesError } = await this.supabase
                .from('societies')
                .select('id, name')
                .order('name');

            if (!societiesError && allSocieties) {
                // CRITICAL FIX: Deduplicate by NAME (not just ID) to remove duplicate "Travellers Rest Golf Group" entries
                const societyMap = new Map();
                allSocieties.forEach(s => {
                    if (s.id && s.name && !societyMap.has(s.name)) {
                        societyMap.set(s.name, { id: s.id, name: s.name });
                    }
                });
                this.userSocieties = Array.from(societyMap.values());
                console.log('[TimeWindowedLeaderboards] Loaded ALL societies (deduplicated by name):', this.userSocieties.map(s => s.name));
            } else if (societiesError) {
                console.log('[TimeWindowedLeaderboards] Could not load societies table, trying society_members:', societiesError.message);
                // Fallback to user's memberships only
                const { data, error } = await this.supabase
                    .from('society_members')
                    .select('society_id, societies(id, name)')
                    .eq('golfer_id', this.currentUserId)
                    .eq('status', 'active');

                if (!error && data) {
                    const societyMap = new Map();
                    data.filter(m => m.societies).forEach(m => {
                        // Deduplicate by name here too
                        if (!societyMap.has(m.societies.name)) {
                            societyMap.set(m.societies.name, {
                                id: m.societies.id,
                                name: m.societies.name
                            });
                        }
                    });
                    this.userSocieties = Array.from(societyMap.values());
                }
            }
            console.log('[TimeWindowedLeaderboards] Final societies count:', this.userSocieties.length);
        } catch (err) {
            console.error('[TimeWindowedLeaderboards] Error loading societies:', err);
        }
    }

    populateSocietyDropdown() {
        const select = document.getElementById('leaderboardSocietyFilter');
        if (!select) return;

        // Completely rebuild the dropdown
        // Global Platform is the default - shows ALL players from ALL societies
        select.innerHTML = `
            <option value="platform" selected>🌍 Global Platform</option>
        `;

        // Add separator and individual societies
        if (this.userSocieties.length > 0) {
            const separator = document.createElement('option');
            separator.disabled = true;
            separator.textContent = '── Society Standings ──';
            select.add(separator);

            // Add each society for their own standings
            this.userSocieties.forEach(society => {
                const option = document.createElement('option');
                option.value = society.id;
                // Show society name with appropriate icon
                const icon = society.name.includes('JOA') ? '🏌️' :
                            society.name.includes('Travellers') ? '✈️' : '⛳';
                option.textContent = `${icon} ${society.name}`;
                select.add(option);
            });
        }

        // Set current selection (default to platform for global view)
        this.currentFilter = 'platform';
        select.value = this.currentFilter;

        console.log('[TimeWindowedLeaderboards] Dropdown populated with', this.userSocieties.length, 'societies:', this.userSocieties.map(s => s.name));
    }

    async setSocietyFilter(value) {
        this.currentFilter = value;

        if (value === 'platform') {
            this.currentSociety = null; // Global platform - all players from all societies
        } else {
            this.currentSociety = value; // Specific society ID for society-only standings
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
        // UNIFIED LEADERBOARD: Uses event_results table (same as My Standings)
        // Points come from assignPoints() in scoring page (linear: 10, 9, 8, 7...)

        if (!this.supabase) {
            return { success: false, error: 'Supabase not initialized' };
        }

        try {
            const now = new Date();
            let startDate, endDate;

            switch (period) {
                case 'daily':
                    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
                    break;
                case 'weekly':
                    const dayOfWeek = now.getDay();
                    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
                    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset);
                    endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
                    break;
                case 'monthly':
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
                    break;
                case 'yearly':
                    startDate = new Date(now.getFullYear(), 0, 1);
                    endDate = new Date(now.getFullYear() + 1, 0, 1);
                    break;
                default:
                    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
            }

            const startDateStr = startDate.toISOString().split('T')[0];
            const endDateStr = endDate.toISOString().split('T')[0];

            // Use the current society filter if not explicitly provided
            const filterSociety = societyFilter || this.currentSociety;

            console.log('[TimeWindowedLeaderboards] Query event_results:', { period, startDateStr, endDateStr, societyFilter: filterSociety });

            // Query event_results directly by event_date (no society_events dependency)
            const { data: results, error } = await this.supabase
                .from('event_results')
                .select('*')
                .gte('event_date', startDateStr)
                .lt('event_date', endDateStr);

            if (error) {
                console.error('[TimeWindowedLeaderboards] Query error:', error);
                return { success: false, error: error.message };
            }

            if (!results || results.length === 0) {
                return { success: true, standings: [] };
            }

            console.log('[TimeWindowedLeaderboards] Found', results.length, 'results in event_results');

            // Aggregate by player (same logic as My Standings)
            const playerStats = {};

            results.forEach(result => {
                const playerId = result.player_id;

                if (!playerStats[playerId]) {
                    playerStats[playerId] = {
                        player_id: playerId,
                        player_name: result.player_name || playerId,
                        total_points: 0,
                        total_stableford: 0,
                        events_played: 0,
                        wins: 0,
                        top_3: 0,
                        best_finish: 999,
                        finishes: []
                    };
                }

                const stats = playerStats[playerId];
                stats.total_points += (result.points_earned || 0);
                stats.total_stableford += (result.score || 0);
                stats.events_played += 1;
                stats.finishes.push({ position: result.position, points: result.points_earned, eventId: result.event_id });

                if (result.position === 1) stats.wins += 1;
                if (result.position <= 3) stats.top_3 += 1;
                if (result.position < stats.best_finish) stats.best_finish = result.position;
            });

            // Convert to array and sort by total points (higher is better)
            let standings = Object.values(playerStats)
                .filter(p => p.events_played > 0)
                .map(p => ({
                    ...p,
                    total_fedex_points: p.total_points, // For compatibility with existing render code
                    display_stableford: p.total_stableford,
                    rounds_played: p.events_played
                }))
                .sort((a, b) => {
                    // Sort by total points, then wins, then best finish
                    if (b.total_points !== a.total_points) return b.total_points - a.total_points;
                    if (b.wins !== a.wins) return b.wins - a.wins;
                    return a.best_finish - b.best_finish;
                });

            // Get player names and society affiliations
            const playerIdsList = standings.map(s => s.player_id);
            if (playerIdsList.length > 0) {
                const { data: profiles } = await this.supabase
                    .from('user_profiles')
                    .select('line_user_id, name, display_name, society_name')
                    .in('line_user_id', playerIdsList);

                const { data: memberships } = await this.supabase
                    .from('society_members')
                    .select('golfer_id, society_id, is_primary_society')
                    .in('golfer_id', playerIdsList)
                    .eq('status', 'active');

                let societyNames = {};
                if (memberships && memberships.length > 0) {
                    const societyIds = [...new Set(memberships.map(m => m.society_id).filter(Boolean))];
                    if (societyIds.length > 0) {
                        const { data: societies } = await this.supabase
                            .from('societies')
                            .select('id, name')
                            .in('id', societyIds);
                        if (societies) {
                            societies.forEach(s => { societyNames[s.id] = s.name; });
                        }
                    }
                }

                const nameMap = {};
                const societyMap = {};

                if (profiles) {
                    profiles.forEach(p => {
                        nameMap[p.line_user_id] = p.display_name || p.name || 'Unknown';
                        if (p.society_name) societyMap[p.line_user_id] = p.society_name;
                    });
                }

                if (memberships) {
                    memberships.forEach(m => {
                        const societyName = societyNames[m.society_id];
                        if (societyName && (m.is_primary_society || !societyMap[m.golfer_id])) {
                            societyMap[m.golfer_id] = societyName;
                        }
                    });
                }

                standings = standings.map((s, index) => ({
                    ...s,
                    player_name: nameMap[s.player_id] || s.player_name || 'Unknown',
                    society_name: societyMap[s.player_id] || null,
                    rank: index + 1,
                    rank_change: 0
                }));
            }

            console.log(`[TimeWindowedLeaderboards] ${period} standings:`, standings.length, 'players');
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
                    <span class="material-symbols-outlined text-5xl mb-3 text-gray-300">leaderboard</span>
                    <p class="font-medium">No rounds played yet this period</p>
                    <p class="text-sm mt-2">Complete a round to appear on the leaderboard!</p>
                </div>
            `;
            return;
        }

        // Get top 3 for podium display
        const podium = standings.slice(0, 3);
        const rest = standings.slice(3);

        let html = `
            <div class="space-y-4">
                <!-- Stylish Header -->
                <div class="bg-gradient-to-r from-emerald-600 via-green-500 to-teal-500 rounded-2xl p-4 shadow-lg">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <div class="bg-white/20 rounded-xl p-2">
                                <span class="material-symbols-outlined text-white text-2xl">emoji_events</span>
                            </div>
                            <div>
                                <h3 class="text-white font-bold text-lg">${title}</h3>
                                <p class="text-white/80 text-sm">${standings.length} players • ${standings.reduce((sum, p) => sum + (p.rounds_played || 0), 0)} rounds</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Podium Top 3 -->
                ${podium.length > 0 ? `
                <div class="grid grid-cols-3 gap-2 md:gap-4">
                    ${this.renderPodiumCard(podium[1], 2, highlightPlayerId)}
                    ${this.renderPodiumCard(podium[0], 1, highlightPlayerId)}
                    ${this.renderPodiumCard(podium[2], 3, highlightPlayerId)}
                </div>
                ` : ''}

                <!-- Rest of Leaderboard -->
                ${rest.length > 0 ? `
                <div class="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
                    <div class="divide-y divide-gray-100">
                        ${rest.map((player, index) => this.renderPlayerRow(player, index + 4, highlightPlayerId)).join('')}
                    </div>
                </div>
                ` : ''}
            </div>
        `;

        container.innerHTML = html;
    }

    // Render podium card for top 3
    renderPodiumCard(player, rank, highlightPlayerId) {
        if (!player) {
            return `<div class="order-${rank === 1 ? '2' : rank === 2 ? '1' : '3'}"></div>`;
        }

        const isHighlighted = player.player_id === highlightPlayerId;
        const colors = {
            1: { bg: 'from-yellow-400 to-amber-500', ring: 'ring-yellow-300', icon: '🥇', height: 'md:pt-0' },
            2: { bg: 'from-gray-300 to-slate-400', ring: 'ring-gray-200', icon: '🥈', height: 'md:pt-6' },
            3: { bg: 'from-amber-600 to-orange-700', ring: 'ring-amber-400', icon: '🥉', height: 'md:pt-8' }
        };
        const style = colors[rank];
        const order = rank === 1 ? 'order-2' : rank === 2 ? 'order-1' : 'order-3';

        // Short society name (abbreviation)
        const societyAbbrev = player.society_name ? this.getSocietyAbbrev(player.society_name) : '';

        // FedEx points display
        const fedexPoints = player.total_fedex_points || player.total_points || 0;
        const winsDisplay = player.wins > 0 ? `🏆${player.wins}` : '';

        return `
            <div class="${order} ${style.height}">
                <div class="bg-gradient-to-b ${style.bg} rounded-2xl p-3 md:p-4 shadow-lg ${isHighlighted ? 'ring-4 ' + style.ring : ''} transform hover:scale-105 transition-transform">
                    <div class="text-center">
                        <!-- Rank Icon -->
                        <div class="text-2xl md:text-3xl mb-1">${style.icon}</div>

                        <!-- Player Avatar -->
                        <div class="mx-auto w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/30 flex items-center justify-center text-white font-bold text-xl md:text-2xl shadow-inner mb-2">
                            ${(player.player_name || 'U')[0].toUpperCase()}
                        </div>

                        <!-- Player Name -->
                        <div class="mb-1">
                            <div class="font-bold text-white text-sm md:text-base truncate">${player.player_name || 'Unknown'}</div>
                            ${societyAbbrev ? `<div class="text-white/70 text-xs">${societyAbbrev}</div>` : ''}
                        </div>

                        <!-- FedEx Points Badge - Big & Prominent! -->
                        <div class="inline-flex items-center gap-1 bg-white/30 backdrop-blur rounded-full px-4 py-2 mt-1">
                            <span class="text-white font-black text-2xl">${fedexPoints}</span>
                            <span class="text-white/80 text-xs font-medium">PTS</span>
                        </div>

                        <!-- Stats Row -->
                        <div class="flex justify-center gap-2 mt-2 text-white/90 text-xs">
                            ${winsDisplay ? `<span class="font-bold">${winsDisplay}</span>` : ''}
                            <span>${player.events_played || player.rounds_played || 0} event${(player.events_played || player.rounds_played) !== 1 ? 's' : ''}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Render player row for positions 4+
    renderPlayerRow(player, rank, highlightPlayerId) {
        const isHighlighted = player.player_id === highlightPlayerId;
        const societyAbbrev = player.society_name ? this.getSocietyAbbrev(player.society_name) : '';
        const fedexPoints = player.total_fedex_points || player.total_points || 0;
        const winsDisplay = player.wins > 0 ? `🏆${player.wins}` : '';

        return `
            <div class="flex items-center gap-3 p-3 ${isHighlighted ? 'bg-emerald-50' : 'hover:bg-gray-50'} transition-colors">
                <!-- Rank -->
                <div class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-600 text-sm flex-shrink-0">
                    ${rank}
                </div>

                <!-- Avatar -->
                <div class="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold shadow-sm flex-shrink-0">
                    ${(player.player_name || 'U')[0].toUpperCase()}
                </div>

                <!-- Name & Society -->
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                        <span class="font-semibold text-gray-800 truncate">${player.player_name || 'Unknown'}</span>
                        <!-- FedEx Points Badge - prominent next to name -->
                        <span class="inline-flex items-center gap-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-full px-2.5 py-0.5 text-sm font-bold flex-shrink-0 shadow-sm">
                            ${fedexPoints}
                        </span>
                        ${winsDisplay ? `<span class="text-sm">${winsDisplay}</span>` : ''}
                    </div>
                    ${societyAbbrev ? `<div class="text-xs text-gray-500">${societyAbbrev}</div>` : ''}
                </div>

                <!-- Stats -->
                <div class="flex items-center gap-3 text-sm text-gray-600 flex-shrink-0">
                    <div class="text-center hidden sm:block">
                        <div class="font-medium">${player.top_3 || 0}</div>
                        <div class="text-xs text-gray-400">Top 3</div>
                    </div>
                    <div class="text-center">
                        <div class="font-medium">${player.events_played || player.rounds_played || 0}</div>
                        <div class="text-xs text-gray-400">Events</div>
                    </div>
                </div>
            </div>
        `;
    }

    // Get society abbreviation
    getSocietyAbbrev(name) {
        if (!name) return '';
        // Common abbreviations
        const abbrevs = {
            'Travellers Rest Golf Group': 'TRGG',
            'JOA': 'JOA',
            'Japan Open Amateur': 'JOA'
        };
        if (abbrevs[name]) return abbrevs[name];
        // Generate abbreviation from initials
        return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 4);
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
