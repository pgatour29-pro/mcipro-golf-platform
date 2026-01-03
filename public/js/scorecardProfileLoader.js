/**
 * Scorecard Profile Loader
 * Loads and manages golf course scorecard profiles for OCR extraction and round entry
 */

class ScorecardProfileLoader {
    constructor() {
        this.profiles = new Map();
        this.loadedProfiles = [];
    }

    /**
     * Load a course profile from YAML file
     * @param {string} courseId - Course identifier (e.g., "pattana", "burapha_east")
     * @returns {Promise<Object>} - Parsed profile object
     */
    async loadProfile(courseId) {
        if (this.profiles.has(courseId)) {
            return this.profiles.get(courseId);
        }

        try {
            const response = await fetch(`/scorecard_profiles/${courseId}.yaml`);
            if (!response.ok) {
                console.warn(`Profile not found for ${courseId}, using generic fallback`);
                return await this.loadProfile('generic');
            }

            const yamlText = await response.text();
            const profile = this.parseYAML(yamlText);
            this.profiles.set(courseId, profile);
            this.loadedProfiles.push(courseId);

            return profile;
        } catch (error) {
            console.error(`Error loading profile ${courseId}:`, error);
            return await this.loadProfile('generic');
        }
    }

    /**
     * Simple YAML parser (basic implementation for our profile structure)
     * @param {string} yamlText - YAML content
     * @returns {Object} - Parsed object
     */
    parseYAML(yamlText) {
        const lines = yamlText.split('\n');
        const profile = {
            course_name: '',
            course_id: '',
            version: 1,
            layout: '',
            country: '',
            course_rating: 72.0,
            slope_rating: 113,
            tees: [],
            regions: {},
            extraction: {}
        };

        let currentSection = null;
        let currentTee = null;

        for (let i = 0; i < lines.length; i++) {
            const originalLine = lines[i];
            const line = originalLine.trim();

            // Skip comments and empty lines
            if (line.startsWith('#') || line === '') continue;

            // Check if we're starting a top-level section
            if (line === 'tees:') {
                currentSection = 'tees';
                currentTee = null;
                continue;
            } else if (line === 'regions:' || line === 'extraction:' || line === 'notes:') {
                // Save any pending tee
                if (currentTee && currentSection === 'tees') {
                    profile.tees.push(currentTee);
                    currentTee = null;
                }
                currentSection = line.replace(':', '');
                continue;
            }

            // Parse top-level key-value pairs
            if (!currentSection && line.includes(':')) {
                const [key, ...valueParts] = line.split(':');
                const value = valueParts.join(':').trim().replace(/['"]/g, '');

                if (key === 'course_name') profile.course_name = value;
                else if (key === 'course_id') profile.course_id = value;
                else if (key === 'version') profile.version = parseInt(value);
                else if (key === 'layout') profile.layout = value;
                else if (key === 'country') profile.country = value;
                else if (key === 'course_rating') profile.course_rating = parseFloat(value);
                else if (key === 'slope_rating') profile.slope_rating = parseInt(value);
            }

            // Parse tees section
            if (currentSection === 'tees') {
                // Check for list item (starts with -)
                if (line.startsWith('- ')) {
                    // Save previous tee if exists
                    if (currentTee) {
                        profile.tees.push(currentTee);
                    }

                    // Start new tee
                    currentTee = {
                        name: '',
                        color: '',
                        course_rating: 72.0,
                        slope_rating: 113
                    };

                    // Parse the first property on the same line as the dash
                    const inlineContent = line.substring(2).trim();
                    if (inlineContent.includes(':')) {
                        const [key, ...valueParts] = inlineContent.split(':');
                        const value = valueParts.join(':').trim().replace(/['"]/g, '');
                        if (key === 'name') currentTee.name = value;
                        else if (key === 'color') currentTee.color = value;
                        else if (key === 'course_rating') currentTee.course_rating = parseFloat(value);
                        else if (key === 'slope_rating') currentTee.slope_rating = parseInt(value);
                    }
                } else if (currentTee && line.includes(':')) {
                    // Parse properties of current tee
                    const [key, ...valueParts] = line.split(':');
                    const value = valueParts.join(':').trim().replace(/['"]/g, '');

                    if (key === 'name') currentTee.name = value;
                    else if (key === 'color') currentTee.color = value;
                    else if (key === 'course_rating') currentTee.course_rating = parseFloat(value);
                    else if (key === 'slope_rating') currentTee.slope_rating = parseInt(value);
                }
            }
        }

        // Save any pending tee at end of file
        if (currentTee && currentSection === 'tees') {
            profile.tees.push(currentTee);
        }

        console.log('[ScorecardProfileLoader] Parsed YAML for', profile.course_id, '- found', profile.tees.length, 'tees');

        return profile;
    }

    /**
     * Get all available course profiles
     * @returns {Array<string>} - List of course IDs
     */
    getAvailableProfiles() {
        return [
            'bangpakong',
            'bangpra',
            'burapha_ac',
            'burapha_cd',
            'burapha_east',
            'cheechan',
            'crystal_bay',
            'eastern_star',
            'grand_prix',
            'greenwood',
            'hermes',
            'khao_kheow',
            'laem_chabang',
            'mountain_shadow',
            'pattana',
            'pattavia',
            'pattaya_county',
            'phoenix',
            'pleasant_valley',
            'plutaluang',
            'royal_lakeside',
            'siam_cc_old',
            'siam_plantation',
            'generic'
        ];
    }

    /**
     * Get course display name by ID
     * @param {string} courseId
     * @returns {string}
     */
    getCourseDisplayName(courseId) {
        const nameMap = {
            'bangpakong': 'Bangpakong Golf Club',
            'bangpra': 'Bangpra International Golf Club',
            'burapha_ac': 'Burapha Golf Club - A/C Course',
            'burapha_cd': 'Burapha Golf Club - C/D Course',
            'burapha_east': 'Burapha Golf Club - East Course',
            'cheechan': 'Chee Chan Golf Resort',
            'crystal_bay': 'Crystal Bay Golf Club',
            'eastern_star': 'Eastern Star Golf Course',
            'grand_prix': 'Grand Prix Golf Club',
            'greenwood': 'Greenwood Golf & Resort',
            'hermes': 'Hermes Golf',
            'khao_kheow': 'Khao Kheow Golf Club',
            'laem_chabang': 'Laem Chabang International Country Club',
            'mountain_shadow': 'Mountain Shadow Golf Club',
            'pattana': 'Pattana Golf Club & Resort',
            'pattavia': 'Pattavia Century Golf Club',
            'pattaya_county': 'Pattaya County Club',
            'phoenix': 'Phoenix Golf',
            'pleasant_valley': 'Pleasant Valley Golf Club',
            'plutaluang': 'Plutaluang Navy Golf Course',
            'royal_lakeside': 'Royal Lakeside Golf Club',
            'siam_cc_old': 'Siam Country Club - Old Course',
            'siam_plantation': 'Siam Plantation Golf Club',
            'generic': 'Generic Course'
        };

        return nameMap[courseId] || courseId;
    }

    /**
     * Get tee options for a course profile
     * @param {string} courseId
     * @returns {Promise<Array>}
     */
    async getTeeOptions(courseId) {
        const profile = await this.loadProfile(courseId);

        // Default tees if not specified in profile or array is empty
        const hasTees = profile.tees && Array.isArray(profile.tees) && profile.tees.length > 0;

        if (!hasTees) {
            console.log('[ScorecardProfileLoader] No tees found for', courseId, '- using defaults');
            return [
                { name: 'Championship', color: 'Black', course_rating: 73.5, slope_rating: 135 },
                { name: 'Men', color: 'Blue', course_rating: 72.0, slope_rating: 130 },
                { name: 'Regular', color: 'White', course_rating: 70.5, slope_rating: 125 }
            ];
        }

        console.log('[ScorecardProfileLoader] ✅ Loaded', profile.tees.length, 'tees for', courseId);
        return profile.tees;
    }

    /**
     * Get course rating and slope for specific tee
     * @param {string} courseId
     * @param {string} teeColor
     * @returns {Promise<Object>}
     */
    async getCourseStats(courseId, teeColor) {
        const profile = await this.loadProfile(courseId);
        const tees = await this.getTeeOptions(courseId);

        const tee = tees.find(t => t.color === teeColor);

        return tee ? {
            course_rating: tee.course_rating,
            slope_rating: tee.slope_rating
        } : {
            course_rating: profile.course_rating,
            slope_rating: profile.slope_rating
        };
    }
}

// Global instance
window.scorecardProfileLoader = new ScorecardProfileLoader();
