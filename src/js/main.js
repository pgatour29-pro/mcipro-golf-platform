// ===== INITIALIZATION & ROUTING =====
        
async function initializeApp() {
    showLoading();
    
    try {
        // Attempt to initialize LIFF
        await liff.init({ liffId: "2008228481" });

        if (!liff.isLoggedIn()) {
            console.log("User not logged in with LINE. Redirecting to login.");
            liff.login();
            return; // Stop further execution until redirected
        }
        
        // Get user profile from LINE
        const lineProfile = await liff.getProfile();
        const idToken = liff.getIDToken();

        // Store LINE token for other services (e.g., Supabase Edge Functions)
        if (idToken) {
            sessionStorage.setItem('__line_id_token', idToken);
        }

        // Check for user in our database
        let { data: userProfile, error } = await SupabaseManager.client
            .from('profiles')
            .select('*')
            .eq('line_user_id', lineProfile.userId)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116: "exact one row" violation - means no user found
            console.error("Error fetching user profile:", error);
            showError("Could not connect to database. Please try again later.");
            return;
        }

        if (userProfile) {
            // User exists, update state and show main dashboard
            AppState.setCurrentUser({
                ...userProfile,
                displayName: lineProfile.displayName,
                avatarUrl: lineProfile.pictureUrl,
                lineUserId: lineProfile.userId
            });
            console.log('User profile loaded:', AppState.currentUser);
            showScreen('main');
        } else {
            // New user, show profile creation screen
            AppState.setCurrentUser({
                displayName: lineProfile.displayName,
                avatarUrl: lineProfile.pictureUrl,
                lineUserId: line.userId
            });
            console.log('New user detected. Showing profile creation.');
            showScreen('createProfile');
        }

    } catch (err) {
        console.error("LIFF Initialization failed:", err);
        // If LIFF fails, could be running in a regular browser
        // Check for a locally stored user session for web-based access
        const localUser = AppState.loadUserFromStorage();
        if (localUser) {
            AppState.setCurrentUser(localUser);
            console.log('LIFF failed, but local session found:', localUser);
            showScreen('main');
        } else {
            showError("Could not initialize app. Please ensure you are using the LINE app or a supported browser.");
        }
    } finally {
        hideLoading();
    }
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
    const screenElement = document.getElementById(screenId);
    if (screenElement) {
        screenElement.classList.add('active');
        AppState.currentScreen = screenId;
        
        // Update URL for better navigation history (optional)
        const url = new URL(window.location);
        url.searchParams.set('screen', screenId);
        history.pushState({ screen: screenId }, '', url);

    } else {
        console.error(`Screen with ID "${screenId}" not found.`);
        showError("The page you're looking for doesn't exist.");
    }
}

function showError(message) {
    const errorContainer = document.getElementById('errorContainer');
    if(errorContainer) {
        errorContainer.textContent = message;
        errorContainer.style.display = 'block';
    }
    hideLoading();
}

function showLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) loadingOverlay.style.display = 'flex';
}

function hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) loadingOverlay.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', initializeApp);

