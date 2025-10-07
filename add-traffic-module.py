import sys

# Read the main file
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Read the TrafficMonitor module
with open('traffic-monitor-update.js', 'r', encoding='utf-8') as f:
    traffic_js = f.read()

# Step 1: Replace the old showHoleDetails and closeHoleDetails functions
# with the TrafficMonitor module

old_functions = '''        // Hole Details Display for Manager Traffic Tab
        function showHoleDetails(holeNumber) {
            const panel = document.getElementById('holeDetailsPanel');
            if (!panel) return;

            // Sample data - will be replaced with real data from bookings
            const holeInfo = {
                number: holeNumber,
                status: 'Clear',
                group: null,
                pace: 'N/A'
            };

            panel.innerHTML = `
                <div class="flex items-start justify-between mb-4">
                    <div>
                        <h4 class="text-xl font-bold text-gray-900">Hole ${holeNumber}</h4>
                        <p class="text-sm text-gray-600">Status: <span class="font-semibold text-green-600">${holeInfo.status}</span></p>
                    </div>
                    <button onclick="closeHoleDetails()" class="text-gray-400 hover:text-gray-600">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
                ${holeInfo.group ? `
                    <div class="space-y-3">
                        <div class="flex items-center justify-between p-3 bg-white rounded-lg">
                            <span class="text-sm text-gray-600">Group</span>
                            <span class="font-semibold">${holeInfo.group}</span>
                        </div>
                        <div class="flex items-center justify-between p-3 bg-white rounded-lg">
                            <span class="text-sm text-gray-600">Pace</span>
                            <span class="font-semibold">${holeInfo.pace}</span>
                        </div>
                    </div>
                ` : `
                    <div class="text-center py-6 text-gray-500">
                        <p class="text-sm">No groups currently on this hole</p>
                    </div>
                `}
            `;
        }

        function closeHoleDetails() {
            const panel = document.getElementById('holeDetailsPanel');
            if (panel) {
                panel.innerHTML = `
                    <div class="text-center text-gray-500">
                        <span class="material-symbols-outlined text-6xl text-gray-300 mb-2 block">golf_course</span>
                        <p>Select a hole to view details</p>
                    </div>
                `;
            }
        }'''

new_module = '''        // ===========================================================
        // TRAFFIC MONITOR MODULE - Dynamic Hole Rendering & History
        // ===========================================================
        ''' + traffic_js + '''
        // ==========================================================='''

if old_functions in content:
    content = content.replace(old_functions, new_module)
    print('SUCCESS: Replaced old hole detail functions with TrafficMonitor module')
else:
    print('WARNING: Could not find old functions to replace')

# Step 2: Update loadTeeSheet function to render 5 columns instead of 6
old_render = '''            table.innerHTML = dayBookings.map(booking => {
                const time = booking.teeTime || booking.time || '-';
                const playerName = booking.playerName || booking.name || 'Unknown';
                const players = booking.players || 1;
                const caddy = booking.caddyName || 'None';
                const status = booking.status || 'Confirmed';

                let statusClass = 'bg-green-100 text-green-800';
                if (status === 'Completed') statusClass = 'bg-gray-100 text-gray-800';
                if (status === 'Cancelled') statusClass = 'bg-red-100 text-red-800';
                if (status === 'In Progress') statusClass = 'bg-blue-100 text-blue-800';

                return `
                    <tr class="border-b border-gray-100 hover:bg-gray-50">
                        <td class="p-3 text-sm font-medium">${time}</td>
                        <td class="p-3 text-sm">${playerName}</td>
                        <td class="p-3 text-sm">${players}</td>
                        <td class="p-3 text-sm">${caddy}</td>
                        <td class="p-3">
                            <span class="px-2 py-1 rounded-full text-xs font-medium ${statusClass}">
                                ${status}
                            </span>
                        </td>
                        <td class="p-3 text-right">
                            <button onclick="viewBookingDetails('${booking.id}')" class="text-blue-600 hover:text-blue-800 text-xs font-medium">
                                View
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');'''

new_render = '''            table.innerHTML = dayBookings.map(booking => {
                const time = booking.teeTime || booking.time || '-';
                const playerName = booking.playerName || booking.name || 'Unknown';
                const players = booking.players || 1;
                const caddy = booking.caddyName || 'None';
                const status = booking.status || 'Confirmed';

                let statusClass = 'bg-green-100 text-green-800';
                if (status === 'Completed') statusClass = 'bg-gray-100 text-gray-800';
                if (status === 'Cancelled') statusClass = 'bg-red-100 text-red-800';
                if (status === 'In Progress') statusClass = 'bg-blue-100 text-blue-800';

                return `
                    <tr class="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onclick="viewBookingDetails('${booking.id}')">
                        <td class="p-2 text-xs font-medium">${time}</td>
                        <td class="p-2 text-xs">${playerName}</td>
                        <td class="p-2 text-xs text-center">${players}</td>
                        <td class="p-2 text-xs">${caddy}</td>
                        <td class="p-2">
                            <span class="px-2 py-0.5 rounded-full text-xs font-medium ${statusClass}">
                                ${status}
                            </span>
                        </td>
                    </tr>
                `;
            }).join('');'''

if old_render in content:
    content = content.replace(old_render, new_render)
    print('SUCCESS: Updated loadTeeSheet to render 5-column format')
else:
    print('WARNING: Could not find old render code')

# Step 3: Update the empty state colspan in loadTeeSheet
old_empty = '''                table.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center py-8 text-gray-500">
                            No tee times scheduled for this date
                        </td>
                    </tr>
                `;'''

new_empty = '''                table.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center py-4 text-gray-500 text-xs">
                            No tee times scheduled for this date
                        </td>
                    </tr>
                `;'''

if old_empty in content:
    content = content.replace(old_empty, new_empty)
    print('SUCCESS: Updated empty state colspan from 6 to 5')
else:
    print('WARNING: Could not find empty state')

# Write back
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print('SUCCESS: All JavaScript updates completed')
