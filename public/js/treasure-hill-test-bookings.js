/**
 * Treasure Hill Golf Test Bookings
 * Creates test bookings for all booking types to test caddy sync
 */

const TreasureHillTestBookings = {
    courseId: 'treasure-hill-golf',
    courseName: 'Treasure Hill Golf & Country Club',

    // Get today and next few days
    getTestDates() {
        const today = new Date();
        const dates = [];
        for (let i = 0; i < 3; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() + i);
            dates.push(d.toISOString().split('T')[0]);
        }
        return dates;
    },

    // Get random THG caddies
    getRandomCaddies(count = 1) {
        const caddySystem = window.CaddySystem;
        if (!caddySystem || !caddySystem.allCaddys) {
            console.warn('[THG Test] CaddySystem not available');
            return [];
        }

        const thgCaddies = caddySystem.allCaddys.filter(c => c.homeClub === 'treasure-hill-golf');
        const shuffled = [...thgCaddies].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, count);
    },

    // Create test bookings
    async createTestBookings() {
        const dates = this.getTestDates();
        const bookings = [];

        console.log('[THG Test] Creating test bookings for Treasure Hill Golf...');
        console.log('[THG Test] Dates:', dates);

        // 1. SOCIETY EVENT - Golf Buddies Society Day
        const societyCaddies = this.getRandomCaddies(4);
        bookings.push({
            id: `thg-society-${Date.now()}`,
            type: 'society_event',
            source: 'dashboard',
            bookingType: 'society',
            courseId: this.courseId,
            courseName: this.courseName,
            course: 'Course A',
            teeSheetCourse: 'A',
            date: dates[0],
            time: '08:00',
            eventName: 'Golf Buddies Monthly Tournament',
            groupName: 'Golf Buddies Society',
            players: 4,
            golfers: [
                { name: 'Pete Mitchell', caddyId: societyCaddies[0]?.id, caddyName: societyCaddies[0]?.name },
                { name: 'Tom Wilson', caddyId: societyCaddies[1]?.id, caddyName: societyCaddies[1]?.name },
                { name: 'James Chen', caddyId: societyCaddies[2]?.id, caddyName: societyCaddies[2]?.name },
                { name: 'Mike Johnson', caddyId: societyCaddies[3]?.id, caddyName: societyCaddies[3]?.name }
            ],
            caddyBookings: societyCaddies.map((c, i) => ({
                caddyId: c.id,
                caddyName: c.name,
                golferName: ['Pete Mitchell', 'Tom Wilson', 'James Chen', 'Mike Johnson'][i]
            })),
            status: 'confirmed',
            isVIP: false,
            createdAt: new Date().toISOString()
        });

        // 2. PRIVATE EVENT - Corporate Outing
        const privateCaddies = this.getRandomCaddies(3);
        bookings.push({
            id: `thg-private-${Date.now()}`,
            type: 'private_event',
            source: 'dashboard',
            bookingType: 'private',
            courseId: this.courseId,
            courseName: this.courseName,
            course: 'Course A',
            teeSheetCourse: 'A',
            date: dates[0],
            time: '09:30',
            eventName: 'ABC Corp Golf Day',
            groupName: 'ABC Corporation',
            players: 3,
            golfers: [
                { name: 'Sarah Lee', caddyId: privateCaddies[0]?.id, caddyName: privateCaddies[0]?.name },
                { name: 'David Park', caddyId: privateCaddies[1]?.id, caddyName: privateCaddies[1]?.name },
                { name: 'Emily Wang', caddyId: privateCaddies[2]?.id, caddyName: privateCaddies[2]?.name }
            ],
            caddyBookings: privateCaddies.map((c, i) => ({
                caddyId: c.id,
                caddyName: c.name,
                golferName: ['Sarah Lee', 'David Park', 'Emily Wang'][i]
            })),
            status: 'confirmed',
            isVIP: true,
            createdAt: new Date().toISOString()
        });

        // 3. PRACTICE ROUND - Individual
        const practiceCaddy = this.getRandomCaddies(1)[0];
        bookings.push({
            id: `thg-practice-${Date.now()}`,
            type: 'practice_round',
            source: 'dashboard',
            bookingType: 'practice',
            courseId: this.courseId,
            courseName: this.courseName,
            course: 'Course A',
            teeSheetCourse: 'A',
            date: dates[1],
            time: '07:00',
            eventName: 'Practice Round',
            players: 1,
            golferName: 'John Smith',
            golfers: [
                { name: 'John Smith', caddyId: practiceCaddy?.id, caddyName: practiceCaddy?.name }
            ],
            caddyBookings: practiceCaddy ? [{
                caddyId: practiceCaddy.id,
                caddyName: practiceCaddy.name,
                golferName: 'John Smith'
            }] : [],
            status: 'confirmed',
            createdAt: new Date().toISOString()
        });

        // 4. PRIVATE ROUND WITH FRIENDS
        const friendsCaddies = this.getRandomCaddies(2);
        bookings.push({
            id: `thg-friends-${Date.now()}`,
            type: 'private_round',
            source: 'dashboard',
            bookingType: 'regular',
            courseId: this.courseId,
            courseName: this.courseName,
            course: 'Course A',
            teeSheetCourse: 'A',
            date: dates[1],
            time: '10:00',
            eventName: 'Weekend Round',
            players: 2,
            golfers: [
                { name: 'Bob Taylor', caddyId: friendsCaddies[0]?.id, caddyName: friendsCaddies[0]?.name },
                { name: 'Chris Martin', caddyId: friendsCaddies[1]?.id, caddyName: friendsCaddies[1]?.name }
            ],
            caddyBookings: friendsCaddies.map((c, i) => ({
                caddyId: c.id,
                caddyName: c.name,
                golferName: ['Bob Taylor', 'Chris Martin'][i]
            })),
            status: 'confirmed',
            createdAt: new Date().toISOString()
        });

        // 5. NON-SOCIETY EVENT ROUND
        const nonSocietyCaddies = this.getRandomCaddies(4);
        bookings.push({
            id: `thg-nonsociety-${Date.now()}`,
            type: 'group_booking',
            source: 'dashboard',
            bookingType: 'group',
            courseId: this.courseId,
            courseName: this.courseName,
            course: 'Course A',
            teeSheetCourse: 'A',
            date: dates[2],
            time: '08:30',
            eventName: 'Charity Golf Day',
            groupName: 'Local Charity Foundation',
            players: 4,
            golfers: [
                { name: 'Alex Brown', caddyId: nonSocietyCaddies[0]?.id, caddyName: nonSocietyCaddies[0]?.name },
                { name: 'Linda Green', caddyId: nonSocietyCaddies[1]?.id, caddyName: nonSocietyCaddies[1]?.name },
                { name: 'Mark White', caddyId: nonSocietyCaddies[2]?.id, caddyName: nonSocietyCaddies[2]?.name },
                { name: 'Nancy Black', caddyId: nonSocietyCaddies[3]?.id, caddyName: nonSocietyCaddies[3]?.name }
            ],
            caddyBookings: nonSocietyCaddies.map((c, i) => ({
                caddyId: c.id,
                caddyName: c.name,
                golferName: ['Alex Brown', 'Linda Green', 'Mark White', 'Nancy Black'][i]
            })),
            status: 'confirmed',
            createdAt: new Date().toISOString()
        });

        // 6. JOIN EXISTING TEE TIME
        const joinCaddy = this.getRandomCaddies(1)[0];
        bookings.push({
            id: `thg-join-${Date.now()}`,
            type: 'join_existing',
            source: 'dashboard',
            bookingType: 'join',
            courseId: this.courseId,
            courseName: this.courseName,
            course: 'Course A',
            teeSheetCourse: 'A',
            date: dates[0],
            time: '08:00', // Same time as society event - joining them
            eventName: 'Joining Golf Buddies',
            players: 1,
            golferName: 'Kevin Adams',
            golfers: [
                { name: 'Kevin Adams', caddyId: joinCaddy?.id, caddyName: joinCaddy?.name }
            ],
            caddyBookings: joinCaddy ? [{
                caddyId: joinCaddy.id,
                caddyName: joinCaddy.name,
                golferName: 'Kevin Adams'
            }] : [],
            status: 'confirmed',
            createdAt: new Date().toISOString()
        });

        return bookings;
    },

    // Save bookings to BookingManager and sync
    async saveAndSync() {
        const bookings = await this.createTestBookings();

        // Add to BookingManager
        if (window.BookingManager) {
            bookings.forEach(booking => {
                // Check if already exists
                const existing = window.BookingManager.bookings.find(b => b.id === booking.id);
                if (!existing) {
                    window.BookingManager.bookings.push(booking);
                }
            });

            // Save to localStorage
            localStorage.setItem('mcipro_bookings', JSON.stringify(window.BookingManager.bookings));
            console.log('[THG Test] Saved', bookings.length, 'bookings to BookingManager');
        }

        // Sync to Supabase if available
        if (window.SupabaseDB && window.SupabaseDB.batchSaveBookings) {
            try {
                await window.SupabaseDB.batchSaveBookings(bookings);
                console.log('[THG Test] Synced bookings to Supabase');
            } catch (e) {
                console.warn('[THG Test] Supabase sync failed:', e);
            }
        }

        // Also save to tee sheet localStorage directly for immediate display
        const teesheetKey = (date) => `teesheet.bookings.${date}`;
        const groupedByDate = {};

        bookings.forEach(b => {
            if (!groupedByDate[b.date]) groupedByDate[b.date] = [];

            // Convert to tee sheet format
            const teesheetBooking = {
                id: b.id,
                time: b.time,
                course: b.teeSheetCourse || 'A',
                tee: 1,
                type: b.bookingType,
                groupId: b.groupName ? `group-${b.id}` : null,
                groupName: b.groupName || b.eventName,
                golfers: b.golfers || [],
                createdAt: b.createdAt
            };

            groupedByDate[b.date].push(teesheetBooking);
        });

        // Save to tee sheet storage
        Object.keys(groupedByDate).forEach(date => {
            const existing = JSON.parse(localStorage.getItem(teesheetKey(date)) || '[]');
            const newBookings = groupedByDate[date].filter(nb =>
                !existing.find(eb => eb.id === nb.id)
            );
            const merged = [...existing, ...newBookings];
            localStorage.setItem(teesheetKey(date), JSON.stringify(merged));
            console.log('[THG Test] Saved', newBookings.length, 'bookings to tee sheet for', date);
        });

        console.log('[THG Test] ✅ All test bookings created and synced!');
        console.log('[THG Test] Booking types:', bookings.map(b => b.bookingType));

        // Show notification
        if (window.NotificationManager) {
            window.NotificationManager.show(
                `Created ${bookings.length} test bookings for Treasure Hill Golf`,
                'success'
            );
        }

        return bookings;
    },

    // Clear test bookings
    clearTestBookings() {
        if (window.BookingManager) {
            window.BookingManager.bookings = window.BookingManager.bookings.filter(
                b => !b.id?.startsWith('thg-')
            );
            localStorage.setItem('mcipro_bookings', JSON.stringify(window.BookingManager.bookings));
        }

        // Clear from tee sheet storage
        const dates = this.getTestDates();
        dates.forEach(date => {
            const key = `teesheet.bookings.${date}`;
            const existing = JSON.parse(localStorage.getItem(key) || '[]');
            const filtered = existing.filter(b => !b.id?.startsWith('thg-'));
            localStorage.setItem(key, JSON.stringify(filtered));
        });

        console.log('[THG Test] Cleared all test bookings');

        if (window.NotificationManager) {
            window.NotificationManager.show('Cleared test bookings', 'info');
        }
    }
};

// Make globally available
window.TreasureHillTestBookings = TreasureHillTestBookings;
console.log('[THG Test] ✅ Treasure Hill Test Bookings module loaded');
console.log('[THG Test] Run: TreasureHillTestBookings.saveAndSync() to create test bookings');
console.log('[THG Test] Run: TreasureHillTestBookings.clearTestBookings() to clear them');
