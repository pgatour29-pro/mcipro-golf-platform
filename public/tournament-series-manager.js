// ============================================================================
// TOURNAMENT SERIES MANAGER (FedEx Cup Style)
// ============================================================================
// Created: 2025-12-11
// Purpose: Multi-event series with playoffs, like PGA TOUR FedEx Cup
// ============================================================================

class TournamentSeriesManager {
    constructor() {
        this.supabase = null;
        this.currentUserId = null;
        this.currentSociety = null;
        this.activeSeries = null;
    }

    async init(supabaseClient, userId, societyId = null) {
        this.supabase = supabaseClient;
        this.currentUserId = userId;
        this.currentSociety = societyId;
        console.log('[TournamentSeriesManager] Initialized');
    }

    // =========================================================================
    // SERIES CRUD
    // =========================================================================

    async createSeries(seriesData) {
        const {
            name,
            description,
            startDate,
            endDate,
            pointsConfig = null,
            playoffConfig = null
        } = seriesData;

        const { data, error } = await this.supabase
            .from('tournament_series')
            .insert({
                society_id: this.currentSociety,
                series_name: name,
                description: description,
                start_date: startDate,
                end_date: endDate,
                points_config: pointsConfig || this.getDefaultPointsConfig(),
                playoff_config: playoffConfig || this.getDefaultPlayoffConfig(),
                status: 'upcoming',
                created_by: this.currentUserId
            })
            .select()
            .single();

        if (error) {
            console.error('[TournamentSeriesManager] Create error:', error);
            return { success: false, error: error.message };
        }

        return { success: true, series: data };
    }

    getDefaultPointsConfig() {
        return {
            regular_season: {
                1: 500, 2: 300, 3: 200, 4: 150, 5: 125,
                6: 110, 7: 100, 8: 90, 9: 80, 10: 70,
                11: 60, 12: 55, 13: 50, 14: 45, 15: 40,
                16: 35, 17: 30, 18: 25, 19: 20, 20: 15,
                participation: 10
            },
            playoff: {
                round1: 1.5,  // 1.5x multiplier
                round2: 2.0,  // 2x multiplier
                final: 3.0    // 3x multiplier (FedEx Cup style)
            }
        };
    }

    getDefaultPlayoffConfig() {
        return {
            qualifying_positions: 70,    // Top 70 make playoffs
            round1_cut: 50,              // Top 50 advance from Round 1
            round2_cut: 30,              // Top 30 advance from Round 2
            final_field: 30,             // Final event field size
            points_reset: false,         // Keep accumulated points
            bonus_pool: 10000            // Points pool for final
        };
    }

    async getSeries(seriesId) {
        const { data, error } = await this.supabase
            .from('tournament_series')
            .select('*')
            .eq('id', seriesId)
            .single();

        if (error) {
            console.error('[TournamentSeriesManager] Get series error:', error);
            return { success: false, error: error.message };
        }

        return { success: true, series: data };
    }

    async getActiveSeries(societyId = null) {
        const society = societyId || this.currentSociety;

        const { data, error } = await this.supabase
            .from('tournament_series')
            .select('*')
            .eq('society_id', society)
            .in('status', ['active', 'playoffs'])
            .order('start_date', { ascending: false })
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('[TournamentSeriesManager] Get active error:', error);
            return { success: false, error: error.message };
        }

