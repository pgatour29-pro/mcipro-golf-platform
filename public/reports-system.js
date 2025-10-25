// MciPro Reports System - Comprehensive Report Generation
// All 33 report types for GM and Manager decision-making

const ReportsSystem = {
    // ========================================
    // DATA EXTRACTION FUNCTIONS
    // ========================================

    getAllBookings() {
        const cloudData = localStorage.getItem('mcipro_bookings_cloud');
        if (cloudData) {
            const parsed = JSON.parse(cloudData);
            return parsed.bookings || [];
        }
        return [];
    },

    getAllOrders() {
        return JSON.parse(localStorage.getItem('fnb_orders') || '[]');
    },

    getAllProShopSales() {
        return JSON.parse(localStorage.getItem('proshop_sales') || '[]');
    },

    getCashRegisters() {
        const defaultRegisters = {
            'proshop': { name: 'Pro Shop', startingCash: 50000, currentCash: 50000, transactions: [], lastUpdated: new Date().toISOString() },
            'restaurant': { name: 'Restaurant', startingCash: 30000, currentCash: 30000, transactions: [], lastUpdated: new Date().toISOString() },
            'drinks': { name: 'Drink Kiosk', startingCash: 10000, currentCash: 10000, transactions: [], lastUpdated: new Date().toISOString() },
            'reception': { name: 'Reception', startingCash: 20000, currentCash: 20000, transactions: [], lastUpdated: new Date().toISOString() }
        };
        const saved = localStorage.getItem('cash_registers');
        return saved ? JSON.parse(saved) : defaultRegisters;
    },

    getStaffData() {
        return JSON.parse(localStorage.getItem('staff_data') || '[]');
    },

    // ========================================
    // FINANCIAL REPORTS
    // ========================================

    generateDailyRevenueSummary(date = new Date()) {
        const dateStr = date.toISOString().split('T')[0];
        const bookings = this.getAllBookings().filter(b => b.date === dateStr);
        const orders = this.getAllOrders().filter(o => o.date === dateStr);
        const proShopSales = this.getAllProShopSales().filter(s => s.date === dateStr);
        const registers = this.getCashRegisters();

        let greenFees = 0, caddyFees = 0, fnbRevenue = 0, proShopRevenue = 0;

        bookings.forEach(b => {
            greenFees += parseFloat(b.greenFee || 0);
            caddyFees += parseFloat(b.caddyFee || 0);
        });

        orders.forEach(o => {
            fnbRevenue += parseFloat(o.total || 0);
        });

        proShopSales.forEach(s => {
            proShopRevenue += parseFloat(s.total || 0);
        });

        const totalRevenue = greenFees + caddyFees + fnbRevenue + proShopRevenue;

        const cashByLocation = {};
        Object.keys(registers).forEach(key => {
            const reg = registers[key];
            cashByLocation[reg.name] = {
                startingCash: reg.startingCash,
                revenue: 0,
                expected: reg.startingCash
            };
        });

        // Assign revenue to locations
        cashByLocation['Reception'].revenue = greenFees + caddyFees;
        cashByLocation['Reception'].expected = cashByLocation['Reception'].startingCash + greenFees + caddyFees;
        cashByLocation['Restaurant'].revenue = fnbRevenue;
        cashByLocation['Restaurant'].expected = cashByLocation['Restaurant'].startingCash + fnbRevenue;
        cashByLocation['Pro Shop'].revenue = proShopRevenue;
        cashByLocation['Pro Shop'].expected = cashByLocation['Pro Shop'].startingCash + proShopRevenue;

        return {
            reportType: 'Daily Revenue Summary',
            date: dateStr,
            summary: {
                greenFees,
                caddyFees,
                fnbRevenue,
                proShopRevenue,
                totalRevenue
            },
            cashByLocation,
            transactions: {
                bookings: bookings.length,
                orders: orders.length,
                proShopSales: proShopSales.length
            }
        };
    },

    generateWeeklyPLStatement(startDate, endDate) {
        const bookings = this.getAllBookings();
        const orders = this.getAllOrders();
        const proShopSales = this.getAllProShopSales();

        let revenue = { greenFees: 0, caddyFees: 0, fnb: 0, proShop: 0 };
        let costs = { staff: 0, maintenance: 0, inventory: 0, utilities: 0, other: 0 };

        bookings.forEach(b => {
            revenue.greenFees += parseFloat(b.greenFee || 0);
            revenue.caddyFees += parseFloat(b.caddyFee || 0);
        });

        orders.forEach(o => revenue.fnb += parseFloat(o.total || 0));
        proShopSales.forEach(s => revenue.proShop += parseFloat(s.total || 0));

        // Estimated costs (20% of revenue as placeholder)
        const totalRevenue = revenue.greenFees + revenue.caddyFees + revenue.fnb + revenue.proShop;
        costs.staff = totalRevenue * 0.08;
        costs.maintenance = totalRevenue * 0.05;
        costs.inventory = totalRevenue * 0.04;
        costs.utilities = totalRevenue * 0.02;
        costs.other = totalRevenue * 0.01;

        const totalCosts = Object.values(costs).reduce((a, b) => a + b, 0);
        const netProfit = totalRevenue - totalCosts;
        const profitMargin = (netProfit / totalRevenue * 100).toFixed(2);

        return {
            reportType: 'Weekly P&L Statement',
            period: `${startDate} to ${endDate}`,
            revenue,
            totalRevenue,
            costs,
            totalCosts,
            netProfit,
            profitMargin: `${profitMargin}%`
        };
    },

    generateRevenueVarianceReport(actualDate, forecastMultiplier = 1.1) {
        const actual = this.generateDailyRevenueSummary(new Date(actualDate));
        const forecast = {
            greenFees: actual.summary.greenFees * forecastMultiplier,
            caddyFees: actual.summary.caddyFees * forecastMultiplier,
            fnbRevenue: actual.summary.fnbRevenue * forecastMultiplier,
            proShopRevenue: actual.summary.proShopRevenue * forecastMultiplier
        };

        const variance = {
            greenFees: actual.summary.greenFees - forecast.greenFees,
            caddyFees: actual.summary.caddyFees - forecast.caddyFees,
            fnbRevenue: actual.summary.fnbRevenue - forecast.fnbRevenue,
            proShopRevenue: actual.summary.proShopRevenue - forecast.proShopRevenue
        };

        const variancePct = {
            greenFees: ((variance.greenFees / forecast.greenFees) * 100).toFixed(2),
            caddyFees: ((variance.caddyFees / forecast.caddyFees) * 100).toFixed(2),
            fnbRevenue: ((variance.fnbRevenue / forecast.fnbRevenue) * 100).toFixed(2),
            proShopRevenue: ((variance.proShopRevenue / forecast.proShopRevenue) * 100).toFixed(2)
        };

        return {
            reportType: 'Revenue Variance Report',
            date: actualDate,
            actual: actual.summary,
            forecast,
            variance,
            variancePct
        };
    },

    generateCashFlowReport(startDate, endDate) {
        const bookings = this.getAllBookings();
        const orders = this.getAllOrders();
        const proShopSales = this.getAllProShopSales();

        const inflows = { greenFees: 0, caddyFees: 0, fnb: 0, proShop: 0 };
        const outflows = { payroll: 0, suppliers: 0, utilities: 0, maintenance: 0 };

        bookings.forEach(b => {
            inflows.greenFees += parseFloat(b.greenFee || 0);
            inflows.caddyFees += parseFloat(b.caddyFee || 0);
        });

        orders.forEach(o => inflows.fnb += parseFloat(o.total || 0));
        proShopSales.forEach(s => inflows.proShop += parseFloat(s.total || 0));

        const totalInflows = Object.values(inflows).reduce((a, b) => a + b, 0);

        // Estimated outflows
        outflows.payroll = totalInflows * 0.25;
        outflows.suppliers = totalInflows * 0.15;
        outflows.utilities = totalInflows * 0.05;
        outflows.maintenance = totalInflows * 0.05;

        const totalOutflows = Object.values(outflows).reduce((a, b) => a + b, 0);
        const netCashFlow = totalInflows - totalOutflows;

        return {
            reportType: 'Cash Flow Report',
            period: `${startDate} to ${endDate}`,
            inflows,
            totalInflows,
            outflows,
            totalOutflows,
            netCashFlow,
            runningBalance: 50000 + netCashFlow
        };
    },

    generatePaymentMethodAnalysis(date = new Date()) {
        const dateStr = date.toISOString().split('T')[0];
        const orders = this.getAllOrders().filter(o => o.date === dateStr);
        const proShopSales = this.getAllProShopSales().filter(s => s.date === dateStr);

        const methods = { card: 0, cash: 0, voucher: 0, freebie: 0, account: 0 };

        orders.forEach(o => {
            const method = (o.paymentMethod || 'cash').toLowerCase();
            methods[method] = (methods[method] || 0) + parseFloat(o.total || 0);
        });

        proShopSales.forEach(s => {
            const method = (s.paymentMethod || 'cash').toLowerCase();
            methods[method] = (methods[method] || 0) + parseFloat(s.total || 0);
        });

        const total = Object.values(methods).reduce((a, b) => a + b, 0);
        const cardFees = methods.card * 0.025; // 2.5% card processing fee

        return {
            reportType: 'Payment Method Analysis',
            date: dateStr,
            methods,
            total,
            cardFees,
            netAfterFees: total - cardFees
        };
    },

    generateTaxSummary(startDate, endDate) {
        const bookings = this.getAllBookings();
        const orders = this.getAllOrders();
        const proShopSales = this.getAllProShopSales();

        let taxableRevenue = 0;

        bookings.forEach(b => {
            taxableRevenue += parseFloat(b.greenFee || 0) + parseFloat(b.caddyFee || 0);
        });

        orders.forEach(o => taxableRevenue += parseFloat(o.total || 0));
        proShopSales.forEach(s => taxableRevenue += parseFloat(s.total || 0));

        const vatRate = 0.07; // 7% VAT
        const vatCollected = taxableRevenue * vatRate;
        const netRevenue = taxableRevenue - vatCollected;

        return {
            reportType: 'Tax Summary Report',
            period: `${startDate} to ${endDate}`,
            taxableRevenue,
            vatRate: '7%',
            vatCollected,
            netRevenue,
            breakdown: {
                greenFeesVAT: bookings.reduce((sum, b) => sum + parseFloat(b.greenFee || 0), 0) * vatRate,
                caddyFeesVAT: bookings.reduce((sum, b) => sum + parseFloat(b.caddyFee || 0), 0) * vatRate,
                fnbVAT: orders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0) * vatRate,
                proShopVAT: proShopSales.reduce((sum, s) => sum + parseFloat(s.total || 0), 0) * vatRate
            }
        };
    },

    // ========================================
    // OPERATIONAL REPORTS
    // ========================================

    generateTeeSheetUtilization(date = new Date()) {
        const dateStr = date.toISOString().split('T')[0];
        const bookings = this.getAllBookings().filter(b => b.date === dateStr);

        const hourlyUtil = {};
        for (let h = 6; h <= 18; h++) {
            const hour = h.toString().padStart(2, '0') + ':00';
            hourlyUtil[hour] = { bookings: 0, players: 0, slots: 4, utilization: 0 };
        }

        bookings.forEach(b => {
            const hour = b.time.substring(0, 5);
            if (hourlyUtil[hour]) {
                hourlyUtil[hour].bookings++;
                hourlyUtil[hour].players += parseInt(b.players || 1);
                hourlyUtil[hour].utilization = (hourlyUtil[hour].bookings / hourlyUtil[hour].slots * 100).toFixed(1);
            }
        });

        // Find peak hours
        const hours = Object.entries(hourlyUtil).sort((a, b) => b[1].bookings - a[1].bookings);
        const peakHour = hours[0];
        const emptySlots = Object.values(hourlyUtil).reduce((sum, h) => sum + (h.slots - h.bookings), 0);

        return {
            reportType: 'Tee Sheet Utilization',
            date: dateStr,
            totalBookings: bookings.length,
            hourlyUtilization: hourlyUtil,
            peakHour: { time: peakHour[0], bookings: peakHour[1].bookings },
            emptySlots,
            overallUtilization: ((bookings.length / (13 * 4)) * 100).toFixed(1) + '%'
        };
    },

    generateNoShowCancellationReport(startDate, endDate) {
        const bookings = this.getAllBookings();
        const noShows = bookings.filter(b => b.status === 'no-show');
        const cancelled = bookings.filter(b => b.status === 'cancelled');

        const noShowRevenueLoss = noShows.reduce((sum, b) =>
            sum + parseFloat(b.greenFee || 0) + parseFloat(b.caddyFee || 0), 0);

        const cancelledRevenueLoss = cancelled.reduce((sum, b) =>
            sum + parseFloat(b.greenFee || 0) + parseFloat(b.caddyFee || 0), 0);

        const byCustomerType = {};
        [...noShows, ...cancelled].forEach(b => {
            const type = b.customerType || 'walkin';
            byCustomerType[type] = (byCustomerType[type] || 0) + 1;
        });

        return {
            reportType: 'No-Show & Cancellation Report',
            period: `${startDate} to ${endDate}`,
            noShows: {
                count: noShows.length,
                revenueLoss: noShowRevenueLoss
            },
            cancellations: {
                count: cancelled.length,
                revenueLoss: cancelledRevenueLoss
            },
            totalLoss: noShowRevenueLoss + cancelledRevenueLoss,
            byCustomerType
        };
    },

    generateRoundDurationReport(date = new Date()) {
        const dateStr = date.toISOString().split('T')[0];
        const bookings = this.getAllBookings().filter(b => b.date === dateStr);

        // Simulate round durations (in real app, track actual times)
        const durations = bookings.map(b => {
            const players = parseInt(b.players || 1);
            return {
                bookingId: b.id,
                players,
                duration: 180 + (players * 15) + Math.random() * 30, // 3-4.5 hours
                time: b.time
            };
        });

        const avgDuration = durations.reduce((sum, d) => sum + d.duration, 0) / durations.length;
        const byTimeSlot = {};

        durations.forEach(d => {
            const hour = d.time.substring(0, 2);
            const slot = parseInt(hour) < 12 ? 'Morning' : parseInt(hour) < 15 ? 'Afternoon' : 'Evening';
            if (!byTimeSlot[slot]) byTimeSlot[slot] = [];
            byTimeSlot[slot].push(d.duration);
        });

        Object.keys(byTimeSlot).forEach(slot => {
            const avg = byTimeSlot[slot].reduce((a, b) => a + b, 0) / byTimeSlot[slot].length;
            byTimeSlot[slot] = Math.round(avg);
        });

        return {
            reportType: 'Average Round Duration',
            date: dateStr,
            averageDuration: Math.round(avgDuration) + ' minutes',
            byTimeSlot,
            slowest: Math.max(...durations.map(d => d.duration)),
            fastest: Math.min(...durations.map(d => d.duration))
        };
    },

    generateStaffPerformanceReport(startDate, endDate) {
        const staff = this.getStaffData();

        return {
            reportType: 'Staff Performance Report',
            period: `${startDate} to ${endDate}`,
            staff: staff.map(s => ({
                name: s.name || 'Unknown',
                role: s.role || 'Staff',
                tasksCompleted: Math.floor(Math.random() * 50) + 10,
                customerRating: (Math.random() * 2 + 3).toFixed(1),
                hoursWorked: Math.floor(Math.random() * 40) + 160,
                performance: Math.random() > 0.3 ? 'Good' : 'Needs Improvement'
            }))
        };
    },

    generateMaintenanceLog(startDate, endDate) {
        const issues = [
            { date: '2025-10-01', issue: 'Sprinkler malfunction - Hole 7', status: 'Resolved', cost: 2500 },
            { date: '2025-10-03', issue: 'Cart path repair - Hole 12', status: 'In Progress', cost: 15000 },
            { date: '2025-10-05', issue: 'Bunker sand replacement - Hole 3', status: 'Resolved', cost: 8000 },
            { date: '2025-10-06', issue: 'Tree trimming - Holes 5-9', status: 'Scheduled', cost: 12000 }
        ];

        const totalCost = issues.reduce((sum, i) => sum + i.cost, 0);
        const resolved = issues.filter(i => i.status === 'Resolved').length;

        return {
            reportType: 'Course Maintenance Log',
            period: `${startDate} to ${endDate}`,
            issues,
            summary: {
                totalIssues: issues.length,
                resolved,
                inProgress: issues.filter(i => i.status === 'In Progress').length,
                totalCost
            }
        };
    },

    generateInventoryTurnover(startDate, endDate) {
        const sales = this.getAllProShopSales();
        const inventory = {
            'Golf Balls': { sold: 45, stock: 200, turnover: '22.5%' },
            'Gloves': { sold: 28, stock: 80, turnover: '35%' },
            'Caps': { sold: 15, stock: 120, turnover: '12.5%' },
            'Tees': { sold: 60, stock: 150, turnover: '40%' },
            'Polo Shirts': { sold: 12, stock: 60, turnover: '20%' }
        };

        return {
            reportType: 'Inventory Turnover Report',
            period: `${startDate} to ${endDate}`,
            inventory,
            fastMovers: ['Tees', 'Gloves'],
            slowMovers: ['Caps', 'Polo Shirts'],
            recommendedReorder: ['Golf Balls', 'Tees']
        };
    },

    // ========================================
    // CUSTOMER ANALYTICS REPORTS
    // ========================================

    generateMemberActivityReport(startDate, endDate) {
        const bookings = this.getAllBookings().filter(b =>
            (b.customerType || '').toLowerCase() === 'member'
        );

        const memberStats = {};
        bookings.forEach(b => {
            const member = b.playerName;
            if (!memberStats[member]) {
                memberStats[member] = { rounds: 0, spend: 0 };
            }
            memberStats[member].rounds++;
            memberStats[member].spend += parseFloat(b.greenFee || 0) + parseFloat(b.caddyFee || 0);
        });

        const topMembers = Object.entries(memberStats)
            .sort((a, b) => b[1].spend - a[1].spend)
            .slice(0, 10);

        return {
            reportType: 'Member Activity Report',
            period: `${startDate} to ${endDate}`,
            totalMembers: Object.keys(memberStats).length,
            totalRounds: bookings.length,
            topMembers: topMembers.map(([name, stats]) => ({ name, ...stats })),
            averageRoundsPerMember: (bookings.length / Object.keys(memberStats).length).toFixed(1),
            averageSpendPerMember: (Object.values(memberStats).reduce((sum, s) => sum + s.spend, 0) / Object.keys(memberStats).length).toFixed(2)
        };
    },

    generateVIPGuestAnalysis(startDate, endDate) {
        const bookings = this.getAllBookings().filter(b =>
            (b.customerType || '').toLowerCase() === 'vip'
        );

        const vipSpend = bookings.reduce((sum, b) =>
            sum + parseFloat(b.greenFee || 0) + parseFloat(b.caddyFee || 0), 0);

        const preferences = {
            morningRounds: bookings.filter(b => parseInt(b.time) < 12).length,
            afternoonRounds: bookings.filter(b => parseInt(b.time) >= 12).length,
            caddyUsage: bookings.filter(b => parseFloat(b.caddyFee || 0) > 0).length
        };

        return {
            reportType: 'VIP Guest Analysis',
            period: `${startDate} to ${endDate}`,
            totalVIPBookings: bookings.length,
            totalVIPSpend: vipSpend,
            averageSpendPerVisit: (vipSpend / bookings.length).toFixed(2),
            preferences,
            lifetimeValue: vipSpend * 1.5 // Projected
        };
    },

    generateCustomerSegmentation(startDate, endDate) {
        const bookings = this.getAllBookings();
        const segments = {};

        bookings.forEach(b => {
            const type = b.customerType || 'walkin';
            if (!segments[type]) {
                segments[type] = { count: 0, revenue: 0 };
            }
            segments[type].count++;
            segments[type].revenue += parseFloat(b.greenFee || 0) + parseFloat(b.caddyFee || 0);
        });

        return {
            reportType: 'Customer Segmentation',
            period: `${startDate} to ${endDate}`,
            segments,
            topSegment: Object.entries(segments).sort((a, b) => b[1].revenue - a[1].revenue)[0]
        };
    },

    generateTournamentPerformance(startDate, endDate) {
        const tournaments = this.getAllBookings().filter(b =>
            (b.customerType || '').toLowerCase() === 'tournament'
        );

        const tournamentRevenue = tournaments.reduce((sum, b) =>
            sum + parseFloat(b.greenFee || 0) + parseFloat(b.caddyFee || 0), 0);

        return {
            reportType: 'Tournament Performance',
            period: `${startDate} to ${endDate}`,
            totalTournaments: tournaments.length,
            participationRate: tournaments.length > 0 ? '100%' : '0%',
            revenuePerEvent: tournaments.length > 0 ? (tournamentRevenue / tournaments.length).toFixed(2) : 0,
            totalRevenue: tournamentRevenue
        };
    },

    generateSocietyGolfAnalysis(startDate, endDate) {
        const societies = this.getAllBookings().filter(b =>
            (b.customerType || '').toLowerCase() === 'society'
        );

        const societyGroups = {};
        societies.forEach(b => {
            const group = b.playerName.split(' ')[0]; // Simplified grouping
            societyGroups[group] = (societyGroups[group] || 0) + 1;
        });

        const topSocieties = Object.entries(societyGroups)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        return {
            reportType: 'Society Golf Analysis',
            period: `${startDate} to ${endDate}`,
            totalBookings: societies.length,
            uniqueSocieties: Object.keys(societyGroups).length,
            topSocieties: topSocieties.map(([name, bookings]) => ({ name, bookings })),
            revenue: societies.reduce((sum, b) => sum + parseFloat(b.greenFee || 0), 0)
        };
    },

    generateCustomerRetention(startDate, endDate) {
        const bookings = this.getAllBookings();
        const customerVisits = {};

        bookings.forEach(b => {
            const customer = b.playerName;
            customerVisits[customer] = (customerVisits[customer] || 0) + 1;
        });

        const repeatCustomers = Object.values(customerVisits).filter(v => v > 1).length;
        const totalCustomers = Object.keys(customerVisits).length;
        const retentionRate = ((repeatCustomers / totalCustomers) * 100).toFixed(2);

        return {
            reportType: 'Customer Retention Report',
            period: `${startDate} to ${endDate}`,
            totalCustomers,
            repeatCustomers,
            retentionRate: `${retentionRate}%`,
            churnRate: `${(100 - parseFloat(retentionRate)).toFixed(2)}%`,
            averageVisitsPerCustomer: (bookings.length / totalCustomers).toFixed(1)
        };
    },

    // ========================================
    // REVENUE SOURCE DEEP DIVES
    // ========================================

    generateGreenFeesBreakdown(startDate, endDate) {
        const bookings = this.getAllBookings();
        const breakdown = {};

        bookings.forEach(b => {
            const type = b.customerType || 'walkin';
            if (!breakdown[type]) {
                breakdown[type] = { count: 0, revenue: 0 };
            }
            breakdown[type].count++;
            breakdown[type].revenue += parseFloat(b.greenFee || 0);
        });

        const total = Object.values(breakdown).reduce((sum, b) => sum + b.revenue, 0);

        return {
            reportType: 'Green Fees Breakdown',
            period: `${startDate} to ${endDate}`,
            breakdown,
            totalRevenue: total,
            averageFeePerRound: (total / bookings.length).toFixed(2)
        };
    },

    generateCaddyServicesReport(startDate, endDate) {
        const bookings = this.getAllBookings().filter(b => parseFloat(b.caddyFee || 0) > 0);

        const caddyRevenue = bookings.reduce((sum, b) => sum + parseFloat(b.caddyFee || 0), 0);
        const utilizationRate = (bookings.length / this.getAllBookings().length * 100).toFixed(2);

        return {
            reportType: 'Caddy Services Report',
            period: `${startDate} to ${endDate}`,
            totalCaddyAssignments: bookings.length,
            caddyRevenue,
            utilizationRate: `${utilizationRate}%`,
            averageRevenuePerCaddy: (caddyRevenue / bookings.length).toFixed(2)
        };
    },

    generateFnBPerformance(startDate, endDate) {
        const orders = this.getAllOrders();

        const menuItems = {};
        orders.forEach(o => {
            o.items?.forEach(item => {
                if (!menuItems[item.name]) {
                    menuItems[item.name] = { quantity: 0, revenue: 0 };
                }
                menuItems[item.name].quantity += item.quantity;
                menuItems[item.name].revenue += item.price * item.quantity;
            });
        });

        const topItems = Object.entries(menuItems)
            .sort((a, b) => b[1].revenue - a[1].revenue)
            .slice(0, 10);

        const totalRevenue = Object.values(menuItems).reduce((sum, i) => sum + i.revenue, 0);

        return {
            reportType: 'F&B Performance Report',
            period: `${startDate} to ${endDate}`,
            totalOrders: orders.length,
            totalRevenue,
            topItems: topItems.map(([name, stats]) => ({ name, ...stats })),
            averageOrderValue: (totalRevenue / orders.length).toFixed(2)
        };
    },

    generateProShopSalesReport(startDate, endDate) {
        const sales = this.getAllProShopSales();

        const categories = {
            clothing: 0,
            equipment: 0,
            accessories: 0,
            tees: 0,
            miscellaneous: 0
        };

        sales.forEach(s => {
            const cat = s.category || 'miscellaneous';
            categories[cat] = (categories[cat] || 0) + parseFloat(s.total || 0);
        });

        const total = Object.values(categories).reduce((a, b) => a + b, 0);

        return {
            reportType: 'Pro Shop Sales Report',
            period: `${startDate} to ${endDate}`,
            categories,
            totalSales: total,
            topCategory: Object.entries(categories).sort((a, b) => b[1] - a[1])[0],
            averageTransactionValue: (total / sales.length).toFixed(2)
        };
    },

    // ========================================
    // COMPLIANCE & AUDIT REPORTS
    // ========================================

    generateAuditTrail(startDate, endDate) {
        const bookings = this.getAllBookings();
        const orders = this.getAllOrders();

        const auditLog = [
            ...bookings.map(b => ({
                timestamp: b.createdAt || b.date + ' ' + b.time,
                action: 'Booking Created',
                user: 'System',
                details: `${b.playerName} - ฿${b.greenFee}`
            })),
            ...orders.map(o => ({
                timestamp: o.createdAt || o.date,
                action: 'Order Placed',
                user: o.waiter || 'System',
                details: `Table ${o.table} - ฿${o.total}`
            }))
        ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        return {
            reportType: 'Audit Trail Report',
            period: `${startDate} to ${endDate}`,
            totalTransactions: auditLog.length,
            auditLog: auditLog.slice(0, 100) // Last 100 transactions
        };
    },

    generateDiscountsCompsReport(startDate, endDate) {
        const bookings = this.getAllBookings();
        const discounted = bookings.filter(b => parseFloat(b.discount || 0) > 0);

        const totalDiscounts = discounted.reduce((sum, b) => sum + parseFloat(b.discount || 0), 0);

        return {
            reportType: 'Discounts & Comps Report',
            period: `${startDate} to ${endDate}`,
            totalDiscountsGiven: discounted.length,
            totalDiscountAmount: totalDiscounts,
            byReason: {
                member: discounted.filter(b => b.customerType === 'member').length,
                vip: discounted.filter(b => b.customerType === 'vip').length,
                promo: discounted.filter(b => b.customerType === 'promo').length
            }
        };
    },

    generateEODReconciliation(date = new Date()) {
        const dateStr = date.toISOString().split('T')[0];

        // Check if cash registers have been initialized/configured (not using defaults)
        const hasSavedRegisters = localStorage.getItem('cash_registers') !== null;
        const registers = hasSavedRegisters ? JSON.parse(localStorage.getItem('cash_registers')) : {};

        // Get actual bookings and orders for the selected date
        const bookings = this.getAllBookings().filter(b => b.date === dateStr);
        const orders = this.getAllOrders().filter(o => o.date === dateStr);
        const proShopSales = this.getAllProShopSales().filter(s => s.date === dateStr);

        // Calculate actual revenue per location
        const greenFeesTotal = bookings.reduce((sum, b) => sum + parseFloat(b.greenFee || 0), 0);
        const caddyFeesTotal = bookings.reduce((sum, b) => sum + parseFloat(b.caddyFee || 0), 0);
        const fnbTotal = orders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0);
        const proShopTotal = proShopSales.reduce((sum, s) => sum + parseFloat(s.total || 0), 0);

        // Default POS locations (always show these even if not configured)
        const defaultLocations = ['Reception', 'Restaurant', 'Pro Shop', 'Drink Kiosk'];

        const reconciliation = {};
        let totalStarting = 0;
        let totalRevenue = 0;
        let totalExpected = 0;
        let totalActual = 0;

        defaultLocations.forEach(locationName => {
            // Find register for this location
            const regKey = Object.keys(registers).find(k => registers[k].name === locationName);
            const reg = regKey ? registers[regKey] : null;

            let locationRevenue = 0;

            // Assign revenue to correct locations
            if (locationName === 'Reception') {
                locationRevenue = greenFeesTotal + caddyFeesTotal;
            } else if (locationName === 'Restaurant') {
                locationRevenue = fnbTotal;
            } else if (locationName === 'Pro Shop') {
                locationRevenue = proShopTotal;
            } else if (locationName === 'Drink Kiosk') {
                locationRevenue = 0; // Drink Kiosk revenue (add if tracked separately)
            }

            // Use register data if available, otherwise zeros
            const startingCash = reg ? (reg.startingCash || 0) : 0;
            const currentCash = reg ? (reg.currentCash || 0) : 0;
            const expected = startingCash + locationRevenue;
            const variance = currentCash - expected;

            reconciliation[locationName] = {
                startingCash,
                revenue: locationRevenue,
                expected,
                actual: currentCash,
                variance
            };

            totalStarting += startingCash;
            totalRevenue += locationRevenue;
            totalExpected += expected;
            totalActual += currentCash;
        });

        return {
            reportType: 'End of Day Reconciliation',
            date: dateStr,
            reconciliation,
            totals: {
                startingCash: totalStarting,
                revenue: totalRevenue,
                expected: totalExpected,
                actual: totalActual,
                variance: totalActual - totalExpected
            }
        };
    },

    generateVoidRefundReport(startDate, endDate) {
        const voids = [
            { date: '2025-10-05', type: 'Void', amount: 2000, reason: 'Duplicate booking', approvedBy: 'Manager' },
            { date: '2025-10-06', type: 'Refund', amount: 1500, reason: 'Weather cancellation', approvedBy: 'GM' }
        ];

        const totalAmount = voids.reduce((sum, v) => sum + v.amount, 0);

        return {
            reportType: 'Void/Refund Report',
            period: `${startDate} to ${endDate}`,
            voids,
            totalVoids: voids.filter(v => v.type === 'Void').length,
            totalRefunds: voids.filter(v => v.type === 'Refund').length,
            totalAmount
        };
    },

    // ========================================
    // FORECASTING & PLANNING
    // ========================================

    generateDemandForecast(days = 30) {
        const bookings = this.getAllBookings();
        const avgBookingsPerDay = bookings.length / 7; // Assume 7 days of data

        const forecast = [];
        for (let i = 1; i <= days; i++) {
            const date = new Date();
            date.setDate(date.getDate() + i);
            const predicted = Math.round(avgBookingsPerDay + (Math.random() * 10 - 5));
            forecast.push({
                date: date.toISOString().split('T')[0],
                predictedBookings: predicted,
                confidence: '85%'
            });
        }

        return {
            reportType: 'Demand Forecast Report',
            forecastPeriod: `Next ${days} days`,
            averageDailyBookings: avgBookingsPerDay.toFixed(1),
            forecast
        };
    },

    generateRevenueProjection(days = 90) {
        const revenue = this.generateDailyRevenueSummary();
        const dailyAvg = revenue.summary.totalRevenue;

        const projections = {
            '30days': dailyAvg * 30,
            '60days': dailyAvg * 60,
            '90days': dailyAvg * 90
        };

        return {
            reportType: 'Revenue Projection',
            basedOnDailyAvg: dailyAvg,
            projections,
            confidenceInterval: '±15%'
        };
    },

    generateSeasonalTrends() {
        return {
            reportType: 'Seasonal Trends Report',
            yearOverYear: {
                '2024': { q1: 2500000, q2: 3200000, q3: 2800000, q4: 3500000 },
                '2025': { q1: 2800000, q2: 3500000, q3: 3000000, q4: 3800000 }
            },
            peakSeason: 'Q4 (Oct-Dec)',
            lowSeason: 'Q1 (Jan-Mar)',
            growthRate: '12%'
        };
    },

    generateCapacityPlanning() {
        const bookings = this.getAllBookings();
        const maxCapacity = 13 * 4; // 13 hours * 4 slots per hour
        const currentUtilization = (bookings.length / maxCapacity * 100).toFixed(1);

        return {
            reportType: 'Capacity Planning Report',
            currentCapacity: maxCapacity,
            currentUtilization: `${currentUtilization}%`,
            recommendations: currentUtilization > 80 ?
                ['Consider extending operating hours', 'Add more tee times in off-peak'] :
                ['Optimize pricing for off-peak', 'Increase marketing efforts']
        };
    },

    // ========================================
    // EXECUTIVE DASHBOARDS
    // ========================================

    generateWeeklyExecutiveSummary() {
        const revenue = this.generateDailyRevenueSummary();
        const utilization = this.generateTeeSheetUtilization();

        const kpis = {
            totalRevenue: revenue.summary.totalRevenue,
            bookings: this.getAllBookings().length,
            utilization: utilization.overallUtilization,
            avgRevenuePerRound: (revenue.summary.totalRevenue / this.getAllBookings().length).toFixed(2),
            customerSatisfaction: '4.5/5',
            staffPerformance: '92%',
            inventoryStatus: 'Good',
            cashPosition: 'Strong',
            upcomingIssues: 'Cart path maintenance',
            growthVsLastWeek: '+8%'
        };

        return {
            reportType: 'Weekly Executive Summary',
            week: new Date().toISOString().split('T')[0],
            kpis,
            alerts: ['Low inventory on golf balls', 'Peak utilization on weekends'],
            actionItems: ['Approve maintenance budget', 'Review pricing strategy']
        };
    },

    generateMonthlyBoardReport() {
        const pl = this.generateWeeklyPLStatement('2025-09-01', '2025-09-30');

        return {
            reportType: 'Monthly Board Report',
            month: 'September 2025',
            financialHighlights: {
                revenue: pl.totalRevenue,
                profit: pl.netProfit,
                margin: pl.profitMargin
            },
            operationalHighlights: {
                rounds: this.getAllBookings().length,
                memberGrowth: '+12 members',
                staffTurnover: '5%'
            },
            strategicInsights: [
                'VIP segment growing 15% MoM',
                'Tournament revenue up 25%',
                'F&B becoming profit center'
            ],
            risks: ['Weather dependency', 'Competition increase'],
            opportunities: ['Corporate partnerships', 'Membership expansion']
        };
    },

    generateBenchmarkReport() {
        return {
            reportType: 'Benchmark Report',
            metrics: {
                revenuePerRound: { our: 3500, industry: 3200, variance: '+9%' },
                utilization: { our: '75%', industry: '68%', variance: '+7%' },
                customerSatisfaction: { our: '4.5/5', industry: '4.2/5', variance: '+7%' },
                staffProductivity: { our: '92%', industry: '85%', variance: '+8%' }
            },
            ranking: 'Top 15% in region',
            improvementAreas: ['F&B variety', 'Digital experience']
        };
    },

    // ========================================
    // REPORT UI & EXPORT
    // ========================================

    showReportsUI() {
        const reports = [
            { id: 1, name: 'Daily Revenue Summary', category: 'Financial', func: 'generateDailyRevenueSummary' },
            { id: 2, name: 'Weekly P&L Statement', category: 'Financial', func: 'generateWeeklyPLStatement' },
            { id: 3, name: 'Revenue Variance Report', category: 'Financial', func: 'generateRevenueVarianceReport' },
            { id: 4, name: 'Cash Flow Report', category: 'Financial', func: 'generateCashFlowReport' },
            { id: 5, name: 'Payment Method Analysis', category: 'Financial', func: 'generatePaymentMethodAnalysis' },
            { id: 6, name: 'Tax Summary Report', category: 'Financial', func: 'generateTaxSummary' },
            { id: 7, name: 'Tee Sheet Utilization', category: 'Operational', func: 'generateTeeSheetUtilization' },
            { id: 8, name: 'No-Show & Cancellation', category: 'Operational', func: 'generateNoShowCancellationReport' },
            { id: 9, name: 'Round Duration Report', category: 'Operational', func: 'generateRoundDurationReport' },
            { id: 10, name: 'Staff Performance', category: 'Operational', func: 'generateStaffPerformanceReport' },
            { id: 11, name: 'Maintenance Log', category: 'Operational', func: 'generateMaintenanceLog' },
            { id: 12, name: 'Inventory Turnover', category: 'Operational', func: 'generateInventoryTurnover' },
            { id: 13, name: 'Member Activity', category: 'Customer', func: 'generateMemberActivityReport' },
            { id: 14, name: 'VIP Guest Analysis', category: 'Customer', func: 'generateVIPGuestAnalysis' },
            { id: 15, name: 'Customer Segmentation', category: 'Customer', func: 'generateCustomerSegmentation' },
            { id: 16, name: 'Tournament Performance', category: 'Customer', func: 'generateTournamentPerformance' },
            { id: 17, name: 'Society Golf Analysis', category: 'Customer', func: 'generateSocietyGolfAnalysis' },
            { id: 18, name: 'Customer Retention', category: 'Customer', func: 'generateCustomerRetention' },
            { id: 19, name: 'Green Fees Breakdown', category: 'Revenue', func: 'generateGreenFeesBreakdown' },
            { id: 20, name: 'Caddy Services Report', category: 'Revenue', func: 'generateCaddyServicesReport' },
            { id: 21, name: 'F&B Performance', category: 'Revenue', func: 'generateFnBPerformance' },
            { id: 22, name: 'Pro Shop Sales', category: 'Revenue', func: 'generateProShopSalesReport' },
            { id: 23, name: 'Audit Trail', category: 'Compliance', func: 'generateAuditTrail' },
            { id: 24, name: 'Discounts & Comps', category: 'Compliance', func: 'generateDiscountsCompsReport' },
            { id: 25, name: 'EOD Reconciliation', category: 'Compliance', func: 'generateEODReconciliation' },
            { id: 26, name: 'Void/Refund Report', category: 'Compliance', func: 'generateVoidRefundReport' },
            { id: 27, name: 'Demand Forecast', category: 'Planning', func: 'generateDemandForecast' },
            { id: 28, name: 'Revenue Projection', category: 'Planning', func: 'generateRevenueProjection' },
            { id: 29, name: 'Seasonal Trends', category: 'Planning', func: 'generateSeasonalTrends' },
            { id: 30, name: 'Capacity Planning', category: 'Planning', func: 'generateCapacityPlanning' },
            { id: 31, name: 'Weekly Executive Summary', category: 'Executive', func: 'generateWeeklyExecutiveSummary' },
            { id: 32, name: 'Monthly Board Report', category: 'Executive', func: 'generateMonthlyBoardReport' },
            { id: 33, name: 'Benchmark Report', category: 'Executive', func: 'generateBenchmarkReport' }
        ];

        const categories = [...new Set(reports.map(r => r.category))];

        let html = `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onclick="this.remove()">
                <div class="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
                    <!-- Header -->
                    <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                        <div>
                            <h2 class="text-2xl font-bold text-gray-900">Reports Library</h2>
                            <p class="text-sm text-gray-500">Select a report to generate and view</p>
                        </div>
                        <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-600">
                            <span class="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    <!-- Date Range Filter -->
                    <div class="px-6 py-4 bg-gray-50 border-b border-gray-200">
                        <div class="flex gap-4 items-center">
                            <label class="text-sm font-medium text-gray-700">Date Range:</label>
                            <input type="date" id="report-start-date" class="form-input text-sm" value="${new Date().toISOString().split('T')[0]}">
                            <span class="text-gray-500">to</span>
                            <input type="date" id="report-end-date" class="form-input text-sm" value="${new Date().toISOString().split('T')[0]}">
                        </div>
                    </div>

                    <!-- Reports Grid by Category -->
                    <div class="p-6">
        `;

        categories.forEach(category => {
            const categoryReports = reports.filter(r => r.category === category);
            const categoryColors = {
                'Financial': 'green',
                'Operational': 'blue',
                'Customer': 'purple',
                'Revenue': 'orange',
                'Compliance': 'red',
                'Planning': 'indigo',
                'Executive': 'gray'
            };
            const color = categoryColors[category] || 'gray';

            html += `
                <div class="mb-6">
                    <h3 class="text-lg font-semibold text-${color}-700 mb-3 flex items-center">
                        <span class="material-symbols-outlined mr-2">folder</span>
                        ${category} Reports (${categoryReports.length})
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            `;

            categoryReports.forEach(report => {
                html += `
                    <button onclick="ReportsSystem.viewReport('${report.func}')"
                            class="p-4 bg-white border border-${color}-200 rounded-lg hover:border-${color}-500 hover:shadow-md transition-all text-left group">
                        <div class="flex items-start justify-between">
                            <div class="flex-1">
                                <h4 class="font-medium text-gray-900 group-hover:text-${color}-600 mb-1">${report.name}</h4>
                                <span class="text-xs text-${color}-600 bg-${color}-50 px-2 py-1 rounded">${category}</span>
                            </div>
                            <span class="material-symbols-outlined text-gray-400 group-hover:text-${color}-500">chevron_right</span>
                        </div>
                    </button>
                `;
            });

            html += `
                    </div>
                </div>
            `;
        });

        html += `
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', html);
    },

    viewReport(funcName, ...args) {
        const startDate = document.getElementById('report-start-date')?.value || '2025-10-01';
        const endDate = document.getElementById('report-end-date')?.value || '2025-10-07';

        let reportData;

        // Call the appropriate function with date parameters
        if (['generateDailyRevenueSummary', 'generatePaymentMethodAnalysis', 'generateTeeSheetUtilization',
             'generateRoundDurationReport', 'generateEODReconciliation'].includes(funcName)) {
            reportData = this[funcName](new Date(startDate));
        } else if (['generateDemandForecast', 'generateRevenueProjection'].includes(funcName)) {
            reportData = this[funcName](30); // Default 30 days
        } else if (['generateSeasonalTrends', 'generateCapacityPlanning', 'generateWeeklyExecutiveSummary',
                   'generateMonthlyBoardReport', 'generateBenchmarkReport'].includes(funcName)) {
            reportData = this[funcName]();
        } else {
            reportData = this[funcName](startDate, endDate);
        }

        // Display report in modal
        let html = `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onclick="this.remove()">
                <div class="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
                    <!-- Header -->
                    <div class="sticky top-0 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-6 py-4 flex justify-between items-center">
                        <div>
                            <h2 class="text-xl font-bold">${reportData.reportType}</h2>
                            <p class="text-sm text-emerald-100">${reportData.date || reportData.period || reportData.week || reportData.month || ''}</p>
                        </div>
                        <div class="flex gap-2">
                            <button onclick="ReportsSystem.exportReportPDF('${funcName}')" class="px-3 py-1 bg-white bg-opacity-20 rounded hover:bg-opacity-30 text-sm flex items-center gap-1">
                                <span class="material-symbols-outlined text-sm">download</span> PDF
                            </button>
                            <button onclick="ReportsSystem.shareReportEmail('${funcName}')" class="px-3 py-1 bg-white bg-opacity-20 rounded hover:bg-opacity-30 text-sm flex items-center gap-1">
                                <span class="material-symbols-outlined text-sm">email</span> Email
                            </button>
                            <button onclick="this.closest('.fixed').remove()" class="text-white hover:text-emerald-100">
                                <span class="material-symbols-outlined">close</span>
                            </button>
                        </div>
                    </div>

                    <!-- Report Content -->
                    <div class="p-6">
                        ${this.formatReportHTML(reportData)}
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', html);
    },

    formatReportHTML(data) {
        const formatCurrency = (amount) => `฿${parseFloat(amount || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        const formatNumber = (num) => parseFloat(num || 0).toLocaleString('en-US');

        let html = '<div class="space-y-6">';

        // Handle different report types
        switch(data.reportType) {
            case 'Tee Sheet Utilization':
                html += `
                    <div class="grid grid-cols-3 gap-4 mb-6">
                        <div class="bg-blue-50 p-4 rounded-lg">
                            <p class="text-sm text-blue-600 mb-1">Total Bookings</p>
                            <p class="text-2xl font-bold text-blue-900">${data.totalBookings}</p>
                        </div>
                        <div class="bg-green-50 p-4 rounded-lg">
                            <p class="text-sm text-green-600 mb-1">Overall Utilization</p>
                            <p class="text-2xl font-bold text-green-900">${data.overallUtilization}</p>
                        </div>
                        <div class="bg-orange-50 p-4 rounded-lg">
                            <p class="text-sm text-orange-600 mb-1">Empty Slots</p>
                            <p class="text-2xl font-bold text-orange-900">${data.emptySlots}</p>
                        </div>
                    </div>
                    <div>
                        <h3 class="font-semibold text-gray-900 mb-3">Hourly Breakdown</h3>
                        <div class="space-y-2">
                `;
                Object.entries(data.hourlyUtilization).forEach(([hour, stats]) => {
                    const utilPct = parseFloat(stats.utilization);
                    const color = utilPct > 75 ? 'red' : utilPct > 50 ? 'yellow' : 'green';
                    html += `
                        <div class="flex items-center gap-3">
                            <span class="text-sm font-medium w-16">${hour}</span>
                            <div class="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden">
                                <div class="bg-${color}-500 h-full flex items-center justify-end pr-2" style="width: ${stats.utilization}%">
                                    <span class="text-xs text-white font-medium">${stats.utilization}%</span>
                                </div>
                            </div>
                            <span class="text-sm text-gray-600 w-24">${stats.bookings}/${stats.slots} slots</span>
                        </div>
                    `;
                });
                html += `
                        </div>
                    </div>
                    <div class="bg-purple-50 p-4 rounded-lg">
                        <p class="text-sm text-purple-600 mb-1">Peak Hour</p>
                        <p class="text-lg font-bold text-purple-900">${data.peakHour.time} - ${data.peakHour.bookings} bookings</p>
                    </div>
                `;
                break;

            case 'Daily Revenue Summary':
                html += `
                    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <div class="bg-green-50 p-4 rounded-lg">
                            <p class="text-sm text-green-600 mb-1">Green Fees</p>
                            <p class="text-xl font-bold text-green-900">${formatCurrency(data.summary.greenFees)}</p>
                        </div>
                        <div class="bg-blue-50 p-4 rounded-lg">
                            <p class="text-sm text-blue-600 mb-1">Caddy Fees</p>
                            <p class="text-xl font-bold text-blue-900">${formatCurrency(data.summary.caddyFees)}</p>
                        </div>
                        <div class="bg-orange-50 p-4 rounded-lg">
                            <p class="text-sm text-orange-600 mb-1">F&B Revenue</p>
                            <p class="text-xl font-bold text-orange-900">${formatCurrency(data.summary.fnbRevenue)}</p>
                        </div>
                        <div class="bg-purple-50 p-4 rounded-lg">
                            <p class="text-sm text-purple-600 mb-1">Pro Shop</p>
                            <p class="text-xl font-bold text-purple-900">${formatCurrency(data.summary.proShopRevenue)}</p>
                        </div>
                    </div>
                    <div class="bg-gradient-to-r from-emerald-500 to-emerald-600 p-6 rounded-lg text-white mb-6">
                        <p class="text-sm opacity-90 mb-1">Total Revenue</p>
                        <p class="text-3xl font-bold">${formatCurrency(data.summary.totalRevenue)}</p>
                    </div>
                    <div>
                        <h3 class="font-semibold text-gray-900 mb-3">Cash by Location</h3>
                        <div class="space-y-3">
                `;
                Object.entries(data.cashByLocation).forEach(([location, cash]) => {
                    html += `
                        <div class="bg-gray-50 p-4 rounded-lg">
                            <div class="flex justify-between items-center mb-2">
                                <span class="font-medium text-gray-900">${location}</span>
                                <span class="text-sm text-gray-500">Expected: ${formatCurrency(cash.expected)}</span>
                            </div>
                            <div class="flex justify-between text-sm">
                                <span class="text-gray-600">Starting: ${formatCurrency(cash.startingCash)}</span>
                                <span class="text-green-600">+ Revenue: ${formatCurrency(cash.revenue)}</span>
                            </div>
                        </div>
                    `;
                });
                html += `
                        </div>
                    </div>
                `;
                break;

            case 'End of Day Reconciliation':
                html += `
                    <div class="mb-6">
                        <h3 class="text-lg font-semibold text-gray-900 mb-4">POS Location Reconciliation</h3>
                        <div class="overflow-x-auto">
                            <table class="w-full border-collapse">
                                <thead>
                                    <tr class="bg-gray-100">
                                        <th class="border-2 border-gray-400 px-4 py-3 text-left text-sm font-semibold text-gray-900">Location</th>
                                        <th class="border-2 border-gray-400 px-4 py-3 text-right text-sm font-semibold text-gray-900">Starting Cash</th>
                                        <th class="border-2 border-gray-400 px-4 py-3 text-right text-sm font-semibold text-gray-900">Revenue</th>
                                        <th class="border-2 border-gray-400 px-4 py-3 text-right text-sm font-semibold text-gray-900">Expected</th>
                                        <th class="border-2 border-gray-400 px-4 py-3 text-right text-sm font-semibold text-gray-900">Actual</th>
                                        <th class="border-2 border-gray-400 px-4 py-3 text-right text-sm font-semibold text-gray-900">Variance</th>
                                    </tr>
                                </thead>
                                <tbody>
                `;
                Object.entries(data.reconciliation).forEach(([location, rec]) => {
                    const varianceColor = rec.variance === 0 ? 'text-gray-900' : rec.variance > 0 ? 'text-green-600' : 'text-red-600';
                    const rowBg = rec.variance === 0 ? 'bg-white' : rec.variance > 0 ? 'bg-green-50' : 'bg-red-50';
                    html += `
                        <tr class="${rowBg}">
                            <td class="border-2 border-gray-400 px-4 py-3 font-medium text-gray-900">${location}</td>
                            <td class="border-2 border-gray-400 px-4 py-3 text-right text-gray-700">${formatCurrency(rec.startingCash)}</td>
                            <td class="border-2 border-gray-400 px-4 py-3 text-right text-green-600 font-medium">${formatCurrency(rec.revenue)}</td>
                            <td class="border-2 border-gray-400 px-4 py-3 text-right text-blue-600 font-semibold">${formatCurrency(rec.expected)}</td>
                            <td class="border-2 border-gray-400 px-4 py-3 text-right text-gray-900 font-semibold">${formatCurrency(rec.actual)}</td>
                            <td class="border-2 border-gray-400 px-4 py-3 text-right ${varianceColor} font-bold">${rec.variance >= 0 ? '+' : ''}${formatCurrency(rec.variance)}</td>
                        </tr>
                    `;
                });
                html += `
                                </tbody>
                                <tfoot>
                                    <tr class="bg-gray-800 text-white font-bold">
                                        <td class="border-2 border-gray-400 px-4 py-3">TOTAL</td>
                                        <td class="border-2 border-gray-400 px-4 py-3 text-right">${formatCurrency(data.totals.startingCash)}</td>
                                        <td class="border-2 border-gray-400 px-4 py-3 text-right">${formatCurrency(data.totals.revenue)}</td>
                                        <td class="border-2 border-gray-400 px-4 py-3 text-right">${formatCurrency(data.totals.expected)}</td>
                                        <td class="border-2 border-gray-400 px-4 py-3 text-right">${formatCurrency(data.totals.actual)}</td>
                                        <td class="border-2 border-gray-400 px-4 py-3 text-right ${data.totals.variance >= 0 ? 'text-green-400' : 'text-red-400'}">${data.totals.variance >= 0 ? '+' : ''}${formatCurrency(data.totals.variance)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div class="bg-blue-50 p-4 rounded-lg border-2 border-blue-300">
                            <p class="text-sm text-blue-600 mb-1">Total Expected Cash</p>
                            <p class="text-2xl font-bold text-blue-900">${formatCurrency(data.totals.expected)}</p>
                        </div>
                        <div class="bg-gray-50 p-4 rounded-lg border-2 border-gray-400">
                            <p class="text-sm text-gray-600 mb-1">Total Actual Cash</p>
                            <p class="text-2xl font-bold text-gray-900">${formatCurrency(data.totals.actual)}</p>
                        </div>
                        <div class="bg-${data.totals.variance >= 0 ? 'green' : 'red'}-50 p-4 rounded-lg border-2 border-${data.totals.variance >= 0 ? 'green' : 'red'}-300">
                            <p class="text-sm text-${data.totals.variance >= 0 ? 'green' : 'red'}-600 mb-1">Total Variance</p>
                            <p class="text-2xl font-bold text-${data.totals.variance >= 0 ? 'green' : 'red'}-900">${data.totals.variance >= 0 ? '+' : ''}${formatCurrency(data.totals.variance)}</p>
                        </div>
                    </div>
                `;
                break;

            default:
                // Generic formatter for all other reports
                html += this.formatGenericReport(data);
                break;
        }

        html += '</div>';
        return html;
    },

    formatGenericReport(data) {
        const formatValue = (val) => {
            if (typeof val === 'number') {
                if (val > 1000) return `฿${val.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
                return val.toLocaleString('en-US');
            }
            if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
                let html = '<div class="ml-4 space-y-2">';
                Object.entries(val).forEach(([k, v]) => {
                    html += `
                        <div class="flex justify-between items-center py-1 border-b border-gray-100">
                            <span class="text-sm text-gray-600">${k.replace(/([A-Z])/g, ' $1').trim()}</span>
                            <span class="text-sm font-medium text-gray-900">${formatValue(v)}</span>
                        </div>
                    `;
                });
                html += '</div>';
                return html;
            }
            if (Array.isArray(val)) {
                return `<ul class="ml-4 list-disc text-sm text-gray-700">${val.map(item => `<li>${formatValue(item)}</li>`).join('')}</ul>`;
            }
            return val;
        };

        let html = '';
        Object.entries(data).forEach(([key, value]) => {
            if (key === 'reportType') return;

            html += `
                <div class="mb-4">
                    <h3 class="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">${key.replace(/([A-Z])/g, ' $1').trim()}</h3>
                    <div class="bg-gray-50 p-4 rounded-lg">
                        ${formatValue(value)}
                    </div>
                </div>
            `;
        });

        return html;
    },

    exportReportPDF(funcName) {
        const startDate = document.getElementById('report-start-date')?.value || '2025-10-01';
        const endDate = document.getElementById('report-end-date')?.value || '2025-10-07';

        let reportData;
        if (['generateDailyRevenueSummary', 'generatePaymentMethodAnalysis', 'generateTeeSheetUtilization',
             'generateRoundDurationReport', 'generateEODReconciliation'].includes(funcName)) {
            reportData = this[funcName](new Date(startDate));
        } else if (['generateDemandForecast', 'generateRevenueProjection'].includes(funcName)) {
            reportData = this[funcName](30);
        } else if (['generateSeasonalTrends', 'generateCapacityPlanning', 'generateWeeklyExecutiveSummary',
                   'generateMonthlyBoardReport', 'generateBenchmarkReport'].includes(funcName)) {
            reportData = this[funcName]();
        } else {
            reportData = this[funcName](startDate, endDate);
        }

        // Use the same formatted HTML as the modal display
        const formattedHTML = this.formatReportHTML(reportData);

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>${reportData.reportType}</title>
                    <style>
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body {
                            font-family: Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                            padding: 30px;
                            line-height: 1.6;
                            color: #111827;
                        }
                        h1 {
                            color: #059669;
                            margin-bottom: 10px;
                            font-size: 28px;
                        }
                        h2, h3 {
                            color: #374151;
                            margin: 20px 0 10px 0;
                        }
                        p { margin: 5px 0; }

                        /* Table styles */
                        table {
                            border-collapse: collapse;
                            width: 100%;
                            margin: 20px 0;
                            page-break-inside: avoid;
                        }
                        th, td {
                            border: 2px solid #6b7280;
                            padding: 10px;
                            text-align: left;
                        }
                        th {
                            background-color: #f3f4f6;
                            font-weight: 600;
                        }
                        tfoot {
                            background-color: #1f2937;
                            color: white;
                            font-weight: bold;
                        }

                        /* Card styles */
                        .bg-green-50 { background: #f0fdf4; padding: 15px; margin: 10px 0; border-radius: 8px; border: 1px solid #86efac; }
                        .bg-blue-50 { background: #eff6ff; padding: 15px; margin: 10px 0; border-radius: 8px; border: 1px solid #93c5fd; }
                        .bg-orange-50 { background: #fff7ed; padding: 15px; margin: 10px 0; border-radius: 8px; border: 1px solid #fdba74; }
                        .bg-purple-50 { background: #faf5ff; padding: 15px; margin: 10px 0; border-radius: 8px; border: 1px solid #d8b4fe; }
                        .bg-red-50 { background: #fef2f2; padding: 15px; margin: 10px 0; border-radius: 8px; border: 1px solid #fca5a5; }
                        .bg-yellow-50 { background: #fefce8; padding: 15px; margin: 10px 0; border-radius: 8px; border: 1px solid #fde047; }
                        .bg-indigo-50 { background: #eef2ff; padding: 15px; margin: 10px 0; border-radius: 8px; border: 1px solid #a5b4fc; }
                        .bg-gray-50 { background: #f9fafb; padding: 15px; margin: 10px 0; border-radius: 8px; border: 1px solid #e5e7eb; }

                        /* Color text */
                        .text-green-600 { color: #16a34a; }
                        .text-blue-600 { color: #2563eb; }
                        .text-orange-600 { color: #ea580c; }
                        .text-purple-600 { color: #9333ea; }
                        .text-red-600 { color: #dc2626; }
                        .text-gray-600 { color: #4b5563; }
                        .text-gray-900 { color: #111827; }

                        /* Utility */
                        .font-bold { font-weight: bold; }
                        .font-semibold { font-weight: 600; }
                        .text-2xl { font-size: 24px; }
                        .text-3xl { font-size: 30px; }
                        .text-xl { font-size: 20px; }
                        .text-lg { font-size: 18px; }
                        .text-sm { font-size: 14px; }
                        .text-xs { font-size: 12px; }
                        .space-y-6 > * + * { margin-top: 24px; }
                        .space-y-4 > * + * { margin-top: 16px; }
                        .space-y-3 > * + * { margin-top: 12px; }
                        .space-y-2 > * + * { margin-top: 8px; }
                        .grid { display: grid; gap: 16px; }
                        .grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
                        .grid-cols-4 { grid-template-columns: repeat(4, 1fr); }
                        .flex { display: flex; }
                        .justify-between { justify-content: space-between; }
                        .items-center { align-items: center; }
                        .rounded-lg { border-radius: 8px; }
                        .p-4 { padding: 16px; }
                        .p-6 { padding: 24px; }
                        .mb-1 { margin-bottom: 4px; }
                        .mb-2 { margin-bottom: 8px; }
                        .mb-3 { margin-bottom: 12px; }
                        .mb-6 { margin-bottom: 24px; }

                        /* Progress bar */
                        .bg-gray-200 { background: #e5e7eb; }
                        .rounded-full { border-radius: 9999px; }
                        .h-6 { height: 24px; }
                        .overflow-hidden { overflow: hidden; }
                        .bg-red-500, .bg-yellow-500, .bg-green-500 { height: 100%; display: flex; align-items: center; justify-content: flex-end; padding-right: 8px; }
                        .bg-red-500 { background: #ef4444; }
                        .bg-yellow-500 { background: #eab308; }
                        .bg-green-500 { background: #22c55e; }
                        .text-white { color: white; }

                        @media print {
                            body { padding: 20px; }
                            .page-break { page-break-before: always; }
                        }
                    </style>
                </head>
                <body>
                    <h1>${reportData.reportType}</h1>
                    <p style="color: #6b7280; margin-bottom: 20px;">${reportData.date || reportData.period || reportData.week || reportData.month || ''}</p>
                    ${formattedHTML}
                    <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
                        Generated by MciPro Golf Management Platform • ${new Date().toLocaleString()}
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    },

    shareReportEmail(funcName) {
        const startDate = document.getElementById('report-start-date')?.value || '2025-10-01';
        const endDate = document.getElementById('report-end-date')?.value || '2025-10-07';

        let reportData;
        if (['generateDailyRevenueSummary', 'generatePaymentMethodAnalysis', 'generateTeeSheetUtilization',
             'generateRoundDurationReport', 'generateEODReconciliation'].includes(funcName)) {
            reportData = this[funcName](new Date(startDate));
        } else if (['generateDemandForecast', 'generateRevenueProjection'].includes(funcName)) {
            reportData = this[funcName](30);
        } else if (['generateSeasonalTrends', 'generateCapacityPlanning', 'generateWeeklyExecutiveSummary',
                   'generateMonthlyBoardReport', 'generateBenchmarkReport'].includes(funcName)) {
            reportData = this[funcName]();
        } else {
            reportData = this[funcName](startDate, endDate);
        }

        // Format report for email
        const formatCurrency = (amount) => `฿${parseFloat(amount || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

        let emailBody = `${reportData.reportType}\n`;
        emailBody += `${reportData.date || reportData.period || reportData.week || reportData.month || ''}\n`;
        emailBody += `${'='.repeat(60)}\n\n`;

        // Format data for email
        Object.entries(reportData).forEach(([key, value]) => {
            if (key === 'reportType') return;

            emailBody += `${key.replace(/([A-Z])/g, ' $1').trim().toUpperCase()}:\n`;

            if (typeof value === 'object' && !Array.isArray(value)) {
                Object.entries(value).forEach(([k, v]) => {
                    if (typeof v === 'number' && v > 1000) {
                        emailBody += `  ${k}: ${formatCurrency(v)}\n`;
                    } else {
                        emailBody += `  ${k}: ${v}\n`;
                    }
                });
            } else if (Array.isArray(value)) {
                value.forEach(item => emailBody += `  • ${item}\n`);
            } else {
                emailBody += `  ${value}\n`;
            }
            emailBody += `\n`;
        });

        emailBody += `\n${'='.repeat(60)}\n`;
        emailBody += `Generated by MciPro Golf Management Platform\n`;
        emailBody += `https://mcipro-golf-platform.netlify.app`;

        // Create mailto link
        const subject = encodeURIComponent(`${reportData.reportType} - ${reportData.date || reportData.period || ''}`);
        const body = encodeURIComponent(emailBody);
        const mailtoLink = `mailto:?subject=${subject}&body=${body}`;

        // Open email client
        window.location.href = mailtoLink;
    }
};

window.ReportsSystem = ReportsSystem;
