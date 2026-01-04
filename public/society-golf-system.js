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
            startTime: e.start_time,
            baseFee: e.base_fee || 0,
            cartFee: e.cart_fee || 0,
            caddyFee: e.caddy_fee || 0,
            transportFee: e.transport_fee || 0,
            competitionFee: e.competition_fee || 0,
            maxPlayers: e.max_players,
            societyId: e.society_id,
            organizerId: e.organizer_id,
            organizerName: e.organizer_name,
            creatorId: e.creator_id,
            status: e.status,
            courseId: e.course_id,
            courseName: e.course_name,
            eventFormat: e.event_format,
            notes: e.notes,
            autoWaitlist: e.auto_waitlist,
            recurring: e.recurring,
            recurFrequency: e.recur_frequency,
            recurDayOfWeek: e.recur_day_of_week,
            recurMonthlyPattern: e.recur_monthly_pattern,
            recurEndType: e.recur_end_type,
            recurUntil: e.recur_until,
            recurCount: e.recur_count,
            createdAt: e.created_at,
            updatedAt: e.updated_at
        }));
    }

    async getOrganizerEventsBySocietyId(societyId) {
        await this.waitForSupabase();

        console.log('[SocietyGolfDB] Loading events for society UUID:', societyId);

        const { data, error } = await SupabaseManager.client
            .from('society_events')
            .select('*')
            .eq('society_id', societyId)
            .order('date', { ascending: true });

        if (error) {
            console.error('[SocietyGolf] Error fetching society events:', error);
            return [];
        }

        console.log('[SocietyGolfDB] Found', data?.length || 0, 'events for society', societyId);

        return (data || []).map(e => ({
            id: e.id,
            name: e.name,
            date: e.date,
            cutoff: e.cutoff,
            startTime: e.start_time,
            baseFee: e.base_fee || 0,
            cartFee: e.cart_fee || 0,
            caddyFee: e.caddy_fee || 0,
            transportFee: e.transport_fee || 0,
            competitionFee: e.competition_fee || 0,
            maxPlayers: e.max_players,
            societyId: e.society_id,
            organizerId: e.organizer_id,
            organizerName: e.organizer_name,
            creatorId: e.creator_id,
            status: e.status,
            courseId: e.course_id,
            courseName: e.course_name,
            eventFormat: e.event_format,
            notes: e.notes,
            autoWaitlist: e.auto_waitlist,
            recurring: e.recurring,
            recurFrequency: e.recur_frequency,
            recurDayOfWeek: e.recur_day_of_week,
            recurMonthlyPattern: e.recur_monthly_pattern,
            recurEndType: e.recur_end_type,
            recurUntil: e.recur_until,
            recurCount: e.recur_count,
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
            startTime: data.start_time,
            baseFee: data.base_fee || 0,
            cartFee: data.cart_fee || 0,
            caddyFee: data.caddy_fee || 0,
            transportFee: data.transport_fee || 0,
            competitionFee: data.competition_fee || 0,
            maxPlayers: data.max_players,
            societyId: data.society_id,
            organizerId: data.organizer_id,
            organizerName: data.organizer_name,
            creatorId: data.creator_id,
            status: data.status,
            courseId: data.course_id,
            courseName: data.course_name,
            eventFormat: data.event_format,
            notes: data.notes,
            autoWaitlist: data.auto_waitlist,
            recurring: data.recurring,
            recurFrequency: data.recur_frequency,
            recurDayOfWeek: data.recur_day_of_week,
            recurMonthlyPattern: data.recur_monthly_pattern,
            recurEndType: data.recur_end_type,
            recurUntil: data.recur_until,
            recurCount: data.recur_count,
            createdAt: data.created_at,            updatedAt: data.updated_at
        } : null;
    }

    async createEvent(eventData) {
        await this.waitForSupabase();
        const { data, error} = await SupabaseManager.client
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
                society_id: eventData.societyId,
                organizer_id: eventData.organizerId,
                organizer_name: eventData.organizerName,
                creator_id: eventData.creatorId,
                status: 'open',
                course_id: eventData.courseId,
                course_name: eventData.courseName,
                start_time: eventData.startTime,
                event_format: eventData.eventFormat,
                notes: eventData.notes,
                auto_waitlist: eventData.autoWaitlist !== undefined ? eventData.autoWaitlist : true,
                recurring: eventData.recurring || false,
                recur_frequency: eventData.recurFrequency,
                recur_day_of_week: eventData.recurDayOfWeek,
                recur_monthly_pattern: eventData.recurMonthlyPattern,
                recur_end_type: eventData.recurEndType,
                recur_until: eventData.recurUntil,
                recur_count: eventData.recurCount
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
        if (updates.startTime !== undefined) dbUpdates.start_time = updates.startTime;
        if (updates.baseFee !== undefined) dbUpdates.base_fee = updates.baseFee;
        if (updates.cartFee !== undefined) dbUpdates.cart_fee = updates.cartFee;
        if (updates.caddyFee !== undefined) dbUpdates.caddy_fee = updates.caddyFee;
        if (updates.transportFee !== undefined) dbUpdates.transport_fee = updates.transportFee;
        if (updates.competitionFee !== undefined) dbUpdates.competition_fee = updates.competitionFee;
        if (updates.maxPlayers !== undefined) dbUpdates.max_players = updates.maxPlayers;
        if (updates.status !== undefined) dbUpdates.status = updates.status;
        if (updates.courseName !== undefined) dbUpdates.course_name = updates.courseName;
        if (updates.eventFormat !== undefined) dbUpdates.event_format = updates.eventFormat;
        if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
        if (updates.autoWaitlist !== undefined) dbUpdates.auto_waitlist = updates.autoWaitlist;
        if (updates.recurring !== undefined) dbUpdates.recurring = updates.recurring;
        if (updates.recurFrequency !== undefined) dbUpdates.recur_frequency = updates.recurFrequency;
        if (updates.recurDayOfWeek !== undefined) dbUpdates.recur_day_of_week = updates.recurDayOfWeek;
        if (updates.recurMonthlyPattern !== undefined) dbUpdates.recur_monthly_pattern = updates.recurMonthlyPattern;
        if (updates.recurEndType !== undefined) dbUpdates.recur_end_type = updates.recurEndType;
        if (updates.recurUntil !== undefined) dbUpdates.recur_until = updates.recurUntil;
        if (updates.recurCount !== undefined) dbUpdates.recur_count = updates.recurCount;

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

    async getCourses() {
        await this.waitForSupabase();
        const { data, error } = await SupabaseManager.client
            .from('courses')
            .select('*')
            .order('name', { ascending: true });

        if (error) {
            console.error('[SocietyGolf] Error fetching courses:', error);
            return [];
        }

        return data || [];
    }

    async getTeeMarkers(courseId) {
        await this.waitForSupabase();
        const { data, error } = await SupabaseManager.client
            .from('course_holes')
            .select('tee_marker')
            .eq('course_id', courseId);

        if (error) {
            console.error('[SocietyGolf] Error fetching tee markers:', error);
            return [];
        }

        // Get unique tee markers
        const teeMarkers = [...new Set(data.map(item => item.tee_marker))];

        return teeMarkers;
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
            handicap: r.handicap || 0,
            wantTransport: r.want_transport,
            wantCompetition: r.want_competition,
            partnerPrefs: r.partner_prefs || [],
            pairedGroup: r.paired_group,
            paymentStatus: r.payment_status || 'unpaid',
            totalFee: r.total_fee || 0,
            amountPaid: r.amount_paid || 0,
            paidAt: r.paid_at,
            paidBy: r.paid_by,
            specialRequests: r.special_requests || {},
            createdAt: r.created_at
        }));
    }

    async registerPlayer(eventId, playerData) {
        await this.waitForSupabase();

        // Get LINE id_token for secure authentication
        const id_token = sessionStorage.getItem('__line_id_token');
        if (!id_token) {
            throw new Error('Not authenticated - please log in with LINE');
        }

        console.log('[SocietyGolf] Using LINE id_token for authentication');

        // Use Edge Function via Supabase client (auto-injects auth headers)
        const { data: result, error: fxErr } = await SupabaseManager.client.functions.invoke('event-register', {
            body: {
                id_token: id_token,
                event_id: eventId,
                want_transport: playerData.wantTransport || false,
                want_competition: playerData.wantCompetition || false,
                total_fee: playerData.totalFee || 0,
                payment_status: 'pending'
            }
        });

        if (fxErr || !result?.ok) {
            const error = new Error(fxErr?.message ?? result?.error ?? 'Registration failed');
            console.error('[SocietyGolf] Error registering player:', error);
            throw error;
        }

        console.log('[SocietyGolf] ✅ Registration successful:', result);
        return result;
    }

    async updateRegistration(regId, updates) {
        await this.waitForSupabase();
        const dbUpdates = {};
        if (updates.pairedGroup !== undefined) dbUpdates.paired_group = updates.pairedGroup;
        if (updates.wantTransport !== undefined) dbUpdates.want_transport = updates.wantTransport;
        if (updates.wantCompetition !== undefined) dbUpdates.want_competition = updates.wantCompetition;
        if (updates.handicap !== undefined) dbUpdates.handicap = updates.handicap;
        if (updates.specialRequests !== undefined) dbUpdates.special_requests = updates.specialRequests;
        if (updates.partnerPrefs !== undefined) dbUpdates.partner_prefs = updates.partnerPrefs;

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
    // PLAYER SEARCH
    // =====================================================

    async searchPlayers(searchTerm) {
        await this.waitForSupabase();
        if (!searchTerm || searchTerm.length < 2) {
            return [];
        }

        const { data, error } = await SupabaseManager.client
            .from('profiles')
            .select('id, display_name, username, profile_data')
            .or(`display_name.ilike.%${searchTerm}%,username.ilike.%${searchTerm}%`)
            .limit(20);

        if (error) {
            console.error('[SocietyGolf] Error searching players:', error);
            return [];
        }

        return (data || []).map(p => {
            const golfInfo = p.profile_data?.golfInfo || {};
            return {
                id: p.id,
                name: p.display_name || p.username,
                username: p.username,
                handicap: golfInfo.handicap || 36,  // KEEP AS STRING to preserve + sign
                homeClub: golfInfo.homeClub || '',
                profileData: p.profile_data
            };
        });
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