        this.activeSeries = data;
        return { success: true, series: data };
    }

    async getAllSeries(societyId = null) {
        const society = societyId || this.currentSociety;

        const { data, error } = await this.supabase
            .from('tournament_series')
            .select('*')
            .eq('society_id', society)
            .order('start_date', { ascending: false });

        if (error) {
            console.error('[TournamentSeriesManager] Get all error:', error);
            return { success: false, error: error.message };
        }

        return { success: true, series: data || [] };
    }

    // =========================================================================
    // SERIES EVENTS
    // =========================================================================

    async addEventToSeries(seriesId, eventData) {
        const {
            eventId,
            eventName,
            eventDate,
            eventType = 'regular',
            pointsMultiplier = 1.0,
            sequenceNumber
        } = eventData;

        const { data, error } = await this.supabase
            .from('series_events')
            .insert({
                series_id: seriesId,
                event_id: eventId,
                event_name: eventName,
                event_date: eventDate,
                event_type: eventType,
                points_multiplier: pointsMultiplier,
                sequence_number: sequenceNumber
            })
            .select()
            .single();

        if (error) {
            console.error('[TournamentSeriesManager] Add event error:', error);
            return { success: false, error: error.message };
        }

        return { success: true, seriesEvent: data };
    }

    async getSeriesEvents(seriesId) {
        const { data, error } = await this.supabase
            .from('series_events')
            .select('*')
            .eq('series_id', seriesId)
            .order('sequence_number', { ascending: true });

        if (error) {
            console.error('[TournamentSeriesManager] Get events error:', error);
            return { success: false, error: error.message };
        }

        return { success: true, events: data || [] };
    }

    // =========================================================================
    // STANDINGS
    // =========================================================================

    async getSeriesStandings(seriesId) {
        const { data, error } = await this.supabase.rpc('calculate_series_standings', {
            p_series_id: seriesId
        });

        if (error) {
            console.error('[TournamentSeriesManager] Standings error:', error);
            return { success: false, error: error.message };
        }

        return { success: true, standings: data || [] };
    }

    async getPlayerSeriesStats(playerId, seriesId) {
        const { data, error } = await this.supabase
            .from('series_standings')
            .select('*, tournament_series(series_name)')
            .eq('series_id', seriesId)
            .eq('player_id', playerId)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('[TournamentSeriesManager] Player stats error:', error);
            return { success: false, error: error.message };
        }

        return { success: true, stats: data };
    }

    // =========================================================================
    // PLAYOFFS
    // =========================================================================

    async startPlayoffs(seriesId) {
        // Qualify players based on config
        const { data: qualifiedCount, error } = await this.supabase.rpc('qualify_players_for_playoff', {
            p_series_id: seriesId
        });

        if (error) {
            console.error('[TournamentSeriesManager] Start playoffs error:', error);
            return { success: false, error: error.message };
        }

        // Update series status
        await this.supabase
            .from('tournament_series')
            .update({ status: 'playoffs', current_playoff_round: 1 })
            .eq('id', seriesId);

        return { success: true, qualifiedPlayers: qualifiedCount };
    }

    async advancePlayoffRound(seriesId, roundNumber) {
        const { data, error } = await this.supabase.rpc('eliminate_players', {
            p_series_id: seriesId,
            p_round_number: roundNumber
        });

        if (error) {
            console.error('[TournamentSeriesManager] Advance round error:', error);
            return { success: false, error: error.message };
        }

        return { success: true, eliminatedCount: data };
    }

    async getPlayoffBracket(seriesId) {
        const { data, error } = await this.supabase
            .from('playoff_brackets')
            .select('*')
            .eq('series_id', seriesId)
            .order('round_number', { ascending: true })
            .order('bracket_position', { ascending: true });

        if (error) {
            console.error('[TournamentSeriesManager] Bracket error:', error);
            return { success: false, error: error.message };
        }

        return { success: true, brackets: data || [] };
    }

    async getQualificationProjections(seriesId) {
        const { data, error } = await this.supabase.rpc('get_qualification_projections', {
            p_series_id: seriesId
        });

        if (error) {
            console.error('[TournamentSeriesManager] Projections error:', error);
            return { success: false, error: error.message };
        }

        return { success: true, projections: data || [] };
    }

    // =========================================================================
    // UI RENDERING
    // =========================================================================

    renderSeriesOverview(containerId, series) {
        const container = document.getElementById(containerId);
        if (!container || !series) return;

        const startDate = new Date(series.start_date).toLocaleDateString();
        const endDate = new Date(series.end_date).toLocaleDateString();
        const statusColors = {
            upcoming: 'bg-blue-100 text-blue-800',
            active: 'bg-emerald-100 text-emerald-800',
            playoffs: 'bg-teal-100 text-teal-800',
            completed: 'bg-gray-100 text-gray-800'
        };

        container.innerHTML = `
            <div class="bg-white rounded-xl shadow-lg overflow-hidden">
                <div class="bg-gradient-to-r from-teal-600 to-teal-700 px-6 py-4">
                    <div class="flex items-center justify-between">
                        <div>
                            <h2 class="text-xl font-bold text-white">${series.series_name}</h2>
                            <p class="text-teal-200 text-sm">${series.description || ''}</p>
                        </div>
                        <span class="px-3 py-1 rounded-full text-xs font-semibold ${statusColors[series.status] || 'bg-gray-100'}">
                            ${series.status.toUpperCase()}
                        </span>
                    </div>
                </div>
                <div class="p-4">
                    <div class="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span class="text-gray-500">Season</span>
                            <div class="font-medium">${startDate} - ${endDate}</div>
                        </div>
                        <div>
                            <span class="text-gray-500">Events</span>
                            <div class="font-medium">${series.total_events || 0} scheduled</div>
                        </div>
                    </div>
                    ${series.status === 'playoffs' ? `
                        <div class="mt-4 p-3 bg-teal-50 rounded-lg">
                            <div class="flex items-center gap-2 text-teal-700">
                                <i class="material-symbols-outlined">emoji_events</i>
                                <span class="font-semibold">Playoff Round ${series.current_playoff_round || 1}</span>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    renderStandingsTable(containerId, standings, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const { title = 'Series Standings', highlightPlayerId = null, showProjections = false } = options;

        if (!standings || standings.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="material-symbols-outlined text-4xl mb-2">emoji_events</i>
                    <p>No standings data yet</p>
                </div>
            `;
            return;
        }

        let html = `
            <div class="bg-white rounded-xl shadow-lg overflow-hidden">
                <div class="bg-gradient-to-r from-teal-600 to-teal-700 px-4 py-3">
                    <h3 class="text-white font-bold text-lg">${title}</h3>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-3 py-2 text-left text-xs font-semibold text-gray-600">Pos</th>
                                <th class="px-3 py-2 text-left text-xs font-semibold text-gray-600">Player</th>
                                <th class="px-3 py-2 text-center text-xs font-semibold text-gray-600">Points</th>
                                <th class="px-3 py-2 text-center text-xs font-semibold text-gray-600">Events</th>
                                <th class="px-3 py-2 text-center text-xs font-semibold text-gray-600">Wins</th>
                                ${showProjections ? '<th class="px-3 py-2 text-center text-xs font-semibold text-gray-600">Status</th>' : ''}
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100">
        `;

        standings.forEach((player, index) => {
            const isHighlighted = player.player_id === highlightPlayerId;
            const position = player.position || index + 1;
            const positionBadge = this.getPositionBadge(position);

            // Qualification status
            let statusBadge = '';
            if (showProjections) {
                if (position <= 30) {
                    statusBadge = '<span class="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Safe</span>';
                } else if (position <= 50) {
                    statusBadge = '<span class="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">Bubble</span>';
                } else if (position <= 70) {
                    statusBadge = '<span class="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">Projected</span>';
                } else {
                    statusBadge = '<span class="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">Out</span>';
                }
            }

            html += `
                <tr class="${isHighlighted ? 'bg-teal-50' : (index % 2 === 0 ? 'bg-white' : 'bg-gray-50')}">
                    <td class="px-3 py-2">${positionBadge}</td>
                    <td class="px-3 py-2">
                        <span class="font-medium ${isHighlighted ? 'text-teal-700' : 'text-gray-800'}">${player.player_name || 'Unknown'}</span>
                    </td>
                    <td class="px-3 py-2 text-center font-bold text-teal-600">${player.total_points || 0}</td>
                    <td class="px-3 py-2 text-center text-gray-600">${player.events_played || 0}</td>
                    <td class="px-3 py-2 text-center text-gray-600">${player.wins || 0}</td>
                    ${showProjections ? `<td class="px-3 py-2 text-center">${statusBadge}</td>` : ''}
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

    getPositionBadge(position) {
        if (position === 1) {
            return '<span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-yellow-400 text-yellow-900 font-bold">1</span>';
        } else if (position === 2) {
            return '<span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-300 text-gray-700 font-bold">2</span>';
        } else if (position === 3) {
            return '<span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-600 text-white font-bold">3</span>';
        } else if (position <= 30) {
            return `<span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-semibold">${position}</span>`;
        } else if (position <= 70) {
            return `<span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-600 font-semibold">${position}</span>`;
        }
        return `<span class="text-gray-500">${position}</span>`;
    }

    renderPlayoffBracket(containerId, brackets) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (!brackets || brackets.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="material-symbols-outlined text-4xl mb-2">account_tree</i>
                    <p>Playoff bracket not yet generated</p>
                </div>
            `;
            return;
        }

        // Group by round
        const rounds = {};
        brackets.forEach(b => {
            if (!rounds[b.round_number]) rounds[b.round_number] = [];
            rounds[b.round_number].push(b);
        });

        let html = `
            <div class="bg-white rounded-xl shadow-lg p-4">
                <h3 class="font-bold text-lg text-gray-800 mb-4">
                    <i class="material-symbols-outlined text-teal-600 align-middle mr-1">account_tree</i>
                    Playoff Bracket
                </h3>
                <div class="flex gap-8 overflow-x-auto pb-4">
        `;

        Object.keys(rounds).sort((a, b) => a - b).forEach(roundNum => {
            const roundBrackets = rounds[roundNum];
            html += `
                <div class="flex-shrink-0">
                    <div class="text-center mb-2 font-semibold text-gray-600">Round ${roundNum}</div>
                    <div class="space-y-2">
                        ${roundBrackets.map(b => {
                            const statusClass = b.is_eliminated ? 'bg-red-50 border-red-200' :
                                               b.is_winner ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-200';
                            return `
                                <div class="p-3 border-2 rounded-lg ${statusClass} min-w-[150px]">
                                    <div class="font-medium text-sm">${b.player_name || 'TBD'}</div>
                                    <div class="text-xs text-gray-500">${b.round_points || 0} pts</div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        });

        html += '</div></div>';
        container.innerHTML = html;
    }

    // =========================================================================
    // EVENT SCHEDULE RENDERING
    // =========================================================================

    renderEventSchedule(containerId, events) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (!events || events.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="material-symbols-outlined text-4xl mb-2">event</i>
                    <p>No events scheduled</p>
                </div>
            `;
            return;
        }

        let html = `
            <div class="bg-white rounded-xl shadow-lg overflow-hidden">
                <div class="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3">
                    <h3 class="text-white font-bold text-lg">Season Schedule</h3>
                </div>
                <div class="divide-y divide-gray-100">
        `;

        const now = new Date();

        events.forEach(event => {
            const eventDate = new Date(event.event_date);
            const isPast = eventDate < now;
            const isToday = eventDate.toDateString() === now.toDateString();
            const isPlayoff = event.event_type.includes('playoff');

            let statusBadge = '';
            if (event.status === 'completed') {
                statusBadge = '<span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">Completed</span>';
            } else if (isToday) {
                statusBadge = '<span class="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 animate-pulse">TODAY</span>';
            } else if (isPlayoff) {
                statusBadge = '<span class="text-xs px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">Playoff</span>';
            }

            html += `
                <div class="p-4 flex items-center gap-4 ${isPast ? 'opacity-60' : ''}">
                    <div class="text-center w-16">
                        <div class="text-2xl font-bold text-gray-800">${eventDate.getDate()}</div>
                        <div class="text-xs text-gray-500">${eventDate.toLocaleDateString('en-US', { month: 'short' })}</div>
                    </div>
                    <div class="flex-1">
                        <div class="font-medium text-gray-800">${event.event_name}</div>
                        <div class="text-sm text-gray-500">
                            ${event.points_multiplier > 1 ? `${event.points_multiplier}x Points • ` : ''}
                            Event #${event.sequence_number}
                        </div>
                    </div>
                    ${statusBadge}
                </div>
            `;
        });

        html += '</div></div>';
        container.innerHTML = html;
    }
}

// Global instance
window.tournamentSeriesManager = new TournamentSeriesManager();
