/**
 * SOCIETY GOLF & REVENUE SEGMENTATION ANALYTICS
 *
 * Tracks revenue by customer type:
 * - Members
 * - Guests (with members)
 * - Walk-ins
 * - Society Golf Events
 * - Tournaments
 * - Corporate Events/VIP
 *
 * Time periods: Daily, Weekly, Monthly, Quarterly, Annual
 * Society Rankings: Track all societies playing at the course
 */

const SocietyGolfAnalytics = {

    // Booking Type Classifications
    BOOKING_TYPES: {
        MEMBER: 'member',
        GUEST: 'guest',
        WALKIN: 'walkin',
        SOCIETY: 'society',
        TOURNAMENT: 'tournament',
        CORPORATE: 'corporate',
        VIP: 'vip'
    },

    // Get booking data with classification
    getClassifiedBookings() {
        const cloud = JSON.parse(localStorage.getItem('mcipro_bookings_cloud') || '{"bookings":[]}');
        const bookings = cloud.bookings || [];

        // Classify each booking
        return bookings.map(booking => {
            // Check if booking has customerType field, otherwise infer
            let customerType = booking.customerType || booking.bookingType || this.inferBookingType(booking);

            return {
                ...booking,
                customerType: customerType,
                societyName: booking.societyName || booking.society || null,
                revenue: this.calculateBookingRevenue(booking)
            };
        });
    },

    // Infer booking type from booking data
    inferBookingType(booking) {
        // Check for society markers
        if (booking.societyName || booking.society || booking.eventType === 'society') {
            return this.BOOKING_TYPES.SOCIETY;
        }

        // Check for tournament
        if (booking.eventType === 'tournament' || booking.isTournament) {
            return this.BOOKING_TYPES.TOURNAMENT;
        }

        // Check for corporate/VIP
        if (booking.eventType === 'corporate' || booking.isVIP || booking.isCorporate) {
            return this.BOOKING_TYPES.CORPORATE;
        }

        // Check for member
        if (booking.isMember || booking.membershipId) {
            return this.BOOKING_TYPES.MEMBER;
        }

        // Check for guest (has member association)
        if (booking.guestOf || booking.memberHost) {
            return this.BOOKING_TYPES.GUEST;
        }

        // Default to walk-in
        return this.BOOKING_TYPES.WALKIN;
    },

    // Calculate revenue for a booking
    calculateBookingRevenue(booking) {
        let total = 0;

        // Green fee
        total += parseFloat(booking.greenFee) || 2000;

        // Caddy fee
        if (booking.caddyId || booking.kind === 'caddie') {
            total += 500;
        }

        // Services
        if (booking.totalCost) {
            total += parseFloat(booking.totalCost);
        }

        return total;
    },

    // Get time period filter
    getTimePeriodDates(period) {
        const now = new Date();
        let startDate, endDate;

        switch(period) {
            case 'today':
                startDate = endDate = now.toISOString().split('T')[0];
                break;

            case 'week':
                const weekStart = new Date(now);
                weekStart.setDate(now.getDate() - now.getDay()); // Sunday
                startDate = weekStart.toISOString().split('T')[0];
                endDate = now.toISOString().split('T')[0];
                break;

            case 'month':
                startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
                endDate = now.toISOString().split('T')[0];
                break;

            case 'quarter':
                const quarter = Math.floor(now.getMonth() / 3);
                const quarterStartMonth = quarter * 3;
                startDate = `${now.getFullYear()}-${String(quarterStartMonth + 1).padStart(2, '0')}-01`;
                endDate = now.toISOString().split('T')[0];
                break;

            case 'year':
                startDate = `${now.getFullYear()}-01-01`;
                endDate = now.toISOString().split('T')[0];
                break;

            default:
                startDate = endDate = now.toISOString().split('T')[0];
        }

        return { startDate, endDate };
    },

    // Calculate revenue breakdown by customer type
    calculateRevenueByCustomerType(period = 'today') {
        const { startDate, endDate } = this.getTimePeriodDates(period);
        const bookings = this.getClassifiedBookings();

        // Filter by date range
        const periodBookings = bookings.filter(b =>
            b.date >= startDate && b.date <= endDate
        );

        const breakdown = {
            member: { count: 0, revenue: 0 },
            guest: { count: 0, revenue: 0 },
            walkin: { count: 0, revenue: 0 },
            society: { count: 0, revenue: 0 },
            tournament: { count: 0, revenue: 0 },
            corporate: { count: 0, revenue: 0 }
        };

        periodBookings.forEach(booking => {
            const type = booking.customerType;
            if (breakdown[type]) {
                breakdown[type].count++;
                breakdown[type].revenue += booking.revenue;
            }
        });

        return breakdown;
    },

    // Calculate society golf rankings
    calculateSocietyRankings(period = 'year') {
        const { startDate, endDate } = this.getTimePeriodDates(period);
        const bookings = this.getClassifiedBookings();

        // Filter society bookings only
        const societyBookings = bookings.filter(b =>
            b.customerType === this.BOOKING_TYPES.SOCIETY &&
            b.date >= startDate &&
            b.date <= endDate
        );

        // Group by society
        const societies = {};

        societyBookings.forEach(booking => {
            const name = booking.societyName || 'Unknown Society';

            if (!societies[name]) {
                societies[name] = {
                    name: name,
                    rounds: 0,
                    totalRevenue: 0,
                    avgRevenuePerRound: 0,
                    firstVisit: booking.date,
                    lastVisit: booking.date,
                    frequency: 0
                };
            }

            societies[name].rounds++;
            societies[name].totalRevenue += booking.revenue;

            if (booking.date < societies[name].firstVisit) {
                societies[name].firstVisit = booking.date;
            }
            if (booking.date > societies[name].lastVisit) {
                societies[name].lastVisit = booking.date;
            }
        });

        // Calculate averages and rank
        const rankings = Object.values(societies).map(society => {
            society.avgRevenuePerRound = society.totalRevenue / society.rounds;

            // Calculate frequency (rounds per month)
            const firstDate = new Date(society.firstVisit);
            const lastDate = new Date(society.lastVisit);
            const monthsDiff = (lastDate - firstDate) / (1000 * 60 * 60 * 24 * 30) || 1;
            society.frequency = society.rounds / monthsDiff;

            return society;
        });

        // Sort by total revenue (descending)
        rankings.sort((a, b) => b.totalRevenue - a.totalRevenue);

        // Add rank
        rankings.forEach((society, index) => {
            society.rank = index + 1;
        });

        return rankings;
    },

    // Compare periods (for growth analysis)
    comparePeriods(currentPeriod, previousPeriod) {
        const current = this.calculateRevenueByCustomerType(currentPeriod);
        const previous = this.calculateRevenueByCustomerType(previousPeriod);

        const comparison = {};

        Object.keys(current).forEach(type => {
            const currentRevenue = current[type].revenue;
            const previousRevenue = previous[type].revenue;
            const growth = previousRevenue > 0
                ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
                : 0;

            comparison[type] = {
                currentRevenue,
                previousRevenue,
                growth: growth.toFixed(1),
                currentCount: current[type].count,
                previousCount: previous[type].count
            };
        });

        return comparison;
    },

    // Get society performance over time
    getSocietyTrend(societyName, months = 6) {
        const bookings = this.getClassifiedBookings();
        const now = new Date();
        const trend = [];

        for (let i = months - 1; i >= 0; i--) {
            const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthStr = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;

            const monthBookings = bookings.filter(b =>
                b.customerType === this.BOOKING_TYPES.SOCIETY &&
                b.societyName === societyName &&
                b.date.startsWith(monthStr)
            );

            const rounds = monthBookings.length;
            const revenue = monthBookings.reduce((sum, b) => sum + b.revenue, 0);

            trend.push({
                month: monthStr,
                rounds: rounds,
                revenue: revenue
            });
        }

        return trend;
    },

    // Update UI - Revenue Breakdown
    updateRevenueBreakdown(period = 'today') {
        const breakdown = this.calculateRevenueByCustomerType(period);

        // Update member stats
        document.getElementById('rev-member-count').textContent = breakdown.member.count;
        document.getElementById('rev-member-amount').textContent = `฿${breakdown.member.revenue.toLocaleString()}`;

        // Update guest stats
        document.getElementById('rev-guest-count').textContent = breakdown.guest.count;
        document.getElementById('rev-guest-amount').textContent = `฿${breakdown.guest.revenue.toLocaleString()}`;

        // Update walk-in stats
        document.getElementById('rev-walkin-count').textContent = breakdown.walkin.count;
        document.getElementById('rev-walkin-amount').textContent = `฿${breakdown.walkin.revenue.toLocaleString()}`;

        // Update society stats
        document.getElementById('rev-society-count').textContent = breakdown.society.count;
        document.getElementById('rev-society-amount').textContent = `฿${breakdown.society.revenue.toLocaleString()}`;

        // Update tournament stats
        document.getElementById('rev-tournament-count').textContent = breakdown.tournament.count;
        document.getElementById('rev-tournament-amount').textContent = `฿${breakdown.tournament.revenue.toLocaleString()}`;

        // Update corporate stats
        document.getElementById('rev-corporate-count').textContent = breakdown.corporate.count;
        document.getElementById('rev-corporate-amount').textContent = `฿${breakdown.corporate.revenue.toLocaleString()}`;

        // Calculate total
        const total = Object.values(breakdown).reduce((sum, type) => sum + type.revenue, 0);
        document.getElementById('rev-total-amount').textContent = `฿${total.toLocaleString()}`;
    },

    // Update UI - Society Rankings
    updateSocietyRankings(period = 'year') {
        const rankings = this.calculateSocietyRankings(period);
        const container = document.getElementById('society-rankings-table');

        if (rankings.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12">
                    <span class="material-symbols-outlined text-6xl text-gray-300 mb-4 block">groups</span>
                    <p class="text-gray-500">No society golf rounds recorded yet</p>
                    <p class="text-sm text-gray-400 mt-2">Society bookings will appear here</p>
                </div>
            `;
            return;
        }

        let html = `
            <table class="pro-table">
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>Society Name</th>
                        <th style="text-align:right;">Rounds</th>
                        <th style="text-align:right;">Total Revenue</th>
                        <th style="text-align:right;">Avg/Round</th>
                        <th style="text-align:right;">Frequency</th>
                        <th style="text-align:center;">Last Visit</th>
                    </tr>
                </thead>
                <tbody>
        `;

        rankings.forEach((society, index) => {
            let rankBadge;
            if (index === 0) {
                rankBadge = `<span class="pro-rank gold">#${society.rank}</span>`;
            } else if (index === 1) {
                rankBadge = `<span class="pro-rank silver">#${society.rank}</span>`;
            } else if (index === 2) {
                rankBadge = `<span class="pro-rank bronze">#${society.rank}</span>`;
            } else {
                rankBadge = `<span class="pro-rank other">#${society.rank}</span>`;
            }

            html += `
                <tr>
                    <td>${rankBadge}</td>
                    <td style="font-weight:600;">${society.name}</td>
                    <td style="text-align:right;">${society.rounds}</td>
                    <td style="text-align:right;font-weight:600;color:#059669;">฿${society.totalRevenue.toLocaleString()}</td>
                    <td style="text-align:right;">฿${Math.round(society.avgRevenuePerRound).toLocaleString()}</td>
                    <td style="text-align:right;">${society.frequency.toFixed(1)}/mo</td>
                    <td style="text-align:center;font-size:0.875rem;color:#6b7280;">${society.lastVisit}</td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
        `;

        container.innerHTML = html;
    }
};

// Export for use in other modules
window.SocietyGolfAnalytics = SocietyGolfAnalytics;
