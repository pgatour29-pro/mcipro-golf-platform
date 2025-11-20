import { state } from '../main.js';
import { UI } from './ui.js';
import { SocietyGolf } from './society-golf.js';

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

export { renderHomeTab, renderBookingsTab, renderLiveScoreTab, renderHistoryTab, renderSocietyTab, renderProfileTab, renderScheduleTab, renderEarningsTab, renderAnalyticsTab, renderCaddyManagementTab };
