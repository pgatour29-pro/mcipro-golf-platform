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

            // Get the selected society's UUID (from society_profiles.id)
            const societyId = AppState.selectedSociety?.id || localStorage.getItem('selectedSocietyId');

            if (!societyId) {
                console.error('[SocietyOrganizer] No society selected');
                this.loading = false;
                return;
            }

            console.log('[SocietyOrganizer] Loading events for society UUID:', societyId);

            // Load only events for this specific society (by UUID)
            this.events = await SocietyGolfDB.getOrganizerEventsBySocietyId(societyId);

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
            const societyId = AppState.selectedSociety?.id ||
                             localStorage.getItem('selectedSocietyId');
            const organizerId = AppState.selectedSociety?.organizerId ||
                               localStorage.getItem('selectedSocietyOrganizerId');
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
                societyId: societyId,
                organizerId: organizerId,
                organizerName: organizerName,
                creatorId: AppState.currentUser?.lineUserId,
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
                        <button onclick="RegistrationsManager.openFromEvent('${event.id}')" class="btn-primary text-xs py-2 col-span-2">
                            <span class="material-symbols-outlined text-sm">how_to_reg</span>
                            <span class="ml-1">Manage Registrations</span>
                        </button>
                        <button onclick="SocietyOrganizerSystem.openRoster('${event.id}')" class="btn-secondary text-xs py-2">
                            <span class="material-symbols-outlined text-sm">groups</span>
                            <span class="ml-1">Quick View</span>
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
                                        <div class="text-xs bg-sky-100 text-sky-700 rounded px-1 py-0.5 mb-1 truncate cursor-pointer hover:bg-sky-200"
                                             onclick="RegistrationsManager.openFromEvent('${e.id}')"
                                             title="${e.name} - Click to manage registrations">
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
            // CRITICAL: Use ONLY the selected society's organizerId, NOT current user
            const organizerId = AppState.selectedSociety?.organizerId ||
                               localStorage.getItem('selectedSocietyOrganizerId');

            console.log('[SocietyOrganizer] Loading profile for organizerId:', organizerId);
            console.log('[SocietyOrganizer] AppState.selectedSociety:', AppState.selectedSociety);

            if (!organizerId) {
                console.warn('[SocietyOrganizer] No organizerId - cannot load profile');
                return;
            }

            const profile = await SocietyGolfDB.getSocietyProfile(organizerId);
            console.log('[SocietyOrganizer] Loaded profile:', profile);
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

    async handleLogoUpload(event) {
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

        try {
            console.log('[SocietyOrganizer] Uploading logo to storage...');

            // Show preview immediately while uploading
            const reader = new FileReader();
            reader.onload = (e) => {
                const preview = document.getElementById('societyLogoPreview');
                preview.innerHTML = `<img src="${e.target.result}" class="w-full h-full object-cover" alt="Society Logo">`;
            };
            reader.readAsDataURL(file);

            // Upload to Supabase storage
            const supabase = await getSupabaseClient();
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `society-logos/${fileName}`;

            console.log('[SocietyOrganizer] Uploading file:', filePath);

            const { data, error } = await supabase.storage
                .from('society-logos')
                .upload(filePath, file, {
                    contentType: file.type,
                    upsert: false
                });

            if (error) {
                console.error('[SocietyOrganizer] Upload error:', error);
                NotificationManager.show('Failed to upload logo: ' + error.message, 'error');
                return;
            }

            console.log('[SocietyOrganizer] Upload successful:', data);

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('society-logos')
                .getPublicUrl(filePath);

            console.log('[SocietyOrganizer] Public URL:', publicUrl);

            // Store the URL (not base64) to be saved to database
            this.tempLogoData = publicUrl;

            NotificationManager.show('Logo uploaded successfully', 'success');
        } catch (error) {
            console.error('[SocietyOrganizer] Error uploading logo:', error);
            NotificationManager.show('Failed to upload logo', 'error');
        }
    }

    async saveSocietyProfile() {
        try {
            // CRITICAL: Use the selected society's organizerId, NOT current user's ID
            const organizerId = AppState.selectedSociety?.organizerId ||
                               localStorage.getItem('selectedSocietyOrganizerId');

            console.log('[SocietyOrganizer] AppState.selectedSociety:', AppState.selectedSociety);
            console.log('[SocietyOrganizer] Selected organizerId:', organizerId);
            console.log('[SocietyOrganizer] Current user ID:', AppState.currentUser?.lineUserId);

            if (!organizerId) {
                NotificationManager.show('No society selected', 'error');
                return;
            }

            const profileData = {
                organizerId: organizerId,
                societyName: document.getElementById('societyName').value.trim(),
                description: document.getElementById('societyDescription').value.trim(),
                societyLogo: this.tempLogoData || this.societyProfile?.societyLogo || null
            };

            console.log('[SocietyOrganizer] Profile data to save:', profileData);
            console.log('[SocietyOrganizer] Current societyProfile logo:', this.societyProfile?.societyLogo);
            console.log('[SocietyOrganizer] tempLogoData:', this.tempLogoData);

            if (!profileData.societyName) {
                NotificationManager.show('Please enter society name', 'error');
                return;
            }

            if (this.societyProfile) {
                // Update existing profile
                console.log('[SocietyOrganizer] Updating profile for organizerId:', organizerId);
                const result = await SocietyGolfDB.updateSocietyProfile(organizerId, profileData);
                console.log('[SocietyOrganizer] Update result:', result);
                NotificationManager.show('Profile updated successfully', 'success');
            } else {
                // Create new profile
                console.log('[SocietyOrganizer] Creating new profile');
                const result = await SocietyGolfDB.createSocietyProfile(profileData);
                console.log('[SocietyOrganizer] Create result:', result);
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

    // Initialize registrations manager if registrations tab is shown
    if (tabName === 'registrations') {
        RegistrationsManager.init();
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

// ============================================
// REGISTRATIONS MANAGER
// ============================================
// Single-event focused registration management
// with stats, player list, waitlist, and pairings

const RegistrationsManager = {
    currentEventId: null,
    currentEvent: null,
    registrations: [],
    waitlist: [],
    pairingsData: null,
    pairingsPanelCollapsed: false,
    waitlistExpanded: false,
    groupSize: 4,
    filterText: '',

    // LocalStorage keys
    STORAGE_SELECTED_EVENT: 'reg_selected_event',
    STORAGE_SELECTION_DATE: 'reg_selection_date',

    async init() {
        console.log('[RegistrationsManager] Initializing...');
        await this.populateEventSelector();

        // Try to restore previous selection first
        const restored = this.restoreSelection();

        // If nothing restored, auto-select the upcoming/current event
        if (!restored && !this.currentEventId) {
            this.autoSelectUpcomingEvent();
        }
    },

    async populateEventSelector() {
        const selector = document.getElementById('registrationsEventSelector');
        if (!selector) return;

        try {
            const events = window.SocietyOrganizerSystem.events || [];
            const sortedEvents = [...events].sort((a, b) => new Date(b.date) - new Date(a.date));

            selector.innerHTML = '<option value="">-- Select an event --</option>' +
                sortedEvents.map(e => {
                    const dateStr = new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                    return `<option value="${e.id}">${e.name} - ${dateStr}</option>`;
                }).join('');

            console.log(`[RegistrationsManager] Populated selector with ${sortedEvents.length} events`);
        } catch (error) {
            console.error('[RegistrationsManager] Error populating events:', error);
        }
    },

    /**
     * Get current Thailand time (ICT, UTC+7)
     * Returns { hour, dateStr } where dateStr is YYYY-MM-DD in Thailand time
     */
    getThailandTime() {
        const now = new Date();
        // Thailand is UTC+7
        const thailandOffset = 7 * 60; // 7 hours in minutes
        const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
        const thailandTime = new Date(utcTime + (thailandOffset * 60000));

        return {
            hour: thailandTime.getHours(),
            minute: thailandTime.getMinutes(),
            dateStr: thailandTime.toISOString().split('T')[0],
            date: thailandTime
        };
    },

    /**
     * Find the upcoming or current event based on 6pm Thailand time cutoff
     * - Before 6pm Thailand: show today's event (or next upcoming if no event today)
     * - After 6pm Thailand: show next upcoming event (skip today's)
     */
    findUpcomingOrCurrentEvent() {
        const events = window.SocietyOrganizerSystem.events || [];
        if (events.length === 0) return null;

        const thailand = this.getThailandTime();
        const isAfter6pm = thailand.hour >= 18;
        const todayStr = thailand.dateStr;

        console.log(`[RegistrationsManager] Thailand time: ${thailand.hour}:${thailand.minute}, date: ${todayStr}, after 6pm: ${isAfter6pm}`);

        // Sort events by date ascending
        const sortedEvents = [...events].sort((a, b) => new Date(a.date) - new Date(b.date));

        // Find today's event
        const todayEvent = sortedEvents.find(e => e.date === todayStr);

        if (isAfter6pm) {
            // After 6pm: find next event AFTER today
            const nextEvent = sortedEvents.find(e => e.date > todayStr);
            if (nextEvent) {
                console.log(`[RegistrationsManager] After 6pm, selecting next event: ${nextEvent.name} (${nextEvent.date})`);
                return nextEvent;
            }
            // If no future event, fall back to today's event or most recent
            if (todayEvent) return todayEvent;
            return sortedEvents[sortedEvents.length - 1]; // Most recent past event
        } else {
            // Before 6pm: prefer today's event
            if (todayEvent) {
                console.log(`[RegistrationsManager] Before 6pm, selecting today's event: ${todayEvent.name}`);
                return todayEvent;
            }
            // If no event today, find next upcoming
            const nextEvent = sortedEvents.find(e => e.date > todayStr);
            if (nextEvent) {
                console.log(`[RegistrationsManager] No event today, selecting next upcoming: ${nextEvent.name} (${nextEvent.date})`);
                return nextEvent;
            }
            // Fall back to most recent past event
            return sortedEvents[sortedEvents.length - 1];
        }
    },

    /**
     * Auto-select the upcoming/current event on page load
     */
    autoSelectUpcomingEvent() {
        const upcomingEvent = this.findUpcomingOrCurrentEvent();
        if (upcomingEvent) {
            console.log(`[RegistrationsManager] Auto-selecting event: ${upcomingEvent.name}`);
            this.selectEvent(upcomingEvent.id, true);
        } else {
            console.log('[RegistrationsManager] No events available to auto-select');
        }
    },

    /**
     * Restore previous selection (returns true if restored)
     */
    restoreSelection() {
        const savedEventId = localStorage.getItem(this.STORAGE_SELECTED_EVENT);
        const lastDate = localStorage.getItem(this.STORAGE_SELECTION_DATE);

        // Get Thailand date for comparison
        const thailand = this.getThailandTime();
        const todayStr = thailand.dateStr;

        // Check if we need to auto-switch due to 6pm Thailand time
        if (thailand.hour >= 18) {
            // After 6pm - check if stored selection is for today's event
            const events = window.SocietyOrganizerSystem.events || [];
            const savedEvent = events.find(e => e.id === savedEventId);

            if (savedEvent && savedEvent.date === todayStr) {
                // Today's event is complete (after 6pm), don't restore it
                console.log('[RegistrationsManager] After 6pm, not restoring today\'s event - will auto-select next');
                localStorage.removeItem(this.STORAGE_SELECTED_EVENT);
                localStorage.removeItem(this.STORAGE_SELECTION_DATE);
                return false;
            }
        }

        // Only restore if selection was made today (in Thailand time)
        if (savedEventId && lastDate === todayStr) {
            const selector = document.getElementById('registrationsEventSelector');
            if (selector) {
                selector.value = savedEventId;
                this.selectEvent(savedEventId, true);
                console.log('[RegistrationsManager] Restored previous selection:', savedEventId);
                return true;
            }
        }

        return false;
    },

    async selectEvent(eventId, isAutomatic = false) {
        if (!eventId) {
            this.clearView();
            return;
        }

        this.currentEventId = eventId;

        // Save selection (unless automatic) - use Thailand date
        if (!isAutomatic) {
            const thailand = this.getThailandTime();
            localStorage.setItem(this.STORAGE_SELECTED_EVENT, eventId);
            localStorage.setItem(this.STORAGE_SELECTION_DATE, thailand.dateStr);
        }

        // Update selector
        const selector = document.getElementById('registrationsEventSelector');
        if (selector && selector.value !== eventId) {
            selector.value = eventId;
        }

        // Load data
        await this.loadEventData(eventId);
    },

    async loadEventData(eventId) {
        try {
            // Find event details
            const events = window.SocietyOrganizerSystem.events || [];
            this.currentEvent = events.find(e => e.id === eventId);

            if (!this.currentEvent) {
                console.error('[RegistrationsManager] Event not found:', eventId);
                NotificationManager.show('Event not found', 'error');
                return;
            }

            // Load registrations, waitlist, and pairings in parallel
            const [registrations, waitlist, pairings] = await Promise.all([
                SocietyGolfDB.getRegistrations(eventId),
                SocietyGolfDB.getWaitlist(eventId),
                SocietyGolfDB.getPairings(eventId)
            ]);

            this.registrations = registrations || [];
            this.waitlist = waitlist || [];
            this.pairingsData = pairings;

            console.log(`[RegistrationsManager] Loaded: ${this.registrations.length} registrations, ${this.waitlist.length} waitlist`);

            // Show event view
            this.showEventView();
            this.renderStats();
            this.renderPlayerTable();
            this.renderWaitlist();
            this.renderPairings();

        } catch (error) {
            console.error('[RegistrationsManager] Error loading event data:', error);
            NotificationManager.show('Failed to load event data', 'error');
        }
    },

    async refreshData() {
        if (!this.currentEventId) {
            NotificationManager.show('Select an event first', 'warning');
            return;
        }
        await this.loadEventData(this.currentEventId);
        NotificationManager.show('Data refreshed', 'success');
    },

    showEventView() {
        document.getElementById('registrationsNoEventState').style.display = 'none';
        document.getElementById('registrationsStatsContainer').style.display = 'grid';
        document.getElementById('registrationsMainContent').style.display = 'flex';
    },

    clearView() {
        document.getElementById('registrationsNoEventState').style.display = 'block';
        document.getElementById('registrationsStatsContainer').style.display = 'none';
        document.getElementById('registrationsMainContent').style.display = 'none';
        this.currentEventId = null;
        this.currentEvent = null;
        this.registrations = [];
        this.waitlist = [];
    },

    // === STATS RENDERING ===

    renderStats() {
        const regs = this.registrations;
        const transportCount = regs.filter(r => r.wantTransport).length;
        const competitionCount = regs.filter(r => r.wantCompetition).length;
        const totalRevenue = regs.reduce((sum, r) => sum + (parseFloat(r.totalFee) || 0), 0);
        const { vans, details } = this.calculateVans(transportCount);

        document.getElementById('regStatTotalPlayers').textContent = regs.length;
        document.getElementById('regStatTransportCount').textContent = transportCount;
        document.getElementById('regStatCompetitionCount').textContent = competitionCount;
        document.getElementById('regStatTotalRevenue').textContent = '฿' + totalRevenue.toLocaleString();
        document.getElementById('regStatVansNeeded').textContent = vans;
        document.getElementById('regStatVansDetails').textContent = details;
    },

    calculateVans(transportCount) {
        if (transportCount === 0) return { vans: 0, details: '' };

        // Van seating: 9 comfortable, 10 max
        // If exactly divisible by 10, use that number of vans at full capacity
        // Otherwise, divide by 9 and round up for comfort
        if (transportCount % 10 === 0) {
            const vans = transportCount / 10;
            return {
                vans: vans,
                details: `${transportCount} @ 10/van`
            };
        }

        const vans = Math.ceil(transportCount / 9);
        return {
            vans: vans,
            details: `${transportCount} @ 9/van`
        };
    },

    // === PLAYER TABLE RENDERING ===

    renderPlayerTable() {
        const tbody = document.getElementById('registrationsPlayerTableBody');
        if (!tbody) return;

        let regs = this.registrations;

        // Apply search filter
        if (this.filterText) {
            const search = this.filterText.toLowerCase();
            regs = regs.filter(r => r.playerName.toLowerCase().includes(search));
        }

        if (!regs || regs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="py-8 text-center text-gray-500">No registrations yet</td></tr>';
            return;
        }

        tbody.innerHTML = regs.map((reg, idx) => {
            const isPaid = reg.paymentStatus === 'paid';
            const rowClass = isPaid ? 'bg-green-50' : '';
            const specialRequests = reg.specialRequests || {};
            const requestIcons = this.getRequestIcons(specialRequests);

            return `
                <tr class="border-t hover:bg-gray-100 ${rowClass}" data-reg-id="${reg.id}">
                    <td class="px-3 py-2 text-gray-600">${idx + 1}</td>
                    <td class="px-3 py-2 font-medium">${reg.playerName}</td>
                    <td class="px-3 py-2 text-center">${Math.round(reg.handicap)}</td>
                    <td class="px-3 py-2 text-center">${reg.wantTransport ? '<span class="text-green-600">✓</span>' : '<span class="text-gray-300">-</span>'}</td>
                    <td class="px-3 py-2 text-center">${reg.wantCompetition ? '<span class="text-green-600">✓</span>' : '<span class="text-gray-300">-</span>'}</td>
                    <td class="px-3 py-2">
                        <button onclick="RegistrationsManager.editSpecialRequests('${reg.id}')" class="text-gray-600 hover:text-gray-900" title="Edit special requests">
                            ${requestIcons || '<span class="text-gray-300">-</span>'}
                        </button>
                    </td>
                    <td class="px-3 py-2 text-right">
                        <input type="number" value="${reg.totalFee || 0}"
                               onchange="RegistrationsManager.updateFee('${reg.id}', this.value)"
                               class="w-20 px-2 py-1 text-right border rounded text-sm">
                    </td>
                    <td class="px-3 py-2 text-center">
                        <button onclick="RegistrationsManager.togglePaymentStatus('${reg.id}')"
                                class="${isPaid ? 'text-green-600' : 'text-gray-400'} hover:opacity-75">
                            <span class="material-symbols-outlined">${isPaid ? 'check_circle' : 'radio_button_unchecked'}</span>
                        </button>
                    </td>
                    <td class="px-3 py-2 text-center">
                        <button onclick="RegistrationsManager.editPlayer('${reg.id}')" class="text-blue-600 hover:underline text-xs mr-1">Edit</button>
                        <button onclick="RegistrationsManager.removePlayer('${reg.id}')" class="text-red-600 hover:underline text-xs">Del</button>
                    </td>
                </tr>
            `;
        }).join('');
    },

    getRequestIcons(specialRequests) {
        const icons = [];
        if (specialRequests.earlyTeeTime) icons.push('<span title="Early Tee Time" class="text-yellow-500">⏰</span>');
        if (specialRequests.dietaryRestriction) icons.push('<span title="Dietary Restriction" class="text-orange-500">🍽️</span>');
        if (specialRequests.mobilityAssistance) icons.push('<span title="Mobility Assistance" class="text-blue-500">♿</span>');
        if (specialRequests.otherNotes) icons.push(`<span title="${specialRequests.otherNotes}" class="text-gray-500">📝</span>`);
        return icons.join(' ');
    },

    filterPlayers(searchText) {
        this.filterText = searchText;
        this.renderPlayerTable();
    },

    // === WAITLIST RENDERING ===

    renderWaitlist() {
        const countEl = document.getElementById('registrationsWaitlistCount');
        const tbody = document.getElementById('registrationsWaitlistTableBody');

        if (countEl) countEl.textContent = this.waitlist.length;

        if (!tbody) return;

        if (!this.waitlist || this.waitlist.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="py-4 text-center text-gray-500">No players on waitlist</td></tr>';
            return;
        }

        tbody.innerHTML = this.waitlist.map((w, idx) => {
            const requestedDate = new Date(w.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            return `
                <tr class="border-t hover:bg-orange-100">
                    <td class="px-3 py-2 font-medium text-orange-600">#${w.position || idx + 1}</td>
                    <td class="px-3 py-2 font-medium">${w.playerName}</td>
                    <td class="px-3 py-2 text-center">${Math.round(w.handicap)}</td>
                    <td class="px-3 py-2 text-gray-500 text-xs">${requestedDate}</td>
                    <td class="px-3 py-2 text-center">
                        <button onclick="RegistrationsManager.promoteFromWaitlist('${w.id}')" class="text-green-600 hover:underline text-xs mr-1">Promote</button>
                        <button onclick="RegistrationsManager.removeFromWaitlist('${w.id}')" class="text-red-600 hover:underline text-xs">Remove</button>
                    </td>
                </tr>
            `;
        }).join('');
    },

    toggleWaitlist() {
        this.waitlistExpanded = !this.waitlistExpanded;
        const section = document.getElementById('registrationsWaitlistSection');
        const chevron = document.getElementById('registrationsWaitlistChevron');

        if (section) section.style.display = this.waitlistExpanded ? 'block' : 'none';
        if (chevron) chevron.textContent = this.waitlistExpanded ? 'expand_less' : 'expand_more';
    },

    // === PAIRINGS RENDERING ===

    renderPairings() {
        const container = document.getElementById('pairingsGroupsContainer');
        if (!container) return;

        if (!this.pairingsData || !this.pairingsData.groups || this.pairingsData.groups.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <span class="material-symbols-outlined text-4xl mb-2">grid_view</span>
                    <p class="text-sm">No pairings yet</p>
                    <p class="text-xs text-gray-400 mt-1">Click "Auto" to create pairings</p>
                </div>
            `;
            return;
        }

        const isLocked = !!this.pairingsData.lockedAt;
        this.updateLockStatus(isLocked);

        container.innerHTML = this.pairingsData.groups.map((group, idx) => {
            const groupNum = idx + 1;
            const teeTime = group.teeTime || '';
            const players = group.players || [];

            return `
                <div class="pairing-group border rounded-lg p-3 bg-gray-50" data-group="${groupNum}"
                     ondragover="RegistrationsManager.onDragOver(event)" ondrop="RegistrationsManager.onDrop(event, ${groupNum})">
                    <div class="flex justify-between items-center mb-2">
                        <span class="font-medium text-sm text-gray-700">Group ${groupNum}</span>
                        <input type="time" value="${teeTime}"
                               onchange="RegistrationsManager.updateGroupTeeTime(${groupNum}, this.value)"
                               class="text-xs border rounded px-2 py-1 w-24"
                               ${isLocked ? 'disabled' : ''}>
                    </div>
                    <div class="space-y-1">
                        ${players.length === 0 ? '<div class="text-xs text-gray-400 italic py-2">Drop players here</div>' :
                        players.map(p => `
                            <div class="pairing-player bg-white rounded px-2 py-1 text-xs flex justify-between items-center border"
                                 draggable="${!isLocked}" data-player-id="${p.playerId}"
                                 ondragstart="RegistrationsManager.onDragStart(event, '${p.playerId}')">
                                <span>${p.playerName} (${p.handicap})</span>
                                ${!isLocked ? `<button onclick="RegistrationsManager.removeFromGroup(${groupNum}, '${p.playerId}')" class="text-red-500 hover:text-red-700">×</button>` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');

        // Add unassigned players section
        const unassigned = this.getUnassignedPlayers();
        if (unassigned.length > 0) {
            container.innerHTML += `
                <div class="border-t pt-3 mt-3">
                    <div class="text-xs font-medium text-gray-500 mb-2">Unassigned (${unassigned.length})</div>
                    <div class="space-y-1">
                        ${unassigned.map(p => `
                            <div class="pairing-player bg-yellow-50 rounded px-2 py-1 text-xs flex justify-between items-center border border-yellow-200"
                                 draggable="true" data-player-id="${p.playerId}"
                                 ondragstart="RegistrationsManager.onDragStart(event, '${p.playerId}')">
                                <span>${p.playerName} (${p.handicap})</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
    },

    getUnassignedPlayers() {
        if (!this.pairingsData || !this.pairingsData.groups) {
            return this.registrations.map(r => ({ playerId: r.playerId, playerName: r.playerName, handicap: r.handicap }));
        }

        const assignedIds = new Set();
        this.pairingsData.groups.forEach(g => {
            (g.players || []).forEach(p => assignedIds.add(p.playerId));
        });

        return this.registrations
            .filter(r => !assignedIds.has(r.playerId))
            .map(r => ({ playerId: r.playerId, playerName: r.playerName, handicap: r.handicap }));
    },

    updateLockStatus(isLocked) {
        const statusEl = document.getElementById('pairingsLockStatus');
        const lockBtn = document.getElementById('pairingsLockBtn');

        if (statusEl) {
            statusEl.innerHTML = isLocked ?
                '<span class="material-symbols-outlined text-xs align-middle text-red-600">lock</span> <span class="text-red-600">Locked</span>' :
                '<span class="material-symbols-outlined text-xs align-middle">lock_open</span> Unlocked';
        }

        if (lockBtn) {
            lockBtn.innerHTML = isLocked ?
                '<span class="material-symbols-outlined text-sm">lock_open</span> Unlock' :
                '<span class="material-symbols-outlined text-sm">lock</span> Lock';
        }
    },

    togglePairingsPanel() {
        this.pairingsPanelCollapsed = !this.pairingsPanelCollapsed;
        const panel = document.getElementById('registrationsPairingsPanel');
        const content = document.getElementById('pairingsPanelContent');
        const chevron = document.getElementById('pairingsPanelChevron');

        if (this.pairingsPanelCollapsed) {
            panel.style.width = '60px';
            if (content) content.style.display = 'none';
            if (chevron) chevron.textContent = 'chevron_left';
        } else {
            panel.style.width = '';
            if (content) content.style.display = 'block';
            if (chevron) chevron.textContent = 'chevron_right';
        }
    },

    // === DRAG-DROP HANDLERS ===

    onDragStart(event, playerId) {
        event.dataTransfer.setData('text/plain', JSON.stringify({ type: 'player', playerId }));
        event.target.classList.add('opacity-50');
    },

    onDragOver(event) {
        event.preventDefault();
        event.currentTarget.classList.add('bg-green-100');
    },

    onDrop(event, groupNumber) {
        event.preventDefault();
        event.currentTarget.classList.remove('bg-green-100');

        try {
            const data = JSON.parse(event.dataTransfer.getData('text/plain'));
            if (data.type === 'player') {
                this.movePlayerToGroup(data.playerId, groupNumber);
            }
        } catch (e) {
            console.error('[RegistrationsManager] Drop error:', e);
        }
    },

    async movePlayerToGroup(playerId, groupNumber) {
        if (!this.pairingsData || !this.pairingsData.groups) return;

        // Find player info
        const playerReg = this.registrations.find(r => r.playerId === playerId);
        if (!playerReg) return;

        const playerData = {
            playerId: playerReg.playerId,
            playerName: playerReg.playerName,
            handicap: playerReg.handicap
        };

        // Remove from current group
        this.pairingsData.groups.forEach(g => {
            g.players = (g.players || []).filter(p => p.playerId !== playerId);
        });

        // Add to target group
        const targetGroup = this.pairingsData.groups[groupNumber - 1];
        if (targetGroup) {
            if (!targetGroup.players) targetGroup.players = [];
            if (targetGroup.players.length < this.groupSize) {
                targetGroup.players.push(playerData);
            } else {
                NotificationManager.show('Group is full', 'warning');
                return;
            }
        }

        // Save and re-render
        await this.savePairings();
        this.renderPairings();
    },

    async removeFromGroup(groupNumber, playerId) {
        if (!this.pairingsData || !this.pairingsData.groups) return;

        const group = this.pairingsData.groups[groupNumber - 1];
        if (group && group.players) {
            group.players = group.players.filter(p => p.playerId !== playerId);
            await this.savePairings();
            this.renderPairings();
        }
    },

    // === PAIRINGS ACTIONS ===

    setGroupSize(size) {
        this.groupSize = parseInt(size) || 4;
        console.log('[RegistrationsManager] Group size set to:', this.groupSize);
    },

    async autoPairByHandicap() {
        if (!this.registrations || this.registrations.length === 0) {
            NotificationManager.show('No players to pair', 'warning');
            return;
        }

        // Sort by handicap
        const sorted = [...this.registrations].sort((a, b) => a.handicap - b.handicap);

        // Create groups
        const groups = [];
        for (let i = 0; i < sorted.length; i += this.groupSize) {
            const groupPlayers = sorted.slice(i, i + this.groupSize).map(r => ({
                playerId: r.playerId,
                playerName: r.playerName,
                handicap: r.handicap
            }));
            groups.push({ players: groupPlayers, teeTime: '' });
        }

        this.pairingsData = {
            eventId: this.currentEventId,
            groupSize: this.groupSize,
            groups: groups,
            lockedAt: null,
            lockedBy: null
        };

        await this.savePairings();
        this.renderPairings();
        NotificationManager.show(`Created ${groups.length} groups by handicap`, 'success');
    },

    async pairByPartnerRequests() {
        if (!this.registrations || this.registrations.length === 0) {
            NotificationManager.show('No players to pair', 'warning');
            return;
        }

        // Build player lookup
        const byId = {};
        this.registrations.forEach(r => { byId[r.playerId] = r; });

        const used = new Set();
        const packs = []; // Each pack is a group of 1-2 players who want to be together

        // Step 1: Find mutual pairs
        this.registrations.forEach(a => {
            if (used.has(a.playerId)) return;
            const prefs = a.partnerPrefs || [];

            for (const prefId of prefs) {
                const b = byId[prefId];
                if (!b || used.has(b.playerId)) continue;

                const bPrefs = b.partnerPrefs || [];
                if (bPrefs.includes(a.playerId)) {
                    // Mutual match!
                    packs.push([a, b]);
                    used.add(a.playerId);
                    used.add(b.playerId);
                    return;
                }
            }
        });

        // Step 2: Add remaining singles
        this.registrations.forEach(r => {
            if (!used.has(r.playerId)) {
                packs.push([r]);
            }
        });

        // Step 3: Pack into groups
        const groups = [];
        let currentGroup = [];

        packs.forEach(pack => {
            if (currentGroup.length + pack.length <= this.groupSize) {
                currentGroup.push(...pack);
            } else {
                if (currentGroup.length > 0) {
                    groups.push({
                        players: currentGroup.map(r => ({ playerId: r.playerId, playerName: r.playerName, handicap: r.handicap })),
                        teeTime: ''
                    });
                }
                currentGroup = [...pack];
            }
        });

        // Don't forget the last group
        if (currentGroup.length > 0) {
            groups.push({
                players: currentGroup.map(r => ({ playerId: r.playerId, playerName: r.playerName, handicap: r.handicap })),
                teeTime: ''
            });
        }

        const mutualPairs = packs.filter(p => p.length === 2).length;

        this.pairingsData = {
            eventId: this.currentEventId,
            groupSize: this.groupSize,
            groups: groups,
            lockedAt: null,
            lockedBy: null
        };

        await this.savePairings();
        this.renderPairings();
        NotificationManager.show(`Created ${groups.length} groups (${mutualPairs} mutual pairs honored)`, 'success');
    },

    async toggleLockPairings() {
        if (!this.pairingsData) {
            NotificationManager.show('No pairings to lock', 'warning');
            return;
        }

        const isCurrentlyLocked = !!this.pairingsData.lockedAt;
        const currentUser = AppState.currentUser?.lineUserId;

        if (isCurrentlyLocked) {
            this.pairingsData.lockedAt = null;
            this.pairingsData.lockedBy = null;
            NotificationManager.show('Pairings unlocked', 'success');
        } else {
            this.pairingsData.lockedAt = new Date().toISOString();
            this.pairingsData.lockedBy = currentUser;
            NotificationManager.show('Pairings locked', 'success');
        }

        await this.savePairings();
        this.renderPairings();
    },

    async updateGroupTeeTime(groupNumber, time) {
        if (!this.pairingsData || !this.pairingsData.groups) return;

        const group = this.pairingsData.groups[groupNumber - 1];
        if (group) {
            group.teeTime = time;
            await this.savePairings();
        }
    },

    async savePairings() {
        try {
            await SocietyGolfDB.savePairings(this.currentEventId, this.pairingsData);
        } catch (error) {
            console.error('[RegistrationsManager] Error saving pairings:', error);
            NotificationManager.show('Failed to save pairings', 'error');
        }
    },

    // === PLAYER ACTIONS ===

    async updateFee(regId, newFee) {
        try {
            const fee = parseFloat(newFee) || 0;
            await SocietyGolfDB.updateRegistrationFee(regId, fee);

            // Update local data
            const reg = this.registrations.find(r => r.id === regId);
            if (reg) reg.totalFee = fee;

            this.renderStats();
        } catch (error) {
            console.error('[RegistrationsManager] Error updating fee:', error);
            NotificationManager.show('Failed to update fee', 'error');
        }
    },

    async togglePaymentStatus(regId) {
        try {
            const reg = this.registrations.find(r => r.id === regId);
            if (!reg) return;

            const isPaid = reg.paymentStatus === 'paid';
            const newStatus = isPaid ? 'unpaid' : 'paid';
            const currentUser = AppState.currentUser?.lineUserId;

            if (newStatus === 'paid') {
                await SocietyGolfDB.markPlayerPaid(this.currentEventId, reg.playerId, reg.totalFee || 0, currentUser);
            } else {
                await SocietyGolfDB.markPlayerUnpaid(this.currentEventId, reg.playerId);
            }

            reg.paymentStatus = newStatus;
            this.renderPlayerTable();
            NotificationManager.show(newStatus === 'paid' ? 'Marked as paid' : 'Marked as unpaid', 'success');
        } catch (error) {
            console.error('[RegistrationsManager] Error toggling payment:', error);
            NotificationManager.show('Failed to update payment status', 'error');
        }
    },

    async editPlayer(regId) {
        // Open the existing roster edit functionality or create new modal
        const reg = this.registrations.find(r => r.id === regId);
        if (!reg) return;

        // For now, open a simple prompt-based edit
        const newHcp = prompt(`Edit handicap for ${reg.playerName}:`, reg.handicap);
        if (newHcp !== null) {
            try {
                await SocietyGolfDB.updateRegistration(regId, { handicap: parseFloat(newHcp) || 0 });
                await this.loadEventData(this.currentEventId);
                NotificationManager.show('Player updated', 'success');
            } catch (error) {
                console.error('[RegistrationsManager] Error updating player:', error);
                NotificationManager.show('Failed to update player', 'error');
            }
        }
    },

    async removePlayer(regId) {
        if (!confirm('Remove this player from the event?')) return;

        try {
            await SocietyGolfDB.removeRegistration(regId);
            await this.loadEventData(this.currentEventId);
            NotificationManager.show('Player removed', 'success');
        } catch (error) {
            console.error('[RegistrationsManager] Error removing player:', error);
            NotificationManager.show('Failed to remove player', 'error');
        }
    },

    // === WAITLIST ACTIONS ===

    async promoteFromWaitlist(waitId) {
        try {
            const w = this.waitlist.find(item => item.id === waitId);
            if (!w) return;

            // Check if event has room
            const maxPlayers = this.currentEvent?.maxPlayers || 999;
            if (this.registrations.length >= maxPlayers) {
                NotificationManager.show('Event is at capacity', 'warning');
                return;
            }

            // Add to registrations
            await SocietyGolfDB.registerForEvent(this.currentEventId, {
                playerName: w.playerName,
                playerId: w.playerId,
                handicap: w.handicap,
                wantTransport: w.wantTransport,
                wantCompetition: w.wantCompetition
            });

            // Remove from waitlist
            await SocietyGolfDB.removeFromWaitlist(waitId);

            await this.loadEventData(this.currentEventId);
            NotificationManager.show('Player promoted to confirmed', 'success');
        } catch (error) {
            console.error('[RegistrationsManager] Error promoting from waitlist:', error);
            NotificationManager.show('Failed to promote player', 'error');
        }
    },

    async removeFromWaitlist(waitId) {
        if (!confirm('Remove this player from the waitlist?')) return;

        try {
            await SocietyGolfDB.removeFromWaitlist(waitId);
            await this.loadEventData(this.currentEventId);
            NotificationManager.show('Player removed from waitlist', 'success');
        } catch (error) {
            console.error('[RegistrationsManager] Error removing from waitlist:', error);
            NotificationManager.show('Failed to remove player', 'error');
        }
    },

    // === SPECIAL REQUESTS ===

    editSpecialRequests(regId) {
        const reg = this.registrations.find(r => r.id === regId);
        if (!reg) return;

        // Store for save
        this._editingRegId = regId;

        // Populate modal fields
        const sr = reg.specialRequests || {};
        document.getElementById('srEarlyTeeTime').checked = sr.earlyTeeTime || false;
        document.getElementById('srDietaryRestriction').checked = sr.dietaryRestriction || false;
        document.getElementById('srMobilityAssistance').checked = sr.mobilityAssistance || false;
        document.getElementById('srOtherNotes').value = sr.otherNotes || '';
        document.getElementById('editSpecialRequestsPlayerName').textContent = reg.playerName;

        // Show modal
        document.getElementById('editSpecialRequestsModal').style.display = 'flex';
    },

    closeSpecialRequestsModal() {
        document.getElementById('editSpecialRequestsModal').style.display = 'none';
        this._editingRegId = null;
    },

    async saveSpecialRequests() {
        if (!this._editingRegId) return;

        const specialRequests = {
            earlyTeeTime: document.getElementById('srEarlyTeeTime').checked,
            dietaryRestriction: document.getElementById('srDietaryRestriction').checked,
            mobilityAssistance: document.getElementById('srMobilityAssistance').checked,
            otherNotes: document.getElementById('srOtherNotes').value.trim()
        };

        try {
            await SocietyGolfDB.updateRegistration(this._editingRegId, { specialRequests });

            // Update local data
            const reg = this.registrations.find(r => r.id === this._editingRegId);
            if (reg) reg.specialRequests = specialRequests;

            this.closeSpecialRequestsModal();
            this.renderPlayerTable();
            NotificationManager.show('Special requests saved', 'success');
        } catch (error) {
            console.error('[RegistrationsManager] Error saving special requests:', error);
            NotificationManager.show('Failed to save special requests', 'error');
        }
    },

    // === ADD PLAYER ===

    openAddPlayerModal() {
        // Use existing add player modal from roster functionality
        if (window.SocietyOrganizerSystem && this.currentEventId) {
            window.SocietyOrganizerSystem.currentRosterEvent = this.currentEvent;
            window.SocietyOrganizerSystem.openAddPlayerModal();
        } else {
            NotificationManager.show('Select an event first', 'warning');
        }
    },

    // === EXPORT ===

    async exportRoster() {
        if (!this.currentEvent || !this.registrations.length) {
            NotificationManager.show('No registrations to export', 'warning');
            return;
        }

        try {
            const csv = [
                ['#', 'Name', 'Handicap', 'Transport', 'Competition', 'Fee', 'Paid', 'Special Requests'].join(',')
            ];

            this.registrations.forEach((reg, idx) => {
                const sr = reg.specialRequests || {};
                const requests = [];
                if (sr.earlyTeeTime) requests.push('Early Tee');
                if (sr.dietaryRestriction) requests.push('Dietary');
                if (sr.mobilityAssistance) requests.push('Mobility');
                if (sr.otherNotes) requests.push(sr.otherNotes);

                csv.push([
                    idx + 1,
                    `"${reg.playerName}"`,
                    reg.handicap,
                    reg.wantTransport ? 'Yes' : 'No',
                    reg.wantCompetition ? 'Yes' : 'No',
                    reg.totalFee || 0,
                    reg.paymentStatus === 'paid' ? 'Paid' : 'Unpaid',
                    `"${requests.join('; ')}"`
                ].join(','));
            });

            const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${this.currentEvent.name}_registrations.csv`;
            a.click();
            window.URL.revokeObjectURL(url);
            NotificationManager.show('Roster exported', 'success');
        } catch (error) {
            console.error('[RegistrationsManager] Error exporting:', error);
            NotificationManager.show('Failed to export roster', 'error');
        }
    },

    // === NAVIGATION FROM OTHER PAGES ===

    openFromEvent(eventId) {
        showOrganizerTab('registrations');
        setTimeout(() => {
            this.selectEvent(eventId);
        }, 100);
    }
};

window.RegistrationsManager = RegistrationsManager;
