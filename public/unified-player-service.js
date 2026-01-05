// ============================================================================
// UNIFIED PLAYER SERVICE
// ============================================================================
// Created: 2025-12-11
// Purpose: Unified access to player profiles from user_profiles + profiles tables
// ============================================================================

class UnifiedPlayerService {
    constructor() {
        this.supabase = null;
        this.currentUserId = null;
        this.profileCache = new Map();
        this.cacheDuration = 2 * 60 * 1000; // 2 minutes
    }

    async init(supabaseClient, userId) {
        this.supabase = supabaseClient;
        this.currentUserId = userId;
        console.log('[UnifiedPlayerService] Initialized');
    }

    // =========================================================================
    // GET PROFILE
    // =========================================================================

    async getProfile(playerId = null) {
        const pid = playerId || this.currentUserId;

        // Check cache
        const cached = this.profileCache.get(pid);
        if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
            return { success: true, profile: cached.data };
        }

        const { data, error } = await this.supabase.rpc('get_full_player_profile', {
            p_player_id: pid
        });

        if (error) {
            console.error('[UnifiedPlayerService] Get profile error:', error);
            return { success: false, error: error.message };
        }

        if (data) {
            this.profileCache.set(pid, { data, timestamp: Date.now() });
        }

        return { success: true, profile: data };
    }

    async getProfileCompleteness(playerId = null) {
        const pid = playerId || this.currentUserId;

        const { data, error } = await this.supabase.rpc('calculate_profile_completeness', {
            p_player_id: pid
        });

        if (error) {
            console.error('[UnifiedPlayerService] Completeness error:', error);
            return { success: false, error: error.message };
        }

        return { success: true, completeness: data };
    }

    // =========================================================================
    // UPDATE PROFILE
    // =========================================================================

    async updateProfile(updates) {
        const { data, error } = await this.supabase.rpc('update_player_profile', {
            p_player_id: this.currentUserId,
            p_updates: updates
        });

        if (error) {
            console.error('[UnifiedPlayerService] Update error:', error);
            return { success: false, error: error.message };
        }

        // Clear cache
        this.profileCache.delete(this.currentUserId);

        return { success: true, profile: data };
    }

    async updateHandicap(handicapIndex) {
        return this.updateProfile({
            profile_data: {
                golfInfo: { handicap: handicapIndex.toString() }
            }
        });
    }

    async updateHomeCourse(courseId, courseName) {
        return this.updateProfile({
            home_course_id: courseId,
            home_course_name: courseName
        });
    }

    async updatePreferredTee(teeName) {
        return this.updateProfile({
            profile_data: {
                golfInfo: { preferredTee: teeName }
            }
        });
    }

    // =========================================================================
    // SEARCH PROFILES
    // =========================================================================

    async searchProfiles(query, options = {}) {
        const {
            society = null,
            handicapMin = null,
            handicapMax = null,
            hasRounds = null,
            limit = 50,
            offset = 0
        } = options;

        const { data, error } = await this.supabase.rpc('search_unified_profiles', {
            p_search_query: query || null,
            p_society_filter: society,
            p_handicap_min: handicapMin,
            p_handicap_max: handicapMax,
            p_has_rounds: hasRounds,
            p_limit: limit,
            p_offset: offset
        });

        if (error) {
            console.error('[UnifiedPlayerService] Search error:', error);
            return { success: false, error: error.message };
        }

        return { success: true, profiles: data || [] };
    }

    // =========================================================================
    // STATISTICS
    // =========================================================================

    async getProfileStats() {
        const { data, error } = await this.supabase.rpc('get_profile_stats_summary');

        if (error) {
            console.error('[UnifiedPlayerService] Stats error:', error);
            return { success: false, error: error.message };
        }

        return { success: true, stats: data };
    }

    // =========================================================================
    // SYNC PROFILES
    // =========================================================================

    async syncProfiles() {
        const { data, error } = await this.supabase.rpc('sync_player_profiles');

        if (error) {
            console.error('[UnifiedPlayerService] Sync error:', error);
            return { success: false, error: error.message };
        }

        return { success: true, result: data };
    }

    // =========================================================================
    // PLAYER STATISTICS HELPERS
    // =========================================================================

    async getPlayerRounds(playerId = null, limit = 20) {
        const pid = playerId || this.currentUserId;

        const { data, error } = await this.supabase
            .from('rounds')
            .select('*')
            .eq('golfer_id', pid)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('[UnifiedPlayerService] Rounds error:', error);
            return { success: false, error: error.message };
        }

        return { success: true, rounds: data || [] };
    }

    async getPlayerScoringTrends(playerId = null, months = 6) {
        const pid = playerId || this.currentUserId;

        const { data, error } = await this.supabase
            .from('rounds')
            .select('total_gross, created_at')
            .eq('golfer_id', pid)
            .not('total_gross', 'is', null)
            .gte('created_at', new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000).toISOString())
            .order('created_at', { ascending: true });

        if (error) {
            console.error('[UnifiedPlayerService] Trends error:', error);
            return { success: false, error: error.message };
        }

        // Group by month
        const monthlyData = {};
        data?.forEach(round => {
            const month = new Date(round.created_at).toISOString().slice(0, 7);
            if (!monthlyData[month]) {
                monthlyData[month] = { scores: [], count: 0 };
            }
            monthlyData[month].scores.push(round.total_gross);
            monthlyData[month].count++;
        });

        const trends = Object.entries(monthlyData).map(([month, data]) => ({
            month,
            avgScore: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length * 10) / 10,
            roundsPlayed: data.count
        }));

        return { success: true, trends };
    }

    async getPlayerCourseStats(playerId = null) {
        const pid = playerId || this.currentUserId;

        const { data, error } = await this.supabase
            .from('rounds')
            .select('course_name, total_gross')
            .eq('golfer_id', pid)
            .not('total_gross', 'is', null);

        if (error) {
            console.error('[UnifiedPlayerService] Course stats error:', error);
            return { success: false, error: error.message };
        }

        // Aggregate by course
        const courseStats = {};
        data?.forEach(round => {
            const course = round.course_name || 'Unknown';
            if (!courseStats[course]) {
                courseStats[course] = { scores: [], count: 0 };
            }
            courseStats[course].scores.push(round.total_gross);
            courseStats[course].count++;
        });

        const stats = Object.entries(courseStats)
            .map(([courseName, data]) => ({
                courseName,
                roundsPlayed: data.count,
                avgScore: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length * 10) / 10,
                bestScore: Math.min(...data.scores)
            }))
            .sort((a, b) => b.roundsPlayed - a.roundsPlayed);

        return { success: true, courseStats: stats };
    }

    // =========================================================================
    // UI RENDERING
    // =========================================================================

    renderProfileCard(containerId, profile) {
        const container = document.getElementById(containerId);
        if (!container || !profile) return;

        const completeness = profile.profile_completeness || { percentage: 0 };
        const stats = profile.statistics || {};

        container.innerHTML = `
            <div class="bg-white rounded-xl shadow-lg overflow-hidden">
                <!-- Header -->
                <div class="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-8 text-white">
                    <div class="flex items-center gap-4">
                        <div class="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-3xl font-bold">
                            ${profile.avatar_url ?
                                `<img src="${profile.avatar_url}" class="w-full h-full rounded-full object-cover">` :
                                (profile.display_name || 'U')[0].toUpperCase()
                            }
                        </div>
                        <div>
                            <h2 class="text-2xl font-bold">${profile.display_name || 'Unknown'}</h2>
                            <p class="text-emerald-100">${profile.primary_society || 'No society'}</p>
                        </div>
                    </div>
                </div>

                <!-- Completeness bar -->
                <div class="px-6 py-3 bg-gray-50 border-b">
                    <div class="flex items-center justify-between text-sm mb-1">
                        <span class="text-gray-600">Profile Completeness</span>
                        <span class="font-medium ${completeness.percentage >= 80 ? 'text-emerald-600' : 'text-orange-600'}">${completeness.percentage || 0}%</span>
                    </div>
                    <div class="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div class="h-full ${completeness.percentage >= 80 ? 'bg-emerald-500' : 'bg-orange-500'} transition-all"
                             style="width: ${completeness.percentage || 0}%"></div>
                    </div>
                </div>

                <!-- Stats Grid -->
                <div class="grid grid-cols-3 gap-4 p-4">
                    <div class="text-center">
                        <div class="text-3xl font-bold text-emerald-600">${profile.handicap_index || '-'}</div>
                        <div class="text-xs text-gray-500">Handicap</div>
                    </div>
                    <div class="text-center">
                        <div class="text-3xl font-bold text-blue-600">${stats.total_rounds || 0}</div>
                        <div class="text-xs text-gray-500">Rounds</div>
                    </div>
                    <div class="text-center">
                        <div class="text-3xl font-bold text-teal-600">${stats.avg_gross_score || '-'}</div>
                        <div class="text-xs text-gray-500">Avg Score</div>
                    </div>
                </div>

                <!-- Details -->
                <div class="px-4 pb-4 space-y-3">
                    ${profile.home_course?.name ? `
                        <div class="flex items-center gap-3 text-sm">
                            <i class="material-symbols-outlined text-emerald-600">golf_course</i>
                            <div>
                                <div class="text-xs text-gray-500">Home Course</div>
                                <div class="font-medium">${profile.home_course.name}</div>
                            </div>
                        </div>
                    ` : ''}

                    ${stats.last_round_date ? `
                        <div class="flex items-center gap-3 text-sm">
                            <i class="material-symbols-outlined text-blue-600">schedule</i>
                            <div>
                                <div class="text-xs text-gray-500">Last Played</div>
                                <div class="font-medium">${new Date(stats.last_round_date).toLocaleDateString()}</div>
                            </div>
                        </div>
                    ` : ''}

                    ${stats.best_gross_score ? `
                        <div class="flex items-center gap-3 text-sm">
                            <i class="material-symbols-outlined text-yellow-600">emoji_events</i>
                            <div>
                                <div class="text-xs text-gray-500">Best Score</div>
                                <div class="font-medium">${stats.best_gross_score}</div>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    renderProfileCompleteness(containerId, completeness) {
        const container = document.getElementById(containerId);
        if (!container || !completeness) return;

        const missingFields = completeness.missing_fields || [];
        const fieldLabels = {
            'name': 'Display Name',
            'avatar': 'Profile Photo',
            'handicap': 'Handicap Index',
            'home_course': 'Home Course',
            'society': 'Society Membership',
            'rounds': 'Played Rounds',
            'contact': 'Contact Info'
        };

        container.innerHTML = `
            <div class="bg-white rounded-xl shadow-lg p-4">
                <h3 class="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <i class="material-symbols-outlined text-emerald-600">checklist</i>
                    Complete Your Profile
                </h3>

                <div class="mb-4">
                    <div class="flex justify-between text-sm mb-1">
                        <span class="text-gray-600">Progress</span>
                        <span class="font-bold ${completeness.percentage >= 80 ? 'text-emerald-600' : 'text-orange-600'}">
                            ${completeness.percentage}%
                        </span>
                    </div>
                    <div class="h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div class="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all"
                             style="width: ${completeness.percentage}%"></div>
                    </div>
                </div>

                ${missingFields.length > 0 ? `
                    <div class="space-y-2">
                        <p class="text-sm text-gray-500 mb-2">Complete these to improve your profile:</p>
                        ${missingFields.map(field => `
                            <div class="flex items-center justify-between py-2 px-3 bg-orange-50 rounded-lg">
                                <span class="text-sm text-orange-800">${fieldLabels[field] || field}</span>
                                <button class="text-xs text-orange-600 font-medium hover:underline"
                                        onclick="unifiedPlayerService.editField('${field}')">
                                    Add
                                </button>
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <div class="text-center py-4 text-emerald-600">
                        <i class="material-symbols-outlined text-3xl">verified</i>
                        <p class="font-medium mt-2">Profile Complete!</p>
                    </div>
                `}
            </div>
        `;
    }

    editField(fieldName) {
        // Trigger appropriate edit modal based on field
        const editActions = {
            'name': () => this.showEditNameModal(),
            'avatar': () => this.showEditAvatarModal(),
            'handicap': () => window.courseDataManager?.renderHandicapCalculator?.(),
            'home_course': () => window.courseDataManager?.renderCourseSelector?.('home-course-container'),
            'society': () => window.location.hash = '#societies',
            'rounds': () => window.location.hash = '#startround',
            'contact': () => this.showEditContactModal()
        };

        const action = editActions[fieldName];
        if (action) action();
    }

    showEditNameModal() {
        const modal = document.createElement('div');
        modal.id = 'edit-name-modal';
        modal.className = 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4';
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

        modal.innerHTML = `
            <div class="bg-white rounded-xl p-6 w-full max-w-md">
                <h3 class="text-lg font-bold mb-4">Update Display Name</h3>
                <input type="text" id="new-name-input" placeholder="Enter your name"
                       class="w-full px-4 py-3 border border-gray-200 rounded-lg mb-4">
                <div class="flex gap-2">
                    <button onclick="document.getElementById('edit-name-modal').remove()"
                            class="flex-1 py-2 border border-gray-200 rounded-lg">Cancel</button>
                    <button onclick="unifiedPlayerService.saveName()"
                            class="flex-1 py-2 bg-emerald-600 text-white rounded-lg">Save</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    async saveName() {
        const input = document.getElementById('new-name-input');
        if (!input || !input.value.trim()) return;

        await this.updateProfile({ display_name: input.value.trim() });
        document.getElementById('edit-name-modal')?.remove();

        // Refresh UI
        const profile = await this.getProfile();
        if (profile.success) {
            this.renderProfileCard('profile-card-container', profile.profile);
        }
    }

    renderRecentRounds(containerId, rounds) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (!rounds || rounds.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="material-symbols-outlined text-4xl mb-2">sports_golf</i>
                    <p>No rounds played yet</p>
                </div>
            `;
            return;
        }

        let html = `
            <div class="bg-white rounded-xl shadow-lg overflow-hidden">
                <div class="px-4 py-3 border-b border-gray-100">
                    <h3 class="font-bold text-gray-800">Recent Rounds</h3>
                </div>
                <div class="divide-y divide-gray-100">
        `;

        rounds.slice(0, 10).forEach(round => {
            const date = new Date(round.created_at).toLocaleDateString();
            html += `
                <div class="p-4 flex items-center justify-between hover:bg-gray-50">
                    <div>
                        <div class="font-medium text-gray-800">${round.course_name || 'Unknown Course'}</div>
                        <div class="text-sm text-gray-500">${date} • ${round.tee_marker || 'White'} tees</div>
                    </div>
                    <div class="text-right">
                        <div class="text-2xl font-bold text-emerald-600">${round.total_gross || '-'}</div>
                        ${round.total_net ? `<div class="text-xs text-gray-500">Net: ${round.total_net}</div>` : ''}
                    </div>
                </div>
            `;
        });

        html += '</div></div>';
        container.innerHTML = html;
    }
}

// Global instance
window.unifiedPlayerService = new UnifiedPlayerService();
