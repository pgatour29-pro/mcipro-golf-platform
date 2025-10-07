// Supabase Configuration for MciPro Golf Platform
// Replace Netlify Blobs + Pusher Chat

const SUPABASE_CONFIG = {
    url: 'https://pyeeplwsnupmhgbguwqs.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk',
    serviceRoleKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTg0MzY2OSwiZXhwIjoyMDc1NDE5NjY5fQ.yz1WTV7h_qpaJu3kQ0pEKHMF3rw-_fSLmdne_3Rb6Yc'
    // IMPORTANT: service_role key bypasses RLS - ONLY use on backend/server, NEVER expose in frontend!
};

// Initialize Supabase Client
class SupabaseClient {
    constructor() {
        this.ready = false;
        this.readyPromise = new Promise((resolve) => {
            this.resolveReady = resolve;
        });
        // Load Supabase library
        this.loadSupabaseLibrary();
    }

    async loadSupabaseLibrary() {
        // Check if already loaded
        if (window.supabase) {
            this.initClient();
            return;
        }

        // Load from CDN
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
        script.onload = () => this.initClient();
        document.head.appendChild(script);
    }

    initClient() {
        const { createClient } = window.supabase;
        this.client = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
        this.ready = true;
        this.resolveReady();
        console.log('[Supabase] Client initialized and ready');
    }

    async waitForReady() {
        if (!this.ready) {
            await this.readyPromise;
        }
    }

    // =====================================================
    // BOOKINGS MANAGEMENT
    // =====================================================

    async getBookings() {
        await this.waitForReady();
        const { data, error } = await this.client
            .from('bookings')
            .select('*')
            .order('date', { ascending: true });

        if (error) {
            console.error('[Supabase] Error fetching bookings:', error);
            return { bookings: [] };
        }

        // Convert snake_case fields back to camelCase for app compatibility
        const bookings = (data || []).map(booking => ({
            id: booking.id,
            name: booking.name,
            date: booking.date,
            time: booking.time,
            teeTime: booking.tee_time,
            status: booking.status,
            players: booking.players,
            caddyNumber: booking.caddy_number,
            currentHole: booking.current_hole,
            lastHoleUpdate: booking.last_hole_update,
            notes: booking.notes,
            phone: booking.phone,
            email: booking.email,

            // CRITICAL: Convert all fields needed for tee sheet
            groupId: booking.group_id,
            kind: booking.kind,
            golferId: booking.golfer_id,
            golferName: booking.golfer_name,
            eventName: booking.event_name,
            courseId: booking.course_id,
            courseName: booking.course_name,
            course: booking.course,
            teeSheetCourse: booking.tee_sheet_course,
            teeNumber: booking.tee_number,
            bookingType: booking.booking_type,
            durationMin: booking.duration_min,

            // Caddie fields
            caddieId: booking.caddie_id,
            caddieName: booking.caddie_name,
            caddieStatus: booking.caddie_status,
            caddyConfirmationRequired: booking.caddy_confirmation_required,

            // Service fields
            serviceName: booking.service_name,
            service: booking.service,

            // Metadata
            source: booking.source,
            isPrivate: booking.is_private,
            isVIP: booking.is_vip,
            deleted: booking.deleted,

            // Timestamps
            createdAt: booking.created_at,
            updatedAt: booking.updated_at
        }));

        return { bookings };
    }

