// Application-Layer Security for Supabase
// Since we use anon key (not authenticated users), we enforce security here

class SupabaseSecurity {
    constructor(supabaseClient) {
        this.client = supabaseClient;
    }

    // Get current user's profile with role info
    async getCurrentUserProfile(lineUserId) {
        if (!lineUserId) {
            console.warn('[Security] No LINE user ID provided');
            return null;
        }

        const { data, error } = await this.client
            .from('user_profiles')
            .select('*')
            .eq('line_user_id', lineUserId)
            .single();

        if (error) {
            console.error('[Security] Error fetching user profile:', error);
            return null;
        }

        return data;
    }

    // Check if user has staff/manager access
    async isStaffOrManager(lineUserId) {
        const profile = await this.getCurrentUserProfile(lineUserId);
        if (!profile) return false;

        return profile.is_staff === true ||
               profile.is_manager === true ||
               profile.is_proshop === true;
    }

    // Filter bookings for golfer view (hide other people's details)
    filterBookingsForGolferView(bookings, currentUserId) {
        return bookings.map(booking => {
            // If it's the user's own booking, show everything
            if (booking.golferId === currentUserId || booking.golfer_id === currentUserId) {
                return booking;
            }

            // For other bookings, show limited info
            return {
                ...booking,
                // Hide personal details
                name: booking.show_event_title && booking.society_event_title
                    ? booking.society_event_title
                    : 'Booked',
                golferName: booking.show_event_title && booking.society_event_title
                    ? booking.society_event_title
                    : 'Booked',
                phone: null,
                email: null,
                notes: null,
                // Keep essential slot info
                date: booking.date,
                time: booking.time,
                teeTime: booking.teeTime,
                course: booking.course,
                players: booking.players,
                status: booking.status,
                slotStatus: booking.status === 'cancelled' ? 'available' : 'booked'
            };
        });
    }

    // Generate access key for sharing a booking
    async generateAccessKey(bookingId, groupId, createdBy, options = {}) {
        // Generate random 8-character key
        const key = this.generateRandomKey();

        const { data, error } = await this.client
            .from('booking_access_keys')
            .insert({
                booking_id: bookingId,
                group_id: groupId,
                access_key: key,
                created_by: createdBy,
                expires_at: options.expiresAt || null,
                max_uses: options.maxUses || null
            })
            .select()
            .single();

        if (error) {
            console.error('[Security] Error creating access key:', error);
            throw error;
        }

        return {
            accessKey: key,
            shareUrl: `${window.location.origin}?join=${key}`,
            expiresAt: data.expires_at,
            maxUses: data.max_uses
        };
    }

    // Validate access key and return booking info
    async validateAccessKey(accessKey) {
        const { data, error } = await this.client
            .from('booking_access_keys')
            .select('*')
            .eq('access_key', accessKey.toUpperCase())
            .single();

        if (error || !data) {
            return { valid: false, reason: 'Key not found' };
        }

        // Check if expired
        if (data.expires_at && new Date(data.expires_at) < new Date()) {
            return { valid: false, reason: 'Key expired' };
        }

        // Check if max uses reached
        if (data.max_uses && data.use_count >= data.max_uses) {
            return { valid: false, reason: 'Max uses reached' };
        }

        // Increment use count
        await this.client
            .from('booking_access_keys')
            .update({ use_count: data.use_count + 1 })
            .eq('id', data.id);

        return {
            valid: true,
            bookingId: data.booking_id,
            groupId: data.group_id
        };
    }

    // Helper: Generate random 8-char alphanumeric key
    generateRandomKey() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No ambiguous chars
        let key = '';
        for (let i = 0; i < 8; i++) {
            key += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return key;
    }

    // Check if user can delete a booking
    async canDeleteBooking(lineUserId, bookingId) {
        // Staff/managers can delete any booking
        if (await this.isStaffOrManager(lineUserId)) {
            return { allowed: true, reason: 'staff' };
        }

        // Golfers can delete their own bookings
        const { data: booking } = await this.client
            .from('bookings')
            .select('golfer_id')
            .eq('id', bookingId)
            .single();

        if (booking && booking.golfer_id === lineUserId) {
            return { allowed: true, reason: 'owner' };
        }

        return { allowed: false, reason: 'not_authorized' };
    }

    // Check if user can view tee sheet
    async canViewTeeSheet(lineUserId) {
        return await this.isStaffOrManager(lineUserId);
    }

    // Set user role (admin only - call this manually for now)
    async setUserRole(lineUserId, role) {
        const { data, error} = await this.client
            .from('user_profiles')
            .update({
                user_role: role,
                is_staff: role === 'staff' || role === 'proshop',
                is_manager: role === 'manager',
                is_proshop: role === 'proshop'
            })
            .eq('line_user_id', lineUserId)
            .select()
            .single();

        if (error) {
            console.error('[Security] Error setting role:', error);
            throw error;
        }

        return data;
    }
}

// Export for use in other files
window.SupabaseSecurity = SupabaseSecurity;

console.log('[Security] Supabase Security layer loaded');
