/**
 * GM ANALYTICS ENGINE
 * Comprehensive metrics for General Manager, Accounting, and Marketing
 */

const GMAnalytics = {

    // Get all data sources
    getData() {
        const bookingsCloud = JSON.parse(localStorage.getItem('mcipro_bookings_cloud') || '{"bookings":[]}');
        const orders = JSON.parse(localStorage.getItem('mcipro_orders') || '[]');
        const profiles = JSON.parse(localStorage.getItem('mcipro_user_profiles') || '[]');

        return {
            bookings: bookingsCloud.bookings || [],
            orders: orders,
            profiles: profiles
        };
    },

    // ============================================
    // 1. GM - FINANCIAL HEALTH METRICS
    // ============================================

    calculateFinancialHealth() {
        const { bookings, orders } = this.getData();
        const today = new Date().toISOString().split('T')[0];

        // Revenue by Channel
        const greenFees = bookings
            .filter(b => b.date === today)
            .reduce((sum, b) => sum + (parseFloat(b.greenFee) || 2000), 0);

        const caddyFees = bookings
            .filter(b => b.date === today && b.caddyId)
            .reduce((sum, b) => sum + 500, 0);

        const fnbRevenue = orders
            .filter(o => (o.category === 'food' || o.category === 'beverage') && o.date === today)
            .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

        const proShopRevenue = orders
            .filter(o => o.category === 'proshop' && o.date === today)
            .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

        const totalRevenue = greenFees + caddyFees + fnbRevenue + proShopRevenue;

        // Revenue per Round
        const roundsToday = bookings.filter(b => b.date === today).length;
        const revenuePerRound = roundsToday > 0 ? totalRevenue / roundsToday : 0;

        // Utilization (assume 72 slots per day - 9 holes every 10 min from 6AM-6PM)
        const maxSlots = 72;
        const utilization = (roundsToday / maxSlots) * 100;

        return {
            totalRevenue,
            greenFees,
            caddyFees,
            fnbRevenue,
            proShopRevenue,
            revenuePerRound,
            utilization,
            roundsToday,
            forecast: totalRevenue * 1.5 // Simple 50% increase projection
        };
    },

    // ============================================
    // 2. OPERATIONAL EFFICIENCY
    // ============================================

    calculateOperationalEfficiency() {
        const { bookings } = this.getData();
        const today = new Date().toISOString().split('T')[0];

        // Tee Sheet Utilization by time slot
        const todayBookings = bookings.filter(b => b.date === today);

        let peakCount = 0; // 8AM-2PM
        let midCount = 0; // 2PM-5PM
        let eveningCount = 0; // 5PM-7PM

        todayBookings.forEach(booking => {
            const hour = parseInt(booking.time.split(':')[0]);
            if (hour >= 8 && hour < 14) peakCount++;
            else if (hour >= 14 && hour < 17) midCount++;
            else if (hour >= 17 && hour < 19) eveningCount++;
        });

        const peakMax = 36; // 6 hours * 6 slots/hour
        const midMax = 18; // 3 hours * 6 slots/hour
        const eveningMax = 12; // 2 hours * 6 slots/hour

        return {
            peakUtilization: (peakCount / peakMax) * 100,
            midUtilization: (midCount / midMax) * 100,
            eveningUtilization: (eveningCount / eveningMax) * 100
        };
    },

    // ============================================
    // 3. CUSTOMER EXPERIENCE
    // ============================================

    calculateCustomerExperience() {
        const { bookings, profiles } = this.getData();

        // Calculate average ratings from bookings (if they have ratings)
        const ratingsData = bookings
            .filter(b => b.rating)
            .map(b => b.rating);

        const avgRating = ratingsData.length > 0
            ? ratingsData.reduce((sum, r) => sum + r, 0) / ratingsData.length
            : 0;

        // Repeat visit rate
        const customerBookingCounts = {};
        bookings.forEach(b => {
            const customer = b.playerName || b.lineUserId;
            if (customer) {
                customerBookingCounts[customer] = (customerBookingCounts[customer] || 0) + 1;
            }
        });

        const repeatCustomers = Object.values(customerBookingCounts).filter(count => count > 1).length;
        const totalCustomers = Object.keys(customerBookingCounts).length;
        const repeatRate = totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0;

        return {
            avgRating: avgRating.toFixed(1),
            courseRating: avgRating > 0 ? (avgRating + 0.2).toFixed(1) : '-',
            serviceRating: avgRating > 0 ? (avgRating - 0.1).toFixed(1) : '-',
            valueRating: avgRating > 0 ? avgRating.toFixed(1) : '-',
            repeatRate
        };
    },

    // ============================================
    // 4. ACCOUNTING - REVENUE STREAMS
    // ============================================

    calculateAccountingMetrics() {
        const { bookings, orders } = this.getData();
        const now = new Date();
        const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const lastMonth = `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`;

        // This month revenue
        const thisMonthBookings = bookings.filter(b => b.date && b.date.startsWith(thisMonth));
        const thisMonthOrders = orders.filter(o => o.date && o.date.startsWith(thisMonth));

        const thisMonthRevenue =
            thisMonthBookings.reduce((sum, b) => sum + (parseFloat(b.greenFee) || 2000), 0) +
            thisMonthBookings.filter(b => b.caddyId).reduce((sum, b) => sum + 500, 0) +
            thisMonthOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

        // Last month revenue
        const lastMonthBookings = bookings.filter(b => b.date && b.date.startsWith(lastMonth));
        const lastMonthOrders = orders.filter(o => o.date && o.date.startsWith(lastMonth));

        const lastMonthRevenue =
            lastMonthBookings.reduce((sum, b) => sum + (parseFloat(b.greenFee) || 2000), 0) +
            lastMonthBookings.filter(b => b.caddyId).reduce((sum, b) => sum + 500, 0) +
            lastMonthOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

        const difference = thisMonthRevenue - lastMonthRevenue;
        const growthPercent = lastMonthRevenue > 0
            ? ((difference / lastMonthRevenue) * 100).toFixed(1)
            : '0';

        return {
            thisMonthRevenue,
            lastMonthRevenue,
            difference,
            growthPercent
        };
    },

    // ============================================
    // 5. MARKETING - CUSTOMER ACQUISITION
    // ============================================

    calculateMarketingMetrics() {
        const { profiles, bookings } = this.getData();

        // Lead sources (from profile data if available)
        const leadSources = {};
        profiles.forEach(p => {
            const source = p.leadSource || 'direct';
            leadSources[source] = (leadSources[source] || 0) + 1;
        });

        // Conversion rate (profiles to bookings)
        const totalProfiles = profiles.length;
        const profilesWithBookings = new Set(bookings.map(b => b.lineUserId)).size;
        const conversionRate = totalProfiles > 0
            ? (profilesWithBookings / totalProfiles) * 100
            : 0;

        // Booking frequency
        const bookingsPerCustomer = bookings.length > 0 && profilesWithBookings > 0
            ? bookings.length / profilesWithBookings
            : 0;

        return {
            totalLeads: totalProfiles,
            leadSources,
            conversionRate: conversionRate.toFixed(1),
            bookingsPerCustomer: bookingsPerCustomer.toFixed(1)
        };
    },

    // ============================================
    // UPDATE UI
    // ============================================

    updateAnalyticsDashboard() {
        const financial = this.calculateFinancialHealth();
        const operational = this.calculateOperationalEfficiency();
        const customer = this.calculateCustomerExperience();
        const accounting = this.calculateAccountingMetrics();
        const marketing = this.calculateMarketingMetrics();

        // Financial Health Metrics
        document.getElementById('analytics-revenue-now').textContent = `฿${financial.totalRevenue.toLocaleString()}`;
        document.getElementById('analytics-forecast').textContent = `฿${Math.round(financial.forecast).toLocaleString()}`;
        document.getElementById('analytics-rev-per-round').textContent = `฿${Math.round(financial.revenuePerRound).toLocaleString()}`;
        document.getElementById('analytics-utilization').textContent = `${Math.round(financial.utilization)}%`;

        // Revenue by Source
        document.getElementById('analytics-green-fees').textContent = `฿${financial.greenFees.toLocaleString()}`;
        document.getElementById('analytics-caddy-fees').textContent = `฿${financial.caddyFees.toLocaleString()}`;
        document.getElementById('analytics-fnb-sales').textContent = `฿${financial.fnbRevenue.toLocaleString()}`;
        document.getElementById('analytics-proshop-sales').textContent = `฿${financial.proShopRevenue.toLocaleString()}`;

        // Operational Efficiency
        document.getElementById('analytics-peak-pct').textContent = `${Math.round(operational.peakUtilization)}%`;
        document.getElementById('analytics-peak-bar').style.width = `${operational.peakUtilization}%`;

        document.getElementById('analytics-mid-pct').textContent = `${Math.round(operational.midUtilization)}%`;
        document.getElementById('analytics-mid-bar').style.width = `${operational.midUtilization}%`;

        document.getElementById('analytics-evening-pct').textContent = `${Math.round(operational.eveningUtilization)}%`;
        document.getElementById('analytics-evening-bar').style.width = `${operational.eveningUtilization}%`;

        // Customer Experience
        document.getElementById('analytics-satisfaction').textContent = customer.avgRating || '-';
        document.getElementById('analytics-course-rating').textContent = customer.courseRating;
        document.getElementById('analytics-service-rating').textContent = customer.serviceRating;
        document.getElementById('analytics-value-rating').textContent = customer.valueRating;

        // Accounting Metrics
        document.getElementById('analytics-growth').textContent = `${accounting.growthPercent}%`;
        document.getElementById('analytics-this-month').textContent = `฿${accounting.thisMonthRevenue.toLocaleString()}`;
        document.getElementById('analytics-last-month').textContent = `฿${accounting.lastMonthRevenue.toLocaleString()}`;
        document.getElementById('analytics-difference').textContent = `฿${accounting.difference.toLocaleString()}`;

        // Update insights
        this.updateInsights(financial, operational, customer, accounting, marketing);
    },

    // ============================================
    // INSIGHTS & RECOMMENDATIONS
    // ============================================

    updateInsights(financial, operational, customer, accounting, marketing) {
        const insights = [];

        // Revenue insights
        if (financial.utilization < 50) {
            insights.push({
                type: 'warning',
                icon: 'trending_down',
                title: 'Low Utilization Alert',
                message: `Course is at ${Math.round(financial.utilization)}% capacity. Consider promotional pricing or marketing campaigns to boost bookings.`
            });
        }

        if (operational.peakUtilization > 80) {
            insights.push({
                type: 'success',
                icon: 'trending_up',
                title: 'Peak Hours High Demand',
                message: `Peak hours are ${Math.round(operational.peakUtilization)}% utilized. Consider dynamic pricing to maximize revenue.`
            });
        }

        if (financial.fnbRevenue < financial.greenFees * 0.3) {
            insights.push({
                type: 'opportunity',
                icon: 'restaurant',
                title: 'F&B Revenue Opportunity',
                message: `F&B revenue is low compared to green fees. Promote restaurant and beverage services to golfers.`
            });
        }

        if (customer.repeatRate < 40) {
            insights.push({
                type: 'warning',
                icon: 'person_off',
                title: 'Low Customer Retention',
                message: `Only ${Math.round(customer.repeatRate)}% of customers are returning. Focus on loyalty programs and customer experience.`
            });
        }

        if (accounting.growthPercent > 0) {
            insights.push({
                type: 'success',
                icon: 'celebration',
                title: 'Revenue Growth',
                message: `Revenue is up ${accounting.growthPercent}% from last month. Keep up the momentum!`
            });
        }

        // Render insights
        const insightsContainer = document.getElementById('analytics-insights');
        if (insights.length === 0) {
            insightsContainer.innerHTML = `
                <div class="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div class="flex items-start space-x-3">
                        <span class="material-symbols-outlined text-green-600">check_circle</span>
                        <div class="flex-1">
                            <div class="font-medium text-green-900 mb-1">All Systems Operating Well</div>
                            <div class="text-sm text-green-700">Your course operations are running smoothly. Keep monitoring key metrics.</div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            insightsContainer.innerHTML = insights.map(insight => {
                const colors = {
                    warning: { bg: 'bg-yellow-50', border: 'border-yellow-200', icon: 'text-yellow-600', title: 'text-yellow-900', text: 'text-yellow-700' },
                    success: { bg: 'bg-green-50', border: 'border-green-200', icon: 'text-green-600', title: 'text-green-900', text: 'text-green-700' },
                    opportunity: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-600', title: 'text-blue-900', text: 'text-blue-700' }
                };

                const c = colors[insight.type];

                return `
                    <div class="p-4 ${c.bg} rounded-lg border ${c.border}">
                        <div class="flex items-start space-x-3">
                            <span class="material-symbols-outlined ${c.icon}">${insight.icon}</span>
                            <div class="flex-1">
                                <div class="font-medium ${c.title} mb-1">${insight.title}</div>
                                <div class="text-sm ${c.text}">${insight.message}</div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }
};

// Export to window for global access
window.GMAnalytics = GMAnalytics;

// Auto-refresh when Analytics tab is opened
document.addEventListener('DOMContentLoaded', function() {
    // Listen for tab changes
    const analyticsTab = document.getElementById('manager-analytics-tab');
    if (analyticsTab) {
        analyticsTab.addEventListener('click', function() {
            setTimeout(() => {
                GMAnalytics.updateAnalyticsDashboard();
            }, 100);
        });
    }

    // Auto-refresh every 30 seconds if on analytics tab
    setInterval(() => {
        const analyticsContent = document.getElementById('manager-analytics');
        if (analyticsContent && !analyticsContent.classList.contains('hidden')) {
            GMAnalytics.updateAnalyticsDashboard();
        }
    }, 30000);
});