// ============================================
// MAIN APPLICATION SCRIPT
// ============================================
document.addEventListener('DOMContentLoaded', async () => {

console.log("[v2.1.0] Document loaded. Initializing MciPro...");

// =========================================================================
// STATE & UTILITY FUNCTIONS
// =========================================================================

const state = {
    currentUser: null,
    currentScreen: 'loginScreen',
    activeTab: 'home',
    activeSubTab: {},
    isOnline: navigator.onLine,
    isNative: false,
    lastSync: 0,
    currentLanguage: 'en',
    languageData: {},
    currentRound: null,
    currentScramble: null,
    activeFilters: {
        schedule: 'all'
    },
    deviceProfile: null,
    emergencyAlerts: [],
    bookings: [],
    caddies: [],
    courses: [],
    societies: [],
    allUsers: [], // For admin/manager roles
    liveLocationWatcher: null,
    liveScoreWatcher: null,
    isScorecardKeypadOpen: false,
};

const UI = {
    screens: {
        login: document.getElementById('loginScreen'),
        createProfile: document.getElementById('createProfileScreen'),
        main: document.getElementById('mainScreen'),
    },
    // All other UI elements are queried dynamically to avoid null errors on startup
    query: (selector) => document.querySelector(selector),
    queryAll: (selector) => document.querySelectorAll(selector),
    
    show: (id) => { const el = document.getElementById(id); if (el) el.style.display = 'block'; },
    hide: (id) => { const el = document.getElementById(id); if (el) el.style.display = 'none'; },
    
    setText: (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; },
    setHtml: (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; },
    
    showLoading: () => UI.show('loadingOverlay'),
    hideLoading: () => UI.hide('loadingOverlay'),

    showError: (message) => {
        console.error("UI Error:", message);
        const errorContainer = UI.query('#errorContainer');
        if (errorContainer) {
            errorContainer.textContent = message;
            errorContainer.style.display = 'block';
            setTimeout(() => errorContainer.style.display = 'none', 5000);
        }
    },

    showSuccess: (message) => {
        console.log("UI Success:", message);
        const successContainer = document.createElement('div');
        successContainer.className = 'fixed top-5 right-5 bg-green-500 text-white p-4 rounded-lg shadow-lg z-50';
        successContainer.textContent = message;
        document.body.appendChild(successContainer);
        setTimeout(() => successContainer.remove(), 3000);
    },

    showScreen(screenId) {
        console.log(`[Navigation] Showing screen: ${screenId}`);
        Object.values(this.screens).forEach(screen => {
            if (screen) screen.classList.remove('active');
        });
        const targetScreen = this.screens[screenId] || document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.add('active');
            state.currentScreen = screenId;
            
            // Update URL for better navigation history
            const url = new URL(window.location);
            if (url.searchParams.get('screen') !== screenId) {
                url.searchParams.set('screen', screenId);
                history.pushState({ screen: screenId }, '', url);
            }
        } else {
            this.showError(`Screen "${screenId}" not found.`);
        }
    },

    updateAvatar(elementId, url) {
        const img = document.getElementById(elementId);
        if (img) {
            img.src = url || 'https://via.placeholder.com/80'; // Fallback
        }
    },

    renderTabs(role) {
        const tabs = getTabsForRole(role);
        const tabContainer = UI.query(`#${role}Dashboard`);
        const drawerNav = UI.query('#mobileDrawer nav');
        
        if (!tabContainer || !drawerNav) return;

        const tabHtml = `
            <div class="border-b border-gray-200 bg-white sticky top-16 z-30 tab-navigation">
                <div class="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
                    <nav class="-mb-px flex space-x-2 overflow-x-auto scrollbar-hide" aria-label="Tabs">
                        ${tabs.map(tab => `
                            <button data-tab="${tab.id}" class="tab-button ${state.activeTab === tab.id ? 'active' : ''}">
                                <span class="material-symbols-outlined">${tab.icon}</span>
                                <span>${tab.label}</span>
                            </button>
                        `).join('')}
                    </nav>
                </div>
            </div>
            <div class="py-4">
                ${tabs.map(tab => `<div id="tab-${tab.id}" class="tab-content ${state.activeTab === tab.id ? 'active' : ''}"></div>`).join('')}
            </div>
        `;
        
        tabContainer.innerHTML = tabHtml;

        // Render drawer menu
        const drawerHtml = tabs.map(tab => `
            <a href="#" data-tab="${tab.id}" class="drawer-link">
                <span class="material-symbols-outlined">${tab.icon}</span>
                <span>${tab.label}</span>
            </a>
        `).join('');
         drawerNav.innerHTML = `<div class="py-2">${drawerHtml}</div>`;
    }
};

// =========================================================================
// AUTHENTICATION
// =========================================================================

async function initLiff() {
    try {
        await liff.init({ liffId: "2008228481" });
        if (!liff.isLoggedIn()) {
            console.log("Not logged in with LINE. Forcing login.");
            liff.login({ redirectUri: window.location.href });
            return null;
        }
        const lineProfile = await liff.getProfile();
        const idToken = liff.getIDToken();
        if (idToken) {
            sessionStorage.setItem('__line_id_token', idToken);
        }
        return lineProfile;
    } catch (err) {
        console.warn("LIFF init failed. This might be a normal browser session.", err);
        return null; // Not a fatal error, could be a web user
    }
}

async function handleAuthentication() {
    UI.showLoading();
    let lineProfile = await initLiff();

    if (lineProfile) {
        // Logged in with LINE
        let { data: user, error } = await SupabaseManager.client
            .from('profiles')
            .select('*')
            .eq('line_user_id', lineProfile.userId)
            .single();
        
        if (error && error.code !== 'PGRST116') {
             UI.showError(`Database error: ${error.message}`);
             return;
        }

        if (user) {
            state.currentUser = { ...user, ...lineProfile, lineUserId: lineProfile.userId, avatarUrl: lineProfile.pictureUrl };
            AppState.setCurrentUser(state.currentUser);
            UI.showScreen('main');
            await postLoginSetup();
        } else {
             // New LINE user
            state.currentUser = { ...lineProfile, lineUserId: lineProfile.userId, avatarUrl: lineProfile.pictureUrl, displayName: lineProfile.displayName };
            AppState.setCurrentUser(state.currentUser);
            setupProfileCreationScreen();
            UI.showScreen('createProfile');
        }
    } else {
        // Not in LINE, check for local session (email/password, etc.)
        const localUser = AppState.loadUserFromStorage();
        if (localUser) {
            state.currentUser = localUser;
            UI.showScreen('main');
            await postLoginSetup();
        } else {
            UI.showScreen('login');
        }
    }
    UI.hideLoading();
}

function setupProfileCreationScreen() {
    UI.updateAvatar('profileAvatar', state.currentUser.avatarUrl);
    UI.setText('profileDisplayName', state.currentUser.displayName);
    
    UI.query('#completeProfileButton').onclick = async () => {
        const username = UI.query('#usernameInput').value.trim();
        const selectedRole = UI.query('input[name="role"]:checked').value;

        if (!username) {
            UI.showError("Please enter a username.");
            return;
        }

        UI.showLoading();
        try {
            // Ensure Supabase user exists before creating profile
            const { data: { user: sbUser }, error: authError } = await AuthBridge.ensureSupabaseSession();
            if (authError) throw authError;

            const newProfile = {
                id: sbUser.id, // This is the Supabase user UUID
                line_user_id: state.currentUser.lineUserId,
                username: username,
                display_name: state.currentUser.displayName,
                avatar_url: state.currentUser.avatarUrl,
                role: selectedRole,
                updated_at: new Date().toISOString()
            };
            
            const { data, error } = await SupabaseManager.client
                .from('profiles')
                .insert(newProfile)
                .select()
                .single();

            if (error) throw error;
            
            state.currentUser = { ...data, ...state.currentUser };
            AppState.setCurrentUser(state.currentUser);
            UI.showScreen('main');
            await postLoginSetup();

        } catch (error) {
            console.error("Profile creation failed:", error);
            UI.showError(`Failed to create profile: ${error.message}`);
        } finally {
            UI.hideLoading();
        }
    };
}

// =========================================================================
// POST-LOGIN SETUP
// =========================================================================

async function postLoginSetup() {
    console.log(`[Setup] Configuring UI for role: ${state.currentUser.role}`);
    
    // Populate user info in header
    UI.updateAvatar('userAvatar', state.currentUser.avatarUrl);
    UI.setText('userDisplayName', state.currentUser.displayName);
    UI.setText('userRole', state.currentUser.role);
    
    // Populate drawer user info
    UI.updateAvatar('drawerUserAvatar', state.currentUser.avatarUrl);
    UI.setText('drawerUserDisplayName', state.currentUser.displayName);
    UI.setText('drawerUserRole', state.currentUser.role);

    // Render the correct dashboard tabs
    UI.renderTabs(state.currentUser.role);
    
    // Initialize role-specific features
    await initDashboard(state.currentUser.role);
    
    // Add event listeners
    setupGlobalEventListeners();
    setupTabNavigation();
    setupDrawerNavigation();

    // Start background sync
    setInterval(() => AppState.syncData(), 60000); // Sync every minute
}

async function initDashboard(role) {
    // Load data common to most roles first
    await loadCourses();
    await loadSocieties();

    // Role-specific initializations
    switch (role) {
        case 'golfer':
            await initGolferDashboard();
            break;
        case 'caddie':
            await initCaddieDashboard();
            break;
        case 'manager':
             await initManagerDashboard();
            break;
        case 'proshop':
            await initProshopDashboard();
            break;
        case 'admin':
            await initAdminDashboard();
            break;
    }

    // Activate the last active tab, or default
    const lastTab = AppState.getActiveTab(role + 'Dashboard');
    const defaultTab = getTabsForRole(role)[0].id;
    showTab(lastTab || defaultTab);
}

// =========================================================================
// DATA FETCHING
// =========================================================================

async function loadCourses() {
    try {
        const { data, error } = await SupabaseManager.client
            .from('courses')
            .select('*')
            .order('name');
        if (error) throw error;
        state.courses = data;
        console.log(`[Data] Loaded ${data.length} courses.`);
    } catch (error) {
        UI.showError(`Could not load courses: ${error.message}`);
    }
}

async function loadSocieties() {
    try {
        const { data, error } = await SupabaseManager.client
            .from('societies')
            .select('*')
            .order('name');
        if (error) throw error;
        state.societies = data;
         console.log(`[Data] Loaded ${data.length} societies.`);
    } catch (error)
    {
        UI.showError(`Could not load societies: ${error.message}`);
    }
}

async function loadBookings() {
    try {
        const { data, error } = await SupabaseManager.client
            .from('bookings')
            .select(`*, course:courses(name), caddie:caddies(display_name)`)
            .eq('user_id', state.currentUser.id)
            .order('booking_time', { ascending: false });
        if (error) throw error;
        state.bookings = data;
        console.log(`[Data] Loaded ${data.length} bookings for user.`);
    } catch (error) {
        UI.showError(`Could not load bookings: ${error.message}`);
    }
}

// =========================================================================
// DASHBOARD INITIALIZERS
// =========================================================================

function getTabsForRole(role) {
    const allTabs = {
        home: { id: 'home', label: 'Home', icon: 'home' },
        bookings: { id: 'bookings', label: 'Bookings', icon: 'calendar_month' },
        history: { id: 'history', label: 'History', icon: 'history' },
        profile: { id: 'profile', label: 'Profile', icon: 'person' },
        liveScore: { id: 'liveScore', label: 'Live Score', icon: 'scoreboard' },
        society: { id: 'society', label: 'Society Golf', icon: 'groups' },
        // Caddie
        schedule: { id: 'schedule', label: 'My Schedule', icon: 'event' },
        earnings: { id: 'earnings', label: 'Earnings', icon: 'payments' },
        // Manager
        caddyManagement: { id: 'caddyManagement', label: 'Caddies', icon: 'badge' },
        courseManagement: { id: 'courseManagement', label: 'Courses', icon: 'golf_course' },
        bookingManagement: { id: 'bookingManagement', label: 'Bookings', icon: 'book_online' },
        analytics: { id: 'analytics', label: 'Analytics', icon: 'analytics' },
        // Proshop
        pos: { id: 'pos', label: 'POS', icon: 'point_of_sale' },
        inventory: { id: 'inventory', label: 'Inventory', icon: 'inventory_2' },
         // Admin
        userManagement: { id: 'userManagement', label: 'Users', icon: 'manage_accounts'},
        systemHealth: { id: 'systemHealth', label: 'System', icon: 'shield'}
    };

    switch (role) {
        case 'golfer':
            return [allTabs.home, allTabs.bookings, allTabs.liveScore, allTabs.history, allTabs.society, allTabs.profile];
        case 'caddie':
            return [allTabs.schedule, allTabs.earnings, allTabs.profile];
        case 'manager':
            return [allTabs.analytics, allTabs.caddyManagement, allTabs.courseManagement, allTabs.bookingManagement, allTabs.society];
        case 'proshop':
            return [allTabs.pos, allTabs.inventory, allTabs.analytics];
        case 'admin':
            return [allTabs.userManagement, allTabs.analytics, allTabs.systemHealth, allTabs.society];
        default:
            return [allTabs.home, allTabs.profile];
    }
}

async function initGolferDashboard() {
    await loadBookings();
    renderHomeTab();
    renderBookingsTab();
    renderLiveScoreTab();
    renderHistoryTab();
    renderSocietyTab();
    renderProfileTab();
}

async function initCaddieDashboard() {
    // ... Caddie-specific logic
    renderScheduleTab();
    renderEarningsTab();
    renderProfileTab();
}

 async function initManagerDashboard() {
    renderAnalyticsTab();
    renderCaddyManagementTab();
    // ... and so on
}

async function initProshopDashboard() {
    // ...
}

async function initAdminDashboard() {
    // ...
}


// =========================================================================
// TAB RENDERERS
// =========================================================================

function renderHomeTab() {
    const container = UI.query('#tab-home');
    if (!container) return;
    
    const nextBooking = state.bookings.find(b => new Date(b.booking_time) > new Date());
    
    container.innerHTML = `
        <div class="space-y-6">
            <div class="glass-card p-6 text-center">
                <h2 class="text-3xl font-bold text-gray-800">Good Morning, ${state.currentUser.display_name}!</h2>
                <p class="text-gray-600 mt-2">Ready for your next round?</p>
            </div>

            ${nextBooking ? `
            <div class="bg-white rounded-xl shadow-md p-5">
                <h3 class="font-bold text-lg mb-3">Next Booking</h3>
                <div class="flex items-center space-x-4">
                    <img src="https://picsum.photos/seed/${nextBooking.course.name}/80/80" class="w-20 h-20 rounded-lg object-cover">
                    <div>
                        <p class="font-semibold text-xl">${nextBooking.course.name}</p>
                        <p class="text-gray-500">${new Date(nextBooking.booking_time).toLocaleString()}</p>
                        ${nextBooking.caddie ? `<p class="text-sm text-green-600 font-medium">Caddie: ${nextBooking.caddie.display_name}</p>` : ''}
                    </div>
                </div>
                 <button class="btn-primary mt-4 w-full justify-center" onclick="showTab('liveScore')">
                    Start Round
                </button>
            </div>
            ` : `
             <div class="bg-white rounded-xl shadow-md p-5 text-center">
                <p class="text-gray-600 mb-4">You have no upcoming bookings.</p>
                 <button class="btn-primary" onclick="showTab('bookings')">Book a Round</button>
             </div>
            `}

            <div class="grid grid-cols-2 gap-4">
                <div class="metric-card text-center">
                     <div class="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
                         <span class="material-symbols-outlined text-green-600">golf_course</span>
                     </div>
                    <p class="metric-value">12</p>
                    <p class="metric-label">Rounds Played</p>
                </div>
                 <div class="metric-card text-center">
                     <div class="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-2">
                         <span class="material-symbols-outlined text-blue-600">trending_up</span>
                     </div>
                    <p class="metric-value">-2.4</p>
                    <p class="metric-label">Handicap</p>
                </div>
            </div>
        </div>
    `;
}

function renderBookingsTab() {
    const container = UI.query('#tab-bookings');
    if (!container) return;

    container.innerHTML = `
        <div class="flex justify-between items-center mb-4">
            <h2 class="text-2xl font-bold">My Bookings</h2>
            <button id="newBookingBtn" class="btn-primary">
                <span class="material-symbols-outlined">add</span> New Booking
            </button>
        </div>
        <div id="bookingsList" class="space-y-4">
            <!-- Bookings will be rendered here -->
        </div>
    `;
    
    renderBookingList();
    UI.query('#newBookingBtn').onclick = () => showNewBookingForm();
}

function renderBookingList() {
    const listContainer = UI.query('#bookingsList');
    if (!listContainer) return;

    if (state.bookings.length === 0) {
        listContainer.innerHTML = `<p class="text-center text-gray-500 py-8">No bookings found.</p>`;
        return;
    }

    listContainer.innerHTML = state.bookings.map(booking => `
        <div class="booking-card bg-white p-4 rounded-lg shadow flex justify-between items-center">
            <div>
                <p class="font-bold text-lg">${booking.course.name}</p>
                <p class="text-sm text-gray-600">${new Date(booking.booking_time).toLocaleString()}</p>
                <p class="text-sm">Status: <span class="status-badge ${'status-' + booking.status}">${booking.status}</span></p>
            </div>
            <div>
                <button class="btn-sm btn-outline" onclick="viewBookingDetails('${booking.id}')">Details</button>
            </div>
        </div>
    `).join('');
}

function showNewBookingForm() {
    const container = UI.query('#tab-bookings');
    if (!container) return;

    container.innerHTML = `
        <div class="bg-white p-6 rounded-xl shadow-lg">
            <h2 class="text-2xl font-bold mb-4">Book a New Round</h2>
            <div class="space-y-4">
                <div>
                    <label for="courseSelect" class="form-label">Golf Course</label>
                    <select id="courseSelect" class="form-input">
                        ${state.courses.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                    </select>
                </div>
                 <div>
                    <label for="bookingDate" class="form-label">Date & Time</label>
                    <input type="datetime-local" id="bookingDate" class="form-input">
                </div>
                 <div>
                    <label for="numPlayers" class="form-label">Number of Players</label>
                    <input type="number" id="numPlayers" class="form-input" min="1" max="4" value="1">
                </div>
                 <div>
                    <input type="checkbox" id="requestCaddie" class="h-4 w-4 text-primary-600 border-gray-300 rounded">
                    <label for="requestCaddie" class="ml-2">Request a Caddie</label>
                </div>
            </div>
             <div class="mt-6 flex justify-end space-x-2">
                <button id="cancelBookingBtn" class="btn-secondary">Cancel</button>
                <button id="confirmBookingBtn" class="btn-primary">Confirm Booking</button>
            </div>
        </div>
    `;

    UI.query('#cancelBookingBtn').onclick = () => renderBookingsTab();
    UI.query('#confirmBookingBtn').onclick = async () => {
        const courseId = UI.query('#courseSelect').value;
        const bookingTime = UI.query('#bookingDate').value;
        const numPlayers = UI.query('#numPlayers').value;
        const requestCaddie = UI.query('#requestCaddie').checked;

        if (!courseId || !bookingTime) {
            UI.showError("Please select a course and date.");
            return;
        }

        UI.showLoading();
        try {
            const { data, error } = await SupabaseManager.client
                .from('bookings')
                .insert({
                    course_id: courseId,
                    user_id: state.currentUser.id,
                    booking_time: bookingTime,
                    players: parseInt(numPlayers),
                    caddie_requested: requestCaddie,
                    status: 'confirmed'
                });
            if (error) throw error;
            
            UI.showSuccess("Booking confirmed!");
            await loadBookings();
            renderBookingsTab();

        } catch (error) {
            UI.showError(`Booking failed: ${error.message}`);
        } finally {
            UI.hideLoading();
        }
    };
}

function renderLiveScoreTab() {
    const container = UI.query('#tab-liveScore');
    if (!container) return;

    if (state.currentRound) {
        renderScorecard();
    } else {
        container.innerHTML = `
            <div class="text-center p-6 bg-white rounded-xl shadow-lg">
                <h2 class="text-2xl font-bold mb-4">Start a New Round</h2>
                <p class="text-gray-600 mb-6">Select a course to begin tracking your score live.</p>
                <div class="max-w-md mx-auto space-y-4">
                    <select id="startRoundCourseSelect" class="form-input">
                         <option value="">-- Select a Course --</option>
                         ${state.courses.map(c => `<option value="${c.id}" data-nines='${JSON.stringify(c.nines)}'>${c.name}</option>`).join('')}
                    </select>
                     <select id="startRoundNineSelect" class="form-input" style="display:none;"></select>
                    <button id="startRoundBtn" class="btn-primary w-full justify-center disabled:opacity-50" disabled>
                        <span class="material-symbols-outlined">play_circle</span>
                        Start Scoring
                    </button>
                </div>
            </div>`;
        
        const courseSelect = UI.query('#startRoundCourseSelect');
        const nineSelect = UI.query('#startRoundNineSelect');
        const startBtn = UI.query('#startRoundBtn');

        courseSelect.onchange = () => {
            const selectedOption = courseSelect.options[courseSelect.selectedIndex];
            const nines = JSON.parse(selectedOption.dataset.nines || 'null');
            
            if (nines && nines.length > 0) {
                nineSelect.innerHTML = nines.map(n => `<option value="${n.name}">${n.name}</option>`).join('');
                nineSelect.style.display = 'block';
                startBtn.disabled = false;
            } else {
                nineSelect.style.display = 'none';
                startBtn.disabled = courseSelect.value === '';
            }
        };
        
        startBtn.onclick = startNewRound;
    }
}

function renderHistoryTab() {
    const container = UI.query('#tab-history');
    if (!container) return;
    // ... History rendering logic
}
 function renderSocietyTab() {
    const container = UI.query('#tab-society');
    if (!container) return;

    container.innerHTML = `
        <div class="space-y-6">
            <div class="flex justify-between items-center">
                <h2 class="text-2xl font-bold">Society Golf</h2>
                 <button id="findSocietyBtn" class="btn-sm btn-outline">Find Societies</button>
            </div>
            
            <div id="mySocietiesSection">
                <h3 class="text-lg font-semibold mb-2">My Societies</h3>
                <div id="mySocietiesList" class="space-y-3">
                    <!-- My societies will be loaded here -->
                </div>
            </div>

            <div id="upcomingEventsSection">
                 <h3 class="text-lg font-semibold mb-2">Upcoming Events</h3>
                 <div id="societyEventsList" class="space-y-3">
                     <!-- Events will be loaded here -->
                 </div>
            </div>
        </div>
    `;
    
    SocietyGolf.init(state.currentUser, SupabaseManager.client, UI);
    SocietyGolf.renderMySocieties();
    SocietyGolf.renderUpcomingEvents();
}

function renderProfileTab() {
    const container = UI.query('#tab-profile');
    if (!container) return;
    
    const user = state.currentUser;
    container.innerHTML = `
         <div class="max-w-md mx-auto bg-white rounded-2xl shadow-lg p-6 space-y-6">
            <div class="text-center">
                <img src="${user.avatarUrl || 'https://via.placeholder.com/120'}" alt="Profile Picture" class="w-32 h-32 rounded-full mx-auto object-cover border-4 border-primary-300">
                <h2 class="text-2xl font-bold mt-4">${user.displayName}</h2>
                <p class="text-gray-500">@${user.username}</p>
            </div>
            <div class="grid grid-cols-2 gap-4 text-center">
                <div>
                    <p class="font-bold text-xl">12</p>
                    <p class="text-sm text-gray-500">Rounds</p>
                </div>
                 <div>
                    <p class="font-bold text-xl">-2.4</p>
                    <p class="text-sm text-gray-500">Handicap</p>
                </div>
            </div>
            <div class="border-t pt-4 space-y-3">
                 <div class="flex items-center">
                    <span class="material-symbols-outlined text-gray-500 mr-3">badge</span>
                    <p>Role: <span class="font-semibold">${user.role}</span></p>
                </div>
                 <div class="flex items-center">
                    <span class="material-symbols-outlined text-gray-500 mr-3">home_pin</span>
                    <p>Home Course: <span id="homeCourseDisplay" class="font-semibold">${user.home_course_name || 'Not Set'}</span></p>
                    <button id="editHomeCourseBtn" class="ml-auto text-sm text-blue-600">Edit</button>
                </div>
            </div>
             <button id="viewFullProfileBtn" class="btn-primary w-full justify-center">View Full Profile</button>
        </div>
    `;

    UI.query('#editHomeCourseBtn').onclick = () => {
         // Logic to show a modal with course selection
         UI.showError('Home course editing not yet implemented.');
    };
}

 function renderScheduleTab() {
    // ...
}
function renderEarningsTab() {
    // ...
}

 function renderAnalyticsTab() {
    const container = UI.query('#tab-analytics');
    if(!container) return;
    container.innerHTML = "<h2>Analytics Dashboard</h2><p>Coming soon...</p>";
}

function renderCaddyManagementTab() {
    const container = UI.query('#tab-caddyManagement');
    if(!container) return;
    container.innerHTML = "<h2>Caddie Management</h2><p>Coming soon...</p>";
}

// =========================================================================
// EVENT LISTENERS & NAVIGATION
// =========================================================================

function setupGlobalEventListeners() {
    UI.query('#logoutButton').onclick = logout;
    UI.query('#drawerLogoutButton').onclick = logout;
    UI.query('#chatButton').onclick = () => ProfessionalChat.openChat();
    UI.query('#emergencyButton').onclick = () => UI.showError("Emergency feature not implemented.");

    // Language toggle
    UI.query('#langEnBtn').onclick = () => switchLanguage('en');
    UI.query('#langThBtn').onclick = () => switchLanguage('th');
}

function setupTabNavigation() {
    const dashboard = UI.query(`#${state.currentUser.role}Dashboard`);
    if (!dashboard) return;
    
    dashboard.addEventListener('click', (e) => {
        const button = e.target.closest('.tab-button');
        if (button && button.dataset.tab) {
            showTab(button.dataset.tab);
        }
    });
}

function setupDrawerNavigation() {
    const drawer = UI.query('#mobileDrawer');
    const overlay = UI.query('#mobileDrawerOverlay');
    const openBtn = UI.query('#hamburgerMenuBtn');
    const closeBtn = UI.query('#closeDrawerBtn');

    if (!drawer || !overlay || !openBtn || !closeBtn) return;
    
    const openDrawer = () => {
        overlay.classList.add('show');
        drawer.classList.add('open');
    }
    
    const closeDrawer = () => {
        overlay.classList.remove('show');
        drawer.classList.remove('open');
    }

    openBtn.onclick = openDrawer;
    closeBtn.onclick = closeDrawer;
    overlay.onclick = closeDrawer;

    drawer.addEventListener('click', (e) => {
        const link = e.target.closest('.drawer-link');
        if (link && link.dataset.tab) {
            e.preventDefault();
            showTab(link.dataset.tab);
            closeDrawer();
        }
    });
}

function showTab(tabId) {
    const dashboardId = state.currentUser.role + 'Dashboard';
    
    UI.queryAll(`#${dashboardId} .tab-button`).forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    UI.queryAll(`#${dashboardId} .tab-content`).forEach(content => {
        content.classList.toggle('active', content.id === `tab-${tabId}`);
    });

    state.activeTab = tabId;
    AppState.setActiveTab(dashboardId, tabId);
    console.log(`[Navigation] Switched to tab: ${tabId}`);
}

async function switchLanguage(lang) {
    if (lang === state.currentLanguage) return;
    
    await AppState.loadLanguage(lang);
    state.currentLanguage = lang;
    
    // Re-render UI elements that have text
    UI.queryAll('[data-lang-key]').forEach(el => {
        const key = el.dataset.langKey;
        const replacements = JSON.parse(el.dataset.langReplacements || '{}');
        el.textContent = AppState.translate(key, replacements);
    });
    
    // Update active button style
    UI.queryAll('.language-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
    });

    // Re-render the current dashboard to update dynamic text
    await initDashboard(state.currentUser.role);
    UI.showSuccess(`Language changed to ${lang === 'en' ? 'English' : 'Thai'}`);
}

