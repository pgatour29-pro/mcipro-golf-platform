
    <script>
    // ============================================
    // SOCIETY GOLF SYSTEM - Supabase Integration
    // ============================================
// ============================================
// SOCIETY GOLF SYSTEM - Supabase Integration
// ============================================

class SocietyGolfSupabase {
    constructor() {
        this.subscriptions = [];
    }

    async waitForSupabase() {
        if (!window.SupabaseManager || !window.SupabaseManager.client) {
            await new Promise((resolve) => setTimeout(resolve, 100));
            return this.waitForSupabase();
        }
    }

    // =====================================================
    // EVENTS MANAGEMENT
    // =====================================================

    async getEvents() {
        await this.waitForSupabase();
        const { data, error } = await SupabaseManager.client
            .from('society_events')
            .select('*')
            .order('date', { ascending: true });

        if (error) {
            console.error('[SocietyGolf] Error fetching events:', error);
            return [];
        }

        return (data || []).map(e => ({
            id: e.id,
            name: e.name,
            date: e.date,
            cutoff: e.cutoff,
            baseFee: e.base_fee || 0,
            cartFee: e.cart_fee || 0,
            caddyFee: e.caddy_fee || 0,
            transportFee: e.transport_fee || 0,
            competitionFee: e.competition_fee || 0,
            maxPlayers: e.max_players,
            organizerId: e.organizer_id,
            organizerName: e.organizer_name,
            status: e.status,
            courseId: e.course_id,
            courseName: e.course_name,
            notes: e.notes,
            createdAt: e.created_at,
            updatedAt: e.updated_at
        }));
    }

    async getEvent(eventId) {
        await this.waitForSupabase();
        const { data, error } = await SupabaseManager.client
            .from('society_events')
            .select('*')
            .eq('id', eventId)
            .single();

        if (error) {
            console.error('[SocietyGolf] Error fetching event:', error);
            return null;
        }

        return data ? {
            id: data.id,
            name: data.name,
            date: data.date,
            cutoff: data.cutoff,
            baseFee: data.base_fee || 0,
            cartFee: data.cart_fee || 0,
            caddyFee: data.caddy_fee || 0,
            transportFee: data.transport_fee || 0,
            competitionFee: data.competition_fee || 0,
            maxPlayers: data.max_players,
            organizerId: data.organizer_id,
            organizerName: data.organizer_name,
            status: data.status,
            courseId: data.course_id,
            courseName: data.course_name,
            notes: data.notes
        } : null;
    }

    async createEvent(eventData) {
        await this.waitForSupabase();
        const { data, error } = await SupabaseManager.client
            .from('society_events')
            .insert([{
                id: eventData.id || this.generateId(),
                name: eventData.name,
                date: eventData.date,
                cutoff: eventData.cutoff,
                base_fee: eventData.baseFee || 0,
                cart_fee: eventData.cartFee || 0,
                caddy_fee: eventData.caddyFee || 0,
                transport_fee: eventData.transportFee || 0,
                competition_fee: eventData.competitionFee || 0,
                max_players: eventData.maxPlayers,
                organizer_id: eventData.organizerId,
                organizer_name: eventData.organizerName,
                status: 'open',
                course_id: eventData.courseId,
                course_name: eventData.courseName,
                notes: eventData.notes
            }])
            .select()
            .single();

        if (error) {
            console.error('[SocietyGolf] Error creating event:', error);
            throw error;
        }

        return data;
    }

    async updateEvent(eventId, updates) {
        await this.waitForSupabase();
        const dbUpdates = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.date !== undefined) dbUpdates.date = updates.date;
        if (updates.cutoff !== undefined) dbUpdates.cutoff = updates.cutoff;
        if (updates.baseFee !== undefined) dbUpdates.base_fee = updates.baseFee;
        if (updates.cartFee !== undefined) dbUpdates.cart_fee = updates.cartFee;
        if (updates.caddyFee !== undefined) dbUpdates.caddy_fee = updates.caddyFee;
        if (updates.transportFee !== undefined) dbUpdates.transport_fee = updates.transportFee;
        if (updates.competitionFee !== undefined) dbUpdates.competition_fee = updates.competitionFee;
        if (updates.maxPlayers !== undefined) dbUpdates.max_players = updates.maxPlayers;
        if (updates.status !== undefined) dbUpdates.status = updates.status;
        if (updates.courseName !== undefined) dbUpdates.course_name = updates.courseName;
        if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

        // CRITICAL: Always update updated_at so golfers see badge notifications for event changes
        dbUpdates.updated_at = new Date().toISOString();

