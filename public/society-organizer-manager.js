// ============================================
// SOCIETY ORGANIZER SYSTEM - UI Management
// ============================================

class SocietyOrganizerManager {
    constructor() {
        this.currentEvent = null;
        this.events = [];
        this.currentRosterEvent = null;
        this.loading = false;
        this.societyProfile = null;
        this.tempLogoData = null;

        // ===== PERFORMANCE OPTIMIZATION =====
        this.initialized = false;
        this.isSubscribed = false;
        this.cacheTimestamp = null;
        this.cacheDuration = 30000; // 30 seconds cache
        this.eventsCache = null;
        this.profileCache = null;
    }

    async init() {
        console.log('[SocietyOrganizer] Initializing...');

        // === OPTIMIZATION 1: Lazy Initialization ===
        // If already initialized and cache is fresh, use cached data
        if (this.initialized && this.isCacheFresh()) {
            console.log('[SocietyOrganizer] Using cached data (fresh)');
            this.events = this.eventsCache || [];
            this.societyProfile = this.profileCache;
            this.renderEventsList();
            return;
        }

        // Show loading state immediately
        this.loading = true;
        this.renderEventsList();

        // === OPTIMIZATION 2: Subscribe once only ===
        if (!this.isSubscribed) {
            this.subscribeToChanges();
            this.isSubscribed = true;
        }

        // Load society profile and events in background (non-blocking)
        await Promise.all([
            this.loadSocietyProfile(),
            this.loadEvents()
        ]);

        // Mark as initialized
        this.initialized = true;
        this.cacheTimestamp = Date.now();
    }

    isCacheFresh() {
        if (!this.cacheTimestamp) return false;
        const age = Date.now() - this.cacheTimestamp;
        return age < this.cacheDuration;
    }

    invalidateCache() {
        console.log('[SocietyOrganizer] Cache invalidated');
        this.cacheTimestamp = null;
        this.eventsCache = null;
        this.profileCache = null;
    }

    async loadEvents() {
        try {
            this.loading = true;
            console.time('[SocietyOrganizer] Load events');

            // Get the selected society's organizerId
            const organizerId = AppState.selectedSociety?.organizerId ||
                               localStorage.getItem('selectedSocietyOrganizerId') ||
                               AppState.currentUser?.lineUserId;

            console.log('[SocietyOrganizer] Loading events for organizerId:', organizerId);

            // Load only events for this specific organizer
            this.events = await SocietyGolfDB.getOrganizerEvents(organizerId);

            // === OPTIMIZATION 3: Cache events ===
            this.eventsCache = this.events;
            this.cacheTimestamp = Date.now();

            console.timeEnd('[SocietyOrganizer] Load events');
            this.loading = false;
            this.renderEventsList();
        } catch (error) {
            this.loading = false;
            console.error('[SocietyOrganizer] Error loading events:', error);
            NotificationManager.show('Failed to load events', 'error');
        }
    }

    async refreshEvents() {
        NotificationManager.show('Refreshing events...', 'info');
        await this.loadEvents();
        NotificationManager.show('Events refreshed', 'success');
    }

    subscribeToChanges() {
        SocietyGolfDB.subscribeToEvents((payload) => {
            console.log('[SocietyOrganizer] Event change:', payload);
            // === OPTIMIZATION 4: Invalidate cache on realtime changes ===
            this.invalidateCache();
            this.loadEvents(); // Reload events when changes occur
        });
    }

    // =====================================================
    // EVENT FORM MANAGEMENT
    // =====================================================

