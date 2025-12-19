#!/usr/bin/env python3
"""
Implement Society Organizer Calendar View
"""

# Complete calendar HTML with header, grid, and sidebar
CALENDAR_HTML = '''            <!-- Tab: Calendar -->
            <div id="organizerTab-calendar" class="organizer-tab-content" style="display: none;">
                <!-- Calendar Header with Stats -->
                <div class="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div class="text-center p-4 bg-blue-50 rounded-lg">
                            <div class="text-3xl font-bold text-blue-600" id="calendarStatThisMonth">0</div>
                            <div class="text-sm text-gray-600 mt-1">Events This Month</div>
                        </div>
                        <div class="text-center p-4 bg-green-50 rounded-lg">
                            <div class="text-3xl font-bold text-green-600" id="calendarStatPlayers">0</div>
                            <div class="text-sm text-gray-600 mt-1">Total Players</div>
                        </div>
                        <div class="text-center p-4 bg-orange-50 rounded-lg">
                            <div class="text-3xl font-bold text-orange-600" id="calendarStatUpcoming">0</div>
                            <div class="text-sm text-gray-600 mt-1">Next 7 Days</div>
                        </div>
                        <div class="text-center p-4 bg-red-50 rounded-lg">
                            <div class="text-3xl font-bold text-red-600" id="calendarStatAttention">0</div>
                            <div class="text-sm text-gray-600 mt-1">Need Attention</div>
                        </div>
                    </div>
                </div>

                <!-- Calendar Main Area -->
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <!-- Calendar Grid (2/3 width on large screens) -->
                    <div class="lg:col-span-2">
                        <div class="bg-white rounded-lg shadow-sm p-6">
                            <!-- Month Navigation -->
                            <div class="flex items-center justify-between mb-6">
                                <button onclick="window.SocietyCalendar?.prevMonth()"
                                        class="p-2 hover:bg-gray-100 rounded-lg transition">
                                    <span class="material-symbols-outlined">chevron_left</span>
                                </button>

                                <div class="text-center">
                                    <h2 id="calendarMonthYear" class="text-2xl font-bold text-gray-800">
                                        October 2025
                                    </h2>
                                </div>

                                <button onclick="window.SocietyCalendar?.nextMonth()"
                                        class="p-2 hover:bg-gray-100 rounded-lg transition">
                                    <span class="material-symbols-outlined">chevron_right</span>
                                </button>
                            </div>

                            <!-- Calendar Grid -->
                            <div class="calendar-grid">
                                <!-- Day Headers -->
                                <div class="grid grid-cols-7 gap-2 mb-2">
                                    <div class="text-center text-sm font-semibold text-gray-600 py-2">Sun</div>
                                    <div class="text-center text-sm font-semibold text-gray-600 py-2">Mon</div>
                                    <div class="text-center text-sm font-semibold text-gray-600 py-2">Tue</div>
                                    <div class="text-center text-sm font-semibold text-gray-600 py-2">Wed</div>
                                    <div class="text-center text-sm font-semibold text-gray-600 py-2">Thu</div>
                                    <div class="text-center text-sm font-semibold text-gray-600 py-2">Fri</div>
                                    <div class="text-center text-sm font-semibold text-gray-600 py-2">Sat</div>
                                </div>

                                <!-- Calendar Days Container -->
                                <div id="calendarDaysGrid" class="grid grid-cols-7 gap-2">
                                    <!-- Days will be rendered here by JavaScript -->
                                </div>
                            </div>

                            <!-- Legend -->
                            <div class="mt-6 pt-4 border-t border-gray-200">
                                <div class="flex flex-wrap gap-4 text-sm">
                                    <div class="flex items-center gap-2">
                                        <div class="w-3 h-3 rounded-full bg-green-500"></div>
                                        <span class="text-gray-600">Open</span>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <div class="w-3 h-3 rounded-full bg-blue-500"></div>
                                        <span class="text-gray-600">Soon (7 days)</span>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <div class="w-3 h-3 rounded-full bg-red-500"></div>
                                        <span class="text-gray-600">Closed</span>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <div class="w-3 h-3 rounded-full bg-gray-400"></div>
                                        <span class="text-gray-600">Past</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Event Sidebar (1/3 width on large screens) -->
                    <div class="lg:col-span-1">
                        <div id="calendarSidebar" class="bg-white rounded-lg shadow-sm p-6">
                            <div class="text-center text-gray-500 py-8">
                                <span class="material-symbols-outlined text-5xl mb-3">event</span>
                                <p class="text-sm">Click a date to view events</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>'''