        // Track WHO made the change for notifications
        const currentUser = window.AppState?.currentUser || window.currentUser;
        if (currentUser) {
            dbUpdates.updated_by = currentUser.lineUserId || currentUser.id || null;
            dbUpdates.updated_by_name = currentUser.displayName || currentUser.name || 'Admin';
        }

        const { error } = await SupabaseManager.client
            .from('society_events')
            .update(dbUpdates)
            .eq('id', eventId);

        if (error) {
            console.error('[SocietyGolf] Error updating event:', error);
            throw error;
        }
    }

    async deleteEvent(eventId) {
        await this.waitForSupabase();
        const { error } = await SupabaseManager.client
            .from('society_events')
            .delete()
            .eq('id', eventId);

        if (error) {
            console.error('[SocietyGolf] Error deleting event:', error);
            throw error;
        }
    }

    // =====================================================
    // REGISTRATIONS MANAGEMENT
    // =====================================================

    async getRegistrations(eventId) {
        await this.waitForSupabase();
        const { data, error } = await SupabaseManager.client
            .from('event_registrations')
            .select('*')
            .eq('event_id', eventId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('[SocietyGolf] Error fetching registrations:', error);
            return [];
        }

        return (data || []).map(r => ({
            id: r.id,
            eventId: r.event_id,
            playerName: r.player_name,
            playerId: r.player_id,
            wantTransport: r.want_transport,
            wantCompetition: r.want_competition,
            pairedGroup: r.paired_group,
            createdAt: r.created_at
        }));
    }

    async registerPlayer(eventId, playerData) {
        await this.waitForSupabase();
        const { data, error } = await SupabaseManager.client
            .from('event_registrations')
            .insert([{
                event_id: eventId,
                player_name: playerData.name,
                player_id: playerData.playerId,
                want_transport: playerData.wantTransport || false,
                want_competition: playerData.wantCompetition || false
            }])
            .select()
            .single();

        if (error) {
            console.error('[SocietyGolf] Error registering player:', error);
            throw error;
        }

        return data;
    }

    async updateRegistration(regId, updates) {
        await this.waitForSupabase();
        const dbUpdates = {};
        if (updates.pairedGroup !== undefined) dbUpdates.paired_group = updates.pairedGroup;
        if (updates.wantTransport !== undefined) dbUpdates.want_transport = updates.wantTransport;
        if (updates.wantCompetition !== undefined) dbUpdates.want_competition = updates.wantCompetition;

        const { error } = await SupabaseManager.client
            .from('event_registrations')
            .update(dbUpdates)
            .eq('id', regId);

        if (error) {
            console.error('[SocietyGolf] Error updating registration:', error);
            throw error;
        }
    }

    async deleteRegistration(regId) {
        await this.waitForSupabase();
        const { error } = await SupabaseManager.client
            .from('event_registrations')
            .delete()
            .eq('id', regId);

        if (error) {
            console.error('[SocietyGolf] Error deleting registration:', error);
            throw error;
        }
    }

    // =====================================================
    // WAITLIST MANAGEMENT
    // =====================================================

    async getWaitlist(eventId) {
        await this.waitForSupabase();
        const { data, error } = await SupabaseManager.client
            .from('event_waitlist')
            .select('*')
            .eq('event_id', eventId)
            .order('position', { ascending: true });

        if (error) {
            console.error('[SocietyGolf] Error fetching waitlist:', error);
            return [];
        }

        return (data || []).map(w => ({
            id: w.id,
            eventId: w.event_id,
            playerName: w.player_name,
            playerId: w.player_id,
            wantTransport: w.want_transport,
            wantCompetition: w.want_competition,
            position: w.position,
            createdAt: w.created_at
        }));
    }

    async joinWaitlist(eventId, playerData) {
        await this.waitForSupabase();
        // Get current max position
        const { data: existing } = await SupabaseManager.client
            .from('event_waitlist')
            .select('position')
            .eq('event_id', eventId)
            .order('position', { ascending: false })
            .limit(1);

        const position = (existing && existing.length > 0) ? existing[0].position + 1 : 1;

        const { data, error } = await SupabaseManager.client
            .from('event_waitlist')
            .insert([{
                event_id: eventId,
                player_name: playerData.name,
                player_id: playerData.playerId,
                want_transport: playerData.wantTransport || false,
                want_competition: playerData.wantCompetition || false,
                position: position
            }])
            .select()
            .single();

        if (error) {
            console.error('[SocietyGolf] Error joining waitlist:', error);
            throw error;
        }

        return data;
    }

    async removeFromWaitlist(waitId) {
        await this.waitForSupabase();
        const { error } = await SupabaseManager.client
            .from('event_waitlist')
            .delete()
            .eq('id', waitId);

        if (error) {
            console.error('[SocietyGolf] Error removing from waitlist:', error);
            throw error;
        }
    }

    // =====================================================
    // PAIRINGS MANAGEMENT
    // =====================================================

    async getPairings(eventId) {
        await this.waitForSupabase();
        const { data, error } = await SupabaseManager.client
            .from('event_pairings')
            .select('*')
            .eq('event_id', eventId)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
            console.error('[SocietyGolf] Error fetching pairings:', error);
            return null;
        }

        return data ? {
            eventId: data.event_id,
            groupSize: data.group_size,
            groups: data.groups,
            lockedAt: data.locked_at,
            lockedBy: data.locked_by
        } : null;
    }

    async savePairings(eventId, pairingsData) {
        await this.waitForSupabase();
        const { error } = await SupabaseManager.client
            .from('event_pairings')
            .upsert({
                event_id: eventId,
                group_size: pairingsData.groupSize,
                groups: pairingsData.groups
            });

        if (error) {
            console.error('[SocietyGolf] Error saving pairings:', error);
            throw error;
        }
    }

    async lockPairings(eventId, userId) {
        await this.waitForSupabase();
        const { error } = await SupabaseManager.client
            .from('event_pairings')
            .update({
                locked_at: new Date().toISOString(),
                locked_by: userId
            })
            .eq('event_id', eventId);

        if (error) {
            console.error('[SocietyGolf] Error locking pairings:', error);
            throw error;
        }
    }

    // =====================================================
    // REALTIME SUBSCRIPTIONS
    // =====================================================

    subscribeToEvents(callback) {
        const subscription = SupabaseManager.client
            .channel('society_events_changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'society_events'
            }, callback)
            .subscribe();

        this.subscriptions.push(subscription);
        return subscription;
    }

    subscribeToRegistrations(eventId, callback) {
        const subscription = SupabaseManager.client
            .channel(`event_${eventId}_registrations`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'event_registrations',
                filter: `event_id=eq.${eventId}`
            }, callback)
            .subscribe();

        this.subscriptions.push(subscription);
        return subscription;
    }

    subscribeToWaitlist(eventId, callback) {
        const subscription = SupabaseManager.client
            .channel(`event_${eventId}_waitlist`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'event_waitlist',
                filter: `event_id=eq.${eventId}`
            }, callback)
            .subscribe();

        this.subscriptions.push(subscription);
        return subscription;
    }

    unsubscribeAll() {
        this.subscriptions.forEach(sub => {
            sub.unsubscribe();
        });
        this.subscriptions = [];
    }

    // =====================================================
    // UTILITIES
    // =====================================================

    generateId() {
        return Math.random().toString(36).substring(2, 11);
    }
}

