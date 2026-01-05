// ============================================================================
// SOCIETY DASHBOARD ENHANCED
// ============================================================================
// Created: 2025-12-11
// Purpose: Unified Society Dashboard with all new features integrated
// Features:
//   - Time-windowed leaderboards (Daily/Weekly/Monthly/Yearly)
//   - Tournament series management (FedEx Cup style)
//   - Global player directory
//   - Course handicap calculations
//   - Member management
// ============================================================================

class SocietyDashboardEnhanced {
    constructor() {
        this.supabase = null;
        this.currentUserId = null;
        this.currentSociety = null;
        this.isOrganizer = false;
        this.activeTab = 'overview';
    }

    async init(supabaseClient, userId, societyId) {
        this.supabase = supabaseClient;
        this.currentUserId = userId;
        this.currentSociety = societyId;

        // Check if user is organizer
        await this.checkOrganizerStatus();

        // Initialize sub-systems
        if (window.timeWindowedLeaderboards) {
            await window.timeWindowedLeaderboards.init(supabaseClient, userId, societyId);
        }
        if (window.tournamentSeriesManager) {
            await window.tournamentSeriesManager.init(supabaseClient, userId, societyId);
        }
        if (window.globalPlayerDirectory) {
            await window.globalPlayerDirectory.init(supabaseClient, userId);
        }
        if (window.courseDataManager) {
            await window.courseDataManager.init(supabaseClient);
        }
        if (window.unifiedPlayerService) {
            await window.unifiedPlayerService.init(supabaseClient, userId);
        }

        console.log('[SocietyDashboardEnhanced] Initialized');
    }

    async checkOrganizerStatus() {
        const { data, error } = await this.supabase
            .from('society_members')
            .select('role')
            .eq('golfer_id', this.currentUserId)
            .eq('society_id', this.currentSociety)
            .single();

        this.isOrganizer = data?.role === 'organizer' || data?.role === 'admin';
    }

    // =========================================================================
    // RENDER MAIN DASHBOARD
    // =========================================================================

