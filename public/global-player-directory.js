// ============================================================================
// GLOBAL PLAYER DIRECTORY
// ============================================================================
// Created: 2025-12-11
// Purpose: Unified player search across ALL societies
// ============================================================================

// Helper function to format handicap - preserves "+" sign for plus handicaps
function formatHandicapDisplay(handicap) {
    if (handicap === null || handicap === undefined || handicap === '') {
        return null;
    }

    // If it's already a string with "+" prefix, return as-is
    if (typeof handicap === 'string' && handicap.startsWith('+')) {
        return handicap;
    }

    // If it's a negative number (plus handicap stored as negative), format with "+"
    const numValue = parseFloat(handicap);
    if (!isNaN(numValue) && numValue < 0) {
        return '+' + Math.abs(numValue).toFixed(1);
    }

    // Regular positive handicap
    if (!isNaN(numValue)) {
        return numValue.toFixed(1);
    }

    // Return as string if nothing else works
    return String(handicap);
}

class GlobalPlayerDirectory {
    constructor() {
        this.supabase = null;
        this.currentUserId = null;
        this.searchDebounce = null;
        this.currentFilters = {
            society: null,
            handicapMin: null,
            handicapMax: null,
            homeCourse: null,
            sortBy: 'name'
        };
        this.currentPage = 0;
        this.pageSize = 50;
        this.allPlayers = [];
    }

    async init(supabaseClient, userId) {
        this.supabase = supabaseClient;
        this.currentUserId = userId;
        console.log('[GlobalPlayerDirectory] Initialized');
    }

    // =========================================================================
    // SEARCH PLAYERS
    // =========================================================================

    async searchPlayers(query = '', options = {}) {
        const {
            society = this.currentFilters.society,
            handicapMin = this.currentFilters.handicapMin,
            handicapMax = this.currentFilters.handicapMax,
            homeCourse = this.currentFilters.homeCourse,
            sortBy = this.currentFilters.sortBy,
            limit = this.pageSize,
            offset = this.currentPage * this.pageSize
        } = options;

        const { data, error } = await this.supabase.rpc('search_players_global', {
            p_search_query: query || '',
            p_society_id: society || null,
            p_handicap_min: handicapMin || null,
            p_handicap_max: handicapMax || null,
            p_limit: limit,
            p_offset: offset
        });

        if (error) {
            console.error('[GlobalPlayerDirectory] Search error:', error);
            return { success: false, error: error.message };
        }

        return { success: true, players: data || [] };
    }

    // =========================================================================
    // GET PLAYER PROFILE
    // =========================================================================

    async getPlayerProfile(playerId) {
        const { data, error } = await this.supabase.rpc('get_player_profile', {
            target_player_id: playerId
        });

        if (error) {
            console.error('[GlobalPlayerDirectory] Profile error:', error);
            return { success: false, error: error.message };
        }

        return { success: true, profile: data };
    }

    // =========================================================================
    // FIND SIMILAR PLAYERS
    // =========================================================================

    async findSimilarPlayers(playerId, type = 'handicap') {
        const { data, error } = await this.supabase.rpc('find_similar_players', {
            reference_player_id: playerId,
            similarity_type: type,
            result_limit: 20
        });

        if (error) {
            console.error('[GlobalPlayerDirectory] Similar players error:', error);
            return { success: false, error: error.message };
        }

        return { success: true, players: data || [] };
    }

    // =========================================================================
    // GET TOP PLAYERS
    // =========================================================================

    async getTopPlayers(metric = 'rounds', societyId = null) {
        const { data, error } = await this.supabase.rpc('get_top_players', {
            society_filter: societyId,
            metric: metric,
            result_limit: 20
        });

        if (error) {
            console.error('[GlobalPlayerDirectory] Top players error:', error);
            return { success: false, error: error.message };
        }

        return { success: true, players: data || [] };
    }

    // =========================================================================
    // GET DIRECTORY ANALYTICS
    // =========================================================================

    async getDirectoryAnalytics() {
        const { data, error } = await this.supabase.rpc('get_directory_analytics');

        if (error) {
            console.error('[GlobalPlayerDirectory] Analytics error:', error);
            return { success: false, error: error.message };
        }

        return { success: true, analytics: data };
    }