    showEventForm(eventId = null) {
        const form = document.getElementById('eventFormContainer');
        const title = document.getElementById('eventFormTitle');

        if (eventId) {
            // Edit mode
            const event = this.events.find(e => e.id === eventId);
            if (!event) return;

            title.textContent = 'Edit Event';
            this.currentEvent = event;

            // Populate form
            document.getElementById('eventName').value = event.name || '';
            document.getElementById('eventDate').value = event.date || '';
            document.getElementById('eventStartTime').value = event.startTime || '';

            // Set cutoff directly - already in YYYY-MM-DDTHH:MM format
            if (event.cutoff) {
                // Remove seconds if present (2025-10-10T06:30:00 -> 2025-10-10T06:30)
                const cutoffValue = event.cutoff.substring(0, 16);
                document.getElementById('eventCutoff').value = cutoffValue;
            } else {
                document.getElementById('eventCutoff').value = '';
            }

            document.getElementById('eventMaxPlayers').value = event.maxPlayers || '';
            document.getElementById('eventCourse').value = event.courseName || '';
            document.getElementById('eventFormat').value = event.eventFormat || 'strokeplay';
            document.getElementById('eventBaseFee').value = event.baseFee || 0;
            document.getElementById('eventCartFee').value = event.cartFee || 0;
            document.getElementById('eventCaddyFee').value = event.caddyFee || 0;
            document.getElementById('eventTransportFee').value = event.transportFee || 0;
            document.getElementById('eventCompetitionFee').value = event.competitionFee || 0;
            document.getElementById('eventNotes').value = event.notes || '';
            document.getElementById('eventAutoWaitlist').checked = event.autoWaitlist !== undefined ? event.autoWaitlist : true;
            document.getElementById('eventRecurring').checked = event.recurring || false;

            // Populate recurring fields
            if (event.recurring) {
                document.getElementById('eventRecurFrequency').value = event.recurFrequency || 'weekly';
                if (event.recurFrequency === 'monthly') {
                    document.getElementById('eventRecurMonthlyPattern').value = event.recurMonthlyPattern || 'first_monday';
                } else {
                    document.getElementById('eventRecurDayOfWeek').value = event.recurDayOfWeek || 1;
                }
                document.getElementById('eventRecurEndType').value = event.recurEndType || 'until';
                if (event.recurEndType === 'until') {
                    document.getElementById('eventRecurUntil').value = event.recurUntil || '';
                } else {
                    document.getElementById('eventRecurCount').value = event.recurCount || 10;
                }
                toggleRecurringOptions();
            }
        } else {
            // Create mode
            title.textContent = 'Create New Event';
            this.currentEvent = null;

            // Clear form
            document.getElementById('eventName').value = '';
            document.getElementById('eventDate').value = '';
            document.getElementById('eventStartTime').value = '';
            document.getElementById('eventCutoff').value = '';
            document.getElementById('eventMaxPlayers').value = '40';
            document.getElementById('eventCourse').value = '';
            document.getElementById('eventFormat').value = 'strokeplay';
            document.getElementById('eventBaseFee').value = '0';
            document.getElementById('eventCartFee').value = '0';
            document.getElementById('eventCaddyFee').value = '0';
            document.getElementById('eventTransportFee').value = '0';
            document.getElementById('eventCompetitionFee').value = '0';
            document.getElementById('eventNotes').value = '';
            document.getElementById('eventAutoWaitlist').checked = true;
            document.getElementById('eventRecurring').checked = false;
            document.getElementById('recurringOptions').style.display = 'none';
        }

        form.style.display = 'block';
        form.scrollIntoView({ behavior: 'smooth' });
    }

    hideEventForm() {
        document.getElementById('eventFormContainer').style.display = 'none';
        this.currentEvent = null;
    }

    async saveEvent() {
        try {
            // Get cutoff value and store as TEXT (not timestamp)
            const cutoffValue = document.getElementById('eventCutoff').value;
            // datetime-local gives us "2025-10-10T10:30" - store exactly this, no timezone
            const cutoffISO = cutoffValue ? cutoffValue + ':00' : null; // Add seconds for consistency

            // Get the selected society's data
            const organizerId = AppState.selectedSociety?.organizerId ||
                               localStorage.getItem('selectedSocietyOrganizerId') ||
                               AppState.currentUser?.lineUserId;
            const organizerName = AppState.selectedSociety?.name ||
                                 localStorage.getItem('selectedSocietyName') ||
                                 AppState.currentUser?.name;

            const eventData = {
                name: document.getElementById('eventName').value.trim(),
                date: document.getElementById('eventDate').value,
                startTime: document.getElementById('eventStartTime').value || null,
                cutoff: cutoffISO,
                maxPlayers: parseInt(document.getElementById('eventMaxPlayers').value) || null,
                courseName: document.getElementById('eventCourse').value.trim(),
                eventFormat: document.getElementById('eventFormat').value,
                baseFee: parseInt(document.getElementById('eventBaseFee').value) || 0,
                cartFee: parseInt(document.getElementById('eventCartFee').value) || 0,
                caddyFee: parseInt(document.getElementById('eventCaddyFee').value) || 0,
                transportFee: parseInt(document.getElementById('eventTransportFee').value) || 0,
                competitionFee: parseInt(document.getElementById('eventCompetitionFee').value) || 0,
                notes: document.getElementById('eventNotes').value.trim(),
                organizerId: organizerId,
                organizerName: organizerName,
                autoWaitlist: document.getElementById('eventAutoWaitlist').checked,
                recurring: document.getElementById('eventRecurring').checked
            };

            // Add recurring fields if enabled
            if (eventData.recurring) {
                eventData.recurFrequency = document.getElementById('eventRecurFrequency').value;

                if (eventData.recurFrequency === 'monthly') {
                    eventData.recurMonthlyPattern = document.getElementById('eventRecurMonthlyPattern').value;
                } else {
                    eventData.recurDayOfWeek = parseInt(document.getElementById('eventRecurDayOfWeek').value);
                }

                eventData.recurEndType = document.getElementById('eventRecurEndType').value;
                if (eventData.recurEndType === 'until') {
                    eventData.recurUntil = document.getElementById('eventRecurUntil').value;
                } else {
                    eventData.recurCount = parseInt(document.getElementById('eventRecurCount').value);
                }
            }

            // Validation
            if (!eventData.name) {
                NotificationManager.show('Please enter event name', 'error');
                return;
            }
            if (!eventData.date) {
                NotificationManager.show('Please select event date', 'error');
                return;
            }

            // Hide form immediately for better UX
            this.hideEventForm();

            if (this.currentEvent) {
                // Update existing event
                await SocietyGolfDB.updateEvent(this.currentEvent.id, eventData);
                NotificationManager.show('Event updated successfully', 'success');
            } else {
                // Create new event
                await SocietyGolfDB.createEvent(eventData);
                NotificationManager.show('Event created successfully', 'success');
            }

            // Reload events list (Supabase realtime will also trigger update)
            await this.loadEvents();
        } catch (error) {
            console.error('[SocietyOrganizer] Error saving event:', error);
            NotificationManager.show('Failed to save event', 'error');
        }
    }

