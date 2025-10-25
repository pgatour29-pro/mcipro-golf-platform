#!/usr/bin/env python3
"""Add search box to confirmed players table in roster modal"""

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Find and replace the confirmed players section to add search box
old_section = '''                <!-- Confirmed Players -->
                <div id="rosterView-confirmed" class="roster-view">
                    <div class="mb-3 flex justify-end">
                        <button onclick="SocietyOrganizerSystem.openManualPlayerModal('confirmed')" class="btn-primary text-xs py-2 px-3 flex items-center gap-1">
                            <span class="material-symbols-outlined text-sm">person_add</span>
                            Add Player
                        </button>
                    </div>'''

new_section = '''                <!-- Confirmed Players -->
                <div id="rosterView-confirmed" class="roster-view">
                    <div class="mb-3 flex gap-2">
                        <!-- Search Box -->
                        <div class="flex-1 relative">
                            <input type="text" id="rosterPlayerSearch"
                                   placeholder="Search players by name..."
                                   oninput="SocietyOrganizerSystem.filterRosterPlayers(this.value)"
                                   class="w-full px-4 py-2 pl-10 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500">
                            <span class="material-symbols-outlined absolute left-3 top-2 text-gray-400">search</span>
                        </div>
                        <button onclick="SocietyOrganizerSystem.openManualPlayerModal('confirmed')" class="btn-primary text-xs py-2 px-3 flex items-center gap-1">
                            <span class="material-symbols-outlined text-sm">person_add</span>
                            Add Player
                        </button>
                    </div>'''

if old_section in content:
    content = content.replace(old_section, new_section)
    print("Added search box to confirmed players table")
else:
    print("ERROR: Could not find confirmed players section")
    exit(1)

# Now add the filter function to the SocietyOrganizerSystem
# Find the renderConfirmedPlayers function and add the filter function before it

# First, store the registrations in a property
old_render_start = '''    renderConfirmedPlayers(registrations) {
        const tbody = document.getElementById('confirmedPlayersTable');
        if (!registrations || registrations.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-gray-500">No registrations yet</td></tr>';
            return;
        }'''

new_render_start = '''    renderConfirmedPlayers(registrations) {
        const tbody = document.getElementById('confirmedPlayersTable');

        // Store original registrations for search filtering
        this.allConfirmedPlayers = registrations || [];

        if (!registrations || registrations.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-gray-500">No registrations yet</td></tr>';
            return;
        }'''

if old_render_start in content:
    content = content.replace(old_render_start, new_render_start)
    print("Updated renderConfirmedPlayers to store registrations")
else:
    print("ERROR: Could not find renderConfirmedPlayers function")
    exit(1)

# Add the filterRosterPlayers function after renderWaitlistPlayers
# Find the renderWaitlistPlayers function end
old_waitlist_end = '''    async removeRegistration(regId) {
        if (!confirm('Remove this player? They will be moved to waitlist if enabled.')) return;

        try {
            await SocietyGolfDB.deleteRegistration(regId);
            NotificationManager.show('Player removed', 'success');
            await this.loadRosterData(this.currentRosterEvent.id);
        } catch (error) {
            console.error('[SocietyOrganizer] Error removing registration:', error);
            NotificationManager.show('Failed to remove player', 'error');
        }
    }'''

new_waitlist_end = '''    filterRosterPlayers(searchText) {
        if (!this.allConfirmedPlayers) return;

        const searchLower = searchText.toLowerCase().trim();

        // If search is empty, show all players
        if (!searchLower) {
            this.renderConfirmedPlayers(this.allConfirmedPlayers);
            return;
        }

        // Filter players by name
        const filtered = this.allConfirmedPlayers.filter(player =>
            player.playerName.toLowerCase().includes(searchLower)
        );

        // Render filtered results
        const tbody = document.getElementById('confirmedPlayersTable');
        const eventId = this.currentRosterEvent?.id;
        const isSuperAdmin = AppState.currentUser?.lineUserId === this.currentRosterEvent?.organizerId;

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-gray-500">No players match your search</td></tr>';
            return;
        }

        tbody.innerHTML = filtered.map(reg => {
            const totalFee = reg.total_fee || 0;
            const paymentStatus = reg.payment_status || 'unpaid';
            const isPaid = paymentStatus === 'paid';

            return `
            <tr class="border-t">
                <td class="px-4 py-2">${reg.playerName}</td>
                <td class="px-4 py-2">${Math.round(reg.handicap)}</td>
                <td class="px-4 py-2 text-center">${reg.wantTransport ? '✓' : '-'}</td>
                <td class="px-4 py-2 text-center">${reg.wantCompetition ? '✓' : '-'}</td>
                <td class="px-4 py-2 text-center">${(reg.partnerPrefs || []).length}</td>
                <td class="px-4 py-2 text-right text-gray-900">
                    <button onclick="SocietyOrganizerSystem.editPlayerFee('${reg.id}', '${reg.playerId}', ${totalFee})"
                        class="hover:text-green-600 hover:underline cursor-pointer" title="Click to edit fee">
                        ฿${totalFee.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </button>
                </td>
                <td class="px-4 py-2 text-center">
                    <div class="flex items-center justify-center gap-2">
                        ${isPaid ? `
                            <span class="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                                PAID
                            </span>
                            ${isSuperAdmin ? `
                                <button onclick="SocietyOrganizerSystem.togglePayment('${eventId}', '${reg.playerId}', false)"
                                    class="text-xs text-gray-500 hover:text-red-600" title="Super Admin: Mark as unpaid">
                                    <span class="material-symbols-outlined text-sm">cancel</span>
                                </button>
                            ` : ''}
                        ` : `
                            <button onclick="SocietyOrganizerSystem.togglePayment('${eventId}', '${reg.playerId}', true)"
                                class="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700">
                                Mark Paid
                            </button>
                        `}
                    </div>
                </td>
                <td class="px-4 py-2 text-center">
                    <button onclick="SocietyOrganizerSystem.removeRegistration('${reg.id}')" class="text-xs text-red-600 hover:underline">
                        Remove
                    </button>
                </td>
            </tr>
        `}).join('');
    }

    async removeRegistration(regId) {
        if (!confirm('Remove this player? They will be moved to waitlist if enabled.')) return;

        try {
            await SocietyGolfDB.deleteRegistration(regId);
            NotificationManager.show('Player removed', 'success');
            await this.loadRosterData(this.currentRosterEvent.id);
        } catch (error) {
            console.error('[SocietyOrganizer] Error removing registration:', error);
            NotificationManager.show('Failed to remove player', 'error');
        }
    }'''

if old_waitlist_end in content:
    content = content.replace(old_waitlist_end, new_waitlist_end)
    print("Added filterRosterPlayers function")
else:
    print("ERROR: Could not find removeRegistration function")
    exit(1)

# Write the updated content
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("\nSuccessfully added roster player search!")
print("- Search box added above confirmed players table")
print("- Filter function added to SocietyOrganizerSystem")
print("- Players can now be searched by name for quick payment marking")