    // =========================================================================
    // GET ALL SOCIETIES (for filter dropdown)
    // =========================================================================

    async getAllSocieties() {
        // Query society_profiles directly instead of society_members
        const { data, error } = await this.supabase
            .from('society_profiles')
            .select('id, society_name')
            .order('society_name');

        if (error) {
            console.error('[GlobalPlayerDirectory] Societies error:', error);
            return { success: false, error: error.message };
        }

        return { success: true, societies: data || [] };
    }

    // =========================================================================
    // UI RENDERING
    // =========================================================================

    renderSearchBox(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="bg-white rounded-xl shadow-lg p-4 mb-4">
                <div class="relative">
                    <i class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</i>
                    <input
                        type="text"
                        id="player-search-input"
                        placeholder="Search players by name..."
                        class="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        oninput="globalPlayerDirectory.handleSearchInput(this.value)"
                    >
                </div>

                <!-- Filters -->
                <div class="mt-4 flex flex-wrap gap-2">
                    <select id="society-filter" onchange="globalPlayerDirectory.setFilter('society', this.value)"
                        class="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500">
                        <option value="">All Societies</option>
                    </select>

                    <select id="handicap-filter" onchange="globalPlayerDirectory.handleHandicapFilter(this.value)"
                        class="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500">
                        <option value="">All Handicaps</option>
                        <option value="0-10">0-10 (Low)</option>
                        <option value="10-20">10-20 (Mid)</option>
                        <option value="20-30">20-30 (High)</option>
                        <option value="30+">30+ (Beginner)</option>
                    </select>

                    <select id="sort-filter" onchange="globalPlayerDirectory.setFilter('sortBy', this.value)"
                        class="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500">
                        <option value="name">Sort by Name</option>
                        <option value="handicap">Sort by Handicap</option>
                        <option value="rounds">Sort by Rounds</option>
                        <option value="last_played">Sort by Last Played</option>
                    </select>
                </div>
            </div>
        `;

        // Load societies into dropdown
        this.loadSocietyFilter();
    }

    async loadSocietyFilter() {
        const result = await this.getAllSocieties();
        if (!result.success) return;

        const select = document.getElementById('society-filter');
        if (!select) return;

        result.societies.forEach(s => {
            const option = document.createElement('option');
            option.value = s.society_name;
            option.textContent = s.society_name;
            select.appendChild(option);
        });
    }

    handleSearchInput(value) {
        clearTimeout(this.searchDebounce);
        this.searchDebounce = setTimeout(() => {
            this.currentPage = 0;
            this.performSearch(value);
        }, 300);
    }

    handleHandicapFilter(value) {
        if (!value) {
            this.currentFilters.handicapMin = null;
            this.currentFilters.handicapMax = null;
        } else if (value === '30+') {
            this.currentFilters.handicapMin = 30;
            this.currentFilters.handicapMax = 54;
        } else {
            const [min, max] = value.split('-').map(Number);
            this.currentFilters.handicapMin = min;
            this.currentFilters.handicapMax = max;
        }
        this.currentPage = 0;
        this.performSearch();
    }

    setFilter(filterName, value) {
        this.currentFilters[filterName] = value || null;
        this.currentPage = 0;
        this.performSearch();
    }

    async performSearch(query = null) {
        const searchInput = document.getElementById('player-search-input');
        const searchQuery = query !== null ? query : (searchInput?.value || '');

        const result = await this.searchPlayers(searchQuery, this.currentFilters);
        if (result.success) {
            this.allPlayers = result.players;
            this.renderPlayerList('player-list-container');
        }
    }

    renderPlayerList(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (!this.allPlayers || this.allPlayers.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12 text-gray-500">
                    <i class="material-symbols-outlined text-5xl mb-3">person_search</i>
                    <p class="text-lg">No players found</p>
                    <p class="text-sm">Try adjusting your search or filters</p>
                </div>
            `;
            return;
        }

        let html = '<div class="space-y-3">';