    async deleteEvent(eventId) {
        if (!confirm('Are you sure you want to delete this event? All registrations and pairings will be removed.')) {
            return;
        }

        try {
            await SocietyGolfDB.deleteEvent(eventId);
            NotificationManager.show('Event deleted', 'success');
            await this.loadEvents();
        } catch (error) {
            console.error('[SocietyOrganizer] Error deleting event:', error);
            NotificationManager.show('Failed to delete event', 'error');
        }
    }

    // =====================================================
    // EVENTS LIST RENDERING
    // =====================================================

    renderEventsList() {
        const container = document.getElementById('eventsListContainer');
        const emptyState = document.getElementById('eventsEmptyState');

        // Show loading spinner
        if (this.loading) {
            container.innerHTML = `
                <div class="col-span-2 text-center py-12">
                    <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
                    <p class="text-gray-600 mt-4">Loading events...</p>
                </div>
            `;
            emptyState.style.display = 'none';
            return;
        }

        if (!this.events || this.events.length === 0) {
            container.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';
        container.innerHTML = this.events.map(event => this.renderEventCard(event)).join('');
    }

    renderEventCard(event) {
        const eventDate = event.date ? new Date(event.date).toLocaleDateString() : '-';

        // Format start time for display (HH:MM to 12-hour format)
        let startTimeDisplay = '';
        if (event.startTime) {
            const [hours, minutes] = event.startTime.split(':');
            const hour = parseInt(hours);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const hour12 = hour % 12 || 12;
            startTimeDisplay = `${hour12}:${minutes} ${ampm}`;
        }

        // Format event format for display
        const formatLabels = {
            'strokeplay': 'Stroke Play',
            '2man_scramble': '2-Man Scramble',
            '4man_scramble': '4-Man Scramble',
            'fourball': 'Four Ball',
            'stableford': 'Stableford',
            'private': 'Private Game',
            'other': 'Other'
        };
        const formatDisplay = formatLabels[event.eventFormat] || 'Stroke Play';

        // Format cutoff date/time for display (no timezone conversion, no seconds)
        let cutoffDate = '-';
        let cutoffTime = '';
        if (event.cutoff) {
            // Parse the stored value: "2025-10-10T10:30" or "2025-10-10T10:30:00"
            const cutoffStr = event.cutoff.substring(0, 16); // Remove seconds: "2025-10-10T10:30"
            const [datePart, timePart] = cutoffStr.split('T');

            if (datePart && timePart) {
                const [year, month, day] = datePart.split('-');
                const [hours, minutes] = timePart.split(':');

                // Format date as: "Oct 10, 2025"
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const monthName = monthNames[parseInt(month) - 1];
                cutoffDate = `${monthName} ${parseInt(day)}, ${year}`;

                // Format time as: "10:30 AM"
                const hour = parseInt(hours);
                const ampm = hour >= 12 ? 'PM' : 'AM';
                const hour12 = hour % 12 || 12;
                cutoffTime = `${hour12}:${minutes} ${ampm}`;
            }
        }

        const maxDisplay = event.maxPlayers ? event.maxPlayers : '∞';

        // Status badge (compare with current local time)
        const now = new Date();
        let isPastCutoff = false;
        if (event.cutoff) {
            // Parse cutoff as local time: "2025-10-10T06:30"
            const cutoffLocal = new Date(event.cutoff.substring(0, 16));
            isPastCutoff = now > cutoffLocal;
        }
        const statusBadge = isPastCutoff
            ? '<span class="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">Closed</span>'
            : '<span class="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Open</span>';

        // Society branding (logo and name)
        const societyLogo = this.societyProfile?.societyLogo
            ? `<img src="${this.societyProfile.societyLogo}" class="w-12 h-12 rounded-full object-cover border-2 border-white" alt="Society Logo">`
            : '<div class="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center border-2 border-white"><span class="material-symbols-outlined text-white text-2xl">groups</span></div>';
        const societyName = this.societyProfile?.societyName || 'Golf Society';

        return `
            <div class="bg-white rounded-2xl shadow-lg border overflow-hidden hover:shadow-xl transition-shadow">
                <!-- Society Branding Banner -->
                <div class="bg-gradient-to-r from-gray-800 to-gray-600 text-white px-4 py-2">
                    <div class="flex items-center space-x-3">
                        ${societyLogo}
                        <div class="flex-1">
                            <div class="text-sm font-semibold">${societyName}</div>
                            <div class="text-xs text-gray-300">${formatDisplay}</div>
                        </div>
                    </div>
                </div>

                <!-- Event Details -->
                <div class="bg-gradient-to-r from-sky-600 to-sky-400 text-white p-4">
                    <div class="flex justify-between items-start">
                        <div class="flex-1">
                            <h3 class="text-xl font-bold mb-2">${event.name}</h3>
                            <div class="text-sm text-sky-100 space-y-0.5">
                                ${startTimeDisplay ? `<div>⏰ ${startTimeDisplay}</div>` : ''}
                                <div>📅 ${eventDate}</div>
                                <div>👥 Max: ${maxDisplay} players</div>
                            </div>
                        </div>
                        ${statusBadge}
                    </div>
                </div>

                <div class="p-4">
                    <!-- Event Details -->
                    <div class="bg-gray-50 rounded-lg p-3 mb-3 text-sm">
                        <div class="grid grid-cols-2 gap-x-3 gap-y-1.5">
                            <div class="text-gray-600">Cutoff Date:</div>
                            <div class="font-medium text-gray-900">${cutoffDate}</div>
                            <div class="text-gray-600">Cutoff Time:</div>
                            <div class="font-medium text-gray-900">${cutoffTime}</div>
                            ${event.courseName ? `
                                <div class="text-gray-600">Course:</div>
                                <div class="font-medium text-gray-900">${event.courseName}</div>
                            ` : ''}
                        </div>
                    </div>

                    <!-- Fees -->
                    <div class="bg-gray-50 rounded-lg p-3 text-xs">
                        <div class="grid grid-cols-2 gap-1">
                            <div>Green: ฿${event.baseFee.toLocaleString()}</div>
                            <div>Cart: ฿${event.cartFee.toLocaleString()}</div>
                            <div>Caddy: ฿${event.caddyFee.toLocaleString()}</div>
                            <div>Transport: ฿${event.transportFee.toLocaleString()}</div>
                            <div class="col-span-2">Competition: ฿${event.competitionFee.toLocaleString()}</div>
                        </div>
                    </div>

                    <!-- Actions -->
                    <div class="grid grid-cols-2 gap-2 mt-3">
                        <button onclick="SocietyOrganizerSystem.openRoster('${event.id}')" class="btn-secondary text-xs py-2">
                            <span class="material-symbols-outlined text-sm">groups</span>
                            <span class="ml-1">Roster</span>
                        </button>
                        <button onclick="SocietyOrganizerSystem.openPairingsModal('${event.id}')" class="btn-secondary text-xs py-2">
                            <span class="material-symbols-outlined text-sm">grid_view</span>
                            <span class="ml-1">Pairings</span>
                        </button>
                        <button onclick="SocietyOrganizerSystem.showEventForm('${event.id}')" class="btn-secondary text-xs py-2">
                            <span class="material-symbols-outlined text-sm">edit</span>
                            <span class="ml-1">Edit</span>
                        </button>
                        <button onclick="SocietyOrganizerSystem.deleteEvent('${event.id}')" class="bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs py-2 font-medium">
                            <span class="material-symbols-outlined text-sm">delete</span>
                            <span class="ml-1">Delete</span>
                        </button>
                    </div>

                    <!-- Copy Registration Link -->
                    <button onclick="SocietyOrganizerSystem.copyRegistrationLink('${event.id}')" class="w-full btn-primary text-xs py-2 mt-2">
                        <span class="material-symbols-outlined text-sm">link</span>
                        Copy Registration Link
                    </button>
                </div>
            </div>
        `;
    }

    // =====================================================
    // ROSTER MANAGEMENT
    // =====================================================

    async openRoster(eventId) {
        this.currentRosterEvent = this.events.find(e => e.id === eventId);
        if (!this.currentRosterEvent) return;

        // Set modal title
        document.getElementById('rosterEventName').textContent = this.currentRosterEvent.name;
        document.getElementById('rosterEventDate').textContent = this.currentRosterEvent.date;

        // Load registrations
        await this.loadRosterData(eventId);

        // Show modal
        document.getElementById('rosterModal').style.display = 'flex';

        // Subscribe to changes
        SocietyGolfDB.subscribeToRegistrations(eventId, () => {
            this.loadRosterData(eventId);
        });
        SocietyGolfDB.subscribeToWaitlist(eventId, () => {
            this.loadRosterData(eventId);
        });
    }

    async loadRosterData(eventId) {
        try {
            const [registrations, waitlist] = await Promise.all([
                SocietyGolfDB.getRegistrations(eventId),
                SocietyGolfDB.getWaitlist(eventId)
            ]);

            // Update counts
            document.getElementById('confirmedCount').textContent = registrations.length;
            document.getElementById('waitlistCount').textContent = waitlist.length;

            // Render tables
            this.renderConfirmedPlayers(registrations);
            this.renderWaitlistPlayers(waitlist);
        } catch (error) {
            console.error('[SocietyOrganizer] Error loading roster:', error);
        }
    }

    renderConfirmedPlayers(registrations) {
        const tbody = document.getElementById('confirmedPlayersTable');
        if (!registrations || registrations.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-gray-500">No registrations yet</td></tr>';
            return;
        }

        tbody.innerHTML = registrations.map(reg => `
            <tr class="border-t">
                <td class="px-4 py-2">${reg.playerName}</td>
                <td class="px-4 py-2">${Math.round(reg.handicap)}</td>
                <td class="px-4 py-2 text-center">${reg.wantTransport ? '✓' : '-'}</td>
                <td class="px-4 py-2 text-center">${reg.wantCompetition ? '✓' : '-'}</td>
                <td class="px-4 py-2 text-center">${(reg.partnerPrefs || []).length}</td>
                <td class="px-4 py-2 text-center">
                    <button onclick="SocietyOrganizerSystem.removeRegistration('${reg.id}')" class="text-xs text-red-600 hover:underline">
                        Remove
                    </button>
                </td>
            </tr>
        `).join('');
    }

    renderWaitlistPlayers(waitlist) {
        const tbody = document.getElementById('waitlistPlayersTable');
        if (!waitlist || waitlist.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-gray-500">No one on waitlist</td></tr>';
            return;
        }

        tbody.innerHTML = waitlist.map((w, idx) => `
            <tr class="border-t">
                <td class="px-4 py-2 font-bold text-sky-600">#${idx + 1}</td>
                <td class="px-4 py-2">${w.playerName}</td>
                <td class="px-4 py-2">${Math.round(w.handicap)}</td>
                <td class="px-4 py-2 text-xs text-gray-600">${new Date(w.createdAt).toLocaleString()}</td>
                <td class="px-4 py-2 text-center">
                    <button onclick="SocietyOrganizerSystem.removeFromWaitlist('${w.id}')" class="text-xs text-red-600 hover:underline">
                        Remove
                    </button>
                </td>
            </tr>
        `).join('');
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
    }

    async removeFromWaitlist(waitId) {
        if (!confirm('Remove this player from waitlist?')) return;

        try {
            await SocietyGolfDB.removeFromWaitlist(waitId);
            NotificationManager.show('Player removed from waitlist', 'success');
            await this.loadRosterData(this.currentRosterEvent.id);
        } catch (error) {
            console.error('[SocietyOrganizer] Error removing from waitlist:', error);
            NotificationManager.show('Failed to remove from waitlist', 'error');
        }
    }

    closeRosterModal() {
        document.getElementById('rosterModal').style.display = 'none';
        this.currentRosterEvent = null;
    }

    async exportRoster() {
        // Export current roster to CSV
        try {
            const regs = await SocietyGolfDB.getRegistrations(this.currentRosterEvent.id);
            const csv = this.generateRosterCSV(regs);
            this.downloadCSV(csv, `${this.currentRosterEvent.name}_roster.csv`);
        } catch (error) {
            console.error('[SocietyOrganizer] Error exporting roster:', error);
            NotificationManager.show('Failed to export roster', 'error');
        }
    }

    generateRosterCSV(registrations) {
        const headers = ['Name', 'Handicap', 'Transport', 'Competition', 'Partner Preferences'];
        const rows = registrations.map(r => [
            r.playerName,
            Math.round(r.handicap),
            r.wantTransport ? 'Yes' : 'No',
            r.wantCompetition ? 'Yes' : 'No',
            (r.partnerPrefs || []).length
        ]);

        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    downloadCSV(csvContent, filename) {
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
    }

    copyRegistrationLink(eventId) {
        const url = `${window.location.origin}${window.location.pathname}?event=${eventId}`;
        navigator.clipboard.writeText(url).then(() => {
            NotificationManager.show('Registration link copied to clipboard', 'success');
        });
    }

    async openPairingsModal(eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (!event) return;

        try {
            const [registrations, pairings] = await Promise.all([
                SocietyGolfDB.getRegistrations(eventId),
                SocietyGolfDB.getPairings(eventId)
            ]);

            if (registrations.length === 0) {
                NotificationManager.show('No registrations yet. Cannot create pairings.', 'warning');
                return;
            }

            // Generate automatic pairings if none exist
            let pairingData = pairings;
            if (!pairings || !pairings.pairings) {
                pairingData = this.generateAutoPairings(registrations);
                await SocietyGolfDB.savePairings(eventId, pairingData);
            }

            this.showPairingsUI(event, pairingData, registrations);
        } catch (error) {
            console.error('[SocietyOrganizer] Error loading pairings:', error);
            NotificationManager.show('Failed to load pairings', 'error');
        }
    }

    generateAutoPairings(registrations) {
        // Sort by handicap
        const sorted = [...registrations].sort((a, b) => a.handicap - b.handicap);
        const groups = [];

        // Create groups of 4 (or 3 for remaining players)
        for (let i = 0; i < sorted.length; i += 4) {
            const group = sorted.slice(i, i + 4);
            groups.push({
                groupNumber: groups.length + 1,
                teeTime: null,
                players: group.map(p => ({
                    playerId: p.playerId,
                    playerName: p.playerName,
                    handicap: p.handicap
                }))
            });
        }

        return {
            pairings: groups,
            locked: false,
            generatedAt: new Date().toISOString()
        };
    }

    showPairingsUI(event, pairingsData, registrations) {
        const modal = `
            <div id="pairingsModal" class="modal-backdrop">
                <div class="modal-container max-w-5xl">
                    <div class="modal-header bg-gradient-to-r from-sky-600 to-sky-400 text-white">
                        <div>
                            <h2 class="text-lg font-bold">Pairings: ${event.name}</h2>
                            <p class="text-xs text-sky-100">${event.date} • ${registrations.length} players</p>
                        </div>
                        <button onclick="closePairingsModal()" class="text-white hover:bg-white/20 rounded-lg p-1">
                            <span class="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    <div class="modal-body">
                        <div class="mb-4 flex justify-between items-center">
                            <div class="text-sm text-gray-600">
                                ${pairingsData.pairings?.length || 0} groups • ${pairingsData.locked ? 'Locked' : 'Unlocked'}
                            </div>
                            <div class="flex gap-2">
                                <button onclick="regeneratePairings('${event.id}')" class="btn-secondary text-sm" ${pairingsData.locked ? 'disabled' : ''}>
                                    <span class="material-symbols-outlined text-sm">refresh</span>
                                    Regenerate
                                </button>
                                <button onclick="toggleLockPairings('${event.id}', ${!pairingsData.locked})" class="btn-primary text-sm">
                                    <span class="material-symbols-outlined text-sm">${pairingsData.locked ? 'lock_open' : 'lock'}</span>
                                    ${pairingsData.locked ? 'Unlock' : 'Lock'}
                                </button>
                            </div>
                        </div>

                        <div id="pairingsContainer" class="space-y-3">
                            ${this.renderPairings(pairingsData.pairings || [])}
                        </div>

                        <div class="mt-6 flex justify-end gap-3">
                            <button onclick="exportPairings('${event.id}')" class="btn-secondary">
                                <span class="material-symbols-outlined text-sm">download</span>
                                Export CSV
                            </button>
                            <button onclick="closePairingsModal()" class="btn-primary">
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existing = document.getElementById('pairingsModal');
        if (existing) existing.remove();

        // Add new modal
        document.body.insertAdjacentHTML('beforeend', modal);
        document.getElementById('pairingsModal').style.display = 'flex';
    }

    renderPairings(groups) {
        if (!groups || groups.length === 0) {
            return '<div class="text-center py-8 text-gray-500">No pairings generated</div>';
        }

        return groups.map(group => `
            <div class="bg-white border rounded-lg p-4">
                <div class="flex justify-between items-center mb-3">
                    <h4 class="font-semibold text-gray-900">Group ${group.groupNumber}</h4>
                    <input type="time" value="${group.teeTime || ''}"
                           onchange="updateTeeTime('${group.groupNumber}', this.value)"
                           class="text-sm border rounded px-2 py-1"
                           placeholder="Tee time">
                </div>
                <div class="space-y-2">
                    ${group.players.map((p, idx) => `
                        <div class="flex justify-between items-center text-sm">
                            <span class="text-gray-700">${idx + 1}. ${p.playerName}</span>
                            <span class="text-gray-500">HCP: ${Math.round(p.handicap)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }

    renderCalendar() {
        const container = document.getElementById('organizerCalendar');
        if (!container) return;

        const now = new Date();
        const year = window.calendarDate ? window.calendarDate.getFullYear() : now.getFullYear();
        const month = window.calendarDate ? window.calendarDate.getMonth() : now.getMonth();

        // Get events for current month
        const monthEvents = this.events.filter(e => {
            if (!e.date) return false;
            const eventDate = new Date(e.date);
            return eventDate.getFullYear() === year && eventDate.getMonth() === month;
        });

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startDayOfWeek = firstDay.getDay();

        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                           'July', 'August', 'September', 'October', 'November', 'December'];

        let html = `
            <div class="bg-white rounded-lg">
                <div class="px-6 py-4 border-b flex justify-between items-center">
                    <h3 class="text-lg font-bold">${monthNames[month]} ${year}</h3>
                    <div class="flex gap-2">
                        <button onclick="changeCalendarMonth(-1)" class="btn-secondary text-sm">
                            <span class="material-symbols-outlined text-sm">chevron_left</span>
                        </button>
                        <button onclick="changeCalendarMonth(1)" class="btn-secondary text-sm">
                            <span class="material-symbols-outlined text-sm">chevron_right</span>
                        </button>
                    </div>
                </div>
                <div class="p-6">
                    <div class="grid grid-cols-7 gap-2">
                        ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day =>
                            `<div class="text-center text-xs font-semibold text-gray-600 py-2">${day}</div>`
                        ).join('')}

                        ${Array(startDayOfWeek).fill(null).map(() =>
                            '<div class="aspect-square"></div>'
                        ).join('')}

                        ${Array(daysInMonth).fill(null).map((_, i) => {
                            const day = i + 1;
                            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            const dayEvents = monthEvents.filter(e => e.date === dateStr);
                            const isToday = day === now.getDate() && month === now.getMonth() && year === now.getFullYear();

                            return `
                                <div class="aspect-square border rounded-lg p-1 ${isToday ? 'bg-sky-50 border-sky-300' : 'bg-white'}">
                                    <div class="text-xs font-medium text-gray-700 mb-1">${day}</div>
                                    ${dayEvents.map(e => `
                                        <div class="text-xs bg-sky-100 text-sky-700 rounded px-1 py-0.5 mb-1 truncate cursor-pointer"
                                             onclick="SocietyOrganizerSystem.showEventForm('${e.id}')"
                                             title="${e.name}">
                                            ${e.name.substring(0, 10)}
                                        </div>
                                    `).join('')}
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    // =====================================================
    // SOCIETY PROFILE MANAGEMENT
    // =====================================================

    async loadSocietyProfile() {
        try {
            // Get the selected society's organizerId
            const organizerId = AppState.selectedSociety?.organizerId ||
                               localStorage.getItem('selectedSocietyOrganizerId') ||
                               AppState.currentUser?.lineUserId;

            console.log('[SocietyOrganizer] Loading profile for organizerId:', organizerId);

            if (!organizerId) return;

            const profile = await SocietyGolfDB.getSocietyProfile(organizerId);
            this.societyProfile = profile;

            // === OPTIMIZATION 5: Cache profile ===
            this.profileCache = profile;

            // Populate form if profile exists
            if (profile) {
                const nameField = document.getElementById('societyName');
                const descField = document.getElementById('societyDescription');
                const preview = document.getElementById('societyLogoPreview');

                if (nameField) nameField.value = profile.societyName || '';
                if (descField) descField.value = profile.description || '';

                if (profile.societyLogo && preview) {
                    preview.innerHTML = `<img src="${profile.societyLogo}" class="w-full h-full object-cover" alt="Society Logo">`;
                }
            }
        } catch (error) {
            console.error('[SocietyOrganizer] Error loading profile:', error);
        }
    }

    handleLogoUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            NotificationManager.show('Logo must be less than 2MB', 'error');
            return;
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            NotificationManager.show('Please upload an image file', 'error');
            return;
        }

        // Read file as base64
        const reader = new FileReader();
        reader.onload = (e) => {
            this.tempLogoData = e.target.result;
            const preview = document.getElementById('societyLogoPreview');
            preview.innerHTML = `<img src="${e.target.result}" class="w-full h-full object-cover" alt="Society Logo">`;
        };
        reader.readAsDataURL(file);
    }

    async saveSocietyProfile() {
        try {
            // Get the selected society's organizerId
            const organizerId = AppState.selectedSociety?.organizerId ||
                               localStorage.getItem('selectedSocietyOrganizerId') ||
                               AppState.currentUser?.lineUserId;

            if (!organizerId) {
                NotificationManager.show('User not logged in', 'error');
                return;
            }

            const profileData = {
                organizerId: organizerId,
                societyName: document.getElementById('societyName').value.trim(),
                description: document.getElementById('societyDescription').value.trim(),
                societyLogo: this.tempLogoData || this.societyProfile?.societyLogo || null
            };

            if (!profileData.societyName) {
                NotificationManager.show('Please enter society name', 'error');
                return;
            }

            if (this.societyProfile) {
                // Update existing profile
                await SocietyGolfDB.updateSocietyProfile(organizerId, profileData);
                NotificationManager.show('Profile updated successfully', 'success');
            } else {
                // Create new profile
                await SocietyGolfDB.createSocietyProfile(profileData);
                NotificationManager.show('Profile created successfully', 'success');
            }

            // Reload profile
            await this.loadSocietyProfile();

            // Reload events to show updated branding
            await this.loadEvents();
        } catch (error) {
            console.error('[SocietyOrganizer] Error saving profile:', error);
            NotificationManager.show('Failed to save profile', 'error');
        }
    }

    cleanup() {
        SocietyGolfDB.unsubscribeAll();
    }
}

// Initialize global instance
window.SocietyOrganizerSystem = new SocietyOrganizerManager();

// Tab switching functions
function showOrganizerTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.organizer-tab-content').forEach(tab => {
        tab.style.display = 'none';
    });

    // Remove active class from buttons
    document.querySelectorAll('.organizer-tab-button').forEach(btn => {
        btn.classList.remove('active', 'border-b-2', 'border-sky-600', 'text-sky-600');
        btn.classList.add('text-gray-600');
    });

    // Show selected tab
    document.getElementById(`organizerTab-${tabName}`).style.display = 'block';

    // Add active class to button
    const activeBtn = document.getElementById(`organizer-${tabName}-tab`);
    activeBtn.classList.add('active', 'border-b-2', 'border-sky-600', 'text-sky-600');
    activeBtn.classList.remove('text-gray-600');

    // Render calendar if calendar tab is shown
    if (tabName === 'calendar') {
        window.SocietyOrganizerSystem.renderCalendar();
    }
}

function showRosterTab(tabName) {
    // Hide all views
    document.querySelectorAll('.roster-view').forEach(view => {
        view.style.display = 'none';
    });

    // Remove active class from buttons
    document.querySelectorAll('.roster-tab-button').forEach(btn => {
        btn.classList.remove('active', 'text-sky-600');
        btn.classList.add('text-gray-600');
    });

    // Show selected view
    document.getElementById(`rosterView-${tabName}`).style.display = 'block';

    // Add active class to button
    const activeBtn = document.getElementById(`rosterTab-${tabName}`);
    activeBtn.classList.add('active', 'text-sky-600');
    activeBtn.classList.remove('text-gray-600');
}

// Pairings Modal Functions
function closePairingsModal() {
    const modal = document.getElementById('pairingsModal');
    if (modal) modal.remove();
}

async function regeneratePairings(eventId) {
    try {
        const registrations = await SocietyGolfDB.getRegistrations(eventId);
        const pairingData = window.SocietyOrganizerSystem.generateAutoPairings(registrations);
        await SocietyGolfDB.savePairings(eventId, pairingData);
        NotificationManager.show('Pairings regenerated', 'success');
        closePairingsModal();
        window.SocietyOrganizerSystem.openPairingsModal(eventId);
    } catch (error) {
        console.error('[Pairings] Error regenerating:', error);
        NotificationManager.show('Failed to regenerate pairings', 'error');
    }
}

async function toggleLockPairings(eventId, lock) {
    try {
        const currentUser = AppState.currentUser?.lineUserId;
        if (lock) {
            await SocietyGolfDB.lockPairings(eventId, currentUser);
            NotificationManager.show('Pairings locked', 'success');
        } else {
            await SocietyGolfDB.savePairings(eventId, { locked: false });
            NotificationManager.show('Pairings unlocked', 'success');
        }
        closePairingsModal();
        window.SocietyOrganizerSystem.openPairingsModal(eventId);
    } catch (error) {
        console.error('[Pairings] Error toggling lock:', error);
        NotificationManager.show('Failed to update pairings', 'error');
    }
}

async function exportPairings(eventId) {
    try {
        const pairings = await SocietyGolfDB.getPairings(eventId);
        const event = window.SocietyOrganizerSystem.events.find(e => e.id === eventId);

        const csv = ['Group,Tee Time,Player,Handicap'];
        (pairings.pairings || []).forEach(group => {
            group.players.forEach((player, idx) => {
                csv.push(`${group.groupNumber},${group.teeTime || ''},${player.playerName},${Math.round(player.handicap)}`);
            });
        });

        const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${event.name}_pairings.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        NotificationManager.show('Pairings exported', 'success');
    } catch (error) {
        console.error('[Pairings] Error exporting:', error);
        NotificationManager.show('Failed to export pairings', 'error');
    }
}

function updateTeeTime(groupNumber, time) {
    // This would update the tee time in the pairings data
    console.log(`Update group ${groupNumber} tee time to ${time}`);
}

// Calendar Functions
window.calendarDate = new Date();

function changeCalendarMonth(delta) {
    window.calendarDate.setMonth(window.calendarDate.getMonth() + delta);
    window.SocietyOrganizerSystem.renderCalendar();
}