    async saveBooking(booking) {
        await this.waitForReady();

        // Extract date in YYYY-MM-DD format
        let dateStr = booking.date;
        if (dateStr && dateStr.includes('T')) {
            // If date includes time (ISO format), extract just the date part
            dateStr = dateStr.split('T')[0];
        }

        // Normalize booking fields (snake_case for Supabase)
        const normalizedBooking = {
            id: booking.id,
            name: booking.name || booking.golferName || 'Unknown',
            date: dateStr,
            time: booking.time,
            tee_time: booking.teeTime || booking.tee_time || booking.slotTime,
            status: booking.status || 'pending',
            players: booking.players || 1,
            caddy_number: booking.caddyNumber || booking.caddy_number,
            current_hole: booking.currentHole || booking.current_hole,
            last_hole_update: booking.lastHoleUpdate || booking.last_hole_update,
            notes: booking.notes || '',
            phone: booking.phone || '',
            email: booking.email || '',

            // CRITICAL: Fields needed for tee sheet display
            group_id: booking.groupId || booking.group_id || booking.id, // Fallback to ID if no groupId
            kind: booking.kind || 'tee',
            golfer_id: booking.golferId || booking.golfer_id,
            golfer_name: booking.golferName || booking.golfer_name || booking.name,
            event_name: booking.eventName || booking.event_name,
            course_id: booking.courseId || booking.course_id,
            course_name: booking.courseName || booking.course_name,
            course: booking.course,
            tee_sheet_course: booking.teeSheetCourse || booking.tee_sheet_course,
            tee_number: booking.teeNumber || booking.tee_number,
            booking_type: booking.bookingType || booking.booking_type || 'regular',
            duration_min: booking.durationMin || booking.duration_min,

            // Caddie-specific fields
            caddie_id: booking.caddieId || booking.caddie_id,
            caddie_name: booking.caddieName || booking.caddie_name,
            caddie_status: booking.caddieStatus || booking.caddie_status,
            caddy_confirmation_required: booking.caddyConfirmationRequired || booking.caddy_confirmation_required || false,

            // Service-specific fields
            service_name: booking.serviceName || booking.service_name,
            service: booking.service,

            // Metadata
            source: booking.source,
            is_private: booking.isPrivate || booking.is_private || false,
            is_vip: booking.isVIP || booking.is_vip || false,
            deleted: booking.deleted || false
        };

        const { data, error } = await this.client
            .from('bookings')
            .upsert(normalizedBooking, { onConflict: 'id' })
            .select()
            .single();

        if (error) {
            console.error('[Supabase] Error saving booking:', error);
            throw error;
        }

        return data;
    }

    async deleteBooking(bookingId) {
        const { error } = await this.client
            .from('bookings')
            .delete()
            .eq('id', bookingId);

        if (error) {
            console.error('[Supabase] Error deleting booking:', error);
            throw error;
        }
    }

    // =====================================================
    // USER PROFILES MANAGEMENT
    // =====================================================

    async getUserProfile(lineUserId) {
        const { data, error } = await this.client
            .from('user_profiles')
            .select('*')
            .eq('line_user_id', lineUserId)
            .single();

        if (error && error.code !== 'PGRST116') { // Not found is OK
            console.error('[Supabase] Error fetching profile:', error);
            return null;
        }

        return data;
    }

    async saveUserProfile(profile) {
        // Normalize profile fields (handle both lineUserId and line_user_id)
        const normalizedProfile = {
            line_user_id: profile.line_user_id || profile.lineUserId,
            name: profile.name,
            role: profile.role,
            caddy_number: profile.caddy_number || profile.caddyNumber,
            phone: profile.phone,
            email: profile.email,
            home_club: profile.home_club || profile.homeClub,
            language: profile.language || 'en'
        };

        const { data, error } = await this.client
            .from('user_profiles')
            .upsert(normalizedProfile, { onConflict: 'line_user_id' })
            .select()
            .single();

        if (error) {
            console.error('[Supabase] Error saving profile:', error);
            throw error;
        }

        return data;
    }

    async getAllProfiles() {
        await this.waitForReady();
        const { data, error } = await this.client
            .from('user_profiles')
            .select('*');

        if (error) {
            console.error('[Supabase] Error fetching profiles:', error);
            return [];
        }

        return data || [];
    }

    // =====================================================
    // GPS POSITIONS (Real-time tracking)
    // =====================================================

