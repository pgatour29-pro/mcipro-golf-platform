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
            handicap: r.handicap,
            partnerPrefs: r.partner_prefs || [],
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
                id: this.generateId(),
                event_id: eventId,
                player_name: playerData.name,
                player_id: playerData.playerId,
                handicap: playerData.handicap,
                partner_prefs: [],
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
        if (updates.partnerPrefs !== undefined) dbUpdates.partner_prefs = updates.partnerPrefs;
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
            handicap: w.handicap,
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
                id: this.generateId(),
                event_id: eventId,
                player_name: playerData.name,
                player_id: playerData.playerId,
                handicap: playerData.handicap,
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
