import sys

# Read the file
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Old table rendering (6 columns with Actions)
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

# New compact 5-column rendering (removed Actions column)
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

# Replace
if old_render in content:
    content = content.replace(old_render, new_render)
    print('SUCCESS: Updated tee sheet table rendering to compact 5-column format')
else:
    print('WARNING: Could not find old table rendering code')

# Write back
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print('SUCCESS: Tee sheet loadTeeSheet() function updated')