        this.allPlayers.forEach(player => {
            const formattedHcp = formatHandicapDisplay(player.handicap);
            const handicapDisplay = formattedHcp ? `HCP ${formattedHcp}` : 'No HCP';
            const societyList = player.societies ? player.societies.slice(0, 2).join(', ') : 'No society';
            const roundsDisplay = player.total_rounds || 0;
            const avgGrossDisplay = player.avg_gross ? `Avg ${player.avg_gross}` : '';

            html += `
                <div class="bg-white rounded-xl shadow p-4 hover:shadow-md transition-shadow cursor-pointer"
                     onclick="globalPlayerDirectory.showPlayerProfile('${player.player_id}')">
                    <div class="flex items-center gap-3">
                        <div class="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold text-lg">
                            ${(player.player_name || 'U')[0].toUpperCase()}
                        </div>
                        <div class="flex-1 min-w-0">
                            <h4 class="font-semibold text-gray-800 truncate">${player.player_name || 'Unknown'}</h4>
                            <p class="text-sm text-gray-500 truncate">${societyList}</p>
                        </div>
                        <div class="text-right">
                            <div class="text-emerald-600 font-bold">${handicapDisplay}</div>
                            <div class="text-xs text-gray-400">${roundsDisplay} rounds${avgGrossDisplay ? ' • ' + avgGrossDisplay : ''}</div>
                        </div>
                    </div>
                    ${player.home_course ? `
                        <div class="mt-2 flex items-center gap-1 text-xs text-gray-500">
                            <i class="material-symbols-outlined text-sm">golf_course</i>
                            ${player.home_course}
                        </div>
                    ` : ''}
                </div>
            `;
        });

        html += '</div>';

        // Pagination
        if (this.allPlayers.length >= this.pageSize) {
            html += `
                <div class="flex justify-center gap-4 mt-4">
                    ${this.currentPage > 0 ? `
                        <button onclick="globalPlayerDirectory.prevPage()"
                                class="px-4 py-2 bg-gray-100 rounded-lg text-gray-700 hover:bg-gray-200">
                            Previous
                        </button>
                    ` : ''}
                    <button onclick="globalPlayerDirectory.nextPage()"
                            class="px-4 py-2 bg-emerald-600 rounded-lg text-white hover:bg-emerald-700">
                        Next
                    </button>
                </div>
            `;
        }

