/**
 * ADMIN PRICING CONTROL SYSTEM
 * Centralized pricing management for all business units:
 * - Tee Times (Member/Guest/Walk-in/Society/Tournament/Corporate rates)
 * - Caddies
 * - Pro Shop (Products & Promotions)
 * - Restaurant (Menu Items & Specials)
 * - Events (Custom pricing for tournaments, societies, corporate)
 */

console.log('🔧 [ADMIN-PRICING-CONTROL.JS] VERSION 2.5.0 - COURSE PERSISTENCE & ROLE-BASED ACCESS...');

const AdminPricingControl = {

    // Storage key
    STORAGE_KEY: 'mcipro_pricing_config',

    // Default pricing structure
    getDefaultPricing() {
        return {
            courseInfo: {
                courseName: '',
                courseId: '',
                location: '',
                description: ''
            },
            courseSettings: {
                allowWalking: true,
                cartCompulsory: false,
                operatingHours: {
                    start: '06:00',
                    end: '19:00'
                },
                slotInterval: 10, // minutes
                maxPlayersPerSlot: 4,
                advanceBookingDays: 30
            },
            timePeriods: {
                peak: {
                    start: '08:00',
                    end: '14:00'
                },
                midday: {
                    start: '14:00',
                    end: '17:00'
                },
                evening: {
                    start: '17:00',
                    end: '19:00'
                },
                weekend: {
                    days: [0, 6]  // Sunday, Saturday
                }
            },
            teeTime: {
                member: {
                    peak: { cart: 2000, walking: 1500 },
                    midday: { cart: 1500, walking: 1200 },
                    evening: { cart: 1200, walking: 1000 },
                    weekend: { cart: 2500, walking: 2000 }
                },
                guest: {
                    peak: { cart: 2500, walking: 2000 },
                    midday: { cart: 2000, walking: 1600 },
                    evening: { cart: 1500, walking: 1200 },
                    weekend: { cart: 3000, walking: 2500 }
                },
                walkin: {
                    peak: { cart: 3000, walking: 2500 },
                    midday: { cart: 2500, walking: 2000 },
                    evening: { cart: 2000, walking: 1600 },
                    weekend: { cart: 3500, walking: 3000 }
                }
            },
            caddy: {
                standard: 500,
                premium: 800,
                tournament: 1000
            },
            cart: {
                fullRound: 800,
                halfRound: 500
            },
            proShop: {
                // Product categories with markup percentages
                balls: { markup: 40 },
                clubs: { markup: 30 },
                apparel: { markup: 50 },
                accessories: { markup: 45 }
            },
            restaurant: {
                // Menu categories
                breakfast: { active: true },
                lunch: { active: true },
                dinner: { active: true },
                beverages: { active: true },
                snacks: { active: true }
            },
            promotions: {
                // Active promotions
                earlyBird: {
                    enabled: false,
                    discount: 20,
                    timeStart: '06:00',
                    timeEnd: '08:00',
                    daysOfWeek: [1, 2, 3, 4, 5],  // Mon-Fri
                    sendTo: {
                        homeMembers: true,
                        optInGolfers: true
                    }
                },
                twilight: {
                    enabled: false,
                    discount: 30,
                    timeStart: '16:00',
                    timeEnd: '18:00',
                    daysOfWeek: [1, 2, 3, 4, 5],
                    sendTo: {
                        homeMembers: true,
                        optInGolfers: true
                    }
                },
                seniorDiscount: {
                    enabled: false,
                    discount: 15,
                    minimumAge: 60,
                    sendTo: {
                        homeMembers: true,
                        optInGolfers: false
                    }
                }
            },
            lastUpdated: new Date().toISOString(),
            updatedBy: 'system'
        };
    },

    // Load current pricing
    loadPricing() {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            console.log('[AdminPricingControl] Loaded from storage:', {
                courseSlug: parsed.courseInfo?.courseSlug,
                courseName: parsed.courseInfo?.courseName,
                configured: parsed.courseInfo?.configured
            });
            // Merge with defaults to ensure all fields exist
            const defaults = this.getDefaultPricing();
            return {
                ...defaults,
                ...parsed,
                courseInfo: { ...defaults.courseInfo, ...(parsed.courseInfo || {}) },
                courseSettings: {
                    ...defaults.courseSettings,
                    ...(parsed.courseSettings || {}),
                    operatingHours: {
                        ...defaults.courseSettings.operatingHours,
                        ...(parsed.courseSettings?.operatingHours || {})
                    }
                },
                timePeriods: { ...defaults.timePeriods, ...(parsed.timePeriods || {}) }
            };
        }
        return this.getDefaultPricing();
    },

    // Save pricing configuration
    savePricing(pricingConfig, updatedBy = 'admin') {
        pricingConfig.lastUpdated = new Date().toISOString();
        pricingConfig.updatedBy = updatedBy;
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(pricingConfig));
        return true;
    },

    // Calculate tee time price based on customer type, date, time
    calculateTeeTimePrice(customerType, date, time) {
        const pricing = this.loadPricing();
        const dayOfWeek = new Date(date).getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        // Parse time to compare with configured periods
        const timeParts = time.split(':');
        const hour = parseInt(timeParts[0]);
        const minute = parseInt(timeParts[1] || 0);
        const timeInMinutes = hour * 60 + minute;

        // Determine time period using configured periods
        let period = 'evening'; // default
        const periods = pricing.timePeriods || {};

        if (periods.peak) {
            const peakStart = this.timeToMinutes(periods.peak.start);
            const peakEnd = this.timeToMinutes(periods.peak.end);
            if (timeInMinutes >= peakStart && timeInMinutes < peakEnd) {
                period = 'peak';
            }
        }
        if (periods.midday) {
            const middayStart = this.timeToMinutes(periods.midday.start);
            const middayEnd = this.timeToMinutes(periods.midday.end);
            if (timeInMinutes >= middayStart && timeInMinutes < middayEnd) {
                period = 'midday';
            }
        }
        if (periods.evening) {
            const eveningStart = this.timeToMinutes(periods.evening.start);
            const eveningEnd = this.timeToMinutes(periods.evening.end);
            if (timeInMinutes >= eveningStart && timeInMinutes < eveningEnd) {
                period = 'evening';
            }
        }

        // Get base price (will be { cart: X, walking: Y } object)
        let basePrice;

        if (customerType === 'member' || customerType === 'guest' || customerType === 'walkin') {
            if (isWeekend) {
                basePrice = pricing.teeTime[customerType].weekend;
            } else {
                basePrice = pricing.teeTime[customerType][period];
            }
        } else {
            // For other types, default to walkin pricing
            basePrice = isWeekend ? pricing.teeTime.walkin.weekend : pricing.teeTime.walkin[period];
        }

        // Apply promotions (to cart price as default)
        const appliedPromotions = this.checkPromotions(customerType, date, time);
        let cartPrice = basePrice?.cart || basePrice || 2000;
        let walkingPrice = basePrice?.walking || basePrice || 1500;

        appliedPromotions.forEach(promo => {
            cartPrice = cartPrice * (1 - promo.discount / 100);
            walkingPrice = walkingPrice * (1 - promo.discount / 100);
        });

        return {
            basePrice: basePrice, // Original { cart, walking } object
            cartPrice: Math.round(cartPrice),
            walkingPrice: Math.round(walkingPrice),
            promotions: appliedPromotions,
            period: period,
            isWeekend: isWeekend
        };
    },

    // Helper: Convert HH:MM to minutes
    timeToMinutes(timeStr) {
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
    },

    // Check which promotions apply
    checkPromotions(customerType, date, time) {
        const pricing = this.loadPricing();
        const applied = [];
        const dayOfWeek = new Date(date).getDay();
        const timeValue = time.replace(':', '');

        // Early bird
        if (pricing.promotions.earlyBird.enabled) {
            const promo = pricing.promotions.earlyBird;
            if (promo.daysOfWeek.includes(dayOfWeek)) {
                const startTime = promo.timeStart.replace(':', '');
                const endTime = promo.timeEnd.replace(':', '');
                if (timeValue >= startTime && timeValue <= endTime) {
                    applied.push({
                        name: 'Early Bird Special',
                        discount: promo.discount
                    });
                }
            }
        }

        // Twilight
        if (pricing.promotions.twilight.enabled) {
            const promo = pricing.promotions.twilight;
            if (promo.daysOfWeek.includes(dayOfWeek)) {
                const startTime = promo.timeStart.replace(':', '');
                const endTime = promo.timeEnd.replace(':', '');
                if (timeValue >= startTime && timeValue <= endTime) {
                    applied.push({
                        name: 'Twilight Discount',
                        discount: promo.discount
                    });
                }
            }
        }

        return applied;
    },

    // Update specific pricing category
    updateCategory(category, subcategory, field, value) {
        const pricing = this.loadPricing();

        if (subcategory) {
            if (!pricing[category][subcategory]) {
                pricing[category][subcategory] = {};
            }
            pricing[category][subcategory][field] = value;
        } else {
            pricing[category][field] = value;
        }

        return this.savePricing(pricing);
    },

    // Toggle promotion
    togglePromotion(promoName, enabled) {
        const pricing = this.loadPricing();
        if (pricing.promotions[promoName]) {
            pricing.promotions[promoName].enabled = enabled;
            return this.savePricing(pricing);
        }
        return false;
    },

    // Create custom event pricing
    createEventPricing(eventName, eventConfig) {
        const pricing = this.loadPricing();

        if (!pricing.events) {
            pricing.events = {};
        }

        pricing.events[eventName] = {
            ...eventConfig,
            createdAt: new Date().toISOString()
        };

        return this.savePricing(pricing);
    },

    // ============================================
    // UI RENDERING
    // ============================================

    renderPricingDashboard() {
        console.log('[AdminPricingControl] VERSION 2.5.0 - renderPricingDashboard called');
        const pricing = this.loadPricing();
        const container = document.getElementById('admin-pricing-dashboard');

        console.log('[AdminPricingControl] Container found:', !!container);
        console.log('[AdminPricingControl] Pricing:', pricing);

        if (!container) {
            console.error('[AdminPricingControl] ERROR: Container #admin-pricing-dashboard not found!');
            return;
        }

        container.innerHTML = `
            <div class="pro-header">
                <div class="flex justify-between items-center">
                    <div>
                        <h2>Pricing & Revenue Control</h2>
                        <p>Manage all pricing, promotions, and event configurations</p>
                    </div>
                    <div class="text-sm text-gray-600">
                        Last updated: ${new Date(pricing.lastUpdated).toLocaleString()}
                    </div>
                </div>
            </div>

            <!-- Quick Stats -->
            <div class="pro-card">
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <div class="text-xs font-semibold text-gray-600 uppercase mb-1">Member Peak (Cart)</div>
                        <div class="text-2xl font-bold text-gray-900">฿${pricing.teeTime.member.peak.cart.toLocaleString()}</div>
                    </div>
                    <div>
                        <div class="text-xs font-semibold text-gray-600 uppercase mb-1">Standard Caddy</div>
                        <div class="text-2xl font-bold text-gray-900">฿${pricing.caddy.standard.toLocaleString()}</div>
                    </div>
                    <div>
                        <div class="text-xs font-semibold text-gray-600 uppercase mb-1">Active Promotions</div>
                        <div class="text-2xl font-bold text-gray-900">${this.countActivePromotions(pricing)}</div>
                    </div>
                    <div>
                        <div class="text-xs font-semibold text-gray-600 uppercase mb-1">Walking Allowed</div>
                        <div class="text-2xl font-bold text-gray-900">${pricing.courseSettings.allowWalking ? 'Yes' : 'No'}</div>
                    </div>
                </div>
            </div>

            <!-- Tabs -->
            <div class="bg-white border-b border-gray-200 mb-4">
                <div class="flex space-x-6 px-4 overflow-x-auto">
                    <button class="pricing-tab active py-3 px-2 border-b-2 border-black font-semibold text-sm whitespace-nowrap" data-tab="course">
                        Course Config
                    </button>
                    <button class="pricing-tab py-3 px-2 border-b-2 border-transparent font-semibold text-sm text-gray-600 whitespace-nowrap" data-tab="teetimes">
                        Tee Times
                    </button>
                    <button class="pricing-tab py-3 px-2 border-b-2 border-transparent font-semibold text-sm text-gray-600 whitespace-nowrap" data-tab="caddies">
                        Caddies & Carts
                    </button>
                    <button class="pricing-tab py-3 px-2 border-b-2 border-transparent font-semibold text-sm text-gray-600 whitespace-nowrap" data-tab="events">
                        Tournaments & Events
                    </button>
                    <button class="pricing-tab py-3 px-2 border-b-2 border-transparent font-semibold text-sm text-gray-600 whitespace-nowrap" data-tab="proshop">
                        Pro Shop
                    </button>
                    <button class="pricing-tab py-3 px-2 border-b-2 border-transparent font-semibold text-sm text-gray-600 whitespace-nowrap" data-tab="restaurant">
                        Restaurant
                    </button>
                    <button class="pricing-tab py-3 px-2 border-b-2 border-transparent font-semibold text-sm text-gray-600 whitespace-nowrap" data-tab="promotions">
                        Promotions
                    </button>
                </div>
            </div>

            <!-- Tab Content -->
            <div id="pricing-tab-content"></div>
        `;

        // Initialize tabs
        this.initializeTabs();
        this.renderCourseConfigTab();
    },

    countActivePromotions(pricing) {
        return Object.values(pricing.promotions).filter(p => p.enabled).length;
    },

    initializeTabs() {
        const tabs = document.querySelectorAll('.pricing-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                // Update active state
                tabs.forEach(t => {
                    t.classList.remove('active', 'border-black', 'text-gray-900');
                    t.classList.add('border-transparent', 'text-gray-600');
                });
                tab.classList.add('active', 'border-black', 'text-gray-900');
                tab.classList.remove('border-transparent', 'text-gray-600');

                // Render appropriate tab
                const tabName = tab.dataset.tab;
                switch(tabName) {
                    case 'course': this.renderCourseConfigTab(); break;
                    case 'teetimes': this.renderTeeTimesTab(); break;
                    case 'caddies': this.renderCaddiesTab(); break;
                    case 'events': this.renderEventsTab(); break;
                    case 'proshop': this.renderProShopTab(); break;
                    case 'restaurant': this.renderRestaurantTab(); break;
                    case 'promotions': this.renderPromotionsTab(); break;
                }
            });
        });
    },

    renderCourseConfigTab() {
        const pricing = this.loadPricing();
        const content = document.getElementById('pricing-tab-content');

        // Get courses from GolfCoursesDatabase if available
        const availableCourses = typeof GolfCoursesDatabase !== 'undefined' ? GolfCoursesDatabase.courses : [];

        // Check user role - admin sees all courses, GM sees only their course
        const currentUserRole = (window.AppState && window.AppState.currentUser && window.AppState.currentUser.role) || 'manager';
        const isAdmin = currentUserRole === 'admin';
        const courseConfigured = pricing.courseInfo?.courseSlug && pricing.courseInfo?.courseName;

        // Format last saved timestamp
        let lastSavedText = '';
        if (pricing.lastUpdated) {
            const savedDate = new Date(pricing.lastUpdated);
            const now = new Date();
            const diffMs = now - savedDate;
            const diffMins = Math.floor(diffMs / 60000);

            if (diffMins < 1) {
                lastSavedText = 'Just now';
            } else if (diffMins < 60) {
                lastSavedText = `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
            } else {
                lastSavedText = savedDate.toLocaleString();
            }
        }

        content.innerHTML = `
            <!-- Auto-save Status -->
            ${lastSavedText ? `
                <div class="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-green-600" style="font-size: 1.25rem;">check_circle</span>
                        <span class="text-sm font-medium text-green-900">All changes auto-saved</span>
                    </div>
                    <span class="text-xs text-green-700">Last saved: ${lastSavedText}</span>
                </div>
            ` : ''}

            <!-- Course Information -->
            <div class="pro-card mb-4">
                <h3 class="pro-section-title">Course Information</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    ${isAdmin || !courseConfigured ? `
                        <!-- Admin or First-Time Setup: Show Dropdown -->
                        <div>
                            <label class="text-xs font-semibold text-gray-600 uppercase mb-1 block">Select Course</label>
                            <select id="courseNameSelect" class="pro-select w-full" onchange="AdminPricingControl.handleCourseSelection(this.value)">
                                <option value="">-- Select from Golf Inventory --</option>
                                ${availableCourses.map(course => `
                                    <option value="${course.slug}" ${pricing.courseInfo?.courseSlug === course.slug ? 'selected' : ''}>
                                        ${course.name}
                                    </option>
                                `).join('')}
                                <option value="custom" ${pricing.courseInfo?.courseSlug === 'custom' ? 'selected' : ''}>✏️ Custom Course (Type Your Own)</option>
                            </select>
                        </div>
                    ` : `
                        <!-- GM: Show Locked Course Name -->
                        <div>
                            <label class="text-xs font-semibold text-gray-600 uppercase mb-1 block">Course Name</label>
                            <div class="pro-select w-full bg-gray-50 cursor-not-allowed flex items-center justify-between" style="padding: 0.5rem 0.75rem;">
                                <span class="font-semibold text-gray-900">${pricing.courseInfo?.courseName || 'Not Set'}</span>
                                <span class="material-symbols-outlined text-gray-400" style="font-size: 1rem;">lock</span>
                            </div>
                            <p class="text-xs text-gray-500 mt-1">Course locked - Contact admin to change</p>
                        </div>
                    `}

                    ${pricing.courseInfo?.courseSlug === 'custom' || (!courseConfigured && !pricing.courseInfo?.courseSlug) ? `
                        <div id="customCourseNameDiv">
                            <label class="text-xs font-semibold text-gray-600 uppercase mb-1 block">Custom Course Name</label>
                            <input type="text" id="customCourseName" class="pro-select w-full"
                                   data-category="courseInfo" data-field="courseName"
                                   value="${pricing.courseInfo?.courseName || ''}"
                                   placeholder="Enter course name...">
                        </div>
                    ` : ''}

                    <div>
                        <label class="text-xs font-semibold text-gray-600 uppercase mb-1 block">Course ID / Abbreviation</label>
                        <input type="text" id="courseIdInput" class="pro-select w-full"
                               data-category="courseInfo" data-field="courseId"
                               value="${pricing.courseInfo?.courseId || ''}"
                               placeholder="e.g., PATTANA, PCC, BANGPRA">
                        <p class="text-xs text-gray-500 mt-1">Auto-generated or enter custom (e.g., Pattana → PATTANA, Pattaya Country Club → PCC)</p>
                    </div>

                    <div>
                        <label class="text-xs font-semibold text-gray-600 uppercase mb-1 block">Location</label>
                        <input type="text" class="pro-select w-full"
                               data-category="courseInfo" data-field="location"
                               value="${pricing.courseInfo?.location || ''}"
                               placeholder="Pattaya, Thailand">
                    </div>

                    <div>
                        <label class="text-xs font-semibold text-gray-600 uppercase mb-1 block">Course Type</label>
                        <select id="courseTypeSelect" class="pro-select w-full" data-category="courseInfo" data-field="courseType" onchange="AdminPricingControl.handleCourseTypeChange(this.value)">
                            <option value="">-- Select Course Type --</option>
                            <option value="9-hole-executive" ${pricing.courseInfo?.courseType === '9-hole-executive' ? 'selected' : ''}>9-Hole Executive Course</option>
                            <option value="9-hole-par3" ${pricing.courseInfo?.courseType === '9-hole-par3' ? 'selected' : ''}>9-Hole Par-3 Course</option>
                            <option value="18-hole-championship" ${pricing.courseInfo?.courseType === '18-hole-championship' ? 'selected' : ''}>18-Hole Championship Course</option>
                            <option value="18-hole-executive" ${pricing.courseInfo?.courseType === '18-hole-executive' ? 'selected' : ''}>18-Hole Executive Course</option>
                            <option value="27-hole-championship" ${pricing.courseInfo?.courseType === '27-hole-championship' ? 'selected' : ''}>27-Hole Championship Course</option>
                            <option value="36-hole-championship" ${pricing.courseInfo?.courseType === '36-hole-championship' ? 'selected' : ''}>36-Hole Championship Course</option>
                            <option value="custom" ${pricing.courseInfo?.courseType === 'custom' ? 'selected' : ''}>Custom Configuration</option>
                        </select>
                    </div>

                    <div>
                        <label class="text-xs font-semibold text-gray-600 uppercase mb-1 block">Additional Details</label>
                        <textarea class="pro-select w-full" rows="3"
                                  data-category="courseInfo" data-field="description"
                                  placeholder="e.g., Designed by Jack Nicklaus, Ocean views, Links-style...">${pricing.courseInfo?.description || ''}</textarea>
                    </div>
                </div>

                <!-- Nine Configuration (appears for 18/27/36 hole courses) -->
                <div id="nineConfigSection" style="display: ${this.shouldShowNineConfig(pricing.courseInfo?.courseType) ? 'block' : 'none'}; margin-top: 1rem;">
                    <hr class="my-3 border-gray-200">
                    <h4 class="text-sm font-semibold text-gray-700 mb-3">Configure Course Nines</h4>
                    <div id="nineConfigGrid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        ${this.renderNineConfigurations(pricing)}
                    </div>
                </div>
            </div>

            <!-- Operating Hours & Booking Settings -->
            <div class="pro-card mb-4">
                <h3 class="pro-section-title">Operating Hours & Booking Settings</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                        <label class="text-xs font-semibold text-gray-600 uppercase mb-1 block">Opening Time</label>
                        <select class="pro-select w-full" data-time-picker data-default="${pricing.courseSettings?.operatingHours?.start || '06:00'}"
                               data-category="courseSettings" data-sub="operatingHours" data-field="start"></select>
                    </div>
                    <div>
                        <label class="text-xs font-semibold text-gray-600 uppercase mb-1 block">Closing Time</label>
                        <select class="pro-select w-full" data-time-picker data-default="${pricing.courseSettings?.operatingHours?.end || '19:00'}"
                               data-category="courseSettings" data-sub="operatingHours" data-field="end"></select>
                    </div>
                    <div>
                        <label class="text-xs font-semibold text-gray-600 uppercase mb-1 block">Slot Interval (minutes)</label>
                        <select class="pro-select w-full"
                                data-category="courseSettings" data-field="slotInterval">
                            <option value="5" ${pricing.courseSettings?.slotInterval === 5 ? 'selected' : ''}>5 minutes</option>
                            <option value="7" ${pricing.courseSettings?.slotInterval === 7 ? 'selected' : ''}>7 minutes</option>
                            <option value="10" ${pricing.courseSettings?.slotInterval === 10 ? 'selected' : ''}>10 minutes</option>
                            <option value="12" ${pricing.courseSettings?.slotInterval === 12 ? 'selected' : ''}>12 minutes</option>
                            <option value="15" ${pricing.courseSettings?.slotInterval === 15 ? 'selected' : ''}>15 minutes</option>
                        </select>
                    </div>
                    <div>
                        <label class="text-xs font-semibold text-gray-600 uppercase mb-1 block">Max Players Per Slot</label>
                        <select class="pro-select w-full"
                                data-category="courseSettings" data-field="maxPlayersPerSlot">
                            <option value="1" ${pricing.courseSettings?.maxPlayersPerSlot === 1 ? 'selected' : ''}>1 Player</option>
                            <option value="2" ${pricing.courseSettings?.maxPlayersPerSlot === 2 ? 'selected' : ''}>2 Players</option>
                            <option value="3" ${pricing.courseSettings?.maxPlayersPerSlot === 3 ? 'selected' : ''}>3 Players</option>
                            <option value="4" ${pricing.courseSettings?.maxPlayersPerSlot === 4 ? 'selected' : ''}>4 Players</option>
                            <option value="5" ${pricing.courseSettings?.maxPlayersPerSlot === 5 ? 'selected' : ''}>5 Players</option>
                            <option value="6" ${pricing.courseSettings?.maxPlayersPerSlot === 6 ? 'selected' : ''}>6 Players</option>
                        </select>
                    </div>
                    <div>
                        <label class="text-xs font-semibold text-gray-600 uppercase mb-1 block">Advance Booking Limit</label>
                        <select class="pro-select w-full"
                                data-category="courseSettings" data-field="advanceBookingDays">
                            <option value="7" ${pricing.courseSettings?.advanceBookingDays === 7 ? 'selected' : ''}>7 days</option>
                            <option value="14" ${pricing.courseSettings?.advanceBookingDays === 14 ? 'selected' : ''}>14 days</option>
                            <option value="30" ${pricing.courseSettings?.advanceBookingDays === 30 ? 'selected' : ''}>30 days</option>
                            <option value="60" ${pricing.courseSettings?.advanceBookingDays === 60 ? 'selected' : ''}>60 days</option>
                            <option value="90" ${pricing.courseSettings?.advanceBookingDays === 90 ? 'selected' : ''}>90 days</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- Time Period Configuration -->
            <div class="pro-card mt-4">
                <h3 class="pro-section-title">Pricing Time Periods</h3>
                <p class="text-xs text-gray-600 mb-4">Configure when peak, midday, and evening pricing applies</p>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <!-- Peak Period -->
                    <div>
                        <label class="text-xs font-semibold text-gray-600 uppercase mb-2 block">Peak Hours</label>
                        <div class="flex items-center gap-2">
                            <select class="pro-select flex-1" data-time-picker data-default="${pricing.timePeriods?.peak?.start || '08:00'}"
                                   data-category="timePeriods" data-sub="peak" data-field="start"></select>
                            <span class="text-xs">to</span>
                            <select class="pro-select flex-1" data-time-picker data-default="${pricing.timePeriods?.peak?.end || '14:00'}"
                                   data-category="timePeriods" data-sub="peak" data-field="end"></select>
                        </div>
                    </div>

                    <!-- Midday Period -->
                    <div>
                        <label class="text-xs font-semibold text-gray-600 uppercase mb-2 block">Midday Hours</label>
                        <div class="flex items-center gap-2">
                            <select class="pro-select flex-1" data-time-picker data-default="${pricing.timePeriods?.midday?.start || '14:00'}"
                                   data-category="timePeriods" data-sub="midday" data-field="start"></select>
                            <span class="text-xs">to</span>
                            <select class="pro-select flex-1" data-time-picker data-default="${pricing.timePeriods?.midday?.end || '17:00'}"
                                   data-category="timePeriods" data-sub="midday" data-field="end"></select>
                        </div>
                    </div>

                    <!-- Evening Period -->
                    <div>
                        <label class="text-xs font-semibold text-gray-600 uppercase mb-2 block">Evening Hours</label>
                        <div class="flex items-center gap-2">
                            <select class="pro-select flex-1" data-time-picker data-default="${pricing.timePeriods?.evening?.start || '17:00'}"
                                   data-category="timePeriods" data-sub="evening" data-field="start"></select>
                            <span class="text-xs">to</span>
                            <select class="pro-select flex-1" data-time-picker data-default="${pricing.timePeriods?.evening?.end || '19:00'}"
                                   data-category="timePeriods" data-sub="evening" data-field="end"></select>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.attachPriceUpdateHandlers();
        // Initialize time pickers
        if (window.TimePickerUtils) window.TimePickerUtils.initAll(content);
    },

    renderTeeTimesTab() {
        const pricing = this.loadPricing();
        const content = document.getElementById('pricing-tab-content');

        content.innerHTML = `
            <!-- Time Period Configuration -->
            <div class="pro-card mb-4">
                <h3 class="pro-section-title">Time Period Configuration</h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label class="text-xs font-semibold text-gray-600 uppercase mb-2 block">Peak Hours</label>
                        <div class="flex gap-2 items-center">
                            <select class="pro-select flex-1" data-time-picker data-default="${pricing.timePeriods.peak.start}"
                                   data-category="timePeriods" data-sub="peak" data-field="start"></select>
                            <span class="text-sm">to</span>
                            <select class="pro-select flex-1" data-time-picker data-default="${pricing.timePeriods.peak.end}"
                                   data-category="timePeriods" data-sub="peak" data-field="end"></select>
                        </div>
                    </div>
                    <div>
                        <label class="text-xs font-semibold text-gray-600 uppercase mb-2 block">Midday Hours</label>
                        <div class="flex gap-2 items-center">
                            <select class="pro-select flex-1" data-time-picker data-default="${pricing.timePeriods.midday.start}"
                                   data-category="timePeriods" data-sub="midday" data-field="start"></select>
                            <span class="text-sm">to</span>
                            <select class="pro-select flex-1" data-time-picker data-default="${pricing.timePeriods.midday.end}"
                                   data-category="timePeriods" data-sub="midday" data-field="end"></select>
                        </div>
                    </div>
                    <div>
                        <label class="text-xs font-semibold text-gray-600 uppercase mb-2 block">Evening Hours</label>
                        <div class="flex gap-2 items-center">
                            <select class="pro-select flex-1" data-time-picker data-default="${pricing.timePeriods.evening.start}"
                                   data-category="timePeriods" data-sub="evening" data-field="start"></select>
                            <span class="text-sm">to</span>
                            <select class="pro-select flex-1" data-time-picker data-default="${pricing.timePeriods.evening.end}"
                                   data-category="timePeriods" data-sub="evening" data-field="end"></select>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Customer Type Pricing -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                ${this.renderCustomerTypeCard('member', 'Members', pricing.teeTime.member, pricing.courseSettings.allowWalking)}
                ${this.renderCustomerTypeCard('guest', 'Guests', pricing.teeTime.guest, pricing.courseSettings.allowWalking)}
                ${this.renderCustomerTypeCard('walkin', 'Walk-ins', pricing.teeTime.walkin, pricing.courseSettings.allowWalking)}
            </div>
        `;

        this.attachPriceUpdateHandlers();
        // Initialize time pickers
        if (window.TimePickerUtils) window.TimePickerUtils.initAll(content);
    },

    renderCustomerTypeCard(type, label, rates, allowWalking) {
        return `
            <div class="pro-card">
                <h3 class="pro-section-title">${label}</h3>
                <div class="space-y-3">
                    ${this.renderPriceRow('Peak', type, 'peak', rates.peak, allowWalking)}
                    ${this.renderPriceRow('Midday', type, 'midday', rates.midday, allowWalking)}
                    ${this.renderPriceRow('Evening', type, 'evening', rates.evening, allowWalking)}
                    ${this.renderPriceRow('Weekend', type, 'weekend', rates.weekend, allowWalking)}
                </div>
            </div>
        `;
    },

    renderPriceRow(label, type, period, prices, allowWalking) {
        return `
            <div>
                <div class="text-xs font-semibold text-gray-600 uppercase mb-1">${label}</div>
                <div class="grid grid-cols-2 gap-2">
                    <div>
                        <label class="text-xs text-gray-500">With Cart</label>
                        <input type="number" class="pro-select w-full text-right"
                               data-category="teeTime" data-sub="${type}" data-period="${period}" data-field="cart"
                               value="${prices.cart}">
                    </div>
                    <div ${!allowWalking ? 'style="opacity:0.5;pointer-events:none;"' : ''}>
                        <label class="text-xs text-gray-500">Walking</label>
                        <input type="number" class="pro-select w-full text-right"
                               data-category="teeTime" data-sub="${type}" data-period="${period}" data-field="walking"
                               value="${prices.walking}">
                    </div>
                </div>
            </div>
        `;
    },

    renderGroupTypeCard(type, label, config) {
        return `
            <div class="pro-card">
                <h3 class="pro-section-title">${label}</h3>
                <div class="space-y-3">
                    <div class="flex justify-between items-center">
                        <span class="text-sm text-gray-600">Per Person</span>
                        <input type="number" class="pro-select w-32 text-right"
                               data-category="teeTime" data-sub="${type}" data-field="perPerson"
                               value="${config.perPerson}">
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="text-sm text-gray-600">Min Players</span>
                        <input type="number" class="pro-select w-32 text-right"
                               data-category="teeTime" data-sub="${type}" data-field="minimumPlayers"
                               value="${config.minimumPlayers}">
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="text-sm text-gray-600">Discount %</span>
                        <input type="number" class="pro-select w-32 text-right"
                               data-category="teeTime" data-sub="${type}" data-field="discount"
                               value="${config.discount}">
                    </div>
                </div>
            </div>
        `;
    },

    renderCaddiesTab() {
        const pricing = this.loadPricing();
        const content = document.getElementById('pricing-tab-content');

        content.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="pro-card">
                    <h3 class="pro-section-title">Caddy Fees</h3>
                    <div class="space-y-3">
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-gray-600">Standard Caddy</span>
                            <input type="number" class="pro-select w-32 text-right"
                                   data-category="caddy" data-field="standard"
                                   value="${pricing.caddy.standard}">
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-gray-600">Premium Caddy</span>
                            <input type="number" class="pro-select w-32 text-right"
                                   data-category="caddy" data-field="premium"
                                   value="${pricing.caddy.premium}">
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-gray-600">Tournament Caddy</span>
                            <input type="number" class="pro-select w-32 text-right"
                                   data-category="caddy" data-field="tournament"
                                   value="${pricing.caddy.tournament}">
                        </div>
                    </div>
                </div>

                <div class="pro-card">
                    <h3 class="pro-section-title">Golf Cart Fees</h3>

                    <!-- Course Policy Settings -->
                    <div class="mb-4 p-3 bg-gray-50 rounded">
                        <label class="flex items-center cursor-pointer mb-2">
                            <input type="checkbox" class="mr-2" id="cart-compulsory-toggle"
                                   ${pricing.courseSettings.cartCompulsory ? 'checked' : ''}
                                   onchange="AdminPricingControl.toggleCartCompulsory(this.checked)">
                            <span class="text-sm font-semibold">Golf Carts Compulsory</span>
                        </label>
                        <label class="flex items-center cursor-pointer">
                            <input type="checkbox" class="mr-2" id="walking-allowed-toggle"
                                   ${pricing.courseSettings.allowWalking ? 'checked' : ''}
                                   onchange="AdminPricingControl.toggleWalkingAllowed(this.checked)">
                            <span class="text-sm font-semibold">Allow Walking</span>
                        </label>
                    </div>

                    <div class="space-y-3">
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-gray-600">Full Round</span>
                            <input type="number" class="pro-select w-32 text-right"
                                   data-category="cart" data-field="fullRound"
                                   value="${pricing.cart.fullRound}">
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-gray-600">Half Round</span>
                            <input type="number" class="pro-select w-32 text-right"
                                   data-category="cart" data-field="halfRound"
                                   value="${pricing.cart.halfRound}">
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.attachPriceUpdateHandlers();
    },

    renderSocietyTab() {
        const content = document.getElementById('pricing-tab-content');
        content.innerHTML = `
            <div class="pro-card">
                <h3 class="pro-section-title">Society Golf Organizer Tools</h3>
                <p class="text-sm text-gray-600 mb-4">Configure special rates for golf societies and manage bookings</p>
                <button class="pro-btn" onclick="AdminPricingControl.openSocietyBookingForm()">
                    <span class="material-symbols-outlined" style="font-size:1rem;vertical-align:middle;">add</span>
                    Create Society Event
                </button>
            </div>
        `;
    },

    renderProShopTab() {
        const content = document.getElementById('pricing-tab-content');
        content.innerHTML = `
            <div class="pro-card">
                <h3 class="pro-section-title">Pro Shop Pricing & Inventory</h3>
                <p class="text-sm text-gray-600 mb-4">Manage product pricing, markup, and promotions</p>
                <button class="pro-btn" onclick="AdminPricingControl.openProShopManager()">
                    Manage Products
                </button>
            </div>
        `;
    },

    renderRestaurantTab() {
        const content = document.getElementById('pricing-tab-content');
        content.innerHTML = `
            <div class="pro-card">
                <h3 class="pro-section-title">Restaurant Menu & Pricing</h3>
                <p class="text-sm text-gray-600 mb-4">Manage menu items, prices, and daily specials</p>
                <button class="pro-btn" onclick="AdminPricingControl.openMenuManager()">
                    Manage Menu
                </button>
            </div>
        `;
    },

    renderPromotionsTab() {
        const pricing = this.loadPricing();
        const content = document.getElementById('pricing-tab-content');

        content.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                ${this.renderPromotionCard('earlyBird', 'Early Bird Special', pricing.promotions.earlyBird)}
                ${this.renderPromotionCard('twilight', 'Twilight Discount', pricing.promotions.twilight)}
                ${this.renderPromotionCard('seniorDiscount', 'Senior Discount', pricing.promotions.seniorDiscount)}
            </div>
        `;

        this.attachPromotionHandlers();
        // Initialize time pickers
        if (window.TimePickerUtils) window.TimePickerUtils.initAll(content);
    },

    renderPromotionCard(promoKey, title, promo) {
        return `
            <div class="pro-card">
                <div class="flex justify-between items-start mb-3">
                    <h3 class="pro-section-title mb-0">${title}</h3>
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" class="sr-only peer promo-toggle" data-promo="${promoKey}"
                               ${promo.enabled ? 'checked' : ''}>
                        <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                    </label>
                </div>

                <div class="space-y-3">
                    ${promo.discount !== undefined ? `
                        <div>
                            <label class="text-xs font-semibold text-gray-600 uppercase mb-1 block">Discount %</label>
                            <input type="number" class="pro-select w-full" min="0" max="100"
                                   data-promo="${promoKey}" data-field="discount"
                                   value="${promo.discount}">
                        </div>
                    ` : ''}

                    ${promo.timeStart ? `
                        <div>
                            <label class="text-xs font-semibold text-gray-600 uppercase mb-1 block">Time Range</label>
                            <div class="flex gap-2 items-center">
                                <select class="pro-select flex-1" data-time-picker data-default="${promo.timeStart}"
                                       data-promo="${promoKey}" data-field="timeStart"></select>
                                <span class="text-sm">to</span>
                                <select class="pro-select flex-1" data-time-picker data-default="${promo.timeEnd}"
                                       data-promo="${promoKey}" data-field="timeEnd"></select>
                            </div>
                        </div>
                    ` : ''}

                    ${promo.minimumAge ? `
                        <div>
                            <label class="text-xs font-semibold text-gray-600 uppercase mb-1 block">Minimum Age</label>
                            <input type="number" class="pro-select w-full"
                                   data-promo="${promoKey}" data-field="minimumAge"
                                   value="${promo.minimumAge}">
                        </div>
                    ` : ''}

                    <!-- Distribution Options -->
                    <div class="border-t pt-3 mt-3">
                        <label class="text-xs font-semibold text-gray-600 uppercase mb-2 block">Send To</label>
                        <div class="space-y-2">
                            <label class="flex items-center cursor-pointer">
                                <input type="checkbox" class="mr-2"
                                       data-promo="${promoKey}" data-field="sendTo.homeMembers"
                                       ${promo.sendTo?.homeMembers ? 'checked' : ''}>
                                <span class="text-sm">Home Course Members</span>
                            </label>
                            <label class="flex items-center cursor-pointer">
                                <input type="checkbox" class="mr-2"
                                       data-promo="${promoKey}" data-field="sendTo.optInGolfers"
                                       ${promo.sendTo?.optInGolfers ? 'checked' : ''}>
                                <span class="text-sm">Opt-in Golfers</span>
                            </label>
                        </div>
                    </div>

                    <button class="pro-btn w-full mt-3" onclick="AdminPricingControl.sendPromotion('${promoKey}')">
                        <span class="material-symbols-outlined" style="font-size:1rem;vertical-align:middle;">send</span>
                        Send Promotion
                    </button>
                </div>
            </div>
        `;
    },

    renderEventsTab() {
        const content = document.getElementById('pricing-tab-content');
        content.innerHTML = `
            <div class="pro-card">
                <h3 class="pro-section-title">Club Tournaments & Special Events</h3>
                <p class="text-sm text-gray-600 mb-4">Plan and manage club tournaments with custom pricing, field sizes, and formats</p>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div class="p-4 border border-gray-200 rounded">
                        <div class="text-xs font-semibold text-gray-600 uppercase mb-1">Weekly Tournaments</div>
                        <div class="text-2xl font-bold">0</div>
                    </div>
                    <div class="p-4 border border-gray-200 rounded">
                        <div class="text-xs font-semibold text-gray-600 uppercase mb-1">Special Events</div>
                        <div class="text-2xl font-bold">0</div>
                    </div>
                </div>

                <button class="pro-btn" onclick="AdminPricingControl.openEventCreator()">
                    <span class="material-symbols-outlined" style="font-size:1rem;vertical-align:middle;">event</span>
                    Create Tournament/Event
                </button>
            </div>

            <div class="pro-card mt-4">
                <h4 class="font-semibold mb-3">Upcoming Tournaments</h4>
                <div class="text-center py-8 text-gray-500">
                    <span class="material-symbols-outlined text-4xl block mb-2">emoji_events</span>
                    <p>No tournaments scheduled</p>
                </div>
            </div>
        `;
    },

    // Event handlers
    attachPriceUpdateHandlers() {
        const inputs = document.querySelectorAll('input[data-category], textarea[data-category], select[data-category]');
        inputs.forEach(input => {
            input.addEventListener('change', (e) => {
                const category = e.target.dataset.category;
                const subcategory = e.target.dataset.sub || null;
                const period = e.target.dataset.period || null;
                const field = e.target.dataset.field;

                let value = e.target.value;
                if (e.target.type === 'number') {
                    value = parseFloat(e.target.value);
                }

                const pricing = this.loadPricing();

                // Ensure category objects exist
                if (!pricing[category]) {
                    pricing[category] = {};
                }

                // Handle nested teeTime pricing (cart/walking)
                if (category === 'teeTime' && period) {
                    if (!pricing[category][subcategory]) {
                        pricing[category][subcategory] = {};
                    }
                    if (!pricing[category][subcategory][period]) {
                        pricing[category][subcategory][period] = {};
                    }
                    pricing[category][subcategory][period][field] = value;
                } else if (subcategory) {
                    // Handle nested objects like courseSettings.operatingHours
                    if (!pricing[category][subcategory]) {
                        pricing[category][subcategory] = {};
                    }
                    pricing[category][subcategory][field] = value;
                } else {
                    // Direct field assignment
                    pricing[category][field] = value;
                }

                this.savePricing(pricing);
                this.showToast('Settings updated');
            });
        });
    },

    attachPromotionHandlers() {
        const inputs = document.querySelectorAll('input[data-promo]');
        inputs.forEach(input => {
            input.addEventListener('change', (e) => {
                const promoName = e.target.dataset.promo;
                const field = e.target.dataset.field;
                const pricing = this.loadPricing();

                if (!pricing.promotions[promoName]) return;

                // Handle toggle
                if (e.target.classList.contains('promo-toggle')) {
                    pricing.promotions[promoName].enabled = e.target.checked;
                    this.savePricing(pricing);
                    this.showToast(e.target.checked ? 'Promotion activated' : 'Promotion deactivated');
                }
                // Handle nested sendTo fields
                else if (field && field.includes('.')) {
                    const [parent, child] = field.split('.');
                    if (!pricing.promotions[promoName][parent]) {
                        pricing.promotions[promoName][parent] = {};
                    }
                    pricing.promotions[promoName][parent][child] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
                    this.savePricing(pricing);
                    this.showToast('Distribution updated');
                }
                // Handle direct fields
                else if (field) {
                    const value = e.target.type === 'number' ? parseFloat(e.target.value) : e.target.value;
                    pricing.promotions[promoName][field] = value;
                    this.savePricing(pricing);
                    this.showToast('Promotion updated');
                }
            });
        });
    },

    showToast(message) {
        // Simple toast notification
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-4 right-4 bg-black text-white px-4 py-2 rounded-lg shadow-lg text-sm';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
    },

    // Toggle functions
    toggleCartCompulsory(checked) {
        console.log('[Toggle] Cart Compulsory:', checked);
        const pricing = this.loadPricing();
        pricing.courseSettings.cartCompulsory = checked;

        // If carts are compulsory, disable walking
        if (checked) {
            pricing.courseSettings.allowWalking = false;
            const walkingToggle = document.getElementById('walking-allowed-toggle');
            if (walkingToggle) walkingToggle.checked = false;
        }

        this.savePricing(pricing);
        console.log('[Toggle] Saved pricing, refreshing UI...');
        this.showToast(checked ? 'Carts now compulsory' : 'Carts optional');

        // Force immediate refresh with setTimeout 0 to ensure it happens after save
        setTimeout(() => {
            this.refreshQuickStats();
            this.refreshActiveTab();
        }, 0);
    },

    toggleWalkingAllowed(checked) {
        console.log('[Toggle] Walking Allowed:', checked);
        const pricing = this.loadPricing();
        pricing.courseSettings.allowWalking = checked;

        // If walking is allowed, carts can't be compulsory
        if (checked) {
            pricing.courseSettings.cartCompulsory = false;
            const cartToggle = document.getElementById('cart-compulsory-toggle');
            if (cartToggle) cartToggle.checked = false;
        }

        this.savePricing(pricing);
        console.log('[Toggle] Saved pricing, refreshing UI...');
        this.showToast(checked ? 'Walking allowed' : 'Walking not allowed');

        // Force immediate refresh with setTimeout 0 to ensure it happens after save
        setTimeout(() => {
            this.refreshQuickStats();
            this.refreshActiveTab();
        }, 0);
    },

    // Refresh quick stats
    refreshQuickStats() {
        const pricing = this.loadPricing();

        // Find the quick stats grid more specifically
        const dashboardContainer = document.getElementById('admin-pricing-dashboard');
        if (!dashboardContainer) return;

        const quickStatsCard = dashboardContainer.querySelector('.pro-card .grid.grid-cols-1.md\\:grid-cols-4');
        if (quickStatsCard) {
            quickStatsCard.innerHTML = `
                <div>
                    <div class="text-xs font-semibold text-gray-600 uppercase mb-1">Member Peak (Cart)</div>
                    <div class="text-2xl font-bold text-gray-900">฿${pricing.teeTime.member.peak.cart.toLocaleString()}</div>
                </div>
                <div>
                    <div class="text-xs font-semibold text-gray-600 uppercase mb-1">Standard Caddy</div>
                    <div class="text-2xl font-bold text-gray-900">฿${pricing.caddy.standard.toLocaleString()}</div>
                </div>
                <div>
                    <div class="text-xs font-semibold text-gray-600 uppercase mb-1">Active Promotions</div>
                    <div class="text-2xl font-bold text-gray-900">${this.countActivePromotions(pricing)}</div>
                </div>
                <div>
                    <div class="text-xs font-semibold text-gray-600 uppercase mb-1">Walking Allowed</div>
                    <div class="text-2xl font-bold text-gray-900" id="walking-allowed-stat">${pricing.courseSettings.allowWalking ? 'Yes' : 'No'}</div>
                </div>
            `;
            console.log('[QuickStats] Refreshed - Walking Allowed:', pricing.courseSettings.allowWalking);
        } else {
            console.error('[QuickStats] Could not find quick stats grid');
        }
    },

    // Refresh active tab
    refreshActiveTab() {
        const activeTab = document.querySelector('.pricing-tab.active');
        if (activeTab) {
            const tabName = activeTab.dataset.tab;
            switch(tabName) {
                case 'teetimes': this.renderTeeTimesTab(); break;
                case 'caddies': this.renderCaddiesTab(); break;
                case 'events': this.renderEventsTab(); break;
                case 'proshop': this.renderProShopTab(); break;
                case 'restaurant': this.renderRestaurantTab(); break;
                case 'promotions': this.renderPromotionsTab(); break;
            }
        }
    },

    // Handle course selection from dropdown
    handleCourseSelection(courseSlug) {
        const pricing = this.loadPricing();
        console.log('[AdminPricingControl] Course selection changed to:', courseSlug);

        if (courseSlug === 'custom') {
            // Show custom input
            const customDiv = document.getElementById('customCourseNameDiv');
            if (customDiv) customDiv.style.display = 'block';
            pricing.courseInfo.courseSlug = 'custom';
            this.savePricing(pricing);
            console.log('[AdminPricingControl] Custom course selected, config saved');
            return;
        }

        if (!courseSlug) {
            const customDiv = document.getElementById('customCourseNameDiv');
            if (customDiv) customDiv.style.display = 'none';
            return;
        }

        // Hide custom input
        const customDiv = document.getElementById('customCourseNameDiv');
        if (customDiv) customDiv.style.display = 'none';

        // Get course data from GolfCoursesDatabase
        if (typeof GolfCoursesDatabase !== 'undefined') {
            const course = GolfCoursesDatabase.courses.find(c => c.slug === courseSlug);
            if (course) {
                // Auto-fill course information
                pricing.courseInfo.courseSlug = course.slug;
                pricing.courseInfo.courseName = course.name;
                pricing.courseInfo.location = course.location || '';
                pricing.courseInfo.configured = true; // Mark as configured

                // Auto-generate Course ID from name
                pricing.courseInfo.courseId = this.generateCourseId(course.name);

                // Set course type based on holes
                if (course.holes === 9) {
                    pricing.courseInfo.courseType = '9-hole-executive';
                } else if (course.holes === 18) {
                    pricing.courseInfo.courseType = '18-hole-championship';
                } else if (course.holes === 27) {
                    pricing.courseInfo.courseType = '27-hole-championship';
                } else if (course.holes === 36) {
                    pricing.courseInfo.courseType = '36-hole-championship';
                }

                this.savePricing(pricing);
                console.log('[AdminPricingControl] Course saved:', pricing.courseInfo);
                this.showToast(`Course info loaded: ${course.name}`);

                // Refresh the tab to show updated values
                this.renderCourseConfigTab();
            }
        } else {
            console.warn('[AdminPricingControl] GolfCoursesDatabase not available');
        }
    },

    // Generate Course ID from course name
    generateCourseId(courseName) {
        // Extract abbreviation from course name
        const words = courseName.split(' ').filter(w => w.length > 0);

        // Common patterns
        if (courseName.toLowerCase().includes('pattana')) return 'PATTANA';
        if (courseName.toLowerCase().includes('pattaya country')) return 'PCC';
        if (courseName.toLowerCase().includes('bang pra')) return 'BANGPRA';
        if (courseName.toLowerCase().includes('siam country')) return 'SIAM';
        if (courseName.toLowerCase().includes('phoenix')) return 'PHOENIX';

        // Generate from initials if specific match not found
        if (words.length >= 2) {
            return words.slice(0, 3).map(w => w[0]).join('').toUpperCase();
        }

        // Single word - take first 6 characters
        return courseName.substring(0, 6).toUpperCase().replace(/\s/g, '');
    },

    // Check if nine configuration should be shown
    shouldShowNineConfig(courseType) {
        if (!courseType) return false;
        return courseType.includes('18-hole') ||
               courseType.includes('27-hole') ||
               courseType.includes('36-hole');
    },

    // Render nine configuration inputs based on course type
    renderNineConfigurations(pricing) {
        const courseType = pricing.courseInfo?.courseType || '';
        const nineConfig = pricing.courseInfo?.nineConfig || {};

        let nineCount = 0;
        if (courseType.includes('18-hole')) nineCount = 2;
        else if (courseType.includes('27-hole')) nineCount = 3;
        else if (courseType.includes('36-hole')) nineCount = 4;

        if (nineCount === 0) return '';

        const nineLetters = ['A', 'B', 'C', 'D'];
        let html = '';

        for (let i = 0; i < nineCount; i++) {
            const letter = nineLetters[i];
            const nineName = nineConfig[letter] || '';

            html += `
                <div class="border border-gray-200 rounded-lg p-3 bg-gray-50">
                    <label class="text-xs font-bold text-gray-700 uppercase mb-2 block">Nine ${letter}</label>
                    <input type="text"
                           id="nine-${letter}"
                           class="pro-select w-full text-sm"
                           data-nine-letter="${letter}"
                           value="${nineName}"
                           placeholder="Optional: e.g., Ocean Nine, Front Nine"
                           onchange="AdminPricingControl.handleNineNameChange('${letter}', this.value)">
                    <p class="text-xs text-gray-500 mt-1">Leave empty to show just "${letter}"</p>
                </div>
            `;
        }

        return html;
    },

    // Handle course type change - show/hide nine config section
    handleCourseTypeChange(courseType) {
        const pricing = this.loadPricing();
        pricing.courseInfo.courseType = courseType;

        // Initialize nineConfig if needed
        if (!pricing.courseInfo.nineConfig) {
            pricing.courseInfo.nineConfig = {};
        }

        this.savePricing(pricing);

        // Show/hide nine config section
        const nineSection = document.getElementById('nineConfigSection');
        if (nineSection) {
            nineSection.style.display = this.shouldShowNineConfig(courseType) ? 'block' : 'none';
        }

        // Re-render nine configurations
        const nineGrid = document.getElementById('nineConfigGrid');
        if (nineGrid) {
            nineGrid.innerHTML = this.renderNineConfigurations(pricing);
        }

        this.showToast(`Course type updated: ${courseType}`);
    },

    // Handle nine name change
    handleNineNameChange(letter, name) {
        const pricing = this.loadPricing();

        if (!pricing.courseInfo.nineConfig) {
            pricing.courseInfo.nineConfig = {};
        }

        pricing.courseInfo.nineConfig[letter] = name;
        this.savePricing(pricing);

        this.showToast(`Nine ${letter} updated: ${name || 'cleared'}`);
    },

    sendPromotion(promoKey) {
        const pricing = this.loadPricing();
        const promo = pricing.promotions[promoKey];

        if (!promo || !promo.enabled) {
            this.showToast('Please enable promotion first');
            return;
        }

        const recipients = [];
        if (promo.sendTo.homeMembers) recipients.push('Home Members');
        if (promo.sendTo.optInGolfers) recipients.push('Opt-in Golfers');

        if (recipients.length === 0) {
            this.showToast('Please select recipients');
            return;
        }

        // TODO: Integrate with LINE messaging or email system
        this.showToast(`Promotion sent to ${recipients.join(' & ')}`);
        console.log('Sending promotion:', promoKey, 'to:', recipients, promo);
    },

    // Placeholder functions for future implementation
    openProShopManager() {
        alert('Pro Shop manager - coming soon');
    },

    openMenuManager() {
        alert('Restaurant menu manager - coming soon');
    },

    openEventCreator() {
        alert('Tournament/Event creator - coming soon');
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Auto-render if pricing dashboard container exists
    const container = document.getElementById('admin-pricing-dashboard');
    if (container) {
        AdminPricingControl.renderPricingDashboard();
    }
});

// Export for use in other modules
window.AdminPricingControl = AdminPricingControl;

console.log('✅ [ADMIN-PRICING-CONTROL.JS] VERSION 2.1.0 LOADED SUCCESSFULLY');
console.log('✅ [AdminPricingControl] Available functions:', Object.keys(AdminPricingControl));