# JavaScript for calendar functionality
CALENDAR_JS = '''
// ===== SOCIETY CALENDAR CLASS =====

class SocietyCalendar {
    constructor() {
        this.currentYear = new Date().getFullYear();
        this.currentMonth = new Date().getMonth(); // 0-11
        this.events = [];
        this.selectedDate = null;
    }

    async init() {
        console.log('[Calendar] Initializing Society Calendar...');
        await this.loadEvents();
        this.render();
        this.updateStats();
    }

    async loadEvents() {
        const userId = AppState.currentUser?.lineUserId;
        if (!userId) {
            console.error('[Calendar] No user ID found');
            return;
        }

        try {
            const { data, error } = await window.SupabaseDB.client
                .from('society_events')
                .select('*')
                .eq('organizer_id', userId)
                .order('date', { ascending: true });

            if (error) {
                console.error('[Calendar] Error loading events:', error);
                NotificationManager.show('Failed to load events', 'error');
                return;
            }

            this.events = data || [];
            console.log(`[Calendar] Loaded ${this.events.length} events`);
        } catch (error) {
            console.error('[Calendar] Exception loading events:', error);
        }
    }

    prevMonth() {
        this.currentMonth--;
        if (this.currentMonth < 0) {
            this.currentMonth = 11;
            this.currentYear--;
        }
        this.render();
        this.updateStats();
    }

    nextMonth() {
        this.currentMonth++;
        if (this.currentMonth > 11) {
            this.currentMonth = 0;
            this.currentYear++;
        }
        this.render();
        this.updateStats();
    }

    render() {
        // Update month/year header
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                          'July', 'August', 'September', 'October', 'November', 'December'];
        document.getElementById('calendarMonthYear').textContent =
            `${monthNames[this.currentMonth]} ${this.currentYear}`;

        // Calculate calendar grid
        const firstDay = new Date(this.currentYear, this.currentMonth, 1).getDay();
        const daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();
        const daysInPrevMonth = new Date(this.currentYear, this.currentMonth, 0).getDate();

        const grid = document.getElementById('calendarDaysGrid');
        grid.innerHTML = '';

        // Previous month's trailing days
        for (let i = firstDay - 1; i >= 0; i--) {
            const day = daysInPrevMonth - i;
            grid.appendChild(this.createDayCell(day, 'prev'));
        }

        // Current month's days
        for (let day = 1; day <= daysInMonth; day++) {
            grid.appendChild(this.createDayCell(day, 'current'));
        }

        // Next month's leading days
        const totalCells = grid.children.length;
        const remainingCells = (Math.ceil(totalCells / 7) * 7) - totalCells;
        for (let day = 1; day <= remainingCells; day++) {
            grid.appendChild(this.createDayCell(day, 'next'));
        }
    }

    createDayCell(day, type) {
        const cell = document.createElement('div');

        let year = this.currentYear;
        let month = this.currentMonth;

        if (type === 'prev') {
            month--;
            if (month < 0) {
                month = 11;
                year--;
            }
        } else if (type === 'next') {
            month++;
            if (month > 11) {
                month = 0;
                year++;
            }
        }

        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const eventsOnDate = this.getEventsForDate(dateStr);
        const isToday = this.isToday(year, month, day);

        // Base styling
        cell.className = 'relative aspect-square p-2 rounded-lg border transition cursor-pointer hover:bg-gray-50';

        if (type !== 'current') {
            cell.className += ' text-gray-400 bg-gray-50';
        } else {
            cell.className += ' text-gray-800 bg-white border-gray-200';
        }

        if (isToday) {
            cell.className += ' ring-2 ring-blue-500';
        }

        // Day number
        const dayNum = document.createElement('div');
        dayNum.className = 'text-sm font-semibold mb-1';
        dayNum.textContent = day;
        cell.appendChild(dayNum);

        // Event indicators
        if (eventsOnDate.length > 0) {
            const indicators = document.createElement('div');
            indicators.className = 'flex flex-wrap gap-1 mt-1';

            const maxDots = 3;
            eventsOnDate.slice(0, maxDots).forEach(event => {
                const dot = document.createElement('div');
                dot.className = `w-2 h-2 rounded-full ${this.getEventColor(event)}`;
                indicators.appendChild(dot);
            });

            // Show count if more than 3 events
            if (eventsOnDate.length > maxDots) {
                const more = document.createElement('div');
                more.className = 'text-xs text-gray-600 font-medium';
                more.textContent = `+${eventsOnDate.length - maxDots}`;
                indicators.appendChild(more);
            }

            cell.appendChild(indicators);
        }

        // Click handler
        if (type === 'current' && eventsOnDate.length > 0) {
            cell.onclick = () => this.showEventsForDate(dateStr, eventsOnDate);
        }

        return cell;
    }

    getEventsForDate(dateStr) {
        return this.events.filter(event => event.date === dateStr);
    }

    isToday(year, month, day) {
        const today = new Date();
        return year === today.getFullYear() &&
               month === today.getMonth() &&
               day === today.getDate();
    }

    getEventColor(event) {
        const eventDate = new Date(event.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const daysUntil = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));

        // Past event
        if (daysUntil < 0) return 'bg-gray-400';

        // Check if closed
        if (event.status === 'closed' ||
            (event.max_players && event.registered_count >= event.max_players)) {
            return 'bg-red-500';
        }

        // Upcoming within 7 days
        if (daysUntil <= 7) return 'bg-blue-500';

        // Open event
        return 'bg-green-500';
    }

    showEventsForDate(dateStr, events) {
        this.selectedDate = dateStr;
        const sidebar = document.getElementById('calendarSidebar');

        const date = new Date(dateStr);
        const dateDisplay = date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        let html = `
            <div class="mb-4">
                <h3 class="text-lg font-bold text-gray-800">${dateDisplay}</h3>
                <p class="text-sm text-gray-600">${events.length} event${events.length !== 1 ? 's' : ''}</p>
            </div>
            <div class="space-y-3">
        `;

        events.forEach(event => {
            const statusColor = this.getEventColor(event).replace('bg-', '');
            const registered = event.registered_count || 0;
            const max = event.max_players || 0;

            html += `
                <div class="p-3 border border-gray-200 rounded-lg hover:shadow-md transition cursor-pointer"
                     onclick="window.SocietyOrganizerSystem?.editEvent('${event.id}')">
                    <div class="flex items-start gap-2 mb-2">
                        <div class="w-3 h-3 rounded-full ${this.getEventColor(event)} mt-1"></div>
                        <div class="flex-1">
                            <div class="font-semibold text-gray-800">${event.event_name}</div>
                            <div class="text-xs text-gray-600">${event.event_format || 'Format not set'}</div>
                        </div>
                    </div>
                    <div class="text-xs text-gray-600 space-y-1">
                        <div>📍 ${event.golf_club || 'Location TBD'}</div>
                        <div>👥 ${registered}/${max} players</div>
                        ${event.departure_time ? `<div>🚐 Departs ${event.departure_time}</div>` : ''}
                    </div>
                    <div class="mt-2 flex gap-2">
                        <button onclick="event.stopPropagation(); window.SocietyOrganizerSystem?.viewRoster('${event.id}')"
                                class="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100">
                            View Roster
                        </button>
                        <button onclick="event.stopPropagation(); window.SocietyOrganizerSystem?.editEvent('${event.id}')"
                                class="text-xs px-2 py-1 bg-gray-50 text-gray-600 rounded hover:bg-gray-100">
                            Edit
                        </button>
                    </div>
                </div>
            `;
        });

        html += `
            </div>
            <div class="mt-4 pt-4 border-t border-gray-200">
                <button onclick="window.SocietyOrganizerSystem?.showCreateEventForm()"
                        class="w-full px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition flex items-center justify-center gap-2">
                    <span class="material-symbols-outlined">add</span>
                    Add Event for This Date
                </button>
            </div>
        `;

        sidebar.innerHTML = html;
    }

    updateStats() {
        // Events this month
        const eventsThisMonth = this.events.filter(e => {
            const eventDate = new Date(e.date);
            return eventDate.getFullYear() === this.currentYear &&
                   eventDate.getMonth() === this.currentMonth;
        });

        document.getElementById('calendarStatThisMonth').textContent = eventsThisMonth.length;

        // Total players
        const totalPlayers = eventsThisMonth.reduce((sum, e) => sum + (e.registered_count || 0), 0);
        document.getElementById('calendarStatPlayers').textContent = totalPlayers;

        // Upcoming in next 7 days
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const sevenDaysLater = new Date(today);
        sevenDaysLater.setDate(today.getDate() + 7);

        const upcoming = this.events.filter(e => {
            const eventDate = new Date(e.date);
            return eventDate >= today && eventDate <= sevenDaysLater;
        });

        document.getElementById('calendarStatUpcoming').textContent = upcoming.length;

        // Events needing attention (near capacity or near cutoff)
        const needAttention = eventsThisMonth.filter(e => {
            const registered = e.registered_count || 0;
            const max = e.max_players || 0;
            const percentFull = max > 0 ? (registered / max) * 100 : 0;

            // Near capacity (>80%)
            if (percentFull >= 80 && percentFull < 100) return true;

            // Near cutoff (within 48 hours)
            if (e.registration_cutoff) {
                const cutoff = new Date(e.registration_cutoff);
                const hoursUntil = (cutoff - today) / (1000 * 60 * 60);
                if (hoursUntil > 0 && hoursUntil <= 48) return true;
            }

            return false;
        });

        document.getElementById('calendarStatAttention').textContent = needAttention.length;
    }

    async refresh() {
        await this.loadEvents();
        this.render();
        this.updateStats();
    }
}

// Initialize calendar when Calendar tab is shown
const originalShowOrganizerTab2 = showOrganizerTab;
showOrganizerTab = function(tabName) {
    originalShowOrganizerTab2(tabName);

    // Initialize calendar when Calendar tab is shown
    if (tabName === 'calendar') {
        if (!window.SocietyCalendar) {
            window.SocietyCalendar = new SocietyCalendar();
        }
        setTimeout(() => {
            window.SocietyCalendar.init();
        }, 100);
    }

    // Load PIN status when Admin tab is shown
    if (tabName === 'admin' && window.SocietyOrganizerSystem) {
        setTimeout(() => {
            window.SocietyOrganizerSystem.loadPinStatus();
        }, 100);
    }
};
'''

