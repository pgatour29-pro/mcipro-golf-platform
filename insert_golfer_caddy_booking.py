#!/usr/bin/env python3
"""
Insert Golfer Caddy Booking Module into index.html
This script:
1. Adds the complete GolferCaddyBooking module before GOLFER EVENTS SYSTEM
2. Updates goToCaddieBooking() function to use the new module
"""

import re

def insert_golfer_caddy_booking():
    file_path = "C:/Users/pete/Documents/MciPro/public/index.html"

    print("Reading index.html...")
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Step 1: Find insertion point (before GOLFER EVENTS SYSTEM)
    insertion_marker = '// ==================================================================\n// GOLFER EVENTS SYSTEM'
    insertion_point = content.find(insertion_marker)

    if insertion_point == -1:
        print("ERROR: Could not find insertion point (GOLFER EVENTS SYSTEM marker)")
        return False

    print(f"Found insertion point at position {insertion_point}")

    # Step 2: Check if module already exists
    if 'GOLFER CADDY BOOKING SYSTEM' in content:
        print("WARNING: GolferCaddyBooking module already exists!")
        return False

    # Step 3: Prepare the module code
    caddy_booking_module = '''
// ==================================================================
// GOLFER CADDY BOOKING SYSTEM - Book Caddies from Database
// ==================================================================
const GolferCaddyBooking = {
    currentCourse: null,
    allCaddies: [],
    myBookings: [],
    selectedDate: null,
    selectedTime: null,
    filters: {
        availability: 'all', // all, available, booked
        rating: 0, // min rating
        experience: 0, // min years
        language: 'all',
        specialty: 'all'
    },

    async init() {
        console.log('[GolferCaddyBooking] Initializing...');
        this.setupEventListeners();
        await this.loadMyBookings();
    },

    setupEventListeners() {
        // Filter change listeners
        const filterElements = [
            'caddyAvailabilityFilter',
            'caddyRatingFilter',
            'caddyExperienceFilter',
            'caddyLanguageFilter',
            'caddySpecialtyFilter'
        ];

        filterElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => this.applyFilters());
            }
        });
    },

    async showCaddyBookingPage(courseId = null) {
        console.log('[GolferCaddyBooking] Opening caddy booking page...', courseId);

        // If course provided, use it. Otherwise show course selector
        if (courseId) {
            this.currentCourse = courseId;
            await this.loadCaddiesForCourse(courseId);
            this.renderCaddyBookingInterface();
        } else {
            this.renderCourseSelector();
        }
    },

    renderCourseSelector() {
        const container = document.getElementById('mainContent');
        if (!container) return;

        container.innerHTML = `
            <div class="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 py-8 px-4">
                <!-- Header -->
                <div class="max-w-7xl mx-auto mb-8">
                    <button onclick="showMainDashboard()" class="flex items-center text-gray-600 hover:text-gray-900 mb-4">
                        <span class="material-symbols-outlined mr-2">arrow_back</span>
                        <span>Back to Dashboard</span>
                    </button>
                    <h1 class="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                        <span class="material-symbols-outlined text-4xl align-middle mr-3">person_pin</span>
                        Book a Professional Caddy
                    </h1>
                    <p class="text-gray-600">Select a golf course to view available caddies</p>
                </div>

                <!-- Course Selection Grid -->
                <div class="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="courseSelectionGrid">
                    <div class="glass-card p-6 text-center">
                        <div class="animate-pulse">
                            <div class="h-6 bg-gray-200 rounded mb-4"></div>
                            <div class="h-4 bg-gray-200 rounded"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.loadCoursesWithCaddies();
    },

    async loadCoursesWithCaddies() {
        try {
            // Get unique courses that have caddies
            const { data, error } = await window.SupabaseDB.client
                .from('caddies')
                .select('home_club_id, home_club_name')
                .eq('availability_status', 'available');

            if (error) throw error;

            // Group by course
            const coursesMap = {};
            data.forEach(caddy => {
                if (!coursesMap[caddy.home_club_id]) {
                    coursesMap[caddy.home_club_id] = {
                        id: caddy.home_club_id,
                        name: caddy.home_club_name || caddy.home_club_id,
                        caddyCount: 0
                    };
                }
                coursesMap[caddy.home_club_id].caddyCount++;
            });

            const courses = Object.values(coursesMap);
            this.renderCourseCards(courses);

        } catch (error) {
            console.error('[GolferCaddyBooking] Error loading courses:', error);
            this.renderCourseCards([]);
        }
    },

    renderCourseCards(courses) {
        const grid = document.getElementById('courseSelectionGrid');
        if (!grid) return;

        if (courses.length === 0) {
            grid.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <span class="material-symbols-outlined text-6xl text-gray-300 mb-4">golf_course</span>
                    <p class="text-gray-600">No courses with available caddies at the moment.</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = courses.map(course => `
            <div class="glass-card card-hover p-6 cursor-pointer" onclick="GolferCaddyBooking.selectCourse('${course.id}', '${course.name}')">
                <div class="flex items-start justify-between mb-4">
                    <div class="flex-1">
                        <h3 class="text-lg font-bold text-gray-900 mb-1">${course.name}</h3>
                        <p class="text-sm text-gray-600">${course.caddyCount} caddies available</p>
                    </div>
                    <span class="material-symbols-outlined text-3xl text-emerald-600">golf_course</span>
                </div>
                <button class="btn-primary w-full">
                    <span>View Caddies</span>
                    <span class="material-symbols-outlined text-sm ml-2">arrow_forward</span>
                </button>
            </div>
        `).join('');
    },

    async selectCourse(courseId, courseName) {
        this.currentCourse = courseId;
        await this.loadCaddiesForCourse(courseId);
        this.renderCaddyBookingInterface(courseName);
    },

    async loadCaddiesForCourse(courseId) {
        try {
            console.log('[GolferCaddyBooking] Loading caddies for:', courseId);

            const { data, error } = await window.SupabaseDB.client
                .from('caddies')
                .select('*')
                .eq('home_club_id', courseId)
                .order('rating', { ascending: false });

            if (error) throw error;

            this.allCaddies = data || [];
            console.log(`[GolferCaddyBooking] Loaded ${this.allCaddies.length} caddies`);

        } catch (error) {
            console.error('[GolferCaddyBooking] Error loading caddies:', error);
            this.allCaddies = [];
        }
    },

    async loadMyBookings() {
        try {
            if (!window.currentUserId) return;

            const { data, error } = await window.SupabaseDB.client
                .from('caddy_bookings')
                .select(`
                    *,
                    caddies:caddy_id (
                        name,
                        caddy_number,
                        photo_url,
                        rating
                    )
                `)
                .eq('golfer_id', window.currentUserId)
                .order('booking_date', { ascending: false });

            if (error) throw error;

            this.myBookings = data || [];
            console.log(`[GolferCaddyBooking] Loaded ${this.myBookings.length} bookings`);

        } catch (error) {
            console.error('[GolferCaddyBooking] Error loading bookings:', error);
            this.myBookings = [];
        }
    },

    renderCaddyBookingInterface(courseName = 'Golf Course') {
        const container = document.getElementById('mainContent');
        if (!container) return;

        container.innerHTML = `
            <div class="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 py-8 px-4">
                <!-- Header -->
                <div class="max-w-7xl mx-auto mb-6">
                    <button onclick="GolferCaddyBooking.showCaddyBookingPage()" class="flex items-center text-gray-600 hover:text-gray-900 mb-4">
                        <span class="material-symbols-outlined mr-2">arrow_back</span>
                        <span>Change Course</span>
                    </button>
                    <div class="flex items-center justify-between flex-wrap gap-4">
                        <div>
                            <h1 class="text-3xl font-bold text-gray-900 mb-1">${courseName}</h1>
                            <p class="text-gray-600">Select your professional caddy</p>
                        </div>
                        <button onclick="GolferCaddyBooking.showMyBookings()" class="btn-secondary">
                            <span class="material-symbols-outlined text-sm">history</span>
                            <span>My Bookings</span>
                        </button>
                    </div>
                </div>

                <!-- Filters -->
                <div class="max-w-7xl mx-auto mb-6">
                    <div class="glass-card p-4">
                        <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <!-- Availability Filter -->
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Availability</label>
                                <select id="caddyAvailabilityFilter" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500">
                                    <option value="all">All Caddies</option>
                                    <option value="available" selected>Available</option>
                                    <option value="booked">Booked</option>
                                </select>
                            </div>

                            <!-- Rating Filter -->
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Min Rating</label>
                                <select id="caddyRatingFilter" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500">
                                    <option value="0">Any Rating</option>
                                    <option value="4.5">4.5+ Stars</option>
                                    <option value="4.7">4.7+ Stars</option>
                                    <option value="4.8">4.8+ Stars</option>
                                    <option value="4.9">4.9+ Stars</option>
                                </select>
                            </div>

                            <!-- Experience Filter -->
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Experience</label>
                                <select id="caddyExperienceFilter" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500">
                                    <option value="0">Any Experience</option>
                                    <option value="5">5+ Years</option>
                                    <option value="10">10+ Years</option>
                                    <option value="15">15+ Years</option>
                                </select>
                            </div>

                            <!-- Language Filter -->
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Language</label>
                                <select id="caddyLanguageFilter" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500">
                                    <option value="all">All Languages</option>
                                    <option value="English">English</option>
                                    <option value="Thai">Thai</option>
                                    <option value="Japanese">Japanese</option>
                                    <option value="Chinese">Chinese</option>
                                    <option value="Korean">Korean</option>
                                </select>
                            </div>

                            <!-- Specialty Filter -->
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Specialty</label>
                                <select id="caddySpecialtyFilter" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500">
                                    <option value="all">All Specialties</option>
                                    <option value="Championship">Championship</option>
                                    <option value="Beginner">Beginner Support</option>
                                    <option value="Ladies">Ladies Golf</option>
                                    <option value="Business">Business Golf</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Caddies Grid -->
                <div class="max-w-7xl mx-auto">
                    <div id="caddiesGrid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <!-- Caddies will be rendered here -->
                    </div>
                </div>
            </div>
        `;

        this.applyFilters();
    },

    applyFilters() {
        const availability = document.getElementById('caddyAvailabilityFilter')?.value || 'all';
        const minRating = parseFloat(document.getElementById('caddyRatingFilter')?.value || 0);
        const minExperience = parseInt(document.getElementById('caddyExperienceFilter')?.value || 0);
        const language = document.getElementById('caddyLanguageFilter')?.value || 'all';
        const specialty = document.getElementById('caddySpecialtyFilter')?.value || 'all';

        let filtered = this.allCaddies;

        // Apply filters
        if (availability !== 'all') {
            filtered = filtered.filter(c => c.availability_status === availability);
        }
        if (minRating > 0) {
            filtered = filtered.filter(c => c.rating >= minRating);
        }
        if (minExperience > 0) {
            filtered = filtered.filter(c => c.experience_years >= minExperience);
        }
        if (language !== 'all') {
            filtered = filtered.filter(c => c.languages && c.languages.includes(language));
        }
        if (specialty !== 'all') {
            filtered = filtered.filter(c => c.specialty && c.specialty.toLowerCase().includes(specialty.toLowerCase()));
        }

        this.renderCaddies(filtered);
    },

    renderCaddies(caddies) {
        const grid = document.getElementById('caddiesGrid');
        if (!grid) return;

        if (caddies.length === 0) {
            grid.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <span class="material-symbols-outlined text-6xl text-gray-300 mb-4">person_search</span>
                    <p class="text-gray-600">No caddies match your filters. Try adjusting your search criteria.</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = caddies.map(caddy => this.renderCaddyCard(caddy)).join('');
    },

    renderCaddyCard(caddy) {
        const isAvailable = caddy.availability_status === 'available';
        const languagesList = Array.isArray(caddy.languages) ? caddy.languages.join(', ') : 'Thai, English';
        const photoUrl = caddy.photo_url || 'images/caddies/default.jpg';

        return `
            <div class="glass-card card-hover overflow-hidden">
                <!-- Caddy Photo -->
                <div class="h-48 bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center relative">
                    ${caddy.photo_url ? `
                        <img src="${photoUrl}" alt="${caddy.name}" class="w-full h-full object-cover">
                    ` : `
                        <span class="material-symbols-outlined text-6xl text-emerald-600">person</span>
                    `}
                    <div class="absolute top-3 right-3">
                        <span class="px-3 py-1 rounded-full text-xs font-medium ${isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                            ${isAvailable ? '✓ Available' : '✗ Booked'}
                        </span>
                    </div>
                </div>

                <!-- Caddy Info -->
                <div class="p-4">
                    <div class="flex items-start justify-between mb-2">
                        <div class="flex-1">
                            <h3 class="text-lg font-bold text-gray-900">${caddy.name}</h3>
                            <p class="text-sm text-gray-600">#${caddy.caddy_number}</p>
                        </div>
                        <div class="flex items-center">
                            <span class="material-symbols-outlined text-yellow-500 text-sm mr-1">star</span>
                            <span class="font-bold text-gray-900">${caddy.rating}</span>
                        </div>
                    </div>

                    <div class="space-y-2 mb-4">
                        <div class="flex items-center text-sm text-gray-600">
                            <span class="material-symbols-outlined text-sm mr-2">workspace_premium</span>
                            <span>${caddy.experience_years} years experience</span>
                        </div>
                        <div class="flex items-center text-sm text-gray-600">
                            <span class="material-symbols-outlined text-sm mr-2">translate</span>
                            <span>${languagesList}</span>
                        </div>
                        ${caddy.specialty ? `
                            <div class="flex items-center text-sm text-gray-600">
                                <span class="material-symbols-outlined text-sm mr-2">military_tech</span>
                                <span>${caddy.specialty}</span>
                            </div>
                        ` : ''}
                        <div class="flex items-center text-sm text-gray-600">
                            <span class="material-symbols-outlined text-sm mr-2">golf_course</span>
                            <span>${caddy.total_rounds || 0} rounds · ${caddy.total_reviews || 0} reviews</span>
                        </div>
                    </div>

                    <div class="flex gap-2">
                        <button onclick="GolferCaddyBooking.viewCaddyProfile('${caddy.id}')" class="flex-1 btn-secondary text-sm py-2">
                            <span>View Profile</span>
                        </button>
                        ${isAvailable ? `
                            <button onclick="GolferCaddyBooking.bookCaddy('${caddy.id}')" class="flex-1 btn-primary text-sm py-2">
                                <span>Book Now</span>
                            </button>
                        ` : `
                            <button onclick="GolferCaddyBooking.joinWaitlist('${caddy.id}')" class="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 rounded-lg transition-all text-sm">
                                <span>Join Waitlist</span>
                            </button>
                        `}
                    </div>
                </div>
            </div>
        `;
    },

    viewCaddyProfile(caddyId) {
        const caddy = this.allCaddies.find(c => c.id === caddyId);
        if (!caddy) {
            NotificationManager.show('Caddy not found', 'error');
            return;
        }

        const languagesList = Array.isArray(caddy.languages) ? caddy.languages.join(', ') : 'Thai, English';
        const strengthsList = Array.isArray(caddy.strengths) ? caddy.strengths.join(', ') : caddy.specialty || 'General Golf';
        const isAvailable = caddy.availability_status === 'available';

        const modal = `
            <div class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onclick="if(event.target === this) this.remove()">
                <div class="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                    <!-- Header -->
                    <div class="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
                        <h2 class="text-2xl font-bold text-gray-900">Caddy Profile</h2>
                        <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-600">
                            <span class="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    <!-- Profile Content -->
                    <div class="p-6">
                        <!-- Photo and Basic Info -->
                        <div class="flex flex-col md:flex-row gap-6 mb-6">
                            <div class="w-full md:w-48 h-48 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                ${caddy.photo_url ? `
                                    <img src="${caddy.photo_url}" alt="${caddy.name}" class="w-full h-full object-cover rounded-lg">
                                ` : `
                                    <span class="material-symbols-outlined text-6xl text-emerald-600">person</span>
                                `}
                            </div>
                            <div class="flex-1">
                                <div class="flex items-start justify-between mb-3">
                                    <div>
                                        <h3 class="text-2xl font-bold text-gray-900">${caddy.name}</h3>
                                        <p class="text-gray-600">Caddy #${caddy.caddy_number}</p>
                                    </div>
                                    <span class="px-3 py-1 rounded-full text-sm font-medium ${isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                        ${isAvailable ? '✓ Available' : '✗ Booked'}
                                    </span>
                                </div>

                                <div class="grid grid-cols-2 gap-3">
                                    <div class="bg-gray-50 p-3 rounded-lg">
                                        <div class="flex items-center text-yellow-500 mb-1">
                                            <span class="material-symbols-outlined text-sm mr-1">star</span>
                                            <span class="font-bold text-gray-900">${caddy.rating}</span>
                                        </div>
                                        <p class="text-xs text-gray-600">Rating</p>
                                    </div>
                                    <div class="bg-gray-50 p-3 rounded-lg">
                                        <div class="flex items-center text-emerald-600 mb-1">
                                            <span class="material-symbols-outlined text-sm mr-1">workspace_premium</span>
                                            <span class="font-bold text-gray-900">${caddy.experience_years}</span>
                                        </div>
                                        <p class="text-xs text-gray-600">Years Experience</p>
                                    </div>
                                    <div class="bg-gray-50 p-3 rounded-lg">
                                        <div class="flex items-center text-blue-600 mb-1">
                                            <span class="material-symbols-outlined text-sm mr-1">golf_course</span>
                                            <span class="font-bold text-gray-900">${caddy.total_rounds || 0}</span>
                                        </div>
                                        <p class="text-xs text-gray-600">Total Rounds</p>
                                    </div>
                                    <div class="bg-gray-50 p-3 rounded-lg">
                                        <div class="flex items-center text-purple-600 mb-1">
                                            <span class="material-symbols-outlined text-sm mr-1">rate_review</span>
                                            <span class="font-bold text-gray-900">${caddy.total_reviews || 0}</span>
                                        </div>
                                        <p class="text-xs text-gray-600">Reviews</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Details Sections -->
                        <div class="space-y-4">
                            ${caddy.specialty ? `
                                <div class="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                                    <h4 class="font-bold text-gray-900 mb-2 flex items-center">
                                        <span class="material-symbols-outlined text-emerald-600 mr-2">military_tech</span>
                                        Specialty
                                    </h4>
                                    <p class="text-gray-700">${caddy.specialty}</p>
                                </div>
                            ` : ''}

                            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <h4 class="font-bold text-gray-900 mb-2 flex items-center">
                                    <span class="material-symbols-outlined text-blue-600 mr-2">translate</span>
                                    Languages
                                </h4>
                                <p class="text-gray-700">${languagesList}</p>
                            </div>

                            ${caddy.personality ? `
                                <div class="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                    <h4 class="font-bold text-gray-900 mb-2 flex items-center">
                                        <span class="material-symbols-outlined text-purple-600 mr-2">psychology</span>
                                        Personality
                                    </h4>
                                    <p class="text-gray-700">${caddy.personality}</p>
                                </div>
                            ` : ''}

                            ${strengthsList ? `
                                <div class="bg-orange-50 border border-orange-200 rounded-lg p-4">
                                    <h4 class="font-bold text-gray-900 mb-2 flex items-center">
                                        <span class="material-symbols-outlined text-orange-600 mr-2">emoji_events</span>
                                        Strengths
                                    </h4>
                                    <p class="text-gray-700">${strengthsList}</p>
                                </div>
                            ` : ''}
                        </div>

                        <!-- Action Buttons -->
                        <div class="mt-6 flex gap-3">
                            ${isAvailable ? `
                                <button onclick="GolferCaddyBooking.bookCaddy('${caddy.id}'); this.closest('.fixed').remove();" class="flex-1 btn-primary py-3">
                                    <span class="material-symbols-outlined text-sm mr-2">event</span>
                                    <span>Book This Caddy</span>
                                </button>
                            ` : `
                                <button onclick="GolferCaddyBooking.joinWaitlist('${caddy.id}'); this.closest('.fixed').remove();" class="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-medium py-3 rounded-lg transition-all">
                                    <span class="material-symbols-outlined text-sm mr-2">schedule</span>
                                    <span>Join Waitlist</span>
                                </button>
                            `}
                            <button onclick="this.closest('.fixed').remove()" class="btn-secondary py-3">
                                <span>Close</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modal);
    },

    bookCaddy(caddyId) {
        const caddy = this.allCaddies.find(c => c.id === caddyId);
        if (!caddy) {
            NotificationManager.show('Caddy not found', 'error');
            return;
        }

        // Open booking modal
        this.showBookingModal(caddy);
    },

    showBookingModal(caddy) {
        const today = new Date().toISOString().split('T')[0];

        const modal = `
            <div class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onclick="if(event.target === this) this.remove()">
                <div class="bg-white rounded-2xl max-w-md w-full">
                    <!-- Header -->
                    <div class="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-6 rounded-t-2xl">
                        <div class="flex items-center justify-between">
                            <div>
                                <h2 class="text-2xl font-bold mb-1">Book Caddy</h2>
                                <p class="text-emerald-100">${caddy.name} (#${caddy.caddy_number})</p>
                            </div>
                            <button onclick="this.closest('.fixed').remove()" class="text-white hover:text-emerald-100">
                                <span class="material-symbols-outlined">close</span>
                            </button>
                        </div>
                    </div>

                    <!-- Form -->
                    <div class="p-6 space-y-4">
                        <!-- Date Selection -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                <span class="material-symbols-outlined text-sm align-middle mr-1">calendar_today</span>
                                Booking Date
                            </label>
                            <input type="date" id="bookingDate" min="${today}" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500" required>
                        </div>

                        <!-- Time Selection -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                <span class="material-symbols-outlined text-sm align-middle mr-1">schedule</span>
                                Tee Time
                            </label>
                            <input type="time" id="bookingTime" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500" required>
                        </div>

                        <!-- Holes Selection -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                <span class="material-symbols-outlined text-sm align-middle mr-1">golf_course</span>
                                Number of Holes
                            </label>
                            <select id="bookingHoles" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500">
                                <option value="9">9 Holes</option>
                                <option value="18" selected>18 Holes</option>
                            </select>
                        </div>

                        <!-- Special Requests -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                <span class="material-symbols-outlined text-sm align-middle mr-1">notes</span>
                                Special Requests (Optional)
                            </label>
                            <textarea id="bookingRequests" rows="3" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500" placeholder="Any special requirements or notes..."></textarea>
                        </div>

                        <!-- Action Buttons -->
                        <div class="flex gap-3 pt-2">
                            <button onclick="this.closest('.fixed').remove()" class="flex-1 btn-secondary py-3">
                                <span>Cancel</span>
                            </button>
                            <button onclick="GolferCaddyBooking.confirmBooking('${caddy.id}')" class="flex-1 btn-primary py-3">
                                <span class="material-symbols-outlined text-sm mr-2">check_circle</span>
                                <span>Confirm Booking</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modal);
    },

    async confirmBooking(caddyId) {
        const date = document.getElementById('bookingDate').value;
        const time = document.getElementById('bookingTime').value;
        const holes = parseInt(document.getElementById('bookingHoles').value);
        const requests = document.getElementById('bookingRequests').value;

        if (!date || !time) {
            NotificationManager.show('Please select date and time', 'error');
            return;
        }

        if (!window.currentUserId) {
            NotificationManager.show('Please login to book a caddy', 'error');
            return;
        }

        const caddy = this.allCaddies.find(c => c.id === caddyId);
        if (!caddy) return;

        try {
            // Create booking in database
            const { data, error } = await window.SupabaseDB.client
                .from('caddy_bookings')
                .insert({
                    caddy_id: caddyId,
                    golfer_id: window.currentUserId,
                    golfer_name: window.currentUserProfile?.full_name || 'Guest',
                    booking_date: date,
                    tee_time: time,
                    holes: holes,
                    course_id: this.currentCourse,
                    course_name: caddy.home_club_name,
                    status: 'pending',
                    special_requests: requests || null,
                    booking_source: 'golfer_app'
                })
                .select();

            if (error) throw error;

            // Close modal
            document.querySelector('.fixed.inset-0')?.remove();

            // Show success
            NotificationManager.show(`Booking request sent for ${caddy.name}! Awaiting confirmation from golf course.`, 'success', 5000);

            // Reload bookings
            await this.loadMyBookings();

        } catch (error) {
            console.error('[GolferCaddyBooking] Error creating booking:', error);
            NotificationManager.show('Failed to create booking. Please try again.', 'error');
        }
    },

    async joinWaitlist(caddyId) {
        // Waitlist functionality
        NotificationManager.show('Waitlist feature coming soon!', 'info');

        // TODO: Implement waitlist
        // Similar to booking but inserts into caddy_waitlist table
    },

    showMyBookings() {
        const container = document.getElementById('mainContent');
        if (!container) return;

        container.innerHTML = `
            <div class="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 py-8 px-4">
                <!-- Header -->
                <div class="max-w-7xl mx-auto mb-8">
                    <button onclick="GolferCaddyBooking.showCaddyBookingPage('${this.currentCourse}')" class="flex items-center text-gray-600 hover:text-gray-900 mb-4">
                        <span class="material-symbols-outlined mr-2">arrow_back</span>
                        <span>Back to Caddies</span>
                    </button>
                    <h1 class="text-3xl font-bold text-gray-900 mb-2">
                        <span class="material-symbols-outlined text-4xl align-middle mr-3">history</span>
                        My Caddy Bookings
                    </h1>
                    <p class="text-gray-600">View and manage your caddy bookings</p>
                </div>

                <!-- Bookings List -->
                <div class="max-w-7xl mx-auto">
                    <div id="bookingsList" class="space-y-4">
                        <!-- Bookings will be rendered here -->
                    </div>
                </div>
            </div>
        `;

        this.renderBookingsList();
    },

    renderBookingsList() {
        const container = document.getElementById('bookingsList');
        if (!container) return;

        if (this.myBookings.length === 0) {
            container.innerHTML = `
                <div class="glass-card p-12 text-center">
                    <span class="material-symbols-outlined text-6xl text-gray-300 mb-4">event_busy</span>
                    <p class="text-gray-600 mb-4">No caddy bookings yet</p>
                    <button onclick="GolferCaddyBooking.showCaddyBookingPage()" class="btn-primary">
                        <span>Book a Caddy</span>
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = this.myBookings.map(booking => {
            const statusColors = {
                pending: 'bg-yellow-100 text-yellow-800',
                confirmed: 'bg-green-100 text-green-800',
                completed: 'bg-blue-100 text-blue-800',
                cancelled: 'bg-red-100 text-red-800'
            };

            const statusColor = statusColors[booking.status] || 'bg-gray-100 text-gray-800';

            return `
                <div class="glass-card p-6">
                    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div class="flex-1">
                            <div class="flex items-center gap-4 mb-3">
                                <div class="w-16 h-16 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    ${booking.caddies?.photo_url ? `
                                        <img src="${booking.caddies.photo_url}" alt="${booking.caddies?.name}" class="w-full h-full object-cover rounded-lg">
                                    ` : `
                                        <span class="material-symbols-outlined text-3xl text-emerald-600">person</span>
                                    `}
                                </div>
                                <div class="flex-1">
                                    <h3 class="text-lg font-bold text-gray-900">${booking.caddies?.name || 'Caddy'} (#${booking.caddies?.caddy_number || '---'})</h3>
                                    <p class="text-sm text-gray-600">${booking.course_name}</p>
                                </div>
                                <span class="px-3 py-1 rounded-full text-xs font-medium ${statusColor}">
                                    ${booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                </span>
                            </div>
                            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                <div class="flex items-center text-gray-600">
                                    <span class="material-symbols-outlined text-sm mr-2">calendar_today</span>
                                    <span>${new Date(booking.booking_date).toLocaleDateString()}</span>
                                </div>
                                <div class="flex items-center text-gray-600">
                                    <span class="material-symbols-outlined text-sm mr-2">schedule</span>
                                    <span>${booking.tee_time}</span>
                                </div>
                                <div class="flex items-center text-gray-600">
                                    <span class="material-symbols-outlined text-sm mr-2">golf_course</span>
                                    <span>${booking.holes} Holes</span>
                                </div>
                                <div class="flex items-center text-gray-600">
                                    <span class="material-symbols-outlined text-sm mr-2">star</span>
                                    <span>${booking.caddies?.rating || 'N/A'}</span>
                                </div>
                            </div>
                            ${booking.special_requests ? `
                                <div class="mt-3 p-3 bg-gray-50 rounded-lg">
                                    <p class="text-sm text-gray-700"><strong>Special Requests:</strong> ${booking.special_requests}</p>
                                </div>
                            ` : ''}
                        </div>
                        ${booking.status === 'pending' ? `
                            <div class="flex gap-2">
                                <button onclick="GolferCaddyBooking.cancelBooking('${booking.id}')" class="btn-secondary text-sm px-4 py-2">
                                    <span class="material-symbols-outlined text-sm">cancel</span>
                                    <span class="hidden md:inline ml-2">Cancel</span>
                                </button>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    },

    async cancelBooking(bookingId) {
        if (!confirm('Are you sure you want to cancel this booking?')) {
            return;
        }

        try {
            const { error } = await window.SupabaseDB.client
                .from('caddy_bookings')
                .update({
                    status: 'cancelled',
                    cancelled_at: new Date().toISOString(),
                    cancellation_reason: 'Cancelled by golfer'
                })
                .eq('id', bookingId);

            if (error) throw error;

            NotificationManager.show('Booking cancelled successfully', 'success');
            await this.loadMyBookings();
            this.renderBookingsList();

        } catch (error) {
            console.error('[GolferCaddyBooking] Error cancelling booking:', error);
            NotificationManager.show('Failed to cancel booking', 'error');
        }
    }
};

// Make globally available
window.GolferCaddyBooking = GolferCaddyBooking;
console.log('[GolferCaddyBooking] ✅ Module loaded');

'''

    # Step 4: Insert the module
    print("Inserting GolferCaddyBooking module...")
    updated_content = content[:insertion_point] + caddy_booking_module + '\n' + content[insertion_point:]

    # Step 5: Update goToCaddieBooking() function
    print("Updating goToCaddieBooking() function...")
    old_function_pattern = r'function goToCaddieBooking\(\) \{[^}]+\}'

    new_function = '''function goToCaddieBooking() {
            try {
                // Use the new standalone GolferCaddyBooking module
                if (typeof GolferCaddyBooking !== 'undefined' && GolferCaddyBooking.showCaddyBookingPage) {
                    GolferCaddyBooking.showCaddyBookingPage();
                } else {
                    // Fallback to old booking tab method
                    showGolferTab('booking', null);
                    try { if (typeof initializeBookingSystem === 'function') initializeBookingSystem(); } catch {}
                }
            } catch (error) {
                console.error('[goToCaddieBooking] Error:', error);
                NotificationManager.show('Error opening caddy booking', 'error');
            }
        }'''

    # Find and replace the function (but be careful - let's find it first)
    function_start = updated_content.find('function goToCaddieBooking() {')
    if function_start != -1:
        # Find the end of the function (matching braces)
        brace_count = 0
        i = function_start
        while i < len(updated_content):
            if updated_content[i] == '{':
                brace_count += 1
            elif updated_content[i] == '}':
                brace_count -= 1
                if brace_count == 0:
                    function_end = i + 1
                    break
            i += 1

        old_function_text = updated_content[function_start:function_end]
        updated_content = updated_content[:function_start] + new_function + updated_content[function_end:]
        print(f"Updated goToCaddieBooking() function (old length: {len(old_function_text)}, new length: {len(new_function)})")
    else:
        print("WARNING: Could not find goToCaddieBooking() function to update")

    # Step 6: Write the file
    print("Writing updated index.html...")
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(updated_content)

    print("=" * 60)
    print("✅ SUCCESS! GolferCaddyBooking module has been added!")
    print("=" * 60)
    print(f"\nModule inserted at line ~{content[:insertion_point].count(chr(10)) + 1}")
    print(f"Total file size: {len(updated_content):,} characters")
    print("\nNext steps:")
    print("1. Test the module by clicking 'Book Caddy' on golfer dashboard")
    print("2. Ensure database tables exist (caddies, caddy_bookings)")
    print("3. Add test caddy data if needed")

    return True

if __name__ == "__main__":
    insert_golfer_caddy_booking()