    renderDashboard(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="min-h-screen bg-gray-100">
                <!-- Header -->
                <div class="bg-gradient-to-r from-emerald-600 to-emerald-700 px-4 py-6 text-white">
                    <h1 class="text-2xl font-bold">Society Dashboard</h1>
                    <p class="text-emerald-100 text-sm" id="society-name-header">Loading...</p>
                </div>

                <!-- Navigation Tabs -->
                <div class="bg-white shadow-sm sticky top-0 z-10">
                    <div class="flex overflow-x-auto" id="dashboard-tabs">
                        ${this.renderTabButtons()}
                    </div>
                </div>

                <!-- Content Area -->
                <div class="p-4" id="dashboard-content">
                    <!-- Content loaded dynamically -->
                </div>
            </div>
        `;

        this.loadSocietyInfo();
        this.switchTab('overview');
    }

    renderTabButtons() {
        const tabs = [
            { id: 'overview', label: 'Overview', icon: 'dashboard' },
            { id: 'standings', label: 'Standings', icon: 'leaderboard' },
            { id: 'series', label: 'Series', icon: 'emoji_events' },
            { id: 'events', label: 'Events', icon: 'event' },
            { id: 'members', label: 'Members', icon: 'groups' },
            { id: 'players', label: 'Find Players', icon: 'person_search' }
        ];

        return tabs.map(tab => `
            <button onclick="societyDashboardEnhanced.switchTab('${tab.id}')"
                    id="tab-${tab.id}"
                    class="flex items-center gap-2 px-4 py-3 border-b-2 whitespace-nowrap transition-colors
                           ${tab.id === this.activeTab ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-600 hover:text-gray-800'}">
                <i class="material-symbols-outlined text-xl">${tab.icon}</i>
                <span class="text-sm font-medium">${tab.label}</span>
            </button>
        `).join('');
    }

    async switchTab(tabId) {
        this.activeTab = tabId;

        // Update tab styles
        document.querySelectorAll('[id^="tab-"]').forEach(tab => {
            if (tab.id === `tab-${tabId}`) {
                tab.classList.add('border-emerald-600', 'text-emerald-600');
                tab.classList.remove('border-transparent', 'text-gray-600');
            } else {
                tab.classList.remove('border-emerald-600', 'text-emerald-600');
                tab.classList.add('border-transparent', 'text-gray-600');
            }
        });

        // Load content
        const content = document.getElementById('dashboard-content');
        if (!content) return;

        content.innerHTML = '<div class="text-center py-8"><div class="animate-spin w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full mx-auto"></div></div>';

        switch (tabId) {
            case 'overview':
                await this.renderOverviewTab(content);
                break;
            case 'standings':
                await this.renderStandingsTab(content);
                break;
            case 'series':
                await this.renderSeriesTab(content);
                break;
            case 'events':
                await this.renderEventsTab(content);
                break;
            case 'members':
                await this.renderMembersTab(content);
                break;
            case 'players':
                await this.renderPlayersTab(content);
                break;
        }
    }

    async loadSocietyInfo() {
        const { data, error } = await this.supabase
            .from('societies')
            .select('*')
            .eq('id', this.currentSociety)
            .single();

        if (data) {
            const header = document.getElementById('society-name-header');
            if (header) header.textContent = data.name || 'Unknown Society';
        }
    }

    // =========================================================================
    // OVERVIEW TAB
    // =========================================================================

    async renderOverviewTab(container) {
        // Get quick stats
        const [membersResult, eventsResult, standingsResult] = await Promise.all([
            this.getMemberCount(),
            this.getUpcomingEvents(3),
            window.timeWindowedLeaderboards?.getWeeklyStandings() || { success: false }
        ]);

        container.innerHTML = `
            <div class="space-y-6">
                <!-- Quick Stats -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div class="bg-white rounded-xl p-4 shadow">
                        <div class="flex items-center gap-3">
                            <div class="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                                <i class="material-symbols-outlined text-emerald-600">groups</i>
                            </div>
                            <div>
                                <div class="text-2xl font-bold text-gray-800">${membersResult.count || 0}</div>
                                <div class="text-xs text-gray-500">Members</div>
                            </div>
                        </div>
                    </div>
                    <div class="bg-white rounded-xl p-4 shadow">
                        <div class="flex items-center gap-3">
                            <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                <i class="material-symbols-outlined text-blue-600">event</i>
                            </div>
                            <div>
                                <div class="text-2xl font-bold text-gray-800">${eventsResult.events?.length || 0}</div>
                                <div class="text-xs text-gray-500">Upcoming</div>
                            </div>
                        </div>
                    </div>
                    <div class="bg-white rounded-xl p-4 shadow">
                        <div class="flex items-center gap-3">
                            <div class="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                                <i class="material-symbols-outlined text-teal-600">leaderboard</i>
                            </div>
                            <div>
                                <div class="text-2xl font-bold text-gray-800">${standingsResult.standings?.length || 0}</div>
                                <div class="text-xs text-gray-500">Active Players</div>
                            </div>
                        </div>
                    </div>
                    <div class="bg-white rounded-xl p-4 shadow cursor-pointer hover:shadow-md" onclick="societyDashboardEnhanced.switchTab('series')">
                        <div class="flex items-center gap-3">
                            <div class="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                                <i class="material-symbols-outlined text-yellow-600">emoji_events</i>
                            </div>
                            <div>
                                <div class="text-2xl font-bold text-gray-800">Series</div>
                                <div class="text-xs text-gray-500">FedEx Cup</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- This Week's Standings -->
                <div id="overview-weekly-standings"></div>

                <!-- Upcoming Events -->
                <div id="overview-upcoming-events"></div>

                ${this.isOrganizer ? `
                    <!-- Organizer Quick Actions -->
                    <div class="bg-white rounded-xl shadow p-4">
                        <h3 class="font-bold text-gray-800 mb-4">
                            <i class="material-symbols-outlined text-emerald-600 align-middle mr-1">admin_panel_settings</i>
                            Organizer Actions
                        </h3>
                        <div class="grid grid-cols-2 gap-3">
                            <button onclick="societyDashboardEnhanced.showCreateEventModal()"
                                    class="flex items-center gap-2 p-3 bg-emerald-50 rounded-lg text-emerald-700 hover:bg-emerald-100">
                                <i class="material-symbols-outlined">add_circle</i>
                                <span class="text-sm font-medium">Create Event</span>
                            </button>
                            <button onclick="societyDashboardEnhanced.showCreateSeriesModal()"
                                    class="flex items-center gap-2 p-3 bg-teal-50 rounded-lg text-teal-700 hover:bg-teal-100">
                                <i class="material-symbols-outlined">emoji_events</i>
                                <span class="text-sm font-medium">Create Series</span>
                            </button>
                            <button onclick="societyDashboardEnhanced.showInviteMemberModal()"
                                    class="flex items-center gap-2 p-3 bg-blue-50 rounded-lg text-blue-700 hover:bg-blue-100">
                                <i class="material-symbols-outlined">person_add</i>
                                <span class="text-sm font-medium">Invite Member</span>
                            </button>
                            <button onclick="societyDashboardEnhanced.showAnnouncementModal()"
                                    class="flex items-center gap-2 p-3 bg-orange-50 rounded-lg text-orange-700 hover:bg-orange-100">
                                <i class="material-symbols-outlined">campaign</i>
                                <span class="text-sm font-medium">Announcement</span>
                            </button>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;

        // Render weekly standings
        if (standingsResult.success && window.timeWindowedLeaderboards) {
            window.timeWindowedLeaderboards.renderStandingsTable(
                standingsResult.standings.slice(0, 10),
                'overview-weekly-standings',
                { title: "This Week's Top 10", highlightPlayerId: this.currentUserId }
            );
        }

        // Render upcoming events
        this.renderUpcomingEventsList('overview-upcoming-events', eventsResult.events || []);
    }

    // =========================================================================
    // STANDINGS TAB
    // =========================================================================

    async renderStandingsTab(container) {
        container.innerHTML = `
            <div class="space-y-4">
                <!-- Period Tabs -->
                <div id="standings-period-tabs"></div>

                <!-- Standings Table -->
                <div id="standings-container"></div>

                <!-- Movers & Shakers -->
                <div id="movers-container"></div>
            </div>
        `;

        if (window.timeWindowedLeaderboards) {
            window.timeWindowedLeaderboards.renderPeriodTabs('standings-period-tabs', async (periodId) => {
                await window.timeWindowedLeaderboards.loadAndRenderPeriod(periodId, 'standings-container');

                // Load movers for this period
                const moversResult = await window.timeWindowedLeaderboards.getMoversAndShakers(periodId);
                if (moversResult.success && moversResult.movers.length > 0) {
                    this.renderMovers('movers-container', moversResult.movers);
                }
            });

            // Load initial standings
            await window.timeWindowedLeaderboards.loadAndRenderPeriod('weekly', 'standings-container');
        }
    }

    renderMovers(containerId, movers) {
        const container = document.getElementById(containerId);
        if (!container || !movers.length) return;

        const climbers = movers.filter(m => m.rank_change > 0).slice(0, 5);
        const fallers = movers.filter(m => m.rank_change < 0).slice(0, 5);

        container.innerHTML = `
            <div class="grid md:grid-cols-2 gap-4">
                <!-- Climbers -->
                <div class="bg-white rounded-xl shadow p-4">
                    <h3 class="font-bold text-emerald-600 mb-3 flex items-center gap-2">
                        <i class="material-symbols-outlined">trending_up</i>
                        Hot Climbers
                    </h3>
                    ${climbers.length > 0 ? `
                        <div class="space-y-2">
                            ${climbers.map(p => `
                                <div class="flex items-center justify-between py-2">
                                    <span class="font-medium">${p.player_name}</span>
                                    <span class="text-emerald-600 font-bold">↑${p.rank_change}</span>
                                </div>
                            `).join('')}
                        </div>
                    ` : '<p class="text-gray-500 text-sm">No climbers this period</p>'}
                </div>

                <!-- Fallers -->
                <div class="bg-white rounded-xl shadow p-4">
                    <h3 class="font-bold text-red-600 mb-3 flex items-center gap-2">
                        <i class="material-symbols-outlined">trending_down</i>
                        Dropping
                    </h3>
                    ${fallers.length > 0 ? `
                        <div class="space-y-2">
                            ${fallers.map(p => `
                                <div class="flex items-center justify-between py-2">
                                    <span class="font-medium">${p.player_name}</span>
                                    <span class="text-red-600 font-bold">↓${Math.abs(p.rank_change)}</span>
                                </div>
                            `).join('')}
                        </div>
                    ` : '<p class="text-gray-500 text-sm">No drops this period</p>'}
                </div>
            </div>
        `;
    }

    // =========================================================================
    // SERIES TAB
    // =========================================================================

    async renderSeriesTab(container) {
        container.innerHTML = `
            <div class="space-y-4">
                <!-- Active Series -->
                <div id="active-series-container"></div>

                <!-- Series Standings -->
                <div id="series-standings-container"></div>

                <!-- Series Events -->
                <div id="series-events-container"></div>

                ${this.isOrganizer ? `
                    <button onclick="societyDashboardEnhanced.showCreateSeriesModal()"
                            class="w-full py-3 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700">
                        <i class="material-symbols-outlined align-middle mr-1">add</i>
                        Create New Series
                    </button>
                ` : ''}
            </div>
        `;

        if (window.tournamentSeriesManager) {
            // Get active series
            const seriesResult = await window.tournamentSeriesManager.getActiveSeries();

            if (seriesResult.success && seriesResult.series) {
                window.tournamentSeriesManager.renderSeriesOverview('active-series-container', seriesResult.series);

                // Get standings
                const standingsResult = await window.tournamentSeriesManager.getSeriesStandings(seriesResult.series.id);
                if (standingsResult.success) {
                    window.tournamentSeriesManager.renderStandingsTable(
                        'series-standings-container',
                        standingsResult.standings,
                        { title: 'Season Standings', highlightPlayerId: this.currentUserId, showProjections: true }
                    );
                }

                // Get events
                const eventsResult = await window.tournamentSeriesManager.getSeriesEvents(seriesResult.series.id);
                if (eventsResult.success) {
                    window.tournamentSeriesManager.renderEventSchedule('series-events-container', eventsResult.events);
                }
            } else {
                document.getElementById('active-series-container').innerHTML = `
                    <div class="text-center py-8 text-gray-500">
                        <i class="material-symbols-outlined text-5xl mb-3">emoji_events</i>
                        <p class="text-lg">No Active Series</p>
                        <p class="text-sm">Create a new season series to start tracking points</p>
                    </div>
                `;
            }
        }
    }

    // =========================================================================
    // EVENTS TAB
    // =========================================================================

    async renderEventsTab(container) {
        const eventsResult = await this.getUpcomingEvents(20);

        container.innerHTML = `
            <div class="space-y-4">
                ${this.isOrganizer ? `
                    <button onclick="societyDashboardEnhanced.showCreateEventModal()"
                            class="w-full py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700">
                        <i class="material-symbols-outlined align-middle mr-1">add</i>
                        Create Event
                    </button>
                ` : ''}

                <div id="events-list-container"></div>
            </div>
        `;

        this.renderEventsList('events-list-container', eventsResult.events || []);
    }

    // =========================================================================
    // MEMBERS TAB
    // =========================================================================

    async renderMembersTab(container) {
        container.innerHTML = `
            <div class="space-y-4">
                <!-- Search -->
                <div class="bg-white rounded-xl shadow p-4">
                    <div class="relative">
                        <i class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</i>
                        <input type="text" id="member-search-input" placeholder="Search members..."
                               class="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg"
                               oninput="societyDashboardEnhanced.filterMembers(this.value)">
                    </div>
                </div>

                <!-- Members List -->
                <div id="members-list-container"></div>
            </div>
        `;

        await this.loadMembers();
    }

    async loadMembers() {
        const { data, error } = await this.supabase
            .from('society_members')
            .select(`
                *,
                user_profiles!golfer_id (name, profile_data)
            `)
            .eq('society_id', this.currentSociety)
            .eq('status', 'active')
            .order('joined_at', { ascending: false });

        this.currentMembers = data || [];
        this.renderMembersList('members-list-container', this.currentMembers);
    }

    renderMembersList(containerId, members) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (!members || members.length === 0) {
            container.innerHTML = '<p class="text-center text-gray-500 py-8">No members found</p>';
            return;
        }

        container.innerHTML = `
            <div class="bg-white rounded-xl shadow divide-y divide-gray-100">
                ${members.map(member => {
                    const profile = member.user_profiles || {};
                    const name = profile.name || member.golfer_name || 'Unknown';
                    const handicap = profile.profile_data?.golfInfo?.handicap || profile.profile_data?.handicap || '-';
                    const roleColors = {
                        'organizer': 'bg-teal-100 text-teal-700',
                        'admin': 'bg-red-100 text-red-700',
                        'member': 'bg-gray-100 text-gray-600'
                    };

                    return `
                        <div class="p-4 flex items-center gap-3">
                            <div class="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
                                ${name[0].toUpperCase()}
                            </div>
                            <div class="flex-1">
                                <div class="font-medium text-gray-800">${name}</div>
                                <div class="text-sm text-gray-500">HCP: ${handicap}</div>
                            </div>
                            <span class="px-2 py-1 rounded-full text-xs font-medium ${roleColors[member.role] || roleColors['member']}">
                                ${member.role || 'Member'}
                            </span>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    filterMembers(query) {
        if (!this.currentMembers) return;

        const filtered = this.currentMembers.filter(m => {
            const name = m.user_profiles?.name || m.golfer_name || '';
            return name.toLowerCase().includes(query.toLowerCase());
        });

        this.renderMembersList('members-list-container', filtered);
    }

    // =========================================================================
    // PLAYERS TAB (Global Directory)
    // =========================================================================

    async renderPlayersTab(container) {
        container.innerHTML = `
            <div class="space-y-4">
                <!-- Search Box -->
                <div id="player-search-box"></div>

                <!-- Analytics -->
                <div id="player-analytics"></div>

                <!-- Player List -->
                <div id="player-list-container"></div>
            </div>
        `;

        if (window.globalPlayerDirectory) {
            window.globalPlayerDirectory.renderSearchBox('player-search-box');
            await window.globalPlayerDirectory.renderAnalytics('player-analytics');
            await window.globalPlayerDirectory.performSearch();
        }
    }

    // =========================================================================
    // HELPER METHODS
    // =========================================================================

    async getMemberCount() {
        const { count, error } = await this.supabase
            .from('society_members')
            .select('*', { count: 'exact', head: true })
            .eq('society_id', this.currentSociety)
            .eq('status', 'active');

        return { count: count || 0 };
    }

    async getUpcomingEvents(limit = 10) {
        const { data, error } = await this.supabase
            .from('society_events')
            .select('*')
            .eq('society_id', this.currentSociety)
            .gte('event_date', new Date().toISOString().split('T')[0])
            .order('event_date', { ascending: true })
            .limit(limit);

        return { events: data || [] };
    }

    renderUpcomingEventsList(containerId, events) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (!events || events.length === 0) {
            container.innerHTML = `
                <div class="bg-white rounded-xl shadow p-4 text-center text-gray-500">
                    <i class="material-symbols-outlined text-3xl mb-2">event_busy</i>
                    <p>No upcoming events</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="bg-white rounded-xl shadow overflow-hidden">
                <div class="px-4 py-3 border-b bg-gray-50">
                    <h3 class="font-bold text-gray-800">Upcoming Events</h3>
                </div>
                <div class="divide-y divide-gray-100">
                    ${events.map(event => {
                        const date = new Date(event.event_date);
                        return `
                            <div class="p-4 flex items-center gap-4 hover:bg-gray-50 cursor-pointer"
                                 onclick="societyDashboardEnhanced.showEventDetails('${event.id}')">
                                <div class="text-center w-14">
                                    <div class="text-2xl font-bold text-emerald-600">${date.getDate()}</div>
                                    <div class="text-xs text-gray-500">${date.toLocaleDateString('en-US', { month: 'short' })}</div>
                                </div>
                                <div class="flex-1">
                                    <div class="font-medium text-gray-800">${event.event_name || 'Untitled Event'}</div>
                                    <div class="text-sm text-gray-500">${event.course_name || 'TBD'}</div>
                                </div>
                                <i class="material-symbols-outlined text-gray-400">chevron_right</i>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    renderEventsList(containerId, events) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (!events || events.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12 text-gray-500">
                    <i class="material-symbols-outlined text-5xl mb-3">event</i>
                    <p class="text-lg">No Events Scheduled</p>
                    ${this.isOrganizer ? '<p class="text-sm">Create your first event to get started</p>' : ''}
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="space-y-3">
                ${events.map(event => {
                    const date = new Date(event.event_date);
                    const isToday = date.toDateString() === new Date().toDateString();

                    return `
                        <div class="bg-white rounded-xl shadow p-4 ${isToday ? 'ring-2 ring-emerald-500' : ''}">
                            <div class="flex items-start gap-4">
                                <div class="text-center bg-emerald-50 rounded-lg p-2 min-w-[60px]">
                                    <div class="text-2xl font-bold text-emerald-600">${date.getDate()}</div>
                                    <div class="text-xs text-emerald-700">${date.toLocaleDateString('en-US', { month: 'short' })}</div>
                                </div>
                                <div class="flex-1">
                                    <h4 class="font-semibold text-gray-800">${event.event_name || 'Untitled'}</h4>
                                    <p class="text-sm text-gray-500">${event.course_name || 'Course TBD'}</p>
                                    <div class="flex items-center gap-3 mt-2 text-xs text-gray-400">
                                        ${event.tee_time ? `<span><i class="material-symbols-outlined text-sm align-middle">schedule</i> ${event.tee_time}</span>` : ''}
                                        ${event.format ? `<span><i class="material-symbols-outlined text-sm align-middle">sports_golf</i> ${event.format}</span>` : ''}
                                    </div>
                                </div>
                                ${isToday ? '<span class="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full font-medium">TODAY</span>' : ''}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    // =========================================================================
    // MODALS (Placeholders - integrate with existing modal systems)
    // =========================================================================

    showCreateEventModal() {
        // Use existing event creation modal or create new one
        console.log('Show create event modal');
        alert('Create Event - integrate with existing society-golf-system.js modal');
    }

    showCreateSeriesModal() {
        console.log('Show create series modal');
        alert('Create Series - new feature modal needed');
    }

    showInviteMemberModal() {
        console.log('Show invite member modal');
        alert('Invite Member - integrate with existing system');
    }

    showAnnouncementModal() {
        console.log('Show announcement modal');
        alert('Announcement - integrate with messaging system');
    }

    showEventDetails(eventId) {
        console.log('Show event details:', eventId);
        // Navigate to event details view
    }
}

// Global instance
window.societyDashboardEnhanced = new SocietyDashboardEnhanced();
