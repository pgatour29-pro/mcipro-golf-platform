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

const BUDDIES_ENABLED = true;

window.GolfBuddiesSystem = {
    buddies: [],
    savedGroups: [],
    suggestions: [],
    recentPartners: [],
    currentUserId: null,
    editingGroupId: null,
    selectedGroupMembers: [],
    groupMemberProfiles: {},

    /**
     * Initialize the system
     */
    async init() {
        if (!BUDDIES_ENABLED) {
            console.log('[Buddies] Disabled - skipping initialization');
            return false;
        }

        console.log('[Buddies] Initializing Golf Buddies System...');

        // Get current user ID
        this.currentUserId = AppState.currentUser?.lineUserId;

        if (!this.currentUserId) {
            console.warn('[Buddies] No user ID found - buddies disabled or not authenticated');
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
            const startTime = Date.now();
            console.log('[Buddies] Loading buddies for user:', this.currentUserId);

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
            console.log(`[Buddies] Found ${buddyIds.length} buddy records, loading profiles...`);

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
            const profileList = profiles || [];
            this.buddies = buddyRecords.map(record => ({
                ...record,
                buddy: profileList.filter(p => p.line_user_id === record.buddy_id)
            }));

            const loadTime = Date.now() - startTime;
            console.log(`[Buddies] ✅ Loaded ${this.buddies.length} buddies in ${loadTime}ms`);
        } catch (error) {
            console.error('[Buddies] Exception loading buddies:', error);
        }
    },

    /**
     * Retry loading buddies (called from error UI)
     */
    async retryLoadBuddies() {
        await this.loadBuddies();
        this.renderMyBuddies();
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
            // Re-enable body scroll
            document.body.style.overflow = '';
        }
    },

    /**
     * Create the buddies modal HTML
     */
    createBuddiesModal() {
        const modalHTML = `
            <!-- Buddies Modal -->
            <div id="buddiesModal" class="fixed inset-0 bg-black bg-opacity-50 hidden flex items-center justify-center p-4" style="z-index: 99999;" onclick="event.target.id === 'buddiesModal' && GolfBuddiesSystem.closeBuddiesModal()">
                <div class="bg-white rounded-lg shadow-xl w-full max-w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] flex flex-col" onclick="event.stopPropagation()">
                        <!-- Header -->
                        <div class="px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-green-50 to-blue-50 rounded-t-lg flex-shrink-0">
                            <div class="flex items-center gap-2 sm:gap-3">
                                <span class="material-symbols-outlined text-green-600 text-xl sm:text-3xl">group</span>
                                <div>
                                    <h2 class="text-lg sm:text-xl font-bold text-gray-900">My Golf Buddies</h2>
                                    <p class="text-xs sm:text-sm text-gray-600 hidden sm:block">Manage your playing partners & groups</p>
                                </div>
                            </div>
                            <button onclick="GolfBuddiesSystem.closeBuddiesModal()" class="text-gray-400 hover:text-gray-600 p-1">
                                <span class="material-symbols-outlined text-2xl sm:text-3xl">close</span>
                            </button>
                        </div>

                        <!-- Tabs -->
                        <div class="border-b border-gray-200 flex-shrink-0">
                            <div class="flex gap-1 sm:gap-2 px-2 sm:px-6 overflow-x-auto">
                                <button onclick="GolfBuddiesSystem.showBuddiesTab('myBuddies')"
                                        id="buddiesTab-myBuddies"
                                        class="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium border-b-2 border-green-500 text-green-600 whitespace-nowrap">
                                    <span class="material-symbols-outlined text-xs align-middle">people</span>
                                    <span class="hidden xs:inline">My </span>Buddies
                                </button>
                                <button onclick="GolfBuddiesSystem.showBuddiesTab('suggestions')"
                                        id="buddiesTab-suggestions"
                                        class="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium border-b-2 border-transparent text-gray-600 hover:text-gray-900 whitespace-nowrap">
                                    <span class="material-symbols-outlined text-xs align-middle">auto_awesome</span>
                                    Suggestions
                                </button>
                                <button onclick="GolfBuddiesSystem.showBuddiesTab('savedGroups')"
                                        id="buddiesTab-savedGroups"
                                        class="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium border-b-2 border-transparent text-gray-600 hover:text-gray-900 whitespace-nowrap">
                                    <span class="material-symbols-outlined text-xs align-middle">groups_2</span>
                                    <span class="hidden xs:inline">Saved </span>Groups
                                </button>
                                <button onclick="GolfBuddiesSystem.showBuddiesTab('addBuddy')"
                                        id="buddiesTab-addBuddy"
                                        class="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium border-b-2 border-transparent text-gray-600 hover:text-gray-900 whitespace-nowrap">
                                    <span class="material-symbols-outlined text-xs align-middle">person_add</span>
                                    Add
                                </button>
                            </div>
                        </div>

                        <!-- Content - scrollable with max height -->
                        <div class="p-3 sm:p-6 overflow-y-auto flex-1">
                            <!-- My Buddies Tab -->
                            <div id="buddiesContent-myBuddies" class="buddies-tab-content w-full max-w-full overflow-x-hidden">
                                <div id="myBuddiesList" class="space-y-3 w-full max-w-full">
                                    <!-- Populated by renderMyBuddies() -->
                                </div>
                            </div>

                            <!-- Suggestions Tab -->
                            <div id="buddiesContent-suggestions" class="buddies-tab-content w-full max-w-full overflow-x-hidden" style="display: none;">
                                <div class="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <div class="flex items-start gap-2">
                                        <span class="material-symbols-outlined text-blue-600">info</span>
                                        <div class="text-sm text-blue-800">
                                            <strong>Auto-suggested buddies</strong> based on your play history.
                                            These are players you've played with 2+ times but haven't added as buddies yet.
                                        </div>
                                    </div>
                                </div>
                                <div id="suggestionsList" class="space-y-3 w-full max-w-full">
                                    <!-- Populated by renderSuggestions() -->
                                </div>
                            </div>

                            <!-- Saved Groups Tab -->
                            <div id="buddiesContent-savedGroups" class="buddies-tab-content w-full max-w-full overflow-x-hidden" style="display: none;">
                                <div class="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                    <p class="text-sm text-gray-600">Quick-load groups of players for common rounds</p>
                                    <button onclick="GolfBuddiesSystem.createNewGroup()" class="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
                                        <span class="material-symbols-outlined text-sm align-middle">add</span>
                                        New Group
                                    </button>
                                </div>
                                <div id="savedGroupsList" class="space-y-3 w-full max-w-full">
                                    <!-- Populated by renderSavedGroups() -->
                                </div>
                            </div>

                            <!-- Add Buddy Tab -->
                            <div id="buddiesContent-addBuddy" class="buddies-tab-content w-full max-w-full overflow-x-hidden" style="display: none;">
                                <div class="mb-4 w-full max-w-full">
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Search for players</label>
                                    <input type="text" id="buddySearchInput" placeholder="Search by name..."
                                           class="w-full max-w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 box-border"
                                           onkeyup="GolfBuddiesSystem.searchPlayers(this.value)">
                                </div>
                                <div id="buddySearchResults" class="space-y-2 sm:space-y-3 w-full max-w-full overflow-x-hidden">
                                    <p class="text-center text-gray-500 py-8">Start typing to search for players...</p>
                                </div>
                            </div>
                        </div>

                        <!-- Footer with Recent Partners -->
                        <div class="px-3 sm:px-6 py-3 sm:py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg flex-shrink-0">
                            <div>
                                <h4 class="text-sm font-semibold text-gray-700 mb-2">Recent Partners</h4>
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
                // If buddies list is empty but user is authenticated, retry loading
                if (this.buddies.length === 0 && this.currentUserId) {
                    this.loadBuddies().then(() => this.renderMyBuddies());
                } else {
                    this.renderMyBuddies();
                }
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

        try {
            const safeHandicapDisplay = (val) => {
                if (val === null || val === undefined) return '-';
                if (typeof window.formatHandicapDisplay === 'function') return window.formatHandicapDisplay(val);
                const num = parseFloat(val);
                return isNaN(num) ? '-' : num.toFixed(1);
            };

            const html = this.buddies.map(buddy => {
                const buddyProfile = buddy.buddy?.[0];
                const name = buddyProfile?.name || 'Unknown';
                const golfInfo = buddyProfile?.profile_data?.golfInfo || {};
                const handicapValue = golfInfo.handicap || buddyProfile?.profile_data?.handicap;
                const handicap = safeHandicapDisplay(handicapValue);
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
        } catch (err) {
            console.error('[Buddies] Error rendering buddies list:', err);
            container.innerHTML = `
                <div class="text-center py-8">
                    <p class="text-red-500 mb-3">Error loading buddies</p>
                    <button onclick="GolfBuddiesSystem.retryLoadBuddies()" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                        Retry
                    </button>
                </div>
            `;
        }
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
                <div class="w-full max-w-full overflow-hidden box-border">
                    <div class="flex items-center justify-between gap-2 p-2 sm:p-4 bg-gradient-to-r from-blue-50 to-teal-50 border border-blue-200 rounded-lg w-full box-border">
                        <div class="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 overflow-hidden">
                            <div class="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-blue-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm sm:text-lg flex-shrink-0">
                                ${name.charAt(0).toUpperCase()}
                            </div>
                            <div class="flex-1 min-w-0 overflow-hidden">
                                <div class="font-semibold text-gray-900 text-sm sm:text-base truncate">${name}</div>
                                <div class="text-xs sm:text-sm text-gray-600 truncate">
                                    Played: ${timesPlayed}x • Last: ${lastPlayed}
                                </div>
                            </div>
                        </div>
                        <button onclick="GolfBuddiesSystem.addBuddy('${suggestion.buddy_id}')"
                                class="px-2 sm:px-4 py-1.5 sm:py-2 bg-green-600 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-green-700 flex-shrink-0 whitespace-nowrap">
                            <span class="material-symbols-outlined text-sm align-middle">add</span>
                            <span class="hidden sm:inline ml-1">Add</span>
                        </button>
                    </div>
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
            // Build flexible search query for name variations (same as scorecard search)
            const searchWords = query.trim().split(/\s+/).filter(w => w.length > 0);
            let dbQuery = window.SupabaseDB.client
                .from('user_profiles')
                .select('line_user_id, name, profile_data');

            if (searchWords.length === 1) {
                // Single word: simple search
                dbQuery = dbQuery.ilike('name', `%${searchWords[0]}%`);
            } else if (searchWords.length === 2) {
                // Two words: Search for ALL variations (handles "First Last", "Last, First", "Last First")
                const word1 = searchWords[0];
                const word2 = searchWords[1];
                dbQuery = dbQuery.or(`name.ilike.%${word1} ${word2}%,name.ilike.%${word2}, ${word1}%,name.ilike.%${word2} ${word1}%`);
            } else {
                // Three or more words: search for the full phrase
                dbQuery = dbQuery.ilike('name', `%${query}%`);
            }

            const { data, error } = await dbQuery.limit(20);

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
                const name = (player.name || 'Unknown').replace(/'/g, '&apos;').replace(/"/g, '&quot;');
                const handicapValue = player.profile_data?.golfInfo?.handicap;
                const handicap = handicapValue !== null && handicapValue !== undefined ? (typeof window.formatHandicapDisplay === 'function' ? window.formatHandicapDisplay(handicapValue) : parseFloat(handicapValue).toFixed(1)) : '-';
                const userId = player.line_user_id;

                return `
                    <div style="width: 100%; max-width: 100%; overflow: hidden; box-sizing: border-box;">
                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; padding: 0.5rem; background: white; border: 1px solid #e5e7eb; border-radius: 0.5rem; width: 100%; box-sizing: border-box;">
                            <div style="display: flex; align-items: center; gap: 0.5rem; flex: 1; min-width: 0; overflow: hidden;">
                                <div style="width: 2rem; height: 2rem; border-radius: 50%; background: linear-gradient(135deg, #9ca3af, #4b5563); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 0.875rem; flex-shrink: 0;">
                                    ${name.charAt(0).toUpperCase()}
                                </div>
                                <div style="min-width: 0; flex: 1; overflow: hidden;">
                                    <div style="font-weight: 600; color: #111827; font-size: 0.875rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${name}</div>
                                    <div style="font-size: 0.75rem; color: #6b7280;">HCP: ${handicap}</div>
                                </div>
                            </div>
                            <button onclick="GolfBuddiesSystem.addBuddy('${userId}')"
                                    style="padding: 0.375rem 0.5rem; background: #16a34a; color: white; border-radius: 0.5rem; font-size: 0.75rem; border: none; cursor: pointer; flex-shrink: 0; white-space: nowrap;">
                                <span class="material-symbols-outlined" style="font-size: 0.875rem; vertical-align: middle;">add</span>
                                <span style="display: none;">Add</span>
                            </button>
                        </div>
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
    async quickAddBuddy(buddyId) {
        // Guard: Ensure user is authenticated
        if (!this.currentUserId) {
            console.warn('[Buddies] Cannot quick-add buddy - not authenticated yet');
            NotificationManager?.show?.('Please wait for authentication to complete', 'warning');
            return;
        }

        // Check if LiveScorecardManager is available and has active round
        if (typeof LiveScorecardManager !== 'undefined' && LiveScorecardManager.players) {
            try {
                // Ensure profiles are loaded
                if (!LiveScorecardManager.allPlayerProfiles || LiveScorecardManager.allPlayerProfiles.length === 0) {
                    console.log('[Buddies] Loading player profiles for quick-add...');
                    LiveScorecardManager.allPlayerProfiles = await window.SupabaseDB.getAllProfiles();
                }

                // Use the existing selectExistingPlayer method
                LiveScorecardManager.selectExistingPlayer(buddyId);

                // Show immediate success feedback with player count
                const playerCount = LiveScorecardManager.players.length;
                NotificationManager?.show?.(`✅ Player added! (${playerCount} player${playerCount !== 1 ? 's' : ''} in round)`, 'success', 2000);

                // Add visual feedback to the button
                const buttons = document.querySelectorAll(`button[onclick*="quickAddBuddy('${buddyId}')"]`);
                buttons.forEach(btn => {
                    btn.classList.remove('bg-green-600', 'hover:bg-green-700');
                    btn.classList.add('bg-gray-400', 'cursor-not-allowed');
                    btn.innerHTML = '<span class="material-symbols-outlined text-sm">check</span>';
                    btn.disabled = true;
                });
            } catch (error) {
                console.error('[Buddies] Error quick-adding buddy:', error);
                NotificationManager?.show?.('Error adding player to scorecard', 'error');
            }
        } else {
            NotificationManager?.show?.('Start a round first to add players', 'warning');
        }
    },

    /**
     * Create new group - opens the group creation/edit modal
     */
    createNewGroup() {
        this.openGroupModal(null); // null = create new
    },

    /**
     * Edit existing group
     */
    editGroup(groupId) {
        const group = this.savedGroups.find(g => g.id === groupId);
        if (!group) {
            NotificationManager?.show?.('Group not found', 'error');
            return;
        }
        this.openGroupModal(group);
    },

    /**
     * Open the group creation/edit modal
     */
    openGroupModal(existingGroup = null) {
        // Create modal if it doesn't exist
        if (!document.getElementById('groupEditModal')) {
            this.createGroupEditModal();
        }

        const modal = document.getElementById('groupEditModal');
        const title = document.getElementById('groupModalTitle');
        const nameInput = document.getElementById('groupNameInput');
        const saveBtn = document.getElementById('saveGroupBtn');
        const searchInput = document.getElementById('groupPlayerSearchInput');
        const searchResults = document.getElementById('groupPlayerSearchResults');

        // Reset state
        this.editingGroupId = existingGroup?.id || null;
        this.selectedGroupMembers = existingGroup?.member_ids ? [...existingGroup.member_ids] : [];
        this.groupMemberProfiles = {}; // Reset profile cache

        // Set title and values
        title.textContent = existingGroup ? 'Edit Group' : 'Create New Group';
        nameInput.value = existingGroup?.group_name || '';
        saveBtn.textContent = existingGroup ? 'Save Changes' : 'Create Group';

        // Clear search
        if (searchInput) searchInput.value = '';
        if (searchResults) searchResults.innerHTML = '';

        // Render components
        this.renderSelectedMembers();
        this.renderBuddyQuickAdd();

        // Show modal
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        nameInput.focus();
    },

    /**
     * Close group edit modal
     */
    closeGroupModal() {
        const modal = document.getElementById('groupEditModal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
        this.editingGroupId = null;
        this.selectedGroupMembers = [];
        this.groupMemberProfiles = {};
    },

    /**
     * Create the group edit modal HTML
     */
    createGroupEditModal() {
        const modalHTML = `
            <div id="groupEditModal" class="fixed inset-0 bg-black bg-opacity-50 hidden overflow-y-auto" style="z-index: 999999;" onclick="event.target.id === 'groupEditModal' && GolfBuddiesSystem.closeGroupModal()">
                <div class="min-h-screen px-2 py-4 sm:p-4 flex items-start sm:items-center justify-center">
                    <div class="bg-white rounded-lg shadow-xl w-full max-w-lg mx-auto" onclick="event.stopPropagation()">
                        <!-- Header -->
                        <div class="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-green-50 to-blue-50 rounded-t-lg">
                            <div class="flex items-center gap-2">
                                <span class="material-symbols-outlined text-green-600">groups_2</span>
                                <h3 id="groupModalTitle" class="text-lg font-bold text-gray-900">Create New Group</h3>
                            </div>
                            <button onclick="GolfBuddiesSystem.closeGroupModal()" class="text-gray-400 hover:text-gray-600 p-1">
                                <span class="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <!-- Content -->
                        <div class="p-4 max-h-[70vh] overflow-y-auto">
                            <!-- Group Name -->
                            <div class="mb-4">
                                <label class="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
                                <input type="text" id="groupNameInput"
                                       placeholder="e.g., Sunday Regulars, Work Crew..."
                                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500">
                            </div>

                            <!-- Selected Members -->
                            <div class="mb-4">
                                <label class="block text-sm font-medium text-gray-700 mb-1">
                                    Group Members <span id="selectedMemberCount" class="text-green-600">(0 selected)</span>
                                </label>
                                <div id="selectedMembersList" class="min-h-[60px] border border-gray-200 rounded-lg p-2 bg-gray-50">
                                    <!-- Populated by renderSelectedMembers() -->
                                </div>
                            </div>

                            <!-- Search Players -->
                            <div class="mb-4">
                                <label class="block text-sm font-medium text-gray-700 mb-1">
                                    <span class="material-symbols-outlined text-sm align-middle">search</span>
                                    Search & Add Players
                                </label>
                                <input type="text" id="groupPlayerSearchInput"
                                       placeholder="Search by name..."
                                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                       onkeyup="GolfBuddiesSystem.searchPlayersForGroup(this.value)">
                                <div id="groupPlayerSearchResults" class="mt-2 max-h-40 overflow-y-auto">
                                    <!-- Search results appear here -->
                                </div>
                            </div>

                            <!-- Quick Add from Buddies -->
                            <div class="mb-4">
                                <label class="block text-sm font-medium text-gray-700 mb-1">
                                    <span class="material-symbols-outlined text-sm align-middle">people</span>
                                    Quick Add from Buddies
                                </label>
                                <div id="groupBuddyQuickAdd" class="flex flex-wrap gap-2">
                                    <!-- Populated by renderBuddyQuickAdd() -->
                                </div>
                            </div>

                            <!-- Info -->
                            <div class="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <div class="flex items-start gap-2 text-sm text-blue-800">
                                    <span class="material-symbols-outlined text-blue-600 text-sm">info</span>
                                    <span>Groups let you quickly load your regular playing partners into a scorecard with one tap.</span>
                                </div>
                            </div>
                        </div>

                        <!-- Footer -->
                        <div class="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
                            <button onclick="GolfBuddiesSystem.closeGroupModal()"
                                    class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                                Cancel
                            </button>
                            <button id="saveGroupBtn" onclick="GolfBuddiesSystem.saveGroup()"
                                    class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
                                Create Group
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    },

    /**
     * Render selected members as removable chips
     */
    async renderSelectedMembers() {
        const container = document.getElementById('selectedMembersList');
        const countSpan = document.getElementById('selectedMemberCount');

        if (!container) return;

        if (this.selectedGroupMembers.length === 0) {
            container.innerHTML = `
                <p class="text-gray-400 text-sm text-center py-2">No members added yet. Search or select from buddies below.</p>
            `;
            if (countSpan) countSpan.textContent = '(0 selected)';
            return;
        }

        // Load member profiles if not cached
        if (!this.groupMemberProfiles) {
            this.groupMemberProfiles = {};
        }

        // Fetch profiles for members we don't have cached
        const missingIds = this.selectedGroupMembers.filter(id => !this.groupMemberProfiles[id]);
        if (missingIds.length > 0) {
            const { data: profiles } = await window.SupabaseDB.client
                .from('user_profiles')
                .select('line_user_id, name, profile_data')
                .in('line_user_id', missingIds);

            if (profiles) {
                profiles.forEach(p => {
                    this.groupMemberProfiles[p.line_user_id] = p;
                });
            }
        }

        const html = this.selectedGroupMembers.map(memberId => {
            const profile = this.groupMemberProfiles[memberId];
            const name = profile?.name || 'Unknown';
            const handicapValue = profile?.profile_data?.golfInfo?.handicap ?? profile?.profile_data?.handicap;
            const handicap = handicapValue !== null && handicapValue !== undefined ? (typeof window.formatHandicapDisplay === 'function' ? window.formatHandicapDisplay(handicapValue) : parseFloat(handicapValue).toFixed(1)) : '-';

            return `
                <div class="flex items-center justify-between p-2 bg-white border border-gray-200 rounded-lg mb-2">
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
                            ${name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div class="font-medium text-gray-900 text-sm">${name}</div>
                            <div class="text-xs text-gray-500">HCP: ${handicap}</div>
                        </div>
                    </div>
                    <button onclick="GolfBuddiesSystem.removeGroupMember('${memberId}')"
                            class="p-1 text-red-500 hover:bg-red-50 rounded-full" title="Remove">
                        <span class="material-symbols-outlined text-sm">close</span>
                    </button>
                </div>
            `;
        }).join('');

        container.innerHTML = html;

        if (countSpan) {
            countSpan.textContent = `(${this.selectedGroupMembers.length} selected)`;
        }
    },

    /**
     * Render buddy quick-add buttons
     */
    renderBuddyQuickAdd() {
        const container = document.getElementById('groupBuddyQuickAdd');
        if (!container) return;

        if (this.buddies.length === 0) {
            container.innerHTML = '<p class="text-gray-400 text-xs">No buddies yet</p>';
            return;
        }

        const html = this.buddies.map(buddy => {
            const buddyProfile = buddy.buddy?.[0];
            const name = buddyProfile?.name || 'Unknown';
            const isSelected = this.selectedGroupMembers.includes(buddy.buddy_id);

            // Cache the profile
            if (buddyProfile && !this.groupMemberProfiles?.[buddy.buddy_id]) {
                if (!this.groupMemberProfiles) this.groupMemberProfiles = {};
                this.groupMemberProfiles[buddy.buddy_id] = buddyProfile;
            }

            if (isSelected) {
                return `
                    <span class="inline-flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-xs">
                        <span class="material-symbols-outlined text-xs">check</span>
                        ${name}
                    </span>
                `;
            }

            return `
                <button onclick="GolfBuddiesSystem.addGroupMember('${buddy.buddy_id}')"
                        class="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 rounded-full text-xs hover:bg-gray-50 hover:border-green-500">
                    <span class="material-symbols-outlined text-xs">add</span>
                    ${name}
                </button>
            `;
        }).join('');

        container.innerHTML = html;
    },

    /**
     * Search players for group (from directory)
     */
    async searchPlayersForGroup(query) {
        const container = document.getElementById('groupPlayerSearchResults');
        if (!container) return;

        if (!query || query.trim().length < 2) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = '<p class="text-gray-500 text-xs py-2">Searching...</p>';

        try {
            const searchWords = query.trim().split(/\s+/).filter(w => w.length > 0);
            let dbQuery = window.SupabaseDB.client
                .from('user_profiles')
                .select('line_user_id, name, profile_data');

            if (searchWords.length === 1) {
                dbQuery = dbQuery.ilike('name', `%${searchWords[0]}%`);
            } else if (searchWords.length === 2) {
                const word1 = searchWords[0];
                const word2 = searchWords[1];
                dbQuery = dbQuery.or(`name.ilike.%${word1} ${word2}%,name.ilike.%${word2}, ${word1}%,name.ilike.%${word2} ${word1}%`);
            } else {
                dbQuery = dbQuery.ilike('name', `%${query}%`);
            }

            const { data, error } = await dbQuery.limit(10);

            if (error || !data || data.length === 0) {
                container.innerHTML = '<p class="text-gray-500 text-xs py-2">No players found</p>';
                return;
            }

            // Filter out current user and already selected members
            const filtered = data.filter(p =>
                p.line_user_id !== this.currentUserId &&
                !this.selectedGroupMembers.includes(p.line_user_id)
            );

            if (filtered.length === 0) {
                container.innerHTML = '<p class="text-gray-500 text-xs py-2">No new players found</p>';
                return;
            }

            const html = filtered.map(player => {
                const name = (player.name || 'Unknown').replace(/'/g, '&apos;');
                const handicapValue = player.profile_data?.golfInfo?.handicap ?? player.profile_data?.handicap;
                const handicap = handicapValue !== null && handicapValue !== undefined ? (typeof window.formatHandicapDisplay === 'function' ? window.formatHandicapDisplay(handicapValue) : parseFloat(handicapValue).toFixed(1)) : '-';

                // Cache the profile
                if (!this.groupMemberProfiles) this.groupMemberProfiles = {};
                this.groupMemberProfiles[player.line_user_id] = player;

                return `
                    <div class="flex items-center justify-between p-2 bg-white border border-gray-200 rounded-lg mb-1 hover:border-green-400">
                        <div class="flex items-center gap-2">
                            <div class="w-7 h-7 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white font-bold text-xs">
                                ${name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div class="font-medium text-gray-900 text-sm">${name}</div>
                                <div class="text-xs text-gray-500">HCP: ${handicap}</div>
                            </div>
                        </div>
                        <button onclick="GolfBuddiesSystem.addGroupMember('${player.line_user_id}')"
                                class="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700">
                            <span class="material-symbols-outlined text-xs">add</span> Add
                        </button>
                    </div>
                `;
            }).join('');

            container.innerHTML = html;

        } catch (error) {
            console.error('[Buddies] Search error:', error);
            container.innerHTML = '<p class="text-red-500 text-xs py-2">Search error</p>';
        }
    },

    /**
     * Add member to group
     */
    addGroupMember(memberId) {
        if (!this.selectedGroupMembers.includes(memberId)) {
            this.selectedGroupMembers.push(memberId);
            this.renderSelectedMembers();
            this.renderBuddyQuickAdd();
            // Clear search results
            const searchInput = document.getElementById('groupPlayerSearchInput');
            const searchResults = document.getElementById('groupPlayerSearchResults');
            if (searchInput) searchInput.value = '';
            if (searchResults) searchResults.innerHTML = '';
        }
    },

    /**
     * Remove member from group
     */
    removeGroupMember(memberId) {
        const index = this.selectedGroupMembers.indexOf(memberId);
        if (index > -1) {
            this.selectedGroupMembers.splice(index, 1);
            this.renderSelectedMembers();
            this.renderBuddyQuickAdd();
        }
    },

    /**
     * Toggle member selection in group (legacy - kept for compatibility)
     */
    toggleGroupMember(memberId) {
        if (this.selectedGroupMembers.includes(memberId)) {
            this.removeGroupMember(memberId);
        } else {
            this.addGroupMember(memberId);
        }
    },

    /**
     * Save group (create or update)
     */
    async saveGroup() {
        const nameInput = document.getElementById('groupNameInput');
        const groupName = nameInput?.value?.trim();

        // Validation
        if (!groupName) {
            NotificationManager?.show?.('Please enter a group name', 'warning');
            nameInput?.focus();
            return;
        }

        if (this.selectedGroupMembers.length === 0) {
            NotificationManager?.show?.('Please select at least one member', 'warning');
            return;
        }

        try {
            if (this.editingGroupId) {
                // Update existing group
                const { error } = await window.SupabaseDB.client
                    .from('saved_groups')
                    .update({
                        group_name: groupName,
                        member_ids: this.selectedGroupMembers,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', this.editingGroupId);

                if (error) {
                    console.error('[Buddies] Error updating group:', error);
                    NotificationManager?.show?.('Error updating group', 'error');
                    return;
                }

                NotificationManager?.show?.('Group updated successfully!', 'success');
            } else {
                // Create new group
                const { error } = await window.SupabaseDB.client
                    .from('saved_groups')
                    .insert({
                        user_id: this.currentUserId,
                        group_name: groupName,
                        member_ids: this.selectedGroupMembers
                    });

                if (error) {
                    console.error('[Buddies] Error creating group:', error);
                    NotificationManager?.show?.('Error creating group', 'error');
                    return;
                }

                NotificationManager?.show?.('Group created successfully!', 'success');
            }

            // Reload and refresh UI
            await this.loadSavedGroups();
            this.closeGroupModal();
            this.renderSavedGroups();

        } catch (error) {
            console.error('[Buddies] Exception saving group:', error);
            NotificationManager?.show?.('Error saving group', 'error');
        }
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
     * Load all group members to the current scorecard
     */
    async loadGroupToScorecard(groupId) {
        const group = this.savedGroups.find(g => g.id === groupId);
        if (!group) {
            NotificationManager?.show?.('Group not found', 'error');
            return;
        }

        // Check if LiveScorecardManager is available
        if (typeof LiveScorecardManager === 'undefined' || !LiveScorecardManager.players) {
            NotificationManager?.show?.('Start a round first to load the group', 'warning');
            return;
        }

        try {
            // Ensure profiles are loaded
            if (!LiveScorecardManager.allPlayerProfiles || LiveScorecardManager.allPlayerProfiles.length === 0) {
                console.log('[Buddies] Loading player profiles for group load...');
                LiveScorecardManager.allPlayerProfiles = await window.SupabaseDB.getAllProfiles();
            }

            // Get current player IDs already in the scorecard
            const existingIds = new Set(LiveScorecardManager.players.map(p => p.id));
            let addedCount = 0;
            let skippedCount = 0;

            // Add each member from the group
            for (const memberId of group.member_ids) {
                if (existingIds.has(memberId)) {
                    console.log(`[Buddies] Skipping ${memberId} - already in scorecard`);
                    skippedCount++;
                    continue;
                }

                // Use the existing selectExistingPlayer method
                LiveScorecardManager.selectExistingPlayer(memberId);
                addedCount++;
            }

            // Update last_used timestamp
            await window.SupabaseDB.client
                .from('saved_groups')
                .update({ last_used: new Date().toISOString() })
                .eq('id', groupId);

            // Reload groups to update UI
            await this.loadSavedGroups();

            // Close the buddies modal
            this.closeBuddiesModal();

            // Show result
            if (addedCount > 0) {
                const totalPlayers = LiveScorecardManager.players.length;
                let message = `Added ${addedCount} player${addedCount !== 1 ? 's' : ''} from "${group.group_name}"`;
                if (skippedCount > 0) {
                    message += ` (${skippedCount} already in round)`;
                }
                message += ` - ${totalPlayers} total`;
                NotificationManager?.show?.(message, 'success');
            } else if (skippedCount > 0) {
                NotificationManager?.show?.(`All ${skippedCount} members already in the round`, 'info');
            }

        } catch (error) {
            console.error('[Buddies] Error loading group:', error);
            NotificationManager?.show?.('Error loading group to scorecard', 'error');
        }
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