async function logout() {
    UI.showLoading();
    try {
        if (liff.isInClient()) {
            liff.logout();
        }
        await SupabaseManager.client.auth.signOut();
        AppState.setCurrentUser(null);
        sessionStorage.clear();
        localStorage.clear();
        console.log('[Auth] User logged out successfully.');
        window.location.reload();
    } catch (error) {
        console.error('Logout failed:', error);
        UI.showError('An error occurred during logout.');
    } finally {
        UI.hideLoading();
    }
}

// =========================================================================
// CORE FUNCTIONALITY
// =========================================================================

async function startNewRound() {
    const courseId = UI.query('#startRoundCourseSelect').value;
    const nineName = UI.query('#startRoundNineSelect').value;
    
    if (!courseId) {
        UI.showError("Please select a course.");
        return;
    }

    const course = state.courses.find(c => c.id === courseId);
    if (!course) {
        UI.showError("Selected course not found.");
        return;
    }

    UI.showLoading();
    try {
        // Logic to create a new round in the database
        const { data, error } = await SupabaseManager.client
            .from('rounds')
            .insert({
                user_id: state.currentUser.id,
                course_id: course.id,
                course_name: course.name,
                status: 'in_progress',
                type: 'live',
                started_at: new Date().toISOString(),
                // other fields...
            })
            .select()
            .single();

        if (error) throw error;

        state.currentRound = { ...data, holes: [], players: [ { id: state.currentUser.id, name: state.currentUser.displayName, scores: {} } ] };
        console.log('[Scoring] New round started:', state.currentRound);
        
        renderLiveScoreTab(); // Re-render the tab to show the scorecard

    } catch (error) {
        UI.showError(`Failed to start round: ${error.message}`);
    } finally {
        UI.hideLoading();
    }
}

