/**
 * FINANCIAL DRILL-DOWN & RECONCILIATION SYSTEM
 *
 * Purpose: Track every baht and find discrepancies within 3 clicks
 * For: General Manager and Accounting Department
 *
 * Example: If ฿20,000 is missing:
 * Click 1: See total revenue vs expected revenue (variance detected)
 * Click 2: See which source has the discrepancy (Tee Times, F&B, Pro Shop, etc.)
 * Click 3: See exact transactions causing the variance
 */

const FinancialDrillDown = {

    // LEVEL 1: Top-level financial overview
    calculateFinancialOverview() {
        const data = this.getAllFinancialData();

        return {
            // Expected vs Actual
            expected: {
                revenue: data.expectedRevenue,
                cash: data.expectedCash,
                deposits: data.expectedDeposits
            },
            actual: {
                revenue: data.actualRevenue,
                cash: data.actualCash,
                deposits: data.actualDeposits
            },
            variance: {
                revenue: data.actualRevenue - data.expectedRevenue,
                cash: data.actualCash - data.expectedCash,
                deposits: data.actualDeposits - data.expectedDeposits
            },
            // Transaction counts for verification
            transactions: {
                total: data.allTransactions.length,
                processed: data.processedTransactions.length,
                pending: data.pendingTransactions.length,
                failed: data.failedTransactions.length
            }
        };
    },

    // LEVEL 2: Revenue source breakdown (when variance is detected)
    drillDownToSources(varianceType) {
        const data = this.getAllFinancialData();

        const sources = {
            teeTimes: {
                expected: this.calculateExpectedTeeTimes(data.bookings),
                actual: this.calculateActualTeeTimes(data.bookings),
                variance: 0,
                transactions: []
            },
            foodBeverage: {
                expected: this.calculateExpectedFB(data.orders),
                actual: this.calculateActualFB(data.orders),
                variance: 0,
                transactions: []
            },
            proShop: {
                expected: this.calculateExpectedProShop(data.orders),
                actual: this.calculateActualProShop(data.orders),
                variance: 0,
                transactions: []
            },
            caddyFees: {
                expected: this.calculateExpectedCaddy(data.bookings),
                actual: this.calculateActualCaddy(data.bookings),
                variance: 0,
                transactions: []
            },
            cartRentals: {
                expected: this.calculateExpectedCarts(data.bookings),
                actual: this.calculateActualCarts(data.bookings),
                variance: 0,
                transactions: []
            },
            equipment: {
                expected: this.calculateExpectedEquipment(data.orders),
                actual: this.calculateActualEquipment(data.orders),
                variance: 0,
                transactions: []
            }
        };

        // Calculate variances
        Object.keys(sources).forEach(key => {
            sources[key].variance = sources[key].actual - sources[key].expected;
        });

        return sources;
    },

    // LEVEL 3: Individual transactions (drill down to exact source of discrepancy)
    drillDownToTransactions(source) {
        const data = this.getAllFinancialData();
        let transactions = [];

        switch(source) {
            case 'teeTimes':
                transactions = data.bookings.map(b => ({
                    id: b.id,
                    date: b.date,
                    time: b.time,
                    golferName: b.playerName || 'Unknown',
                    expectedAmount: this.getExpectedTeeTimeFee(b),
                    actualAmount: b.paidAmount || 0,
                    variance: (b.paidAmount || 0) - this.getExpectedTeeTimeFee(b),
                    status: b.paymentStatus || 'pending',
                    paymentMethod: b.paymentMethod || 'unknown',
                    notes: b.paymentNotes || ''
                }));
                break;

            case 'foodBeverage':
                transactions = data.orders
                    .filter(o => o.category === 'food' || o.category === 'beverage')
                    .map(o => ({
                        id: o.id,
                        date: o.date,
                        time: o.time,
                        customerName: o.customerName || 'Unknown',
                        items: o.items,
                        expectedAmount: o.totalAmount,
                        actualAmount: o.paidAmount || 0,
                        variance: (o.paidAmount || 0) - o.totalAmount,
                        status: o.paymentStatus || 'pending',
                        paymentMethod: o.paymentMethod || 'unknown',
                        notes: o.notes || ''
                    }));
                break;

            case 'proShop':
                transactions = data.orders
                    .filter(o => o.category === 'proshop' || o.category === 'merchandise')
                    .map(o => ({
                        id: o.id,
                        date: o.date,
                        time: o.time,
                        customerName: o.customerName || 'Unknown',
                        items: o.items,
                        expectedAmount: o.totalAmount,
                        actualAmount: o.paidAmount || 0,
                        variance: (o.paidAmount || 0) - o.totalAmount,
                        status: o.paymentStatus || 'pending',
                        paymentMethod: o.paymentMethod || 'unknown',
                        notes: o.notes || ''
                    }));
                break;

            case 'caddyFees':
                transactions = data.bookings
                    .filter(b => b.caddyId)
                    .map(b => ({
                        id: b.id + '_caddy',
                        date: b.date,
                        time: b.time,
                        golferName: b.playerName || 'Unknown',
                        caddyName: b.caddyName || 'Unknown',
                        expectedAmount: this.getExpectedCaddyFee(b),
                        actualAmount: b.caddyFeePaid || 0,
                        variance: (b.caddyFeePaid || 0) - this.getExpectedCaddyFee(b),
                        status: b.caddyPaymentStatus || 'pending',
                        paymentMethod: b.caddyPaymentMethod || 'unknown',
                        notes: b.caddyNotes || ''
                    }));
                break;

            case 'cartRentals':
                transactions = data.bookings
                    .filter(b => b.needsCart)
                    .map(b => ({
                        id: b.id + '_cart',
                        date: b.date,
                        time: b.time,
                        golferName: b.playerName || 'Unknown',
                        expectedAmount: this.getExpectedCartFee(b),
                        actualAmount: b.cartFeePaid || 0,
                        variance: (b.cartFeePaid || 0) - this.getExpectedCartFee(b),
                        status: b.cartPaymentStatus || 'pending',
                        paymentMethod: b.cartPaymentMethod || 'unknown',
                        notes: b.cartNotes || ''
                    }));
                break;

            case 'equipment':
                transactions = data.orders
                    .filter(o => o.category === 'equipment')
                    .map(o => ({
                        id: o.id,
                        date: o.date,
                        time: o.time,
                        customerName: o.customerName || 'Unknown',
                        items: o.items,
                        expectedAmount: o.totalAmount,
                        actualAmount: o.paidAmount || 0,
                        variance: (o.paidAmount || 0) - o.totalAmount,
                        status: o.paymentStatus || 'pending',
                        paymentMethod: o.paymentMethod || 'unknown',
                        notes: o.notes || ''
                    }));
                break;
        }

        // Sort by variance (biggest discrepancies first)
        return transactions.sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));
    },

    // Get all financial data from localStorage
    getAllFinancialData() {
        const bookingsCloud = JSON.parse(localStorage.getItem('mcipro_bookings_cloud') || '{"bookings":[]}');
        const orders = JSON.parse(localStorage.getItem('mcipro_orders') || '[]');
        const profiles = JSON.parse(localStorage.getItem('mcipro_user_profiles') || '[]');

        return {
            bookings: bookingsCloud.bookings || [],
            orders: orders,
            profiles: profiles,
            expectedRevenue: this.calculateExpectedRevenue(bookingsCloud.bookings, orders),
            actualRevenue: this.calculateActualRevenue(bookingsCloud.bookings, orders),
            expectedCash: this.calculateExpectedCash(bookingsCloud.bookings, orders),
            actualCash: this.calculateActualCash(bookingsCloud.bookings, orders),
            expectedDeposits: this.calculateExpectedDeposits(bookingsCloud.bookings, orders),
            actualDeposits: this.calculateActualDeposits(bookingsCloud.bookings, orders),
            allTransactions: this.getAllTransactions(bookingsCloud.bookings, orders),
            processedTransactions: this.getProcessedTransactions(bookingsCloud.bookings, orders),
            pendingTransactions: this.getPendingTransactions(bookingsCloud.bookings, orders),
            failedTransactions: this.getFailedTransactions(bookingsCloud.bookings, orders)
        };
    },

    // Calculate expected revenue from all sources
    calculateExpectedRevenue(bookings, orders) {
        const teeTimeRevenue = bookings.reduce((sum, b) => sum + this.getExpectedTeeTimeFee(b), 0);
        const orderRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
        const caddyRevenue = bookings.filter(b => b.caddyId).reduce((sum, b) => sum + this.getExpectedCaddyFee(b), 0);
        const cartRevenue = bookings.filter(b => b.needsCart).reduce((sum, b) => sum + this.getExpectedCartFee(b), 0);

        return teeTimeRevenue + orderRevenue + caddyRevenue + cartRevenue;
    },

    // Calculate actual revenue received
    calculateActualRevenue(bookings, orders) {
        const teeTimeRevenue = bookings.reduce((sum, b) => sum + (b.paidAmount || 0), 0);
        const orderRevenue = orders.reduce((sum, o) => sum + (o.paidAmount || 0), 0);
        const caddyRevenue = bookings.filter(b => b.caddyId).reduce((sum, b) => sum + (b.caddyFeePaid || 0), 0);
        const cartRevenue = bookings.filter(b => b.needsCart).reduce((sum, b) => sum + (b.cartFeePaid || 0), 0);

        return teeTimeRevenue + orderRevenue + caddyRevenue + cartRevenue;
    },

    // Expected tee time calculations
    calculateExpectedTeeTimes(bookings) {
        return bookings.reduce((sum, b) => sum + this.getExpectedTeeTimeFee(b), 0);
    },

    calculateActualTeeTimes(bookings) {
        return bookings.reduce((sum, b) => sum + (b.paidAmount || 0), 0);
    },

    // Expected F&B calculations
    calculateExpectedFB(orders) {
        return orders
            .filter(o => o.category === 'food' || o.category === 'beverage')
            .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    },

    calculateActualFB(orders) {
        return orders
            .filter(o => o.category === 'food' || o.category === 'beverage')
            .reduce((sum, o) => sum + (o.paidAmount || 0), 0);
    },

    // Expected Pro Shop calculations
    calculateExpectedProShop(orders) {
        return orders
            .filter(o => o.category === 'proshop' || o.category === 'merchandise')
            .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    },

    calculateActualProShop(orders) {
        return orders
            .filter(o => o.category === 'proshop' || o.category === 'merchandise')
            .reduce((sum, o) => sum + (o.paidAmount || 0), 0);
    },

    // Expected Caddy calculations
    calculateExpectedCaddy(bookings) {
        return bookings
            .filter(b => b.caddyId)
            .reduce((sum, b) => sum + this.getExpectedCaddyFee(b), 0);
    },

    calculateActualCaddy(bookings) {
        return bookings
            .filter(b => b.caddyId)
            .reduce((sum, b) => sum + (b.caddyFeePaid || 0), 0);
    },

    // Expected Cart calculations
    calculateExpectedCarts(bookings) {
        return bookings
            .filter(b => b.needsCart)
            .reduce((sum, b) => sum + this.getExpectedCartFee(b), 0);
    },

    calculateActualCarts(bookings) {
        return bookings
            .filter(b => b.needsCart)
            .reduce((sum, b) => sum + (b.cartFeePaid || 0), 0);
    },

    // Expected Equipment calculations
    calculateExpectedEquipment(orders) {
        return orders
            .filter(o => o.category === 'equipment')
            .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    },

    calculateActualEquipment(orders) {
        return orders
            .filter(o => o.category === 'equipment')
            .reduce((sum, o) => sum + (o.paidAmount || 0), 0);
    },

    // Fee calculation helpers
    getExpectedTeeTimeFee(booking) {
        // Default: ฿2000 per round (can be customized based on peak/off-peak)
        return booking.greenFee || 2000;
    },

    getExpectedCaddyFee(booking) {
        // Default: ฿500 per caddy
        return booking.caddyFee || 500;
    },

    getExpectedCartFee(booking) {
        // Default: ฿800 per cart
        return booking.cartFee || 800;
    },

    // Cash flow calculations
    calculateExpectedCash(bookings, orders) {
        // Expected cash = cash payments only
        return this.calculateActualRevenue(bookings, orders) * 0.6; // Assume 60% cash
    },

    calculateActualCash(bookings, orders) {
        const cashBookings = bookings.filter(b => b.paymentMethod === 'cash').reduce((sum, b) => sum + (b.paidAmount || 0), 0);
        const cashOrders = orders.filter(o => o.paymentMethod === 'cash').reduce((sum, o) => sum + (o.paidAmount || 0), 0);
        return cashBookings + cashOrders;
    },

    calculateExpectedDeposits(bookings, orders) {
        // Deposits should happen twice daily
        return this.calculateActualCash(bookings, orders);
    },

    calculateActualDeposits(bookings, orders) {
        // Check if deposits were made (would need deposit tracking)
        const deposits = JSON.parse(localStorage.getItem('mcipro_deposits') || '[]');
        return deposits.reduce((sum, d) => sum + (d.amount || 0), 0);
    },

    // Transaction tracking
    getAllTransactions(bookings, orders) {
        const bookingTxns = bookings.map(b => ({ type: 'teeTime', id: b.id, amount: b.paidAmount || 0, status: b.paymentStatus }));
        const orderTxns = orders.map(o => ({ type: 'order', id: o.id, amount: o.paidAmount || 0, status: o.paymentStatus }));
        return [...bookingTxns, ...orderTxns];
    },

    getProcessedTransactions(bookings, orders) {
        return this.getAllTransactions(bookings, orders).filter(t => t.status === 'completed' || t.status === 'paid');
    },

    getPendingTransactions(bookings, orders) {
        return this.getAllTransactions(bookings, orders).filter(t => t.status === 'pending');
    },

    getFailedTransactions(bookings, orders) {
        return this.getAllTransactions(bookings, orders).filter(t => t.status === 'failed' || t.status === 'cancelled');
    },

    // UI Display Functions
    displayFinancialOverview() {
        const overview = this.calculateFinancialOverview();

        return `
            <div class="financial-overview">
                <h2>Financial Reconciliation Dashboard</h2>

                <!-- Variance Alert (if any) -->
                ${Math.abs(overview.variance.revenue) > 0 ? `
                    <div class="variance-alert ${overview.variance.revenue < 0 ? 'negative' : 'positive'}">
                        <span class="alert-icon">⚠️</span>
                        <div class="alert-content">
                            <h3>Revenue Variance Detected: ฿${Math.abs(overview.variance.revenue).toLocaleString()}</h3>
                            <p>${overview.variance.revenue < 0 ? 'Missing revenue' : 'Excess revenue'}</p>
                            <button onclick="FinancialDrillDown.showSourceBreakdown()">Click to Investigate →</button>
                        </div>
                    </div>
                ` : ''}

                <!-- Summary Cards -->
                <div class="financial-cards">
                    <div class="fin-card">
                        <h4>Expected Revenue</h4>
                        <p class="amount">฿${overview.expected.revenue.toLocaleString()}</p>
                    </div>
                    <div class="fin-card">
                        <h4>Actual Revenue</h4>
                        <p class="amount">฿${overview.actual.revenue.toLocaleString()}</p>
                    </div>
                    <div class="fin-card ${overview.variance.revenue !== 0 ? 'variance' : ''}">
                        <h4>Variance</h4>
                        <p class="amount ${overview.variance.revenue < 0 ? 'negative' : 'positive'}">
                            ฿${overview.variance.revenue.toLocaleString()}
                        </p>
                    </div>
                </div>

                <!-- Transaction Summary -->
                <div class="transaction-summary">
                    <h3>Transaction Status</h3>
                    <div class="txn-grid">
                        <div>Total: ${overview.transactions.total}</div>
                        <div>Processed: ${overview.transactions.processed}</div>
                        <div>Pending: ${overview.transactions.pending}</div>
                        <div>Failed: ${overview.transactions.failed}</div>
                    </div>
                </div>
            </div>
        `;
    },

    // Show source breakdown (Click 2)
    showSourceBreakdown() {
        const sources = this.drillDownToSources();

        let html = '<div class="source-breakdown"><h2>Revenue by Source</h2><div class="source-grid">';

        Object.keys(sources).forEach(key => {
            const source = sources[key];
            const hasVariance = Math.abs(source.variance) > 0;

            html += `
                <div class="source-card ${hasVariance ? 'has-variance' : ''}">
                    <h3>${this.formatSourceName(key)}</h3>
                    <div class="source-amounts">
                        <div>Expected: ฿${source.expected.toLocaleString()}</div>
                        <div>Actual: ฿${source.actual.toLocaleString()}</div>
                        <div class="variance ${source.variance < 0 ? 'negative' : 'positive'}">
                            Variance: ฿${source.variance.toLocaleString()}
                        </div>
                    </div>
                    ${hasVariance ? `
                        <button onclick="FinancialDrillDown.showTransactions('${key}')">
                            View Transactions →
                        </button>
                    ` : ''}
                </div>
            `;
        });

        html += '</div></div>';

        document.getElementById('financial-drill-container').innerHTML = html;
    },

    // Show individual transactions (Click 3)
    showTransactions(source) {
        const transactions = this.drillDownToTransactions(source);

        let html = `
            <div class="transaction-detail">
                <h2>${this.formatSourceName(source)} - Transaction Detail</h2>
                <button onclick="FinancialDrillDown.showSourceBreakdown()">← Back to Sources</button>

                <table class="transaction-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Date</th>
                            <th>Customer</th>
                            <th>Expected</th>
                            <th>Actual</th>
                            <th>Variance</th>
                            <th>Status</th>
                            <th>Payment Method</th>
                            <th>Notes</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        transactions.forEach(txn => {
            html += `
                <tr class="${Math.abs(txn.variance) > 0 ? 'has-variance' : ''}">
                    <td>${txn.id}</td>
                    <td>${txn.date}</td>
                    <td>${txn.golferName || txn.customerName}</td>
                    <td>฿${txn.expectedAmount.toLocaleString()}</td>
                    <td>฿${txn.actualAmount.toLocaleString()}</td>
                    <td class="${txn.variance < 0 ? 'negative' : txn.variance > 0 ? 'positive' : ''}">
                        ฿${txn.variance.toLocaleString()}
                    </td>
                    <td>${txn.status}</td>
                    <td>${txn.paymentMethod}</td>
                    <td>${txn.notes}</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        document.getElementById('financial-drill-container').innerHTML = html;
    },

    formatSourceName(key) {
        const names = {
            teeTimes: 'Tee Times',
            foodBeverage: 'Food & Beverage',
            proShop: 'Pro Shop',
            caddyFees: 'Caddy Fees',
            cartRentals: 'Cart Rentals',
            equipment: 'Equipment Rentals'
        };
        return names[key] || key;
    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Create drill-down container if it doesn't exist
    if (!document.getElementById('financial-drill-container')) {
        const container = document.createElement('div');
        container.id = 'financial-drill-container';
        document.getElementById('manager-analytics')?.appendChild(container);
    }
});