// Initialize global instance
window.SocietyGolfDB = new SocietyGolfSupabase();
    </script>

    <script>
    // ============================================
    // SOCIETY ORGANIZER SYSTEM - UI Management
    // ============================================
// ============================================
// SOCIETY ORGANIZER SYSTEM - UI Management
// ============================================

class SocietyOrganizerManager {
    constructor() {
        this.currentEvent = null;
        this.events = [];
        this.currentRosterEvent = null;
    }

    async init() {
        console.log('[SocietyOrganizer] Initializing...');
        await this.loadEvents();
        this.subscribeToChanges();
    }

    async loadEvents() {
        try {
            this.events = await SocietyGolfDB.getEvents();
            this.renderEventsList();
        } catch (error) {
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
            document.getElementById('eventCutoff').value = event.cutoff?.substring(0, 16) || '';
            document.getElementById('eventMaxPlayers').value = event.maxPlayers || '';
            document.getElementById('eventCourse').value = event.courseName || '';
            document.getElementById('eventBaseFee').value = event.baseFee || 0;
            document.getElementById('eventCartFee').value = event.cartFee || 0;
            document.getElementById('eventCaddyFee').value = event.caddyFee || 0;
            document.getElementById('eventTransportFee').value = event.transportFee || 0;
            document.getElementById('eventCompetitionFee').value = event.competitionFee || 0;
            document.getElementById('eventNotes').value = event.notes || '';
        } else {
            // Create mode
            title.textContent = 'Create New Event';
            this.currentEvent = null;

            // Clear form
            document.getElementById('eventName').value = '';
            document.getElementById('eventDate').value = '';
            document.getElementById('eventCutoff').value = '';
            document.getElementById('eventMaxPlayers').value = '40';
            document.getElementById('eventCourse').value = '';
            document.getElementById('eventBaseFee').value = '0';
            document.getElementById('eventCartFee').value = '0';
            document.getElementById('eventCaddyFee').value = '0';
            document.getElementById('eventTransportFee').value = '0';
            document.getElementById('eventCompetitionFee').value = '0';
            document.getElementById('eventNotes').value = '';
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
            const eventData = {
                name: document.getElementById('eventName').value.trim(),
                date: document.getElementById('eventDate').value,
                cutoff: document.getElementById('eventCutoff').value,
                maxPlayers: parseInt(document.getElementById('eventMaxPlayers').value) || null,
                courseName: document.getElementById('eventCourse').value.trim(),
                baseFee: parseInt(document.getElementById('eventBaseFee').value) || 0,
                cartFee: parseInt(document.getElementById('eventCartFee').value) || 0,
                caddyFee: parseInt(document.getElementById('eventCaddyFee').value) || 0,
                transportFee: parseInt(document.getElementById('eventTransportFee').value) || 0,
                competitionFee: parseInt(document.getElementById('eventCompetitionFee').value) || 0,
                notes: document.getElementById('eventNotes').value.trim(),
                organizerId: AppState.currentUser?.lineUserId,
                organizerName: AppState.currentUser?.name
            };

            // Validation
            if (!eventData.name) {
                NotificationManager.show('Please enter event name', 'error');
                return;
            }
            if (!eventData.date) {
                NotificationManager.show('Please select event date', 'error');
                return;
            }

            if (this.currentEvent) {
                // Update existing event
                await SocietyGolfDB.updateEvent(this.currentEvent.id, eventData);
                NotificationManager.show('Event updated successfully', 'success');
            } else {
                // Create new event
                await SocietyGolfDB.createEvent(eventData);
                NotificationManager.show('Event created successfully', 'success');
            }

            this.hideEventForm();
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
        const cutoffDate = event.cutoff ? new Date(event.cutoff).toLocaleString() : '-';
        const maxDisplay = event.maxPlayers ? event.maxPlayers : '∞';

        // Status badge
        const now = new Date();
        const cutoff = event.cutoff ? new Date(event.cutoff) : null;
        const isPastCutoff = cutoff && now > cutoff;
        const statusBadge = isPastCutoff
            ? '<span class="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">Closed</span>'
            : '<span class="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Open</span>';

        return `
            <div class="bg-white rounded-2xl shadow-lg border overflow-hidden hover:shadow-xl transition-shadow">
                <div class="bg-gradient-to-r from-sky-600 to-sky-400 text-white p-4">
                    <div class="flex justify-between items-start">
                        <div>
                            <h3 class="text-lg font-bold mb-1">${event.name}</h3>
                            <p class="text-xs text-sky-100">${eventDate} • Max: ${maxDisplay}</p>
                        </div>
                        ${statusBadge}
                    </div>
                </div>

                <div class="p-4 space-y-3">
                    <!-- Details -->
                    <div class="grid grid-cols-2 gap-2 text-sm">
                        <div class="text-gray-600">Cutoff:</div>
                        <div class="font-medium text-gray-900">${cutoffDate}</div>
                        ${event.courseName ? `
                            <div class="text-gray-600">Course:</div>
                            <div class="font-medium text-gray-900">${event.courseName}</div>
                        ` : ''}
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
                    <div class="grid grid-cols-2 gap-2">
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
                    <button onclick="SocietyOrganizerSystem.copyRegistrationLink('${event.id}')" class="w-full btn-primary text-xs py-2">
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
                <td class="px-4 py-2 text-center">${reg.wantTransport ? '✓' : '-'}</td>
                <td class="px-4 py-2 text-center">${reg.wantCompetition ? '✓' : '-'}</td>
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
        const headers = ['Name', 'Transport', 'Competition'];
        const rows = registrations.map(r => [
            r.playerName,
            r.wantTransport ? 'Yes' : 'No',
            r.wantCompetition ? 'Yes' : 'No'
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
        NotificationManager.show('Pairings module coming soon...', 'info');
        // TODO: Implement pairings modal
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

    // ===================================================
    // Initialize Society Organizer when dashboard loads
    // ===================================================
    ScreenManager.registerScreenInit('societyOrganizerDashboard', async () => {
        await SocietyOrganizerSystem.init();
    });
    </script>

