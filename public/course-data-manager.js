// ============================================================================
// COURSE DATA MANAGER
// ============================================================================
// Created: 2025-12-11
// Purpose: Manage course rating/slope data for WHS handicap calculations
// ============================================================================

class CourseDataManager {
    constructor() {
        this.supabase = null;
        this.courseCache = new Map();
        this.cacheDuration = 5 * 60 * 1000; // 5 minutes
    }

    async init(supabaseClient) {
        this.supabase = supabaseClient;
        console.log('[CourseDataManager] Initialized');
    }

    // =========================================================================
    // COURSE OPERATIONS
    // =========================================================================

    async getCourse(courseIdOrCode) {
        // Check cache first
        const cached = this.courseCache.get(courseIdOrCode);
        if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
            return { success: true, course: cached.data };
        }

        const { data, error } = await this.supabase.rpc('get_course_info', {
            p_course_id: courseIdOrCode
        });

        if (error) {
            console.error('[CourseDataManager] Get course error:', error);
            return { success: false, error: error.message };
        }

        if (data && data.length > 0) {
            this.courseCache.set(courseIdOrCode, { data: data[0], timestamp: Date.now() });
            return { success: true, course: data[0] };
        }

        return { success: false, error: 'Course not found' };
    }

    async getAllCourses(country = null) {
        let query = this.supabase
            .from('courses')
            .select('id, course_name, course_code, location, country, par, total_holes')
            .order('course_name', { ascending: true });

        if (country) {
            query = query.eq('country', country);
        }

        const { data, error } = await query;

        if (error) {
            console.error('[CourseDataManager] Get all courses error:', error);
            return { success: false, error: error.message };
        }

        return { success: true, courses: data || [] };
    }

    async searchCourses(query) {
        const { data, error } = await this.supabase
            .from('courses')
            .select('id, course_name, course_code, location, country')
            .ilike('course_name', `%${query}%`)
            .order('course_name', { ascending: true })
            .limit(20);

        if (error) {
            console.error('[CourseDataManager] Search error:', error);
            return { success: false, error: error.message };
        }

        return { success: true, courses: data || [] };
    }

    // =========================================================================
    // TEE OPERATIONS
    // =========================================================================

    async getCourseTees(courseIdOrCode) {
        const { data, error } = await this.supabase.rpc('get_course_tees', {
            p_course_id: courseIdOrCode
        });

        if (error) {
            console.error('[CourseDataManager] Get tees error:', error);
            return { success: false, error: error.message };
        }

        return { success: true, tees: data || [] };
    }

    async getCourseRatingSlope(courseIdOrCode, teeName) {
        const { data, error } = await this.supabase.rpc('get_course_rating_slope', {
            p_course_id: courseIdOrCode,
            p_tee_name: teeName
        });

        if (error) {
            console.error('[CourseDataManager] Get rating/slope error:', error);
            return { success: false, error: error.message };
        }

        if (data && data.length > 0) {
            return { success: true, rating: data[0].rating, slope: data[0].slope, par: data[0].par };
        }

        // Return defaults if no data
        return { success: true, rating: 72.0, slope: 113, par: 72 };
    }

    // =========================================================================
    // WHS CALCULATIONS
    // =========================================================================

    async calculateScoreDifferential(grossScore, courseIdOrCode, teeName) {
        // Try database function first
        const { data, error } = await this.supabase.rpc('calculate_score_differential_v2', {
            p_gross_score: grossScore,
            p_course_id: courseIdOrCode,
            p_tee_marker: teeName
        });

        if (!error && data !== null) {
            return { success: true, differential: data };
        }

        // Fallback to local calculation
        const ratingResult = await this.getCourseRatingSlope(courseIdOrCode, teeName);
        if (!ratingResult.success) {
            return { success: false, error: 'Could not get course rating' };
        }

        const { rating, slope } = ratingResult;
        const differential = ((grossScore - rating) * 113) / slope;

        return { success: true, differential: Math.round(differential * 10) / 10 };
    }

    async calculateCourseHandicap(handicapIndex, courseIdOrCode, teeName) {
        // Try database function first
        const { data, error } = await this.supabase.rpc('calculate_course_handicap', {
            p_handicap_index: handicapIndex,
            p_course_id: courseIdOrCode,
            p_tee_marker: teeName
        });

        if (!error && data !== null) {
            return { success: true, courseHandicap: data };
        }

        // Fallback to local calculation
        const ratingResult = await this.getCourseRatingSlope(courseIdOrCode, teeName);
        if (!ratingResult.success) {
            return { success: false, error: 'Could not get course rating' };
        }

        const { rating, slope, par } = ratingResult;
        // WHS Formula: Index * (Slope / 113) + (Rating - Par)
        const courseHandicap = handicapIndex * (slope / 113) + (rating - par);

        return { success: true, courseHandicap: Math.round(courseHandicap) };
    }

    // Calculate playing handicap for different formats
    calculatePlayingHandicap(courseHandicap, format = 'stroke') {
        const allowances = {
            'stroke': 1.0,           // 100%
            'stableford': 1.0,       // 100%
            'match_play': 1.0,       // 100%
            'fourball_stroke': 0.85, // 85%
            'fourball_match': 0.90,  // 90%
            'foursome_stroke': 0.50, // 50% (combined)
            'foursome_match': 0.50,  // 50% (combined)
            'scramble_2': 0.35,      // 35% low / 15% high
            'scramble_4': 0.25       // 25%/20%/15%/10%
        };

        const allowance = allowances[format] || 1.0;
        return Math.round(courseHandicap * allowance);
    }

    // =========================================================================
    // HANDICAP INDEX CALCULATION
    // =========================================================================

    async calculateHandicapIndex(playerId) {
        // Get last 20 rounds
        const { data: rounds, error } = await this.supabase
            .from('rounds')
            .select('total_gross, course_name, tee_marker, created_at')
            .eq('golfer_id', playerId)
            .not('total_gross', 'is', null)
            .order('created_at', { ascending: false })
            .limit(20);

        if (error || !rounds || rounds.length === 0) {
            return { success: false, error: 'No rounds found' };
        }

        // Calculate differentials for each round
        const differentials = [];
        for (const round of rounds) {
            const diffResult = await this.calculateScoreDifferential(
                round.total_gross,
                round.course_name, // This should ideally be course_id
                round.tee_marker || 'White'
            );
            if (diffResult.success) {
                differentials.push(diffResult.differential);
            }
        }

        if (differentials.length < 3) {
            return { success: false, error: 'Need at least 3 rounds for handicap' };
        }

        // Sort and take best differentials based on WHS table
        differentials.sort((a, b) => a - b);

        const numToUse = this.getNumDifferentialsToUse(differentials.length);
        const bestDiffs = differentials.slice(0, numToUse);
        const average = bestDiffs.reduce((a, b) => a + b, 0) / bestDiffs.length;

        // Apply 96% adjustment (WHS rule)
        const handicapIndex = Math.round(average * 0.96 * 10) / 10;

        // Cap at 54.0
        const cappedIndex = Math.min(handicapIndex, 54.0);

        return {
            success: true,
            handicapIndex: cappedIndex,
            roundsUsed: differentials.length,
            differentialsUsed: numToUse,
            bestDifferentials: bestDiffs
        };
    }

    getNumDifferentialsToUse(totalRounds) {
        // WHS table for number of differentials to use
        if (totalRounds <= 3) return 1;
        if (totalRounds === 4) return 1;
        if (totalRounds === 5) return 1;
        if (totalRounds === 6) return 2;
        if (totalRounds === 7) return 2;
        if (totalRounds === 8) return 2;
        if (totalRounds === 9) return 3;
        if (totalRounds === 10) return 3;
        if (totalRounds === 11) return 3;
        if (totalRounds === 12) return 4;
        if (totalRounds === 13) return 4;
        if (totalRounds === 14) return 4;
        if (totalRounds === 15) return 5;
        if (totalRounds === 16) return 5;
        if (totalRounds === 17) return 6;
        if (totalRounds === 18) return 6;
        if (totalRounds === 19) return 7;
        return 8; // 20 rounds = best 8
    }

    // =========================================================================
    // UI RENDERING
    // =========================================================================

    renderCourseSelector(containerId, onSelect) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="relative">
                <i class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">golf_course</i>
                <input
                    type="text"
                    id="course-search-input"
                    placeholder="Search for a course..."
                    class="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    oninput="courseDataManager.handleCourseSearch(this.value)"
                >
                <div id="course-search-results" class="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto hidden">
                </div>
            </div>
        `;

        this.onCourseSelect = onSelect;
    }

    async handleCourseSearch(query) {
        const resultsContainer = document.getElementById('course-search-results');
        if (!resultsContainer) return;

        if (query.length < 2) {
            resultsContainer.classList.add('hidden');
            return;
        }

        const result = await this.searchCourses(query);
        if (!result.success || result.courses.length === 0) {
            resultsContainer.innerHTML = '<div class="p-3 text-gray-500">No courses found</div>';
            resultsContainer.classList.remove('hidden');
            return;
        }

        resultsContainer.innerHTML = result.courses.map(course => `
            <div class="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0"
                 onclick="courseDataManager.selectCourse('${course.id}', '${course.course_name}')">
                <div class="font-medium">${course.course_name}</div>
                <div class="text-sm text-gray-500">${course.location || course.country || ''}</div>
            </div>
        `).join('');

        resultsContainer.classList.remove('hidden');
    }

    selectCourse(courseId, courseName) {
        const input = document.getElementById('course-search-input');
        const results = document.getElementById('course-search-results');

        if (input) input.value = courseName;
        if (results) results.classList.add('hidden');

        if (this.onCourseSelect) {
            this.onCourseSelect(courseId, courseName);
        }
    }

    async renderTeeSelector(containerId, courseId, onSelect) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '<div class="text-gray-500">Loading tees...</div>';

        const result = await this.getCourseTees(courseId);
        if (!result.success || result.tees.length === 0) {
            container.innerHTML = `
                <select class="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500">
                    <option value="White">White (Default)</option>
                    <option value="Blue">Blue</option>
                    <option value="Yellow">Yellow</option>
                    <option value="Red">Red</option>
                </select>
            `;
            return;
        }

        container.innerHTML = `
            <select id="tee-selector"
                    class="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    onchange="courseDataManager.handleTeeSelect(this.value)">
                ${result.tees.map(tee => `
                    <option value="${tee.tee_name}" data-rating="${tee.rating}" data-slope="${tee.slope}">
                        ${tee.tee_name} (${tee.tee_color || ''}) - Rating: ${tee.rating}, Slope: ${tee.slope}${tee.yardage ? `, ${tee.yardage}y` : ''}
                    </option>
                `).join('')}
            </select>
        `;

        this.onTeeSelect = onSelect;
    }

    handleTeeSelect(teeName) {
        const selector = document.getElementById('tee-selector');
        if (!selector) return;

        const option = selector.selectedOptions[0];
        const rating = parseFloat(option.dataset.rating);
        const slope = parseInt(option.dataset.slope);

        if (this.onTeeSelect) {
            this.onTeeSelect(teeName, rating, slope);
        }
    }

    renderCourseInfo(containerId, course, tees = []) {
        const container = document.getElementById(containerId);
        if (!container || !course) return;

        container.innerHTML = `
            <div class="bg-white rounded-xl shadow-lg overflow-hidden">
                <div class="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-4">
                    <h2 class="text-xl font-bold text-white">${course.course_name}</h2>
                    <p class="text-emerald-100 text-sm">${course.location || course.country || ''}</p>
                </div>
                <div class="p-4">
                    <div class="grid grid-cols-3 gap-4 text-center mb-4">
                        <div>
                            <div class="text-2xl font-bold text-emerald-600">${course.par || 72}</div>
                            <div class="text-xs text-gray-500">Par</div>
                        </div>
                        <div>
                            <div class="text-2xl font-bold text-blue-600">${course.total_holes || 18}</div>
                            <div class="text-xs text-gray-500">Holes</div>
                        </div>
                        <div>
                            <div class="text-2xl font-bold text-teal-600">${tees.length || 0}</div>
                            <div class="text-xs text-gray-500">Tees</div>
                        </div>
                    </div>
                    ${tees.length > 0 ? `
                        <div class="border-t pt-4">
                            <h3 class="font-semibold text-gray-800 mb-2">Tee Options</h3>
                            <div class="space-y-2">
                                ${tees.map(tee => `
                                    <div class="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                                        <div class="flex items-center gap-2">
                                            <div class="w-4 h-4 rounded-full ${this.getTeeColor(tee.tee_color)}"></div>
                                            <span class="font-medium">${tee.tee_name}</span>
                                        </div>
                                        <div class="text-sm text-gray-600">
                                            ${tee.rating} / ${tee.slope}
                                            ${tee.yardage ? `• ${tee.yardage}y` : ''}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    getTeeColor(colorName) {
        const colors = {
            'Black': 'bg-gray-900',
            'Blue': 'bg-blue-600',
            'White': 'bg-white border border-gray-300',
            'Yellow': 'bg-yellow-400',
            'Red': 'bg-red-600',
            'Green': 'bg-green-600',
            'Gold': 'bg-yellow-600'
        };
        return colors[colorName] || 'bg-gray-400';
    }

    // =========================================================================
    // HANDICAP CARD RENDERING
    // =========================================================================

    renderHandicapCard(containerId, handicapData) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (!handicapData || !handicapData.success) {
            container.innerHTML = `
                <div class="bg-white rounded-xl shadow-lg p-6 text-center">
                    <i class="material-symbols-outlined text-4xl text-gray-400 mb-2">badge</i>
                    <p class="text-gray-500">Handicap not yet calculated</p>
                    <p class="text-xs text-gray-400 mt-1">Play at least 3 rounds to get your index</p>
                </div>
            `;
            return;
        }

        const { handicapIndex, roundsUsed, differentialsUsed, bestDifferentials } = handicapData;

        container.innerHTML = `
            <div class="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl shadow-lg p-6 text-white">
                <div class="flex items-center justify-between mb-4">
                    <span class="text-emerald-100 text-sm font-medium">WHS Handicap Index</span>
                    <i class="material-symbols-outlined">verified</i>
                </div>
                <div class="text-5xl font-bold mb-2">${handicapIndex.toFixed(1)}</div>
                <div class="text-emerald-100 text-sm">
                    Based on best ${differentialsUsed} of ${roundsUsed} rounds
                </div>
                <div class="mt-4 pt-4 border-t border-emerald-400/30">
                    <div class="text-xs text-emerald-200 mb-2">Best Differentials</div>
                    <div class="flex gap-2 flex-wrap">
                        ${bestDifferentials.map(d => `
                            <span class="bg-white/20 px-2 py-1 rounded text-sm">${d.toFixed(1)}</span>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }
}

// Global instance
window.courseDataManager = new CourseDataManager();