    async updateGPSPosition(caddyNumber, position) {
        const { data, error } = await this.client
            .from('gps_positions')
            .upsert({
                caddy_number: caddyNumber,
                current_hole: position.currentHole,
                latitude: position.lat,
                longitude: position.lng,
                accuracy: position.accuracy,
                updated_at: new Date().toISOString()
            }, { onConflict: 'caddy_number' })
            .select()
            .single();

        if (error) {
            console.error('[Supabase] Error updating GPS position:', error);
            throw error;
        }

        return data;
    }

    async getGPSPositions() {
        const { data, error } = await this.client
            .from('gps_positions')
            .select('*');

        if (error) {
            console.error('[Supabase] Error fetching GPS positions:', error);
            return {};
        }

        // Convert to object keyed by caddy_number
        const positions = {};
        data.forEach(pos => {
            positions[pos.caddy_number] = {
                currentHole: pos.current_hole,
                position: {
                    lat: pos.latitude,
                    lng: pos.longitude,
                    accuracy: pos.accuracy
                },
                timestamp: new Date(pos.updated_at).getTime()
            };
        });

        return positions;
    }

    // Subscribe to real-time GPS updates
    subscribeToGPSUpdates(callback) {
        const channel = this.client
            .channel('gps-updates')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'gps_positions' },
                (payload) => {
                    console.log('[Supabase] GPS position updated:', payload);
                    callback(payload.new);
                }
            )
            .subscribe();

        return channel;
    }

    // =====================================================
    // CHAT MESSAGES (Real-time chat - replaces Pusher)
    // =====================================================

    async sendChatMessage(roomId, userId, userName, message) {
        const { data, error } = await this.client
            .from('chat_messages')
            .insert({
                room_id: roomId,
                user_id: userId,
                user_name: userName,
                message: message,
                type: 'text'
            })
            .select()
            .single();

        if (error) {
            console.error('[Supabase] Error sending chat message:', error);
            throw error;
        }

        return data;
    }

    async getChatMessages(roomId, limit = 50) {
        const { data, error } = await this.client
            .from('chat_messages')
            .select('*')
            .eq('room_id', roomId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('[Supabase] Error fetching chat messages:', error);
            return [];
        }

        return (data || []).reverse(); // Return in chronological order
    }

    // Subscribe to real-time chat messages (REPLACES PUSHER)
    subscribeToChatRoom(roomId, callback) {
        const channel = this.client
            .channel(`chat-room-${roomId}`)
            .on('postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'chat_messages',
                    filter: `room_id=eq.${roomId}`
                },
                (payload) => {
                    console.log('[Supabase] New chat message:', payload);
                    callback(payload.new);
                }
            )
            .subscribe();

        return channel;
    }

    unsubscribeFromChannel(channel) {
        this.client.removeChannel(channel);
    }

    // =====================================================
    // EMERGENCY ALERTS
    // =====================================================

    async getActiveAlerts() {
        const { data, error } = await this.client
            .from('emergency_alerts')
            .select('*')
            .eq('active', true)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[Supabase] Error fetching alerts:', error);
            return [];
        }

        return data || [];
    }

    async createAlert(type, message, createdBy) {
        const { data, error } = await this.client
            .from('emergency_alerts')
            .insert({
                type: type,
                message: message,
                active: true,
                created_by: createdBy
            })
            .select()
            .single();

        if (error) {
            console.error('[Supabase] Error creating alert:', error);
            throw error;
        }

        return data;
    }

    async deactivateAlert(alertId) {
        const { error } = await this.client
            .from('emergency_alerts')
            .update({ active: false })
            .eq('id', alertId);

        if (error) {
            console.error('[Supabase] Error deactivating alert:', error);
            throw error;
        }
    }
}

// Global instance
window.SupabaseDB = new SupabaseClient();

console.log('[Supabase] Configuration loaded - waiting for library...');
