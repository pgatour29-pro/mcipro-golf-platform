/**
 * ===========================================================================
 * GOLF BUDDIES & SAVED GROUPS SYSTEM
 * ===========================================================================
 * Date: 2025-11-12
 * Purpose: Manage buddy lists and saved groups for quick scorecard setup
 *
 * FEATURES:
 * 1. Buddy list management (add/remove buddies)
 * 2. Auto-suggestions based on play history
 * 3. Saved groups for quick round setup
 * 4. Integration with Live Scoring (quick-add players)
 * 5. Recent partners tracking
 * ===========================================================================
 */

window.GolfBuddiesSystem = {
    buddies: [],
    savedGroups: [],
    suggestions: [],
    recentPartners: [],
    currentUserId: null,

    /**
     * Initialize the system
     */
    async init() {
        console.log('[Buddies] Initializing Golf Buddies System...');

        // Get current user ID
        this.currentUserId = AppState.currentUser?.lineUserId;

        if (!this.currentUserId) {
            console.warn('[Buddies] No user ID found - will retry');
            return false; // Indicate initialization failed
        }

        // Load data
        await this.loadBuddies();
        await this.loadSavedGroups();
        await this.loadSuggestions();
        await this.loadRecentPartners();

        // Update badge
        this.updateBuddiesBadge();

        console.log('[Buddies] ✅ Initialized');
        return true; // Indicate initialization succeeded
    },

    /**
     * Load buddies from database
     */
    async loadBuddies() {
        try {
            // Load buddy records
            const { data: buddyRecords, error: buddyError } = await window.SupabaseDB.client
                .from('golf_buddies')
                .select('*')
                .eq('user_id', this.currentUserId)
                .order('times_played_together', { ascending: false });

            if (buddyError) {
                console.error('[Buddies] Error loading buddy records:', buddyError);
                return;
            }

            if (!buddyRecords || buddyRecords.length === 0) {
                this.buddies = [];
                console.log('[Buddies] No buddies found');
                return;
            }

            // Get buddy IDs
            const buddyIds = buddyRecords.map(b => b.buddy_id);

            // Load buddy profiles
            const { data: profiles, error: profileError } = await window.SupabaseDB.client
                .from('user_profiles')
                .select('line_user_id, name, profile_data')
                .in('line_user_id', buddyIds);

            if (profileError) {
                console.error('[Buddies] Error loading buddy profiles:', profileError);
                this.buddies = buddyRecords; // Still save records even without profiles
                return;
            }

            // Merge buddy records with profiles
            this.buddies = buddyRecords.map(record => ({
                ...record,
                buddy: profiles.filter(p => p.line_user_id === record.buddy_id)
            }));

            console.log(`[Buddies] Loaded ${this.buddies.length} buddies`);
        } catch (error) {
            console.error('[Buddies] Exception loading buddies:', error);
        }
    },

    /**
     * Load saved groups from database
     */
    async loadSavedGroups() {
        try {
            const { data, error } = await window.SupabaseDB.client
                .from('saved_groups')
                .select('*')
                .eq('user_id', this.currentUserId)
                .order('last_used', { ascending: false, nullsFirst: false });

            if (error) {
                console.error('[Buddies] Error loading groups:', error);
                return;
            }

            this.savedGroups = data || [];
            console.log(`[Buddies] Loaded ${this.savedGroups.length} saved groups`);
        } catch (error) {
            console.error('[Buddies] Exception loading groups:', error);
        }
    },

    /**
     * Load buddy suggestions (from play history)
     */
    async loadSuggestions() {
        try {
            const { data, error} = await window.SupabaseDB.client
                .rpc('get_buddy_suggestions', { p_user_id: this.currentUserId });

            if (error) {
                console.warn('[Buddies] Suggestions unavailable (function may not be deployed):', error.message);
                this.suggestions = [];
                return;
            }

            this.suggestions = data || [];
            console.log(`[Buddies] Loaded ${this.suggestions.length} suggestions`);
        } catch (error) {
            console.warn('[Buddies] Suggestions unavailable:', error.message);
            this.suggestions = [];
        }
    },

    /**
     * Load recent partners (last 5 rounds)
     */
    async loadRecentPartners() {
        try {
            const { data, error } = await window.SupabaseDB.client
                .rpc('get_recent_partners', {
                    p_user_id: this.currentUserId,
                    p_limit: 5
                });

            if (error) {
                console.warn('[Buddies] Recent partners unavailable (function may not be deployed):', error.message);
                this.recentPartners = [];
                return;
            }

            this.recentPartners = data || [];
            console.log(`[Buddies] Loaded ${this.recentPartners.length} recent partners`);
        } catch (error) {
            console.warn('[Buddies] Recent partners unavailable:', error.message);
            this.recentPartners = [];
        }
    },

    /**
     * Update buddies count badge
     */
    updateBuddiesBadge() {
        const badge = document.getElementById('buddiesCountBadge');
        if (badge && this.buddies.length > 0) {
            badge.textContent = this.buddies.length;
            badge.style.display = 'inline-block';
        } else if (badge) {
            badge.style.display = 'none';
        }
    },

    /**
     * Open buddies modal
     */
    async openBuddiesModal() {
        // If not initialized yet but user is authenticated, try to initialize now
        if (!this.currentUserId && AppState?.currentUser?.lineUserId) {
            console.log('[Buddies] Initializing on modal open...');
            const success = await this.init();
            if (!success) {
                console.warn('[Buddies] Cannot open modal - initialization failed');
                NotificationManager?.show?.('Please wait for authentication to complete', 'warning');
                return;
            }
        }

        // Guard: Ensure user is authenticated
        if (!this.currentUserId) {
            console.warn('[Buddies] Cannot open modal - not authenticated yet');
            NotificationManager?.show?.('Please wait for authentication to complete', 'warning');
            return;
        }

        // Create modal if it doesn't exist
        if (!document.getElementById('buddiesModal')) {
            this.createBuddiesModal();
        }

        // Show modal
        const modal = document.getElementById('buddiesModal');
        modal.classList.remove('hidden');
        modal.classList.add('flex');

        // Load/refresh data
        this.showBuddiesTab('myBuddies');
    },

    /**
     * Close buddies modal
     */
    closeBuddiesModal() {
        const modal = document.getElementById('buddiesModal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    },

    /**
     * Create the buddies modal HTML
     */
    createBuddiesModal() {
        const modalHTML = `
            <!-- Buddies Modal -->
            <div id="buddiesModal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50 p-4">
                <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                    <!-- Header -->
                    <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-green-50 to-blue-50">
                        <div class="flex items-center gap-3">
                            <span class="material-symbols-outlined text-green-600 text-3xl">group</span>
                            <div>
                                <h2 class="text-xl font-bold text-gray-900">My Golf Buddies</h2>
                                <p class="text-sm text-gray-600">Manage your playing partners & groups</p>
                            </div>
                        </div>
                        <button onclick="GolfBuddiesSystem.closeBuddiesModal()" class="text-gray-400 hover:text-gray-600">
                            <span class="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    <!-- Tabs -->
                    <div class="border-b border-gray-200">
                        <div class="flex gap-2 px-6 overflow-x-auto">
                            <button onclick="GolfBuddiesSystem.showBuddiesTab('myBuddies')"
                                    id="buddiesTab-myBuddies"
                                    class="px-4 py-3 text-sm font-medium border-b-2 border-green-500 text-green-600 whitespace-nowrap">
                                <span class="material-symbols-outlined text-xs align-middle">people</span>
                                My Buddies
                            </button>
                            <button onclick="GolfBuddiesSystem.showBuddiesTab('suggestions')"
                                    id="buddiesTab-suggestions"
                                    class="px-4 py-3 text-sm font-medium border-b-2 border-transparent text-gray-600 hover:text-gray-900 whitespace-nowrap">
                                <span class="material-symbols-outlined text-xs align-middle">auto_awesome</span>
                                Suggestions
                            </button>
                            <button onclick="GolfBuddiesSystem.showBuddiesTab('savedGroups')"
                                    id="buddiesTab-savedGroups"
                                    class="px-4 py-3 text-sm font-medium border-b-2 border-transparent text-gray-600 hover:text-gray-900 whitespace-nowrap">
                                <span class="material-symbols-outlined text-xs align-middle">groups_2</span>
                                Saved Groups
                            </button>
                            <button onclick="GolfBuddiesSystem.showBuddiesTab('addBuddy')"
                                    id="buddiesTab-addBuddy"
                                    class="px-4 py-3 text-sm font-medium border-b-2 border-transparent text-gray-600 hover:text-gray-900 whitespace-nowrap">
                                <span class="material-symbols-outlined text-xs align-middle">person_add</span>
                                Add Buddy
                            </button>
                        </div>
                    </div>

                    <!-- Content -->
                    <div class="flex-1 overflow-y-auto p-6">
                        <!-- My Buddies Tab -->
                        <div id="buddiesContent-myBuddies" class="buddies-tab-content">
                            <div id="myBuddiesList" class="space-y-3">
                                <!-- Populated by renderMyBuddies() -->
                            </div>
                        </div>

                        <!-- Suggestions Tab -->
                        <div id="buddiesContent-suggestions" class="buddies-tab-content" style="display: none;">
                            <div class="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <div class="flex items-start gap-2">
                                    <span class="material-symbols-outlined text-blue-600">info</span>
                                    <div class="text-sm text-blue-800">
                                        <strong>Auto-suggested buddies</strong> based on your play history.
                                        These are players you've played with 2+ times but haven't added as buddies yet.
                                    </div>
                                </div>
                            </div>
                            <div id="suggestionsList" class="space-y-3">
                                <!-- Populated by renderSuggestions() -->
                            </div>
                        </div>

                        <!-- Saved Groups Tab -->
                        <div id="buddiesContent-savedGroups" class="buddies-tab-content" style="display: none;">
                            <div class="mb-4 flex justify-between items-center">
                                <p class="text-sm text-gray-600">Quick-load groups of players for common rounds</p>
                                <button onclick="GolfBuddiesSystem.createNewGroup()" class="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
                                    <span class="material-symbols-outlined text-sm align-middle">add</span>
                                    New Group
                                </button>
                            </div>
                            <div id="savedGroupsList" class="space-y-3">
                                <!-- Populated by renderSavedGroups() -->
                            </div>
                        </div>

                        <!-- Add Buddy Tab -->
                        <div id="buddiesContent-addBuddy" class="buddies-tab-content" style="display: none;">
                            <div class="mb-4">
                                <label class="block text-sm font-medium text-gray-700 mb-2">Search for players</label>
                                <input type="text" id="buddySearchInput" placeholder="Search by name..."
                                       class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                       onkeyup="GolfBuddiesSystem.searchPlayers(this.value)">
                            </div>
                            <div id="buddySearchResults" class="space-y-3">
                                <p class="text-center text-gray-500 py-8">Start typing to search for players...</p>
                            </div>
                        </div>
                    </div>

                    <!-- Footer with Recent Partners -->
                    <div class="px-6 py-4 border-t border-gray-200 bg-gray-50">
                        <div class="flex items-center justify-between">
                            <div>
                                <h4 class="text-sm font-semibold text-gray-700 mb-1">Recent Partners</h4>
                                <div id="recentPartnersList" class="flex gap-2 flex-wrap">
                                    <!-- Populated by renderRecentPartners() -->
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Append to body
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    },

    /**
     * Switch between tabs in buddies modal
     */
    showBuddiesTab(tabName) {
        // Update tab buttons
        ['myBuddies', 'suggestions', 'savedGroups', 'addBuddy'].forEach(tab => {
            const btn = document.getElementById(`buddiesTab-${tab}`);
            const content = document.getElementById(`buddiesContent-${tab}`);

            if (tab === tabName) {
                btn?.classList.add('border-green-500', 'text-green-600');
                btn?.classList.remove('border-transparent', 'text-gray-600');
                if (content) content.style.display = 'block';
            } else {
                btn?.classList.remove('border-green-500', 'text-green-600');
                btn?.classList.add('border-transparent', 'text-gray-600');
                if (content) content.style.display = 'none';
            }
        });

        // Render content for the selected tab
        switch (tabName) {
            case 'myBuddies':
                this.renderMyBuddies();
                break;
            case 'suggestions':
                this.renderSuggestions();
                break;
            case 'savedGroups':
                this.renderSavedGroups();
                break;
            case 'addBuddy':
                // Search is handled by input onkeyup
                break;
        }

        // Always render recent partners
        this.renderRecentPartners();
    },

    /**
     * Render my buddies list
     */
    renderMyBuddies() {
        const container = document.getElementById('myBuddiesList');

        if (!container) return;

        if (this.buddies.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12">
                    <span class="material-symbols-outlined text-6xl text-gray-300 mb-4">person_off</span>
                    <p class="text-gray-500 mb-4">You haven't added any buddies yet</p>
                    <button onclick="GolfBuddiesSystem.showBuddiesTab('suggestions')" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                        View Suggestions
                    </button>
                </div>
            `;
            return;
        }

        const html = this.buddies.map(buddy => {
            const buddyProfile = buddy.buddy?.[0];
            const name = buddyProfile?.name || 'Unknown';
            const handicap = buddyProfile?.profile_data?.golfInfo?.handicap || '-';
            const timesPlayed = buddy.times_played_together || 0;
            const lastPlayed = buddy.last_played_together
                ? new Date(buddy.last_played_together).toLocaleDateString()
                : 'Never';

            return `
                <div class="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                    <div class="flex items-center gap-3 flex-1">
                        <div class="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                            ${name.charAt(0).toUpperCase()}
                        </div>
                        <div class="flex-1">
                            <div class="font-semibold text-gray-900">${name}</div>
                            <div class="text-sm text-gray-600">
                                HCP: ${handicap} • Played together: ${timesPlayed}x
                                ${timesPlayed > 0 ? `<br><span class="text-xs">Last played: ${lastPlayed}</span>` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <button onclick="GolfBuddiesSystem.quickAddBuddy('${buddy.buddy_id}')"
                                class="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                                title="Quick add to scorecard">
                            <span class="material-symbols-outlined text-sm">person_add</span>
                        </button>
                        <button onclick="GolfBuddiesSystem.removeBuddy('${buddy.id}')"
                                class="px-3 py-1.5 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                                title="Remove buddy">
                            <span class="material-symbols-outlined text-sm">person_remove</span>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    },

    /**
     * Render suggestions list
     */
    renderSuggestions() {
        const container = document.getElementById('suggestionsList');

        if (!container) return;

        if (this.suggestions.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12">
                    <span class="material-symbols-outlined text-6xl text-gray-300 mb-4">search_off</span>
                    <p class="text-gray-500">No suggestions available yet</p>
                    <p class="text-sm text-gray-400 mt-2">Play more rounds to get buddy suggestions!</p>
                </div>
            `;
            return;
        }

        const html = this.suggestions.map(suggestion => {
            const name = suggestion.buddy_name || 'Unknown';
            const timesPlayed = suggestion.times_played || 0;
            const lastPlayed = suggestion.last_played
                ? new Date(suggestion.last_played).toLocaleDateString()
                : 'Unknown';

            return `
                <div class="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
                    <div class="flex items-center gap-3 flex-1">
                        <div class="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                            ${name.charAt(0).toUpperCase()}
                        </div>
                        <div class="flex-1">
                            <div class="font-semibold text-gray-900">${name}</div>
                            <div class="text-sm text-gray-600">
                                Played together: ${timesPlayed}x • Last: ${lastPlayed}
                            </div>
                        </div>
                    </div>
                    <button onclick="GolfBuddiesSystem.addBuddy('${suggestion.buddy_id}')"
                            class="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
                        <span class="material-symbols-outlined text-sm align-middle">add</span>
                        Add Buddy
                    </button>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    },

    /**
     * Render saved groups list
     */
    renderSavedGroups() {
        const container = document.getElementById('savedGroupsList');

        if (!container) return;

        if (this.savedGroups.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12">
                    <span class="material-symbols-outlined text-6xl text-gray-300 mb-4">groups_2</span>
                    <p class="text-gray-500 mb-4">No saved groups yet</p>
                    <p class="text-sm text-gray-400 mb-4">Create groups for your regular playing partners</p>
                    <button onclick="GolfBuddiesSystem.createNewGroup()" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                        Create First Group
                    </button>
                </div>
            `;
            return;
        }

        const html = this.savedGroups.map(group => {
            const memberCount = group.member_ids?.length || 0;
            const lastUsed = group.last_used
                ? `Last used: ${new Date(group.last_used).toLocaleDateString()}`
                : 'Never used';

            return `
                <div class="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                    <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-outlined text-green-600">groups_2</span>
                            <h4 class="font-semibold text-gray-900">${group.group_name}</h4>
                        </div>
                        <div class="flex items-center gap-2">
                            <button onclick="GolfBuddiesSystem.loadGroupToScorecard('${group.id}')"
                                    class="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                                    title="Load group">
                                <span class="material-symbols-outlined text-sm">play_arrow</span>
                            </button>
                            <button onclick="GolfBuddiesSystem.editGroup('${group.id}')"
                                    class="px-3 py-1.5 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                                    title="Edit group">
                                <span class="material-symbols-outlined text-sm">edit</span>
                            </button>
                            <button onclick="GolfBuddiesSystem.deleteGroup('${group.id}')"
                                    class="px-3 py-1.5 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                                    title="Delete group">
                                <span class="material-symbols-outlined text-sm">delete</span>
                            </button>
                        </div>
                    </div>
                    <div class="text-sm text-gray-600">
                        ${memberCount} member${memberCount !== 1 ? 's' : ''} • ${lastUsed}
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    },

    /**
     * Render recent partners
     */
    renderRecentPartners() {
        const container = document.getElementById('recentPartnersList');

        if (!container) return;

        if (this.recentPartners.length === 0) {
            container.innerHTML = '<p class="text-xs text-gray-500">No recent partners</p>';
            return;
        }

        const html = this.recentPartners.map(partner => {
            const name = partner.partner_name || 'Unknown';
            const initial = name.charAt(0).toUpperCase();

            return `
                <button onclick="GolfBuddiesSystem.quickAddBuddy('${partner.partner_id}')"
                        class="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 rounded-full text-xs hover:bg-gray-50"
                        title="Quick add ${name}">
                    <div class="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-xs">
                        ${initial}
                    </div>
                    ${name}
                </button>
            `;
        }).join('');

        container.innerHTML = html;
    },

    /**
     * Search for players to add as buddies
     */
    async searchPlayers(query) {
        const container = document.getElementById('buddySearchResults');

        if (!container) return;

        if (!query || query.trim().length < 2) {
            container.innerHTML = '<p class="text-center text-gray-500 py-8">Start typing to search for players...</p>';
            return;
        }

        container.innerHTML = '<p class="text-center text-gray-500 py-8">Searching...</p>';

        try {
            const { data, error } = await window.SupabaseDB.client
                .from('user_profiles')
                .select('line_user_id, name, profile_data')
                .ilike('name', `%${query}%`)
                .limit(20);

            if (error) {
                console.error('[Buddies] Search error:', error);
                container.innerHTML = '<p class="text-center text-red-500 py-8">Error searching players</p>';
                return;
            }

            if (!data || data.length === 0) {
                container.innerHTML = '<p class="text-center text-gray-500 py-8">No players found</p>';
                return;
            }

            // Filter out current user and existing buddies
            const existingBuddyIds = new Set(this.buddies.map(b => b.buddy_id));
            const filtered = data.filter(p =>
                p.line_user_id !== this.currentUserId &&
                !existingBuddyIds.has(p.line_user_id)
            );

            if (filtered.length === 0) {
                container.innerHTML = '<p class="text-center text-gray-500 py-8">No new players found (already buddies)</p>';
                return;
            }

            const html = filtered.map(player => {
                const name = player.name || 'Unknown';
                const handicap = player.profile_data?.golfInfo?.handicap || '-';

                return `
                    <div class="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                        <div class="flex items-center gap-3 flex-1">
                            <div class="w-10 h-10 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white font-bold">
                                ${name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div class="font-semibold text-gray-900">${name}</div>
                                <div class="text-sm text-gray-600">HCP: ${handicap}</div>
                            </div>
                        </div>
                        <button onclick="GolfBuddiesSystem.addBuddy('${player.line_user_id}')"
                                class="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
                            <span class="material-symbols-outlined text-sm align-middle">add</span>
                            Add
                        </button>
                    </div>
                `;
            }).join('');

            container.innerHTML = html;

        } catch (error) {
            console.error('[Buddies] Search exception:', error);
            container.innerHTML = '<p class="text-center text-red-500 py-8">Error searching players</p>';
        }
    },

    /**
     * Add a buddy
     */
    async addBuddy(buddyId) {
        // Guard: Ensure user is authenticated
        if (!this.currentUserId) {
            console.error('[Buddies] Cannot add buddy - not authenticated');
            NotificationManager?.show?.('Please wait for authentication to complete', 'error');
            return;
        }

        try {
            const { error } = await window.SupabaseDB.client
                .from('golf_buddies')
                .insert({
                    user_id: this.currentUserId,
                    buddy_id: buddyId,
                    added_manually: true
                });

            if (error) {
                // Handle duplicate buddy (409 conflict)
                if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('unique')) {
                    console.warn('[Buddies] Buddy already exists');
                    NotificationManager?.show?.('This buddy already exists in your list', 'info');
                    return;
                }

                console.error('[Buddies] Error adding buddy:', error);
                NotificationManager?.show?.('Error adding buddy', 'error');
                return;
            }

            // Reload data
            await this.loadBuddies();
            await this.loadSuggestions();

            // Update UI
            this.updateBuddiesBadge();
            this.renderMyBuddies();
            this.renderSuggestions();

            NotificationManager?.show?.('Buddy added successfully!', 'success');

        } catch (error) {
            console.error('[Buddies] Exception adding buddy:', error);
            NotificationManager?.show?.('Error adding buddy', 'error');
        }
    },

    /**
     * Remove a buddy
     */
    async removeBuddy(buddyRecordId) {
        if (!confirm('Remove this buddy?')) return;

        try {
            const { error } = await window.SupabaseDB.client
                .from('golf_buddies')
                .delete()
                .eq('id', buddyRecordId);

            if (error) {
                console.error('[Buddies] Error removing buddy:', error);
                NotificationManager?.show?.('Error removing buddy', 'error');
                return;
            }

            // Reload data
            await this.loadBuddies();

            // Update UI
            this.updateBuddiesBadge();
            this.renderMyBuddies();

            NotificationManager?.show?.('Buddy removed', 'success');

        } catch (error) {
            console.error('[Buddies] Exception removing buddy:', error);
            NotificationManager?.show?.('Error removing buddy', 'error');
        }
    },

    /**
     * Quick add buddy to current scorecard (if Live Scoring is active)
     */
    quickAddBuddy(buddyId) {
        // Guard: Ensure user is authenticated
        if (!this.currentUserId) {
            console.warn('[Buddies] Cannot quick-add buddy - not authenticated yet');
            NotificationManager?.show?.('Please wait for authentication to complete', 'warning');
            return;
        }

        // Check if LiveScorecardManager is available and has active round
        if (typeof LiveScorecardManager !== 'undefined' && LiveScorecardManager.players) {
            // Find buddy profile
            const buddy = this.buddies.find(b => b.buddy_id === buddyId);
            const buddyProfile = buddy?.buddy?.[0];

            if (buddyProfile) {
                // Add to scorecard
                LiveScorecardManager.addPlayerById(buddyId, buddyProfile.name, buddyProfile.profile_data?.golfInfo?.handicap || 0);
                NotificationManager?.show?.(`Added ${buddyProfile.name} to scorecard`, 'success');
                this.closeBuddiesModal();
            }
        } else {
            NotificationManager?.show?.('Start a round first to add players', 'warning');
        }
    },

    /**
     * Create new group (placeholder - full implementation would open form)
     */
    createNewGroup() {
        NotificationManager?.show?.('Create Group feature coming soon!', 'info');
        // TODO: Open group creation form
    },

    /**
     * Edit group (placeholder)
     */
    editGroup(groupId) {
        NotificationManager?.show?.('Edit Group feature coming soon!', 'info');
        // TODO: Open group edit form
    },

    /**
     * Delete group
     */
    async deleteGroup(groupId) {
        if (!confirm('Delete this group?')) return;

        try {
            const { error } = await window.SupabaseDB.client
                .from('saved_groups')
                .delete()
                .eq('id', groupId);

            if (error) {
                console.error('[Buddies] Error deleting group:', error);
                NotificationManager?.show?.('Error deleting group', 'error');
                return;
            }

            // Reload
            await this.loadSavedGroups();
            this.renderSavedGroups();

            NotificationManager?.show?.('Group deleted', 'success');

        } catch (error) {
            console.error('[Buddies] Exception deleting group:', error);
            NotificationManager?.show?.('Error deleting group', 'error');
        }
    },

    /**
     * Load group to scorecard (placeholder)
     */
    loadGroupToScorecard(groupId) {
        NotificationManager?.show?.('Load Group feature coming soon!', 'info');
        // TODO: Load all group members to Live Scoring
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            if (AppState?.currentUser) {
                GolfBuddiesSystem.init();
            }
        }, 1000);
    });
} else {
    // Auto-initialize with retry mechanism
    let retryCount = 0;
    const maxRetries = 30; // Try for 30 seconds (OAuth can be slow)
    const retryInterval = 1000; // Every 1 second

    const tryInit = async () => {
        console.log(`[Buddies] Init attempt ${retryCount + 1}/${maxRetries}. AppState:`, {
            exists: !!AppState,
            hasCurrentUser: !!AppState?.currentUser,
            hasLineUserId: !!AppState?.currentUser?.lineUserId,
            lineUserId: AppState?.currentUser?.lineUserId?.substring(0, 10) + '...' || 'none'
        });

        if (AppState?.currentUser?.lineUserId) {
            const success = await GolfBuddiesSystem.init();
            if (success) {
                console.log('[Buddies] ✅ Initialization successful after', retryCount + 1, 'attempts');
                return;
            }
        }

        retryCount++;
        if (retryCount < maxRetries) {
            setTimeout(tryInit, retryInterval);
        } else {
            console.error('[Buddies] ❌ Initialization timed out after 30 seconds. Please refresh the page.');
        }
    };

    setTimeout(tryInit, 1000);
}

console.log('[Buddies] ✅ Golf Buddies System loaded');