print("Reading mycaddipro-live.html...")
with open('C:/Users/pete/Documents/MciPro/mycaddipro-live.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Replace calendar tab content
print("Replacing calendar tab content...")
old_calendar = '''            <!-- Tab: Calendar -->
            <div id="organizerTab-calendar" class="organizer-tab-content" style="display: none;">
                <div id="organizerCalendar" class="min-h-[400px]">
                    <!-- Calendar view will be rendered here -->
                </div>
            </div>'''

if old_calendar in content:
    content = content.replace(old_calendar, CALENDAR_HTML)
    print("[OK] Calendar tab HTML replaced")
else:
    print("[ERROR] Could not find calendar tab to replace")
    exit(1)

# 2. Add calendar JavaScript - insert before closing </script> tag at end
print("Adding calendar JavaScript...")
script_end = '''
    </script>

</body>
</html>'''

if script_end in content:
    content = content.replace(script_end, CALENDAR_JS + '\n' + script_end)
    print("[OK] Calendar JavaScript added")
else:
    print("[ERROR] Could not find script closing tag")
    exit(1)

# Write to index.html
print("Writing to index.html...")
with open('C:/Users/pete/Documents/MciPro/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("")
print("=" * 60)
print("SUCCESS: Society Organizer Calendar Implemented")
print("=" * 60)
print("")
print("Features added:")
print("✓ Monthly calendar grid (7x6 layout)")
print("✓ Month navigation (prev/next arrows)")
print("✓ Color-coded event indicators:")
print("  - Green: Open events")
print("  - Blue: Upcoming within 7 days")
print("  - Red: Closed/full events")
print("  - Gray: Past events")
print("✓ Event sidebar on date click")
print("✓ Header stats (events, players, upcoming, attention)")
print("✓ Click events to edit")
print("✓ Quick actions (View Roster, Edit)")
print("✓ Add event button for selected date")
print("")
print("Ready to deploy!")
