#!/usr/bin/env python3
"""
Update SocietyCalendar JavaScript to render list view instead of grid
"""

print("Reading index.html...")
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the render() method
render_start = content.find('    render() {\n        // Update month/year header')
if render_start == -1:
    print("[ERROR] Could not find render() method")
    exit(1)

# Find the end of createDayCell() method (end of old rendering logic)
create_day_cell_end = content.find('    getEventsForDate(dateStr) {', render_start)
if create_day_cell_end == -1:
    print("[ERROR] Could not find getEventsForDate method")
    exit(1)

print(f"[OK] Found render() and createDayCell() methods")

# New render() method for list view
new_render_method = '''    render() {
        // Update month/year header
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                          'July', 'August', 'September', 'October', 'November', 'December'];
        document.getElementById('calendarMonthYear').textContent =
            `${monthNames[this.currentMonth]} ${this.currentYear}`;

        // Get events for current month
        const eventsThisMonth = this.events.filter(e => {
            const eventDate = new Date(e.date);
            return eventDate.getFullYear() === this.currentYear &&
                   eventDate.getMonth() === this.currentMonth;
        }).sort((a, b) => new Date(a.date) - new Date(b.date));

        const tbody = document.getElementById('calendarEventsBody');

        if (eventsThisMonth.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="px-6 py-12 text-center text-gray-500">
                        <span class="material-symbols-outlined text-5xl mb-2 block">event_busy</span>
                        <p class="text-sm">No events scheduled for ${monthNames[this.currentMonth]} ${this.currentYear}</p>
                        <button onclick="window.SocietyOrganizerSystem?.showEventForm(null)"
                                class="mt-4 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition">
                            Create Event
                        </button>
                    </td>
                </tr>
            `;
            return;
        }

        // Render events as table rows
        tbody.innerHTML = eventsThisMonth.map(event => {
            const eventDate = new Date(event.date);
            const dayNum = eventDate.getDate();
            const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][eventDate.getDay()];

            const departTime = event.departure_time || 'TBD';
            const course = event.golf_club || 'TBD';
            const registered = event.registered_count || 0;
            const maxPlayers = event.max_players || 0;

            // Calculate total fee
            const baseFee = event.base_fee || 0;
            const cartFee = event.cart_fee || 0;
            const caddyFee = event.caddy_fee || 0;
            const transportFee = event.transport_fee || 0;
            const compFee = event.competition_fee || 0;
            const totalFee = baseFee + cartFee + caddyFee + transportFee + compFee;

            // Get status badge
            const statusBadge = this.getStatusBadge(event);

            // Row styling
            const rowClass = 'hover:bg-gray-50 cursor-pointer transition';

            return `
                <tr class="${rowClass}" onclick="window.SocietyCalendar?.showEventDetails('${event.id}')">
                    <td class="px-3 py-4 whitespace-nowrap">
                        <div class="text-2xl font-bold text-gray-800">${dayNum}</div>
                    </td>
                    <td class="px-3 py-4 whitespace-nowrap">
                        <div class="text-sm font-medium text-gray-600">${dayName}</div>
                    </td>
                    <td class="px-3 py-4">
                        <div class="text-sm font-semibold text-gray-800">${event.event_name}</div>
                        <div class="text-xs text-gray-500">${event.event_format || 'Format TBD'}</div>
                    </td>
                    <td class="px-3 py-4">
                        <div class="text-sm text-gray-700">${course}</div>
                    </td>
                    <td class="px-3 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-700">${departTime}</div>
                    </td>
                    <td class="px-3 py-4 whitespace-nowrap">
                        <div class="text-sm font-medium text-gray-800">฿${totalFee.toLocaleString()}</div>
                    </td>
                    <td class="px-3 py-4 text-center whitespace-nowrap">
                        <div class="text-sm">
                            <span class="font-semibold text-gray-800">${registered}</span>
                            <span class="text-gray-500">/${maxPlayers}</span>
                        </div>
                    </td>
                    <td class="px-3 py-4 text-center">
                        ${statusBadge}
                    </td>
                </tr>
            `;
        }).join('');
    }

    getStatusBadge(event) {
        const eventDate = new Date(event.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const daysUntil = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));

        // Past event
        if (daysUntil < 0) {
            return '<span class="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">Past</span>';
        }

        // Check if closed/full
        const registered = event.registered_count || 0;
        const max = event.max_players || 0;
        if (event.status === 'closed' || (max > 0 && registered >= max)) {
            return '<span class="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">Full</span>';
        }

        // Almost full (90%+)
        if (max > 0 && (registered / max) >= 0.9) {
            return '<span class="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">Almost Full</span>';
        }

        // Closing soon (within 48 hours)
        if (event.registration_cutoff) {
            const cutoff = new Date(event.registration_cutoff);
            const hoursUntil = (cutoff - today) / (1000 * 60 * 60);
            if (hoursUntil > 0 && hoursUntil <= 48) {
                return '<span class="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-700">Closing Soon</span>';
            }
        }

        // Upcoming within 7 days
        if (daysUntil <= 7) {
            return '<span class="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">Soon</span>';
        }

        // Open
        return '<span class="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">Open</span>';
    }

    showEventDetails(eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (!event) return;

        const sidebar = document.getElementById('calendarSidebar');
        const eventDate = new Date(event.date);
        const dateDisplay = eventDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const registered = event.registered_count || 0;
        const max = event.max_players || 0;
        const percentFull = max > 0 ? Math.round((registered / max) * 100) : 0;

        // Calculate fees
        const baseFee = event.base_fee || 0;
        const cartFee = event.cart_fee || 0;
        const caddyFee = event.caddy_fee || 0;
        const transportFee = event.transport_fee || 0;
        const compFee = event.competition_fee || 0;

        sidebar.innerHTML = `
            <div class="mb-4 pb-4 border-b border-gray-200">
                <h3 class="text-lg font-bold text-gray-800 mb-1">${event.event_name}</h3>
                <p class="text-sm text-gray-600">${dateDisplay}</p>
                <div class="mt-2">
                    ${this.getStatusBadge(event)}
                </div>
            </div>

            <div class="space-y-3 text-sm">
                <div>
                    <div class="text-xs text-gray-500 uppercase font-medium">Format</div>
                    <div class="text-gray-800">${event.event_format || 'Not specified'}</div>
                </div>

                <div>
                    <div class="text-xs text-gray-500 uppercase font-medium">Course</div>
                    <div class="text-gray-800">${event.golf_club || 'TBD'}</div>
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <div class="text-xs text-gray-500 uppercase font-medium">Departure</div>
                        <div class="text-gray-800">${event.departure_time || 'TBD'}</div>
                    </div>
                    <div>
                        <div class="text-xs text-gray-500 uppercase font-medium">Players</div>
                        <div class="text-gray-800 font-semibold">${registered}/${max}</div>
                    </div>
                </div>

                ${percentFull > 0 ? `
                <div>
                    <div class="text-xs text-gray-500 uppercase font-medium mb-1">Capacity</div>
                    <div class="w-full bg-gray-200 rounded-full h-2">
                        <div class="bg-sky-600 h-2 rounded-full" style="width: ${percentFull}%"></div>
                    </div>
                    <div class="text-xs text-gray-600 mt-1">${percentFull}% full</div>
                </div>
                ` : ''}

                <div class="pt-3 border-t border-gray-200">
                    <div class="text-xs text-gray-500 uppercase font-medium mb-2">Fees (THB)</div>
                    <div class="space-y-1 text-xs text-gray-700">
                        ${baseFee > 0 ? `<div class="flex justify-between"><span>Green Fee:</span><span>฿${baseFee}</span></div>` : ''}
                        ${cartFee > 0 ? `<div class="flex justify-between"><span>Cart:</span><span>฿${cartFee}</span></div>` : ''}
                        ${caddyFee > 0 ? `<div class="flex justify-between"><span>Caddy:</span><span>฿${caddyFee}</span></div>` : ''}
                        ${transportFee > 0 ? `<div class="flex justify-between"><span>Transport:</span><span>฿${transportFee}</span></div>` : ''}
                        ${compFee > 0 ? `<div class="flex justify-between"><span>Competition:</span><span>฿${compFee}</span></div>` : ''}
                        <div class="flex justify-between font-semibold text-gray-900 pt-1 border-t border-gray-200">
                            <span>Total:</span>
                            <span>฿${(baseFee + cartFee + caddyFee + transportFee + compFee).toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                ${event.notes ? `
                <div class="pt-3 border-t border-gray-200">
                    <div class="text-xs text-gray-500 uppercase font-medium mb-1">Notes</div>
                    <div class="text-xs text-gray-700">${event.notes}</div>
                </div>
                ` : ''}
            </div>

            <div class="mt-6 space-y-2">
                <button onclick="window.SocietyOrganizerSystem?.viewRoster('${event.id}')"
                        class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2">
                    <span class="material-symbols-outlined text-sm">groups</span>
                    View Roster (${registered})
                </button>
                <button onclick="window.SocietyOrganizerSystem?.editEvent('${event.id}')"
                        class="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition flex items-center justify-center gap-2">
                    <span class="material-symbols-outlined text-sm">edit</span>
                    Edit Event
                </button>
            </div>
        `;
    }

    '''

# Replace old methods
content_before = content[:render_start]
content_after = content[create_day_cell_end:]

new_content = content_before + new_render_method + content_after

print("[OK] Replaced render() and createDayCell() with new list rendering logic")

# Write updated content
print("Writing updated index.html...")
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("")
print("="*60)
print("SUCCESS: Calendar JavaScript updated for list view")
print("="*60)
print("")
print("Features:")
print("  - Events displayed as chronological table rows")
print("  - Click row to show full details in sidebar")
print("  - Status badges (Open, Soon, Almost Full, Full, Past)")
print("  - Fee breakdown in sidebar")
print("  - Capacity progress bar")