        container.innerHTML = html;
    }

    nextPage() {
        this.currentPage++;
        this.performSearch();
    }

    prevPage() {
        if (this.currentPage > 0) {
            this.currentPage--;
            this.performSearch();
        }
    }

    // =========================================================================
    // PLAYER PROFILE MODAL
    // =========================================================================

    async showPlayerProfile(playerId) {
        const result = await this.getPlayerProfile(playerId);
        if (!result.success || !result.profile) {
            console.error('Failed to load profile');
            return;
        }

        const profile = result.profile;
        const stats = profile.statistics || {};
        const societies = profile.societies || {};
        const formattedHcp = formatHandicapDisplay(profile.handicap);

        // Create modal
        const modal = document.createElement('div');
        modal.id = 'player-profile-modal';
        modal.className = 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4';
        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };

        modal.innerHTML = `
            <div class="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <!-- Header -->
                <div class="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-8 text-white relative">
                    <button onclick="document.getElementById('player-profile-modal').remove()"
                            class="absolute top-4 right-4 text-white/80 hover:text-white">
                        <i class="material-symbols-outlined">close</i>
                    </button>
                    <div class="flex items-center gap-4">
                        <div class="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-3xl font-bold">
                            ${(profile.player_name || 'U')[0].toUpperCase()}
                        </div>
                        <div>
                            <h2 class="text-2xl font-bold">${profile.player_name || 'Unknown'}</h2>
                            <p class="text-emerald-100">${societies.primary || 'No society'}</p>
                        </div>
                    </div>
                </div>

                <!-- Stats Grid - Enhanced -->
                <div class="grid grid-cols-4 gap-2 p-4 bg-gray-50">
                    <div class="text-center">
                        <div class="text-xl font-bold text-emerald-600">${formattedHcp || '-'}</div>
                        <div class="text-xs text-gray-500">HCP</div>
                    </div>
                    <div class="text-center">
                        <div class="text-xl font-bold text-blue-600">${stats.total_rounds || 0}</div>
                        <div class="text-xs text-gray-500">Rounds</div>
                    </div>
                    <div class="text-center">
                        <div class="text-xl font-bold text-purple-600">${stats.avg_gross || '-'}</div>
                        <div class="text-xs text-gray-500">Avg Gross</div>
                    </div>
                    <div class="text-center">
                        <div class="text-xl font-bold text-orange-600">${stats.best_gross || '-'}</div>
                        <div class="text-xs text-gray-500">Best</div>
                    </div>
                </div>

                <!-- Stableford Stats -->
                ${stats.avg_stableford ? `
                    <div class="grid grid-cols-2 gap-4 px-4 py-2 border-b border-gray-100">
                        <div class="flex items-center gap-2">
                            <i class="material-symbols-outlined text-amber-500 text-sm">star</i>
                            <span class="text-sm text-gray-600">Avg Stableford: <span class="font-bold text-amber-600">${stats.avg_stableford} pts</span></span>
                        </div>
                        <div class="flex items-center gap-2">
                            <i class="material-symbols-outlined text-amber-500 text-sm">emoji_events</i>
                            <span class="text-sm text-gray-600">Best: <span class="font-bold text-amber-600">${stats.best_stableford || '-'} pts</span></span>
                        </div>
                    </div>
                ` : ''}

                <!-- Details -->
                <div class="p-4 space-y-4">
                    ${profile.home_course?.name ? `
                        <div class="flex items-center gap-3">
                            <i class="material-symbols-outlined text-emerald-600">golf_course</i>
                            <div>
                                <div class="text-xs text-gray-500">Home Course</div>
                                <div class="font-medium">${profile.home_course.name}</div>
                            </div>
                        </div>
                    ` : ''}

                    ${societies.all && societies.all.length > 0 ? `
                        <div class="flex items-start gap-3">
                            <i class="material-symbols-outlined text-emerald-600">groups</i>
                            <div>
                                <div class="text-xs text-gray-500">Societies (${societies.count || 0})</div>
                                <div class="font-medium">${societies.all.join(', ')}</div>
                            </div>
                        </div>
                    ` : ''}

                    ${stats.last_round_date ? `
                        <div class="flex items-center gap-3">
                            <i class="material-symbols-outlined text-emerald-600">schedule</i>
                            <div>
                                <div class="text-xs text-gray-500">Last Played</div>
                                <div class="font-medium">${new Date(stats.last_round_date).toLocaleDateString()}</div>
                            </div>
                        </div>
                    ` : ''}
                </div>

                <!-- Full Round History -->
                ${profile.recent_rounds && profile.recent_rounds.length > 0 ? `
                    <div class="px-4 pb-4">
                        <h3 class="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                            <i class="material-symbols-outlined text-emerald-600">history</i>
                            Playing History (${profile.recent_rounds.length} rounds)
                        </h3>
                        <div class="bg-gray-50 rounded-lg max-h-64 overflow-y-auto">
                            <table class="w-full text-sm">
                                <thead class="sticky top-0 bg-gray-100">
                                    <tr class="text-left text-gray-500 text-xs">
                                        <th class="px-3 py-2">Date</th>
                                        <th class="px-3 py-2">Course</th>
                                        <th class="px-3 py-2 text-center">Gross</th>
                                        <th class="px-3 py-2 text-center">Pts</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-gray-100">
                                    ${profile.recent_rounds.map(round => {
                                        const playedDate = round.played_at ? new Date(round.played_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '-';
                                        const courseName = round.course_name || 'Unknown';
                                        const shortCourse = courseName.length > 25 ? courseName.substring(0, 22) + '...' : courseName;
                                        const typeIcon = round.type === 'society' ? '🏆' : round.type === 'private' ? '👤' : '';
                                        return `
                                            <tr class="hover:bg-gray-100">
                                                <td class="px-3 py-2 text-gray-600">${playedDate}</td>
                                                <td class="px-3 py-2 font-medium" title="${courseName}">${typeIcon} ${shortCourse}</td>
                                                <td class="px-3 py-2 text-center font-bold text-emerald-600">${round.total_gross || '-'}</td>
                                                <td class="px-3 py-2 text-center font-bold text-amber-600">${round.total_stableford || '-'}</td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ` : `
                    <div class="px-4 pb-4">
                        <div class="text-center py-6 text-gray-400">
                            <i class="material-symbols-outlined text-3xl mb-2">sports_golf</i>
                            <p>No rounds recorded yet</p>
                        </div>
                    </div>
                `}

                <!-- Actions -->
                <div class="p-4 bg-gray-50 flex gap-2">
                    <button onclick="globalPlayerDirectory.addToBuddies('${playerId}')"
                            class="flex-1 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700">
                        <i class="material-symbols-outlined text-sm mr-1">person_add</i>
                        Add Buddy
                    </button>
                    <button onclick="globalPlayerDirectory.sendMessage('${playerId}')"
                            class="flex-1 py-2 bg-white border border-gray-200 rounded-lg font-medium hover:bg-gray-50">
                        <i class="material-symbols-outlined text-sm mr-1">chat</i>
                        Message
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    async addToBuddies(playerId) {
        // Use existing golf buddies system
        if (window.golfBuddiesSystem) {
            await window.golfBuddiesSystem.addBuddy(playerId);
            alert('Added to Golf Buddies!');
        } else {
            console.log('Add to buddies:', playerId);
            alert('Golf Buddies system not available');
        }
    }

    sendMessage(playerId) {
        // Navigate to messages with this player
        if (window.messagesSystem) {
            window.messagesSystem.startConversation(playerId);
        } else {
            console.log('Send message to:', playerId);
        }
    }

    // =========================================================================
    // RENDER ANALYTICS
    // =========================================================================

    async renderAnalytics(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const result = await this.getDirectoryAnalytics();
        if (!result.success) {
            container.innerHTML = '<p class="text-red-500">Failed to load analytics</p>';
            return;
        }

        const stats = result.analytics;

        container.innerHTML = `
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="bg-white rounded-xl p-4 shadow">
                    <div class="text-3xl font-bold text-emerald-600">${stats.total_players || 0}</div>
                    <div class="text-sm text-gray-500">Total Players</div>
                </div>
                <div class="bg-white rounded-xl p-4 shadow">
                    <div class="text-3xl font-bold text-blue-600">${stats.total_societies || 0}</div>
                    <div class="text-sm text-gray-500">Societies</div>
                </div>
                <div class="bg-white rounded-xl p-4 shadow">
                    <div class="text-3xl font-bold text-purple-600">${stats.players_with_rounds || 0}</div>
                    <div class="text-sm text-gray-500">Active Players</div>
                </div>
                <div class="bg-white rounded-xl p-4 shadow">
                    <div class="text-3xl font-bold text-orange-600">${stats.active_players_30_days || 0}</div>
                    <div class="text-sm text-gray-500">Last 30 Days</div>
                </div>
            </div>
        `;
    }
}

// Global instance
window.globalPlayerDirectory = new GlobalPlayerDirectory();

// Add convenience methods that HTML can call
window.globalPlayerDirectory.loadPlayers = async function() {
    // Initialize with Supabase if not already done
    if (!this.supabase && window.SupabaseDB) {
        await window.SupabaseDB.waitForReady();
        const userId = window.AppState?.currentUser?.userId ||
                       window.AppState?.currentUser?.lineUserId ||
                       localStorage.getItem('lineUserId');
        await this.init(window.SupabaseDB.client, userId);
    }

    // Load society filter dropdown
    await this.loadSocietyFilterUI();

    // Render initial player list
    await this.performSearchUI();
};

// Debounced search for input typing
window.globalPlayerDirectory.searchTimeout = null;
window.globalPlayerDirectory.debounceSearch = function(query) {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
        this.performSearchUI(query);
    }, 300);
};