function renderScorecard() {
    const container = UI.query('#tab-liveScore');
    if (!container || !state.currentRound) return;

    // More sophisticated rendering would be needed here, this is a placeholder
    container.innerHTML = `
        <div class="bg-white p-6 rounded-xl shadow-lg">
            <h2 class="text-2xl font-bold mb-4">Live Scorecard</h2>
            <p>Course: ${state.currentRound.course_name}</p>
            <p>Status: ${state.currentRound.status}</p>
            <div id="scorecard-grid" class="mt-4">
                <!-- Scorecard grid will be rendered here -->
            </div>
             <div class="mt-6 flex justify-between">
                <button id="addPlayerBtn" class="btn-secondary">Add Player</button>
                <button id="finishRoundBtn" class="btn-primary">Finish Round</button>
            </div>
        </div>
    `;
    
    // Logic to render the actual scorecard grid based on holes and players
    
    UI.query('#finishRoundBtn').onclick = async () => {
         UI.showLoading();
         try {
            // Finalize round in DB
            const { error } = await SupabaseManager.client
                .from('rounds')
                .update({ status: 'completed', completed_at: new Date().toISOString() })
                .eq('id', state.currentRound.id);
            if (error) throw error;
            
            UI.showSuccess("Round finished and saved!");
            state.currentRound = null;
            await loadBookings(); // Refresh data
            renderLiveScoreTab(); // Go back to start round screen
            showTab('history'); // Switch to history tab to show the new round
         } catch(error) {
             UI.showError(`Failed to finish round: ${error.message}`);
         } finally {
             UI.hideLoading();
         }
    };
}


// =========================================================================
// INITIAL EXECUTION
// =========================================================================

await handleAuthentication();

});
