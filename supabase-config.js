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

        // PERFORMANCE: Only fetch last 7 days + future bookings
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const cutoffDate = sevenDaysAgo.toISOString().split('T')[0];

        const { data, error } = await this.client
            .from('bookings')
            .select('*')
            .gte('date', cutoffDate)
            .order('date', { ascending: true })
            .limit(500);

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
            caddiNumber: booking.caddy_number,
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
            caddiConfirmationRequired: booking.caddi_confirmation_required,

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
            caddy_number: booking.caddiNumber || booking.caddy_number,
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

        // Transform database row into UI-expected structure
        if (data) {
            // Ensure profile_data exists
            if (!data.profile_data) {
                data.profile_data = {};
            }

            // Ensure golfInfo structure exists with homeClub for UI compatibility
            if (!data.profile_data.golfInfo) {
                data.profile_data.golfInfo = {};
            }
            // Populate from dedicated columns if not in JSONB
            if (!data.profile_data.golfInfo.homeClub && (data.home_course_name || data.home_club)) {
                data.profile_data.golfInfo.homeClub = data.home_course_name || data.home_club;
            }
            if (!data.profile_data.golfInfo.homeCourseId && data.home_course_id) {
                data.profile_data.golfInfo.homeCourseId = data.home_course_id;
            }

            // Ensure organizationInfo structure exists
            if (!data.profile_data.organizationInfo) {
                data.profile_data.organizationInfo = {};
            }
            // Populate from dedicated columns if not in JSONB
            if (!data.profile_data.organizationInfo.societyName && data.society_name) {
                data.profile_data.organizationInfo.societyName = data.society_name;
            }
            if (!data.profile_data.organizationInfo.societyId && data.society_id) {
                data.profile_data.organizationInfo.societyId = data.society_id;
            }
        }

        return data;
    }

    async getUserProfileBySupabaseId(supabaseUserId) {
        const { data, error } = await this.client
            .from('user_profiles')
            .select('*')
            .eq('supabase_user_id', supabaseUserId)
            .single();

        if (error && error.code !== 'PGRST116') { // Not found is OK
            console.error('[Supabase] Error fetching profile by Supabase ID:', error);
            return null;
        }

        // Transform database row into UI-expected structure (same as getUserProfile)
        if (data) {
            if (!data.profile_data) {
                data.profile_data = {};
            }

            if (!data.profile_data.golfInfo) {
                data.profile_data.golfInfo = {};
            }
            if (!data.profile_data.golfInfo.homeClub && (data.home_course_name || data.home_club)) {
                data.profile_data.golfInfo.homeClub = data.home_course_name || data.home_club;
            }
            if (!data.profile_data.golfInfo.homeCourseId && data.home_course_id) {
                data.profile_data.golfInfo.homeCourseId = data.home_course_id;
            }

            if (!data.profile_data.organizationInfo) {
                data.profile_data.organizationInfo = {};
            }
            if (!data.profile_data.organizationInfo.societyName && data.society_name) {
                data.profile_data.organizationInfo.societyName = data.society_name;
            }
            if (!data.profile_data.organizationInfo.societyId && data.society_id) {
                data.profile_data.organizationInfo.societyId = data.society_id;
            }
        }

        return data;
    }

    async saveUserProfile(profile) {
        // Helper function to convert empty strings to null for UUID fields
        const cleanUUID = (value) => {
            if (!value || value === '') return null;
            return value;
        };

        // Normalize profile fields (handle both lineUserId and line_user_id)
        const normalizedProfile = {
            line_user_id: profile.line_user_id || profile.lineUserId,
            name: profile.name,
            role: profile.role,
            caddy_number: profile.caddy_number || profile.caddiNumber,
            phone: profile.phone,
            email: profile.email,
            home_club: profile.home_club || profile.homeClub,
            language: profile.language || 'en',

            // ===== NEW: Society Affiliation Fields =====
            society_id: cleanUUID(profile.society_id || profile.societyId),
            society_name: profile.society_name || profile.societyName || profile.organizationInfo?.societyName || '',
            member_since: profile.member_since || profile.memberSince || null,

            // ===== NEW: Home Course Fields =====
            home_course_id: cleanUUID(profile.home_course_id || profile.homeCourseId || profile.golfInfo?.homeCourseId),
            home_course_name: profile.home_course_name || profile.homeCourseName || profile.golfInfo?.homeClub || '',

            // ===== NEW: Store FULL profile data in JSONB column =====
            profile_data: {
                personalInfo: profile.personalInfo || {},
                golfInfo: {
                    ...(profile.golfInfo || {}),
                    // Ensure homeClub is in JSONB for UI compatibility
                    homeClub: profile.home_course_name || profile.homeCourseName || profile.golfInfo?.homeClub || profile.profile_data?.golfInfo?.homeClub || profile.home_club || profile.homeClub || '',
                    homeCourseId: cleanUUID(profile.home_course_id || profile.homeCourseId || profile.golfInfo?.homeCourseId || profile.profile_data?.golfInfo?.homeCourseId),
                    handicap: profile.handicap || profile.golfInfo?.handicap || profile.profile_data?.golfInfo?.handicap || null
                },
                organizationInfo: {
                    ...(profile.organizationInfo || {}),
                    // Ensure society data is in JSONB for UI compatibility
                    societyName: profile.society_name || profile.societyName || profile.organizationInfo?.societyName || '',
                    societyId: cleanUUID(profile.society_id || profile.societyId || profile.organizationInfo?.societyId)
                },
                professionalInfo: profile.professionalInfo || {},
                skills: profile.skills || {},
                preferences: profile.preferences || {},
                media: profile.media || {},
                privacy: profile.privacy || {},
                // Store any additional fields
                handicap: profile.handicap || profile.golfInfo?.handicap || profile.profile_data?.golfInfo?.handicap || null,
                username: profile.username || null,
                userId: profile.userId || profile.lineUserId,
                linePictureUrl: profile.linePictureUrl || null
            }
        };

        console.log('--- normalizedProfile before upsert ---', normalizedProfile);
        const { data, error } = await this.client
            .from('user_profiles')
            .upsert(normalizedProfile, { onConflict: 'line_user_id' })
            .select()
            .single();

        if (error) {
            console.error('[Supabase] Error saving profile:', error);
            throw error;
        }

        console.log('[Supabase] ✅ Full profile saved to cloud:', data.line_user_id);
        return data;
    }

    async getAllProfiles() {
        await this.waitForReady();

        // PERFORMANCE FIX: Cache profiles for 5 minutes to avoid slow database queries
        const cacheKey = 'mcipro_all_profiles_cache';
        const cacheTimeKey = 'mcipro_all_profiles_cache_time';
        const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

        try {
            const cached = localStorage.getItem(cacheKey);
            const cacheTime = parseInt(localStorage.getItem(cacheTimeKey) || '0');
            const now = Date.now();

            if (cached && (now - cacheTime) < CACHE_DURATION) {
                console.log('[Supabase] Using cached profiles (age: ' + Math.round((now - cacheTime) / 1000) + 's)');
                return JSON.parse(cached);
            }
        } catch (e) {
            console.warn('[Supabase] Cache read failed:', e);
        }

        // PERFORMANCE FIX: Only select columns we need (not *)
        const { data, error} = await this.client
            .from('user_profiles')
            .select('line_user_id, name, email, profile_data, home_course_name, home_course_id, home_club, society_name, society_id')
            .order('name');

        if (error) {
            console.error('[Supabase] Error fetching profiles:', error);
            return [];
        }

        // Transform each profile to include golfInfo.homeClub structure
        if (data && Array.isArray(data)) {
            data.forEach(profile => {
                if (!profile.profile_data) profile.profile_data = {};
                if (!profile.profile_data.golfInfo) profile.profile_data.golfInfo = {};
                if (!profile.profile_data.golfInfo.homeClub && (profile.home_course_name || profile.home_club)) {
                    profile.profile_data.golfInfo.homeClub = profile.home_course_name || profile.home_club;
                }
                if (!profile.profile_data.golfInfo.homeCourseId && profile.home_course_id) {
                    profile.profile_data.golfInfo.homeCourseId = profile.home_course_id;
                }
                if (!profile.profile_data.organizationInfo) profile.profile_data.organizationInfo = {};
                if (!profile.profile_data.organizationInfo.societyName && profile.society_name) {
                    profile.profile_data.organizationInfo.societyName = profile.society_name;
                }
                if (!profile.profile_data.organizationInfo.societyId && profile.society_id) {
                    profile.profile_data.organizationInfo.societyId = profile.society_id;
                }
            });
        }

        // Cache the results
        try {
            localStorage.setItem(cacheKey, JSON.stringify(data || []));
            localStorage.setItem(cacheTimeKey, Date.now().toString());
            console.log('[Supabase] Profiles cached (' + (data?.length || 0) + ' profiles)');
        } catch (e) {
            console.warn('[Supabase] Cache write failed:', e);
        }

        return data || [];
    }

    // PERFORMANCE: Lazy load only specific profiles (instead of all)
    async getProfilesByIds(lineUserIds) {
        await this.waitForReady();

        if (!lineUserIds || lineUserIds.length === 0) {
            return [];
        }

        const { data, error } = await this.client
            .from('user_profiles')
            .select('*')
            .in('line_user_id', lineUserIds);

        if (error) {
            console.error('[Supabase] Error fetching profiles by IDs:', error);
            return [];
        }

        console.log(`[Supabase] Lazy loaded ${data?.length || 0} profiles`);
        return data || [];
    }

    // PERFORMANCE: Get only current user + profiles for visible bookings
    async getEssentialProfiles(currentUserId, bookings) {
        await this.waitForReady();

        // Get unique golfer IDs from bookings
        const golferIds = [...new Set(
            bookings
                .map(b => b.golfer_id || b.golferId)
                .filter(id => id)
        )];

        // Always include current user
        if (currentUserId && !golferIds.includes(currentUserId)) {
            golferIds.push(currentUserId);
        }

        console.log(`[Supabase] Loading ${golferIds.length} essential profiles (current user + visible bookings)`);

        return this.getProfilesByIds(golferIds);
    }

    // =====================================================
    // BATCH OPERATIONS (Combine multiple requests)
    // =====================================================

    // PERFORMANCE: Batch save multiple bookings in one transaction
    async batchSaveBookings(bookings) {
        await this.waitForReady();

        if (!bookings || bookings.length === 0) {
            return [];
        }

        console.log(`[Supabase] Batch saving ${bookings.length} bookings...`);

        // Normalize all bookings
        const normalizedBookings = bookings.map(booking => {
            let dateStr = booking.date;
            if (dateStr && dateStr.includes('T')) {
                dateStr = dateStr.split('T')[0];
            }

            return {
                id: booking.id,
                name: booking.name || booking.golferName || 'Unknown',
                date: dateStr,
                time: booking.time,
                tee_time: booking.teeTime || booking.tee_time || booking.slotTime,
                status: booking.status || 'pending',
                players: booking.players || 1,
                caddy_number: booking.caddiNumber || booking.caddy_number,
                current_hole: booking.currentHole || booking.current_hole,
                last_hole_update: booking.lastHoleUpdate || booking.last_hole_update,
                notes: booking.notes || '',
                phone: booking.phone || '',
                email: booking.email || '',
                group_id: booking.groupId || booking.group_id || booking.id,
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
                caddie_id: booking.caddieId || booking.caddie_id,
                caddie_name: booking.caddieName || booking.caddie_name,
                caddie_status: booking.caddieStatus || booking.caddie_status,
                service_name: booking.serviceName || booking.service_name,
                service: booking.service,
                source: booking.source,
                is_private: booking.isPrivate || booking.is_private || false,
                is_vip: booking.isVIP || booking.is_vip || false,
                deleted: booking.deleted || false
            };
        });

        // Batch upsert all bookings in one query
        const { data, error } = await this.client
            .from('bookings')
            .upsert(normalizedBookings, { onConflict: 'id' })
            .select();

        if (error) {
            console.error('[Supabase] Batch save error:', error);
            throw error;
        }

        console.log(`[Supabase] ✅ Batch saved ${data?.length || 0} bookings`);
        return data;
    }

    // =====================================================
    // GPS POSITIONS (Real-time tracking)
    // =====================================================

    async updateGPSPosition(caddiNumber, position) {
        const { data, error } = await this.client
            .from('gps_positions')
            .upsert({
                caddy_number: caddiNumber,
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

        // Convert to object keyed by caddi_number
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
    // REALTIME SUBSCRIPTIONS (WebSocket - replaces polling)
    // =====================================================

    subscribeToBookings(callback) {
        const channel = this.client
            .channel('bookings-changes')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'bookings' },
                (payload) => {
                    console.log('[Supabase Realtime] Booking changed:', payload);
                    callback(payload);
                }
            )
            .subscribe();

        console.log('[Supabase Realtime] Subscribed to bookings changes');
        return channel;
    }

    subscribeToProfiles(callback) {
        const channel = this.client
            .channel('profiles-changes')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'user_profiles' },
                (payload) => {
                    console.log('[Supabase Realtime] Profile changed:', payload);
                    callback(payload);
                }
            )
            .subscribe();

        console.log('[Supabase Realtime] Subscribed to profile changes');
        return channel;
    }

    // =====================================================
    // EMERGENCY ALERTS (Cross-Device Sync)
    // =====================================================

    async getEmergencyAlerts() {
        await this.waitForReady();

        // Get all active alerts (not expired, not resolved)
        const { data, error } = await this.client
            .from('emergency_alerts')
            .select('*')
            .eq('status', 'active')
            .gte('expires_at', new Date().toISOString())
            .order('timestamp', { ascending: false });

        if (error) {
            console.error('[Supabase] Error fetching emergency alerts:', error);
            return [];
        }

        // Convert to app format
        const alerts = (data || []).map(alert => ({
            id: alert.id,
            type: alert.type,
            message: alert.message,
            user: alert.user_name,
            role: alert.user_role,
            timestamp: alert.timestamp,
            location: (alert.location_lat && alert.location_lng) ? {
                lat: alert.location_lat,
                lng: alert.location_lng,
                hole: alert.location_hole
            } : null,
            status: alert.status,
            priority: alert.priority,
            acknowledged: alert.acknowledged_by ? alert.acknowledged_by.includes(alert.user_name) : false,
            acknowledgedBy: alert.acknowledged_by || [],
            resolvedBy: alert.resolved_by,
            resolvedAt: alert.resolved_at
        }));

        console.log(`[Supabase] Loaded ${alerts.length} active emergency alerts`);
        return alerts;
    }

    async saveEmergencyAlert(alertData) {
        await this.waitForReady();

        // Normalize alert fields for Supabase
        const normalizedAlert = {
            id: alertData.id,
            type: alertData.type,
            message: alertData.message,
            user_name: alertData.user,
            user_role: alertData.role,
            timestamp: alertData.timestamp,
            location_lat: alertData.location?.lat || null,
            location_lng: alertData.location?.lng || null,
            location_hole: alertData.location?.hole || null,
            status: alertData.status || 'active',
            priority: alertData.priority || 'high',
            acknowledged_by: alertData.acknowledgedBy || [],
            resolved_by: alertData.resolvedBy || null,
            resolved_at: alertData.resolvedAt || null,
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
        };

        const { data, error } = await this.client
            .from('emergency_alerts')
            .upsert(normalizedAlert, { onConflict: 'id' })
            .select()
            .single();

        if (error) {
            console.error('[Supabase] Error saving emergency alert:', error);
            throw error;
        }

        console.log('[Supabase] Emergency alert saved:', data.id);
        return data;
    }

    async updateAlertStatus(alertId, status, resolvedBy = null) {
        await this.waitForReady();

        const updates = {
            status: status,
            updated_at: new Date().toISOString()
        };

        if (status === 'resolved' && resolvedBy) {
            updates.resolved_by = resolvedBy;
            updates.resolved_at = new Date().toISOString();
        }

        const { error } = await this.client
            .from('emergency_alerts')
            .update(updates)
            .eq('id', alertId);

        if (error) {
            console.error('[Supabase] Error updating alert status:', error);
            throw error;
        }

        console.log(`[Supabase] Alert ${alertId} status updated to ${status}`);
    }

    async acknowledgeAlert(alertId, userName) {
        await this.waitForReady();

        // Get current alert
        const { data: alert } = await this.client
            .from('emergency_alerts')
            .select('acknowledged_by')
            .eq('id', alertId)
            .single();

        if (!alert) return;

        // Add user to acknowledged list
        const acknowledgedBy = alert.acknowledged_by || [];
        if (!acknowledgedBy.includes(userName)) {
            acknowledgedBy.push(userName);
        }

        const { error } = await this.client
            .from('emergency_alerts')
            .update({ acknowledged_by: acknowledgedBy })
            .eq('id', alertId);

        if (error) {
            console.error('[Supabase] Error acknowledging alert:', error);
            throw error;
        }

        console.log(`[Supabase] Alert ${alertId} acknowledged by ${userName}`);
    }

    async deleteEmergencyAlert(alertId) {
        await this.waitForReady();

        const { error } = await this.client
            .from('emergency_alerts')
            .delete()
            .eq('id', alertId);

        if (error) {
            console.error('[Supabase] Error deleting emergency alert:', error);
            throw error;
        }

        console.log(`[Supabase] ✅ Emergency alert DELETED permanently: ${alertId}`);
    }

    async cleanupExpiredAlerts() {
        await this.waitForReady();

        const { data, error } = await this.client
            .rpc('cleanup_expired_alerts');

        if (error) {
            console.error('[Supabase] Error cleaning up expired alerts:', error);
            return 0;
        }

        console.log(`[Supabase] Cleaned up ${data || 0} expired alerts`);
        return data || 0;
    }

    // Subscribe to real-time emergency alerts
    subscribeToEmergencyAlerts(callback) {
        console.log('[Supabase] 📡 Setting up emergency alerts WebSocket subscription...');

        const channel = this.client
            .channel('emergency-alerts')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'emergency_alerts' },
                (payload) => {
                    console.log('[Supabase Realtime] ⚡ Emergency alert WebSocket event received!');
                    console.log('[Supabase Realtime] Event type:', payload.eventType);
                    console.log('[Supabase Realtime] Full payload:', payload);
                    callback(payload);
                }
            )
            .subscribe((status) => {
                console.log('[Supabase Realtime] 🔌 Subscription status:', status);
                if (status === 'SUBSCRIBED') {
                    console.log('[Supabase Realtime] ✅ Successfully subscribed to emergency_alerts table');
                } else if (status === 'CHANNEL_ERROR') {
                    console.error('[Supabase Realtime] ❌ Channel error - subscription failed!');
                } else if (status === 'TIMED_OUT') {
                    console.error('[Supabase Realtime] ⏱️ Subscription timed out!');
                } else {
                    console.log('[Supabase Realtime] Status:', status);
                }
            });

        console.log('[Supabase Realtime] 📢 Subscribed to emergency alerts - waiting for confirmation...');
        return channel;
    }
}

// Global instance
window.SupabaseDB = new SupabaseClient();