// Apply filters from dropdowns
window.globalPlayerDirectory.applyFilters = async function() {
    await this.performSearchUI();
};

// Load more players (pagination)
window.globalPlayerDirectory.moreOffset = 0;
window.globalPlayerDirectory.loadMore = async function() {
    this.moreOffset += 20;
    await this.performSearchUI(null, true);
};

// Load society filter dropdown
window.globalPlayerDirectory.loadSocietyFilterUI = async function() {
    const dropdown = document.getElementById('playerSocietyFilter');
    if (!dropdown) return;

    const result = await this.getAllSocieties();
    if (result.success && result.societies) {
        let html = '<option value="">All Societies</option>';
        result.societies.forEach(s => {
            html += `<option value="${s.id}">${s.society_name}</option>`;
        });
        dropdown.innerHTML = html;
    }
};

// Perform search and render to UI
window.globalPlayerDirectory.performSearchUI = async function(query = null, append = false) {
    const searchInput = document.getElementById('globalPlayerSearchInput');
    const societyFilter = document.getElementById('playerSocietyFilter');
    const handicapFilter = document.getElementById('playerHandicapFilter');
    const container = document.getElementById('playerDirectoryList');
    const countEl = document.getElementById('playerDirectoryCount');
    const loadMoreDiv = document.getElementById('playerDirectoryLoadMore');

    if (!container) return;

    const searchQuery = query !== null ? query : (searchInput?.value || '');

    // Build filters
    const filters = {};
    if (societyFilter?.value) filters.society_id = societyFilter.value;
    if (handicapFilter?.value) {
        const [min, max] = handicapFilter.value.split('-').map(Number);
        filters.handicap_min = min;
        filters.handicap_max = max;
    }
    filters.limit = 20;
    filters.offset = append ? this.moreOffset : 0;

    if (!append) {
        this.moreOffset = 0;
        container.innerHTML = '<div class="text-center py-8"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div></div>';
    }

    const result = await this.searchPlayers(searchQuery, filters);

    if (!result.success) {
        container.innerHTML = '<p class="text-center py-8 text-red-500">Error loading players</p>';
        return;
    }

    const players = result.players || [];

    if (players.length === 0 && !append) {
        container.innerHTML = `
            <div class="text-center py-12 text-gray-500">
                <span class="material-symbols-outlined text-5xl mb-3">person_search</span>
                <p class="text-lg">No players found</p>
                <p class="text-sm">Try adjusting your search or filters</p>
            </div>
        `;
        if (loadMoreDiv) loadMoreDiv.style.display = 'none';
        return;
    }

    let html = append ? container.innerHTML : '';

    players.forEach(player => {
        const formattedHcp = formatHandicapDisplay(player.handicap);
        const handicapDisplay = formattedHcp ? `HCP ${formattedHcp}` : 'No HCP';
        const roundsDisplay = player.total_rounds || 0;
        const avgGrossDisplay = player.avg_gross ? `Avg ${player.avg_gross}` : '';

        html += `
            <div class="bg-white rounded-xl shadow p-4 hover:shadow-md transition-shadow cursor-pointer"
                 onclick="window.globalPlayerDirectory.showPlayerProfile('${player.player_id}')">
                <div class="flex items-center gap-3">
                    <div class="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold text-lg">
                        ${(player.player_name || 'U')[0].toUpperCase()}
                    </div>
                    <div class="flex-1 min-w-0">
                        <h4 class="font-semibold text-gray-800 truncate">${player.player_name || 'Unknown'}</h4>
                        <p class="text-sm text-gray-500">${player.home_course || 'No home course'}</p>
                    </div>
                    <div class="text-right">
                        <div class="text-green-600 font-bold">${handicapDisplay}</div>
                        <div class="text-xs text-gray-400">${roundsDisplay} rounds${avgGrossDisplay ? ' • ' + avgGrossDisplay : ''}</div>
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;

    if (countEl) {
        countEl.textContent = `${this.moreOffset + players.length} players shown`;
    }

    // Show/hide load more button
    if (loadMoreDiv) {
        loadMoreDiv.style.display = players.length >= 20 ? 'block' : 'none';
    }
};
