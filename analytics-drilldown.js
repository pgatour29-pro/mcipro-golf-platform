/**
 * ANALYTICS DRILL-DOWN & CASH MANAGEMENT SYSTEM
 *
 * Features:
 * - Detailed drill-down modals for every metric
 * - Cash management (starting cash, revenue tracking, end-of-day reconciliation)
 * - Transaction-level visibility
 * - 3-click rule: Find any discrepancy within 3 clicks
 */

const AnalyticsDrillDown = {

    // ============================================
    // CASH MANAGEMENT
    // ============================================

    // Get or initialize cash register data
    getCashRegisters() {
        const stored = localStorage.getItem('mcipro_cash_registers');
        if (stored) {
            return JSON.parse(stored);
        }

        // Default cash registers
        return {
            proshop: {
                startingCash: 10000,
                currentCash: 10000,
                transactions: [],
                lastUpdated: new Date().toISOString()
            },
            restaurant: {
                startingCash: 15000,
                currentCash: 15000,
                transactions: [],
                lastUpdated: new Date().toISOString()
            },
            drinkKiosk: {
                startingCash: 5000,
                currentCash: 5000,
                transactions: [],
                lastUpdated: new Date().toISOString()
            },
            reception: {
                startingCash: 20000,
                currentCash: 20000,
                transactions: [],
                lastUpdated: new Date().toISOString()
            }
        };
    },

    // Save cash registers
    saveCashRegisters(registers) {
        localStorage.setItem('mcipro_cash_registers', JSON.stringify(registers));
    },

    // Update starting cash for a register
    setStartingCash(register, amount) {
        const registers = this.getCashRegisters();
        registers[register].startingCash = parseFloat(amount);
        registers[register].currentCash = parseFloat(amount);
        registers[register].transactions = [];
        registers[register].lastUpdated = new Date().toISOString();
        this.saveCashRegisters(registers);

        // Refresh the modal to show updated totals
        this.showCashManagement();
    },

    // Add new POS location
    addPOSLocation(name, startingCash) {
        const registers = this.getCashRegisters();
        const key = name.toLowerCase().replace(/\s+/g, '');

        if (registers[key]) {
            alert('POS location already exists!');
            return;
        }

        registers[key] = {
            name: name,
            startingCash: parseFloat(startingCash) || 0,
            currentCash: parseFloat(startingCash) || 0,
            transactions: [],
            lastUpdated: new Date().toISOString()
        };

        this.saveCashRegisters(registers);
        this.showCashManagement(); // Refresh modal
    },

    // Remove POS location
    removePOSLocation(register) {
        if (!confirm(`Remove ${register}? This cannot be undone.`)) return;

        const registers = this.getCashRegisters();
        delete registers[register];
        this.saveCashRegisters(registers);
        this.showCashManagement(); // Refresh modal
    },

    // Calculate end of day totals
    calculateEndOfDay() {
        const registers = this.getCashRegisters();
        const { bookings, orders } = GMAnalytics.getData();
        const today = new Date().toISOString().split('T')[0];

        // Calculate actual revenue by source
        const greenFees = bookings
            .filter(b => b.date === today)
            .reduce((sum, b) => sum + (parseFloat(b.greenFee) || 2000), 0);

        const caddyFees = bookings
            .filter(b => b.date === today && b.caddyId)
            .reduce((sum, b) => sum + 500, 0);

        const proshopRevenue = orders
            .filter(o => o.category === 'proshop' && o.date === today)
            .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

        const fnbRevenue = orders
            .filter(o => (o.category === 'food' || o.category === 'beverage') && o.date === today)
            .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

        // Expected cash = Starting + Revenue
        const expectedCash = {
            reception: registers.reception.startingCash + greenFees + caddyFees,
            proshop: registers.proshop.startingCash + proshopRevenue,
            restaurant: registers.restaurant.startingCash + fnbRevenue,
            drinkKiosk: registers.drinkKiosk.startingCash + 0 // Drink kiosk revenue tracked separately
        };

        // Total starting cash
        const totalStartingCash = Object.values(registers).reduce((sum, r) => sum + r.startingCash, 0);

        // Total expected
        const totalExpected = Object.values(expectedCash).reduce((sum, val) => sum + val, 0);

        return {
            registers,
            expectedCash,
            totalStartingCash,
            totalExpected,
            totalRevenue: greenFees + caddyFees + proshopRevenue + fnbRevenue,
            breakdown: {
                greenFees,
                caddyFees,
                proshopRevenue,
                fnbRevenue
            }
        };
    },

    // ============================================
    // DRILL-DOWN MODALS
    // ============================================

    // Show Revenue Now drill-down
    showRevenueNowDrillDown() {
        const { bookings, orders } = GMAnalytics.getData();
        const today = new Date().toISOString().split('T')[0];

        // Get all revenue transactions
        const greenFeeTransactions = bookings
            .filter(b => b.date === today)
            .map(b => ({
                type: 'Green Fee',
                time: b.time,
                player: b.playerName || 'Walk-in',
                amount: parseFloat(b.greenFee) || 2000,
                id: b.id
            }));

        const caddyTransactions = bookings
            .filter(b => b.date === today && b.caddyId)
            .map(b => ({
                type: 'Caddy Fee',
                time: b.time,
                player: b.playerName || 'Walk-in',
                caddy: b.caddyId,
                amount: 500,
                id: b.id
            }));

        const fnbTransactions = orders
            .filter(o => (o.category === 'food' || o.category === 'beverage') && o.date === today)
            .map(o => ({
                type: o.category === 'food' ? 'Food' : 'Beverage',
                time: o.time || 'N/A',
                customer: o.customerName || 'Guest',
                items: o.items?.length || 0,
                amount: o.totalAmount || 0,
                id: o.id
            }));

        const proshopTransactions = orders
            .filter(o => o.category === 'proshop' && o.date === today)
            .map(o => ({
                type: 'Pro Shop',
                time: o.time || 'N/A',
                customer: o.customerName || 'Guest',
                items: o.items?.length || 0,
                amount: o.totalAmount || 0,
                id: o.id
            }));

        const allTransactions = [
            ...greenFeeTransactions,
            ...caddyTransactions,
            ...fnbTransactions,
            ...proshopTransactions
        ].sort((a, b) => (a.time || '').localeCompare(b.time || ''));

        const totalRevenue = allTransactions.reduce((sum, t) => sum + t.amount, 0);

        this.showModal('Revenue Now - Detailed Breakdown', `
            <div class="space-y-4">
                <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div class="text-sm font-semibold text-green-900 mb-1">Total Revenue (Current)</div>
                    <div class="text-3xl font-bold text-green-600">฿${totalRevenue.toLocaleString()}</div>
                    <div class="text-xs text-green-700 mt-1">${allTransactions.length} transactions today</div>
                </div>

                <div class="bg-white border rounded-lg overflow-hidden">
                    <div class="bg-gray-50 px-4 py-2 border-b">
                        <h4 class="font-semibold text-sm">All Transactions (Chronological)</h4>
                    </div>
                    <div class="overflow-auto max-h-96">
                        <table class="w-full text-sm">
                            <thead class="bg-gray-100 sticky top-0">
                                <tr>
                                    <th class="px-3 py-2 text-left text-xs font-semibold text-gray-700">Time</th>
                                    <th class="px-3 py-2 text-left text-xs font-semibold text-gray-700">Type</th>
                                    <th class="px-3 py-2 text-left text-xs font-semibold text-gray-700">Details</th>
                                    <th class="px-3 py-2 text-right text-xs font-semibold text-gray-700">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${allTransactions.map(t => `
                                    <tr class="border-b hover:bg-gray-50">
                                        <td class="px-3 py-2 text-gray-600">${t.time}</td>
                                        <td class="px-3 py-2">
                                            <span class="inline-block px-2 py-1 rounded text-xs font-medium
                                                ${t.type === 'Green Fee' ? 'bg-green-100 text-green-800' : ''}
                                                ${t.type === 'Caddy Fee' ? 'bg-blue-100 text-blue-800' : ''}
                                                ${t.type === 'Food' ? 'bg-orange-100 text-orange-800' : ''}
                                                ${t.type === 'Beverage' ? 'bg-yellow-100 text-yellow-800' : ''}
                                                ${t.type === 'Pro Shop' ? 'bg-purple-100 text-purple-800' : ''}
                                            ">${t.type}</span>
                                        </td>
                                        <td class="px-3 py-2 text-gray-600 text-xs">
                                            ${t.player ? `Player: ${t.player}` : ''}
                                            ${t.customer ? `Customer: ${t.customer}` : ''}
                                            ${t.caddy ? `Caddy: ${t.caddy}` : ''}
                                            ${t.items ? `(${t.items} items)` : ''}
                                        </td>
                                        <td class="px-3 py-2 text-right font-semibold text-gray-900">฿${t.amount.toLocaleString()}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div class="bg-green-50 rounded p-3">
                        <div class="text-xs text-green-700 mb-1">Green Fees</div>
                        <div class="text-lg font-bold text-green-600">฿${greenFeeTransactions.reduce((s, t) => s + t.amount, 0).toLocaleString()}</div>
                        <div class="text-xs text-green-600">${greenFeeTransactions.length} rounds</div>
                    </div>
                    <div class="bg-blue-50 rounded p-3">
                        <div class="text-xs text-blue-700 mb-1">Caddy Fees</div>
                        <div class="text-lg font-bold text-blue-600">฿${caddyTransactions.reduce((s, t) => s + t.amount, 0).toLocaleString()}</div>
                        <div class="text-xs text-blue-600">${caddyTransactions.length} caddies</div>
                    </div>
                    <div class="bg-orange-50 rounded p-3">
                        <div class="text-xs text-orange-700 mb-1">F&B</div>
                        <div class="text-lg font-bold text-orange-600">฿${fnbTransactions.reduce((s, t) => s + t.amount, 0).toLocaleString()}</div>
                        <div class="text-xs text-orange-600">${fnbTransactions.length} orders</div>
                    </div>
                    <div class="bg-purple-50 rounded p-3">
                        <div class="text-xs text-purple-700 mb-1">Pro Shop</div>
                        <div class="text-lg font-bold text-purple-600">฿${proshopTransactions.reduce((s, t) => s + t.amount, 0).toLocaleString()}</div>
                        <div class="text-xs text-purple-600">${proshopTransactions.length} sales</div>
                    </div>
                </div>
            </div>
        `);
    },

    // Show End of Day Forecast drill-down
    showForecastDrillDown() {
        const financial = GMAnalytics.calculateFinancialHealth();
        const eodData = this.calculateEndOfDay();
        const hourlyProjection = this.calculateHourlyProjection();

        this.showModal('End of Day Forecast - Detailed Projection', `
            <div class="space-y-4">
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div class="text-sm font-semibold text-blue-900 mb-1">Projected End of Day Revenue</div>
                    <div class="text-3xl font-bold text-blue-600">฿${Math.round(financial.forecast).toLocaleString()}</div>
                    <div class="text-xs text-blue-700 mt-1">Based on current trajectory + remaining hours</div>
                </div>

                <div class="bg-white border rounded-lg p-4">
                    <h4 class="font-semibold text-sm mb-3">Calculation Breakdown</h4>
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between">
                            <span class="text-gray-600">Current Revenue:</span>
                            <span class="font-semibold">฿${financial.totalRevenue.toLocaleString()}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">Projected Additional:</span>
                            <span class="font-semibold text-blue-600">฿${Math.round(financial.forecast - financial.totalRevenue).toLocaleString()}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">Hours Remaining:</span>
                            <span class="font-semibold">${hourlyProjection.hoursRemaining}h</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">Avg Revenue/Hour (so far):</span>
                            <span class="font-semibold">฿${Math.round(hourlyProjection.avgPerHour).toLocaleString()}</span>
                        </div>
                        <div class="h-px bg-gray-200 my-2"></div>
                        <div class="flex justify-between text-base">
                            <span class="text-gray-900 font-semibold">Forecast Total:</span>
                            <span class="font-bold text-blue-600">฿${Math.round(financial.forecast).toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                <div class="bg-white border rounded-lg p-4">
                    <h4 class="font-semibold text-sm mb-3">Expected Cash Position (End of Day)</h4>
                    <div class="space-y-3">
                        ${Object.keys(eodData.expectedCash).map(register => `
                            <div class="flex justify-between items-center p-2 bg-gray-50 rounded">
                                <div>
                                    <div class="font-medium text-sm capitalize">${register.replace(/([A-Z])/g, ' $1').trim()}</div>
                                    <div class="text-xs text-gray-500">Starting: ฿${eodData.registers[register].startingCash.toLocaleString()}</div>
                                </div>
                                <div class="text-right">
                                    <div class="font-bold">฿${Math.round(eodData.expectedCash[register]).toLocaleString()}</div>
                                    <div class="text-xs text-green-600">+฿${Math.round(eodData.expectedCash[register] - eodData.registers[register].startingCash).toLocaleString()}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `);
    },

    // Calculate hourly projection
    calculateHourlyProjection() {
        const now = new Date();
        const currentHour = now.getHours();
        const openHour = 6; // 6 AM
        const closeHour = 19; // 7 PM

        const hoursElapsed = Math.max(currentHour - openHour, 1);
        const hoursRemaining = Math.max(closeHour - currentHour, 0);

        const financial = GMAnalytics.calculateFinancialHealth();
        const avgPerHour = financial.totalRevenue / hoursElapsed;

        return {
            hoursElapsed,
            hoursRemaining,
            avgPerHour,
            projectedAdditional: avgPerHour * hoursRemaining
        };
    },

    // Show Cash Management modal
    showCashManagement() {
        const eodData = this.calculateEndOfDay();
        const registers = eodData.registers;

        this.showModal('Cash Management & Reconciliation', `
            <div class="space-y-4">
                <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div class="flex items-start gap-3">
                        <span class="material-symbols-outlined text-yellow-600">info</span>
                        <div>
                            <div class="font-semibold text-yellow-900 text-sm">Starting Cash Setup</div>
                            <div class="text-xs text-yellow-700 mt-1">Set the starting cash for each register at the beginning of the day</div>
                        </div>
                    </div>
                </div>

                <!-- Add POS Location Button -->
                <div class="flex justify-end">
                    <button onclick="AnalyticsDrillDown.showAddPOSForm()"
                            class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium">
                        <span class="material-symbols-outlined text-sm">add_circle</span>
                        Add POS Location
                    </button>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    ${Object.keys(registers).map(register => `
                        <div class="bg-white border rounded-lg p-4 relative">
                            <button onclick="AnalyticsDrillDown.removePOSLocation('${register}')"
                                    class="absolute top-2 right-2 text-gray-400 hover:text-red-600"
                                    title="Remove POS">
                                <span class="material-symbols-outlined text-sm">close</span>
                            </button>
                            <h4 class="font-semibold text-sm mb-3 capitalize flex items-center gap-2">
                                <span class="material-symbols-outlined text-gray-400 text-sm">point_of_sale</span>
                                ${registers[register].name || register.replace(/([A-Z])/g, ' $1').trim()}
                            </h4>
                            <div class="space-y-2">
                                <div>
                                    <label class="text-xs text-gray-600">Starting Cash</label>
                                    <div class="flex items-center gap-2 mt-1">
                                        <input type="number"
                                               id="cash-start-${register}"
                                               value="${registers[register].startingCash}"
                                               class="flex-1 px-3 py-2 border rounded text-sm"
                                               onchange="AnalyticsDrillDown.setStartingCash('${register}', this.value)">
                                        <span class="text-xs text-gray-500">฿</span>
                                    </div>
                                </div>
                                <div class="pt-2 border-t">
                                    <div class="flex justify-between text-xs mb-1">
                                        <span class="text-gray-600">Expected (EoD):</span>
                                        <span class="font-semibold">฿${Math.round(eodData.expectedCash[register] || 0).toLocaleString()}</span>
                                    </div>
                                    <div class="flex justify-between text-xs">
                                        <span class="text-gray-600">Revenue Added:</span>
                                        <span class="font-semibold text-green-600">+฿${Math.round((eodData.expectedCash[register] || 0) - registers[register].startingCash).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>

                <div class="bg-gray-50 border rounded-lg p-4">
                    <h4 class="font-semibold mb-3">Total Cash Summary</h4>
                    <div class="grid grid-cols-3 gap-4 text-center">
                        <div>
                            <div class="text-xs text-gray-600 mb-1">Starting Total</div>
                            <div class="text-xl font-bold">฿${eodData.totalStartingCash.toLocaleString()}</div>
                        </div>
                        <div>
                            <div class="text-xs text-gray-600 mb-1">Revenue Added</div>
                            <div class="text-xl font-bold text-green-600">+฿${eodData.totalRevenue.toLocaleString()}</div>
                        </div>
                        <div>
                            <div class="text-xs text-gray-600 mb-1">Expected Total</div>
                            <div class="text-xl font-bold text-blue-600">฿${Math.round(eodData.totalExpected).toLocaleString()}</div>
                        </div>
                    </div>
                </div>
            </div>
        `);
    },

    // Generic modal display
    showModal(title, content) {
        const modalHTML = `
            <div id="analytics-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                 onclick="if(event.target.id === 'analytics-modal') AnalyticsDrillDown.closeModal()">
                <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                    <div class="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
                        <h3 class="text-lg font-bold text-white">${title}</h3>
                        <div class="flex gap-2 items-center">
                            <button onclick="AnalyticsDrillDown.exportToPDF('${title}')"
                                    class="px-3 py-1 bg-white bg-opacity-20 rounded hover:bg-opacity-30 text-sm flex items-center gap-1 text-white">
                                <span class="material-symbols-outlined text-sm">download</span> PDF
                            </button>
                            <button onclick="AnalyticsDrillDown.shareViaEmail('${title}')"
                                    class="px-3 py-1 bg-white bg-opacity-20 rounded hover:bg-opacity-30 text-sm flex items-center gap-1 text-white">
                                <span class="material-symbols-outlined text-sm">email</span> Email
                            </button>
                            <button onclick="AnalyticsDrillDown.closeModal()"
                                    class="text-white hover:text-gray-200">
                                <span class="material-symbols-outlined">close</span>
                            </button>
                        </div>
                    </div>
                    <div class="p-6 overflow-auto max-h-[calc(90vh-80px)]">
                        ${content}
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existing = document.getElementById('analytics-modal');
        if (existing) existing.remove();

        // Add new modal
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    },

    closeModal() {
        const modal = document.getElementById('analytics-modal');
        if (modal) modal.remove();
    },

    // Show Add POS Location form
    showAddPOSForm() {
        const formHTML = `
            <div class="bg-white border rounded-lg p-4 mt-4">
                <h4 class="font-semibold mb-3">Add New POS Location</h4>
                <div class="space-y-3">
                    <div>
                        <label class="text-sm font-medium text-gray-700 block mb-1">Location Name</label>
                        <input type="text" id="new-pos-name"
                               placeholder="e.g., Beverage Cart, Halfway House, Locker Room"
                               class="w-full px-3 py-2 border rounded text-sm">
                    </div>
                    <div>
                        <label class="text-sm font-medium text-gray-700 block mb-1">Starting Cash (฿)</label>
                        <input type="number" id="new-pos-cash"
                               placeholder="0"
                               class="w-full px-3 py-2 border rounded text-sm">
                    </div>
                    <div class="flex gap-2">
                        <button onclick="AnalyticsDrillDown.submitNewPOS()"
                                class="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm font-medium">
                            Add Location
                        </button>
                        <button onclick="document.getElementById('add-pos-form').remove()"
                                class="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 text-sm font-medium">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Check if form already exists
        if (document.getElementById('add-pos-form')) return;

        // Add form before the POS grid
        const modal = document.getElementById('analytics-modal');
        const grid = modal.querySelector('.grid');
        const formDiv = document.createElement('div');
        formDiv.id = 'add-pos-form';
        formDiv.innerHTML = formHTML;
        grid.parentNode.insertBefore(formDiv, grid);
    },

    // Submit new POS location
    submitNewPOS() {
        const name = document.getElementById('new-pos-name').value.trim();
        const cash = document.getElementById('new-pos-cash').value;

        if (!name) {
            alert('Please enter a location name');
            return;
        }

        this.addPOSLocation(name, cash);
    },

    // Show Revenue per Round drill-down
    showRevenuePerRoundDrillDown() {
        const { bookings } = GMAnalytics.getData();
        const today = new Date().toISOString().split('T')[0];
        const financial = GMAnalytics.calculateFinancialHealth();

        const todayBookings = bookings.filter(b => b.date === today);

        const roundsWithRevenue = todayBookings.map(b => {
            const greenFee = parseFloat(b.greenFee) || 2000;
            const caddyFee = b.caddyId ? 500 : 0;
            const totalForRound = greenFee + caddyFee;

            return {
                time: b.time,
                player: b.playerName || 'Walk-in',
                greenFee,
                caddyFee,
                total: totalForRound,
                id: b.id
            };
        });

        const avgRevenue = roundsWithRevenue.length > 0
            ? roundsWithRevenue.reduce((sum, r) => sum + r.total, 0) / roundsWithRevenue.length
            : 0;

        this.showModal('Revenue per Round - Detailed Analysis', `
            <div class="space-y-4">
                <div class="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div class="text-sm font-semibold text-purple-900 mb-1">Average Revenue per Round</div>
                    <div class="text-3xl font-bold text-purple-600">฿${Math.round(avgRevenue).toLocaleString()}</div>
                    <div class="text-xs text-purple-700 mt-1">${todayBookings.length} rounds today</div>
                </div>

                <div class="grid grid-cols-3 gap-3">
                    <div class="bg-green-50 rounded p-3 text-center">
                        <div class="text-xs text-green-700 mb-1">Highest</div>
                        <div class="text-lg font-bold text-green-600">
                            ฿${Math.max(...roundsWithRevenue.map(r => r.total), 0).toLocaleString()}
                        </div>
                    </div>
                    <div class="bg-yellow-50 rounded p-3 text-center">
                        <div class="text-xs text-yellow-700 mb-1">Average</div>
                        <div class="text-lg font-bold text-yellow-600">฿${Math.round(avgRevenue).toLocaleString()}</div>
                    </div>
                    <div class="bg-orange-50 rounded p-3 text-center">
                        <div class="text-xs text-orange-700 mb-1">Lowest</div>
                        <div class="text-lg font-bold text-orange-600">
                            ฿${Math.min(...roundsWithRevenue.map(r => r.total), 0).toLocaleString()}
                        </div>
                    </div>
                </div>

                <div class="bg-white border rounded-lg overflow-hidden">
                    <div class="bg-gray-50 px-4 py-2 border-b">
                        <h4 class="font-semibold text-sm">Revenue by Round</h4>
                    </div>
                    <div class="overflow-auto max-h-96">
                        <table class="w-full text-sm">
                            <thead class="bg-gray-100 sticky top-0">
                                <tr>
                                    <th class="px-3 py-2 text-left text-xs font-semibold text-gray-700">Time</th>
                                    <th class="px-3 py-2 text-left text-xs font-semibold text-gray-700">Player</th>
                                    <th class="px-3 py-2 text-right text-xs font-semibold text-gray-700">Green Fee</th>
                                    <th class="px-3 py-2 text-right text-xs font-semibold text-gray-700">Caddy</th>
                                    <th class="px-3 py-2 text-right text-xs font-semibold text-gray-700">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${roundsWithRevenue.map(r => `
                                    <tr class="border-b hover:bg-gray-50">
                                        <td class="px-3 py-2 text-gray-600">${r.time}</td>
                                        <td class="px-3 py-2 text-gray-900">${r.player}</td>
                                        <td class="px-3 py-2 text-right text-gray-600">฿${r.greenFee.toLocaleString()}</td>
                                        <td class="px-3 py-2 text-right text-gray-600">฿${r.caddyFee.toLocaleString()}</td>
                                        <td class="px-3 py-2 text-right font-semibold text-gray-900">฿${r.total.toLocaleString()}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `);
    },

    // Show Green Fees drill-down with customer type breakdown
    showGreenFeesDrillDown() {
        const { bookings } = GMAnalytics.getData();
        const today = new Date().toISOString().split('T')[0];

        const todayBookings = bookings.filter(b => b.date === today);

        // Categorize by customer type
        const breakdown = {
            member: { count: 0, revenue: 0, bookings: [] },
            vip: { count: 0, revenue: 0, bookings: [] },
            corporate: { count: 0, revenue: 0, bookings: [] },
            tournament: { count: 0, revenue: 0, bookings: [] },
            society: { count: 0, revenue: 0, bookings: [] },
            walkin: { count: 0, revenue: 0, bookings: [] },
            promo: { count: 0, revenue: 0, bookings: [] }
        };

        todayBookings.forEach(b => {
            const fee = parseFloat(b.greenFee) || 2000;
            let type = 'walkin'; // default

            if (b.customerType) type = b.customerType.toLowerCase();
            else if (b.isMember) type = 'member';
            else if (b.isVIP) type = 'vip';
            else if (b.eventType === 'corporate') type = 'corporate';
            else if (b.eventType === 'tournament') type = 'tournament';
            else if (b.eventType === 'society' || b.societyName) type = 'society';
            else if (b.promoCode || b.isPromo) type = 'promo';

            if (breakdown[type]) {
                breakdown[type].count++;
                breakdown[type].revenue += fee;
                breakdown[type].bookings.push({ ...b, greenFee: fee });
            }
        });

        const totalRevenue = Object.values(breakdown).reduce((sum, t) => sum + t.revenue, 0);

        this.showModal('Green Fees - Customer Type Breakdown', `
            <div class="space-y-4">
                <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div class="text-sm font-semibold text-green-900 mb-1">Total Green Fees</div>
                    <div class="text-3xl font-bold text-green-600">฿${totalRevenue.toLocaleString()}</div>
                    <div class="text-xs text-green-700 mt-1">${todayBookings.length} rounds today</div>
                </div>

                <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                    ${Object.entries(breakdown).map(([type, data]) => `
                        <div class="bg-white border rounded p-3">
                            <div class="text-xs font-semibold text-gray-600 uppercase mb-1">${type}</div>
                            <div class="text-lg font-bold text-gray-900">฿${data.revenue.toLocaleString()}</div>
                            <div class="text-xs text-gray-600">${data.count} rounds</div>
                        </div>
                    `).join('')}
                </div>

                <div class="bg-white border rounded-lg overflow-hidden">
                    <div class="bg-gray-50 px-4 py-2 border-b">
                        <h4 class="font-semibold text-sm">Detailed Breakdown by Customer Type</h4>
                    </div>
                    <div class="overflow-auto max-h-96">
                        ${Object.entries(breakdown).map(([type, data]) =>
                            data.bookings.length > 0 ? `
                                <div class="border-b">
                                    <div class="bg-gray-100 px-4 py-2">
                                        <span class="font-semibold uppercase text-xs">${type} (${data.count})</span>
                                    </div>
                                    ${data.bookings.map(b => `
                                        <div class="px-4 py-2 hover:bg-gray-50 flex justify-between text-sm">
                                            <div>
                                                <span class="font-medium">${b.playerName || 'Walk-in'}</span>
                                                <span class="text-gray-500 text-xs ml-2">${b.time}</span>
                                            </div>
                                            <span class="font-semibold">฿${b.greenFee.toLocaleString()}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : ''
                        ).join('')}
                    </div>
                </div>
            </div>
        `);
    },

    // Show Caddy Services drill-down with customer type breakdown
    showCaddyServicesDrillDown() {
        const { bookings } = GMAnalytics.getData();
        const today = new Date().toISOString().split('T')[0];

        const caddyBookings = bookings.filter(b => b.date === today && b.caddyId);

        // Categorize by customer type
        const breakdown = {
            member: { count: 0, revenue: 0, bookings: [] },
            vip: { count: 0, revenue: 0, bookings: [] },
            corporate: { count: 0, revenue: 0, bookings: [] },
            tournament: { count: 0, revenue: 0, bookings: [] },
            society: { count: 0, revenue: 0, bookings: [] },
            walkin: { count: 0, revenue: 0, bookings: [] },
            promo: { count: 0, revenue: 0, bookings: [] }
        };

        caddyBookings.forEach(b => {
            const fee = 500;
            let type = 'walkin';

            if (b.customerType) type = b.customerType.toLowerCase();
            else if (b.isMember) type = 'member';
            else if (b.isVIP) type = 'vip';
            else if (b.eventType === 'corporate') type = 'corporate';
            else if (b.eventType === 'tournament') type = 'tournament';
            else if (b.eventType === 'society' || b.societyName) type = 'society';
            else if (b.promoCode) type = 'promo';

            if (breakdown[type]) {
                breakdown[type].count++;
                breakdown[type].revenue += fee;
                breakdown[type].bookings.push({ ...b, caddyFee: fee });
            }
        });

        const totalRevenue = Object.values(breakdown).reduce((sum, t) => sum + t.revenue, 0);

        this.showModal('Caddy Services - Customer Type Breakdown', `
            <div class="space-y-4">
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div class="text-sm font-semibold text-blue-900 mb-1">Total Caddy Revenue</div>
                    <div class="text-3xl font-bold text-blue-600">฿${totalRevenue.toLocaleString()}</div>
                    <div class="text-xs text-blue-700 mt-1">${caddyBookings.length} caddies assigned</div>
                </div>

                <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                    ${Object.entries(breakdown).map(([type, data]) => `
                        <div class="bg-white border rounded p-3">
                            <div class="text-xs font-semibold text-gray-600 uppercase mb-1">${type}</div>
                            <div class="text-lg font-bold text-gray-900">฿${data.revenue.toLocaleString()}</div>
                            <div class="text-xs text-gray-600">${data.count} caddies</div>
                        </div>
                    `).join('')}
                </div>

                <div class="bg-white border rounded-lg overflow-hidden">
                    <div class="bg-gray-50 px-4 py-2 border-b">
                        <h4 class="font-semibold text-sm">Caddy Assignments by Customer Type</h4>
                    </div>
                    <div class="overflow-auto max-h-96">
                        ${Object.entries(breakdown).map(([type, data]) =>
                            data.bookings.length > 0 ? `
                                <div class="border-b">
                                    <div class="bg-gray-100 px-4 py-2">
                                        <span class="font-semibold uppercase text-xs">${type} (${data.count})</span>
                                    </div>
                                    ${data.bookings.map(b => `
                                        <div class="px-4 py-2 hover:bg-gray-50 text-sm">
                                            <div class="flex justify-between">
                                                <div>
                                                    <span class="font-medium">${b.playerName || 'Walk-in'}</span>
                                                    <span class="text-gray-500 text-xs ml-2">${b.time}</span>
                                                </div>
                                                <span class="font-semibold">฿${b.caddyFee.toLocaleString()}</span>
                                            </div>
                                            <div class="text-xs text-gray-500 mt-1">Caddy: ${b.caddyId}</div>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : ''
                        ).join('')}
                    </div>
                </div>
            </div>
        `);
    },

    // Show F&B drill-down with payment method breakdown
    showFnBDrillDown() {
        const { orders } = GMAnalytics.getData();
        const today = new Date().toISOString().split('T')[0];

        const fnbOrders = orders.filter(o =>
            (o.category === 'food' || o.category === 'beverage') && o.date === today
        );

        // Payment method breakdown
        const paymentBreakdown = {
            card: { count: 0, revenue: 0, orders: [] },
            cash: { count: 0, revenue: 0, orders: [] },
            voucher: { count: 0, revenue: 0, orders: [] },
            freebie: { count: 0, revenue: 0, orders: [] },
            account: { count: 0, revenue: 0, orders: [] }
        };

        // Customer type breakdown
        const customerBreakdown = {
            member: { count: 0, revenue: 0 },
            vip: { count: 0, revenue: 0 },
            corporate: { count: 0, revenue: 0 },
            guest: { count: 0, revenue: 0 }
        };

        fnbOrders.forEach(o => {
            const amount = o.totalAmount || 0;
            const payment = (o.paymentMethod || 'cash').toLowerCase();
            const custType = (o.customerType || 'guest').toLowerCase();

            if (paymentBreakdown[payment]) {
                paymentBreakdown[payment].count++;
                paymentBreakdown[payment].revenue += amount;
                paymentBreakdown[payment].orders.push(o);
            }

            if (customerBreakdown[custType]) {
                customerBreakdown[custType].count++;
                customerBreakdown[custType].revenue += amount;
            }
        });

        const totalRevenue = Object.values(paymentBreakdown).reduce((sum, t) => sum + t.revenue, 0);

        this.showModal('F&B Sales - Payment & Customer Breakdown', `
            <div class="space-y-4">
                <div class="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div class="text-sm font-semibold text-orange-900 mb-1">Total F&B Revenue</div>
                    <div class="text-3xl font-bold text-orange-600">฿${totalRevenue.toLocaleString()}</div>
                    <div class="text-xs text-orange-700 mt-1">${fnbOrders.length} orders today</div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <h4 class="font-semibold text-sm mb-2">By Payment Method</h4>
                        <div class="space-y-2">
                            ${Object.entries(paymentBreakdown).map(([method, data]) => `
                                <div class="bg-white border rounded p-2 flex justify-between items-center">
                                    <div>
                                        <div class="text-xs font-semibold text-gray-600 uppercase">${method}</div>
                                        <div class="text-xs text-gray-500">${data.count} orders</div>
                                    </div>
                                    <div class="text-lg font-bold text-gray-900">฿${data.revenue.toLocaleString()}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div>
                        <h4 class="font-semibold text-sm mb-2">By Customer Type</h4>
                        <div class="space-y-2">
                            ${Object.entries(customerBreakdown).map(([type, data]) => `
                                <div class="bg-white border rounded p-2 flex justify-between items-center">
                                    <div>
                                        <div class="text-xs font-semibold text-gray-600 uppercase">${type}</div>
                                        <div class="text-xs text-gray-500">${data.count} orders</div>
                                    </div>
                                    <div class="text-lg font-bold text-gray-900">฿${data.revenue.toLocaleString()}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <div class="bg-white border rounded-lg overflow-hidden">
                    <div class="bg-gray-50 px-4 py-2 border-b">
                        <h4 class="font-semibold text-sm">Orders by Payment Method</h4>
                    </div>
                    <div class="overflow-auto max-h-96">
                        ${Object.entries(paymentBreakdown).map(([method, data]) =>
                            data.orders.length > 0 ? `
                                <div class="border-b">
                                    <div class="bg-gray-100 px-4 py-2">
                                        <span class="font-semibold uppercase text-xs">${method} (${data.count})</span>
                                    </div>
                                    ${data.orders.map(o => `
                                        <div class="px-4 py-2 hover:bg-gray-50 text-sm">
                                            <div class="flex justify-between">
                                                <div>
                                                    <span class="font-medium">${o.customerName || 'Guest'}</span>
                                                    <span class="text-gray-500 text-xs ml-2">${o.time || 'N/A'}</span>
                                                </div>
                                                <span class="font-semibold">฿${(o.totalAmount || 0).toLocaleString()}</span>
                                            </div>
                                            <div class="text-xs text-gray-500 mt-1">${o.items?.length || 0} items - ${o.category}</div>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : ''
                        ).join('')}
                    </div>
                </div>
            </div>
        `);
    },

    // Show Pro Shop drill-down with category & customer breakdown
    showProShopDrillDown() {
        const { orders } = GMAnalytics.getData();
        const today = new Date().toISOString().split('T')[0];

        const proshopOrders = orders.filter(o => o.category === 'proshop' && o.date === today);

        // Item category breakdown
        const categoryBreakdown = {
            clothing: { count: 0, revenue: 0, orders: [] },
            equipment: { count: 0, revenue: 0, orders: [] },
            accessories: { count: 0, revenue: 0, orders: [] },
            tees: { count: 0, revenue: 0, orders: [] },
            miscellaneous: { count: 0, revenue: 0, orders: [] }
        };

        // Customer type breakdown
        const customerBreakdown = {
            member: { count: 0, revenue: 0 },
            vip: { count: 0, revenue: 0 },
            guest: { count: 0, revenue: 0 },
            walkin: { count: 0, revenue: 0 }
        };

        proshopOrders.forEach(o => {
            const amount = o.totalAmount || 0;
            const itemCat = (o.itemCategory || 'miscellaneous').toLowerCase();
            const custType = (o.customerType || 'guest').toLowerCase();

            if (categoryBreakdown[itemCat]) {
                categoryBreakdown[itemCat].count++;
                categoryBreakdown[itemCat].revenue += amount;
                categoryBreakdown[itemCat].orders.push(o);
            }

            if (customerBreakdown[custType]) {
                customerBreakdown[custType].count++;
                customerBreakdown[custType].revenue += amount;
            }
        });

        const totalRevenue = Object.values(categoryBreakdown).reduce((sum, t) => sum + t.revenue, 0);

        this.showModal('Pro Shop Sales - Product & Customer Breakdown', `
            <div class="space-y-4">
                <div class="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div class="text-sm font-semibold text-purple-900 mb-1">Total Pro Shop Revenue</div>
                    <div class="text-3xl font-bold text-purple-600">฿${totalRevenue.toLocaleString()}</div>
                    <div class="text-xs text-purple-700 mt-1">${proshopOrders.length} transactions today</div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <h4 class="font-semibold text-sm mb-2">By Product Category</h4>
                        <div class="space-y-2">
                            ${Object.entries(categoryBreakdown).map(([cat, data]) => `
                                <div class="bg-white border rounded p-2 flex justify-between items-center">
                                    <div>
                                        <div class="text-xs font-semibold text-gray-600 uppercase">${cat}</div>
                                        <div class="text-xs text-gray-500">${data.count} sales</div>
                                    </div>
                                    <div class="text-lg font-bold text-gray-900">฿${data.revenue.toLocaleString()}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div>
                        <h4 class="font-semibold text-sm mb-2">By Customer Type</h4>
                        <div class="space-y-2">
                            ${Object.entries(customerBreakdown).map(([type, data]) => `
                                <div class="bg-white border rounded p-2 flex justify-between items-center">
                                    <div>
                                        <div class="text-xs font-semibold text-gray-600 uppercase">${type}</div>
                                        <div class="text-xs text-gray-500">${data.count} sales</div>
                                    </div>
                                    <div class="text-lg font-bold text-gray-900">฿${data.revenue.toLocaleString()}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <div class="bg-white border rounded-lg overflow-hidden">
                    <div class="bg-gray-50 px-4 py-2 border-b">
                        <h4 class="font-semibold text-sm">Sales by Product Category</h4>
                    </div>
                    <div class="overflow-auto max-h-96">
                        ${Object.entries(categoryBreakdown).map(([cat, data]) =>
                            data.orders.length > 0 ? `
                                <div class="border-b">
                                    <div class="bg-gray-100 px-4 py-2">
                                        <span class="font-semibold uppercase text-xs">${cat} (${data.count})</span>
                                    </div>
                                    ${data.orders.map(o => `
                                        <div class="px-4 py-2 hover:bg-gray-50 text-sm">
                                            <div class="flex justify-between">
                                                <div>
                                                    <span class="font-medium">${o.customerName || 'Guest'}</span>
                                                    <span class="text-gray-500 text-xs ml-2">${o.time || 'N/A'}</span>
                                                </div>
                                                <span class="font-semibold">฿${(o.totalAmount || 0).toLocaleString()}</span>
                                            </div>
                                            <div class="text-xs text-gray-500 mt-1">${o.items?.length || 0} items</div>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : ''
                        ).join('')}
                    </div>
                </div>
            </div>
        `);
    },

    // Show Utilization drill-down
    showUtilizationDrillDown() {
        const { bookings } = GMAnalytics.getData();
        const today = new Date().toISOString().split('T')[0];
        const financial = GMAnalytics.calculateFinancialHealth();
        const operational = GMAnalytics.calculateOperationalEfficiency();

        const todayBookings = bookings.filter(b => b.date === today);

        // Group by hour
        const hourlyData = {};
        for (let h = 6; h < 19; h++) {
            hourlyData[h] = { count: 0, players: [] };
        }

        todayBookings.forEach(b => {
            const hour = parseInt(b.time.split(':')[0]);
            if (hourlyData[hour]) {
                hourlyData[hour].count++;
                hourlyData[hour].players.push(b.playerName || 'Walk-in');
            }
        });

        const maxSlots = 72;
        const utilizationPct = financial.utilization;

        this.showModal('Course Utilization - Hour by Hour', `
            <div class="space-y-4">
                <div class="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                    <div class="text-sm font-semibold text-indigo-900 mb-1">Overall Course Utilization</div>
                    <div class="text-3xl font-bold text-indigo-600">${Math.round(utilizationPct)}%</div>
                    <div class="text-xs text-indigo-700 mt-1">${todayBookings.length} of ${maxSlots} available slots</div>
                </div>

                <div class="grid grid-cols-3 gap-3">
                    <div class="bg-red-50 rounded p-3">
                        <div class="text-xs text-red-700 mb-1">Peak Hours (8AM-2PM)</div>
                        <div class="text-lg font-bold text-red-600">${Math.round(operational.peakUtilization)}%</div>
                        <div class="w-full bg-red-200 rounded-full h-2 mt-2">
                            <div class="bg-red-600 h-2 rounded-full" style="width: ${operational.peakUtilization}%"></div>
                        </div>
                    </div>
                    <div class="bg-yellow-50 rounded p-3">
                        <div class="text-xs text-yellow-700 mb-1">Midday (2PM-5PM)</div>
                        <div class="text-lg font-bold text-yellow-600">${Math.round(operational.midUtilization)}%</div>
                        <div class="w-full bg-yellow-200 rounded-full h-2 mt-2">
                            <div class="bg-yellow-600 h-2 rounded-full" style="width: ${operational.midUtilization}%"></div>
                        </div>
                    </div>
                    <div class="bg-green-50 rounded p-3">
                        <div class="text-xs text-green-700 mb-1">Evening (5PM-7PM)</div>
                        <div class="text-lg font-bold text-green-600">${Math.round(operational.eveningUtilization)}%</div>
                        <div class="w-full bg-green-200 rounded-full h-2 mt-2">
                            <div class="bg-green-600 h-2 rounded-full" style="width: ${operational.eveningUtilization}%"></div>
                        </div>
                    </div>
                </div>

                <div class="bg-white border rounded-lg overflow-hidden">
                    <div class="bg-gray-50 px-4 py-2 border-b">
                        <h4 class="font-semibold text-sm">Hourly Breakdown</h4>
                    </div>
                    <div class="overflow-auto max-h-96">
                        <table class="w-full text-sm">
                            <thead class="bg-gray-100 sticky top-0">
                                <tr>
                                    <th class="px-3 py-2 text-left text-xs font-semibold text-gray-700">Hour</th>
                                    <th class="px-3 py-2 text-center text-xs font-semibold text-gray-700">Bookings</th>
                                    <th class="px-3 py-2 text-left text-xs font-semibold text-gray-700">Players</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${Object.keys(hourlyData).map(hour => `
                                    <tr class="border-b hover:bg-gray-50">
                                        <td class="px-3 py-2 text-gray-900 font-medium">
                                            ${hour}:00 - ${parseInt(hour) + 1}:00
                                        </td>
                                        <td class="px-3 py-2 text-center">
                                            <span class="inline-block px-2 py-1 rounded text-xs font-semibold
                                                ${hourlyData[hour].count > 5 ? 'bg-red-100 text-red-800' : ''}
                                                ${hourlyData[hour].count >= 3 && hourlyData[hour].count <= 5 ? 'bg-yellow-100 text-yellow-800' : ''}
                                                ${hourlyData[hour].count < 3 ? 'bg-green-100 text-green-800' : ''}
                                            ">${hourlyData[hour].count}</span>
                                        </td>
                                        <td class="px-3 py-2 text-xs text-gray-600">
                                            ${hourlyData[hour].players.slice(0, 3).join(', ')}
                                            ${hourlyData[hour].players.length > 3 ? `... +${hourlyData[hour].players.length - 3} more` : ''}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `);
    },

    // Make metrics clickable
    attachDrillDownHandlers() {
        // Revenue Now
        const revenueNow = document.getElementById('analytics-revenue-now');
        if (revenueNow && !revenueNow.onclick) {
            revenueNow.parentElement.style.cursor = 'pointer';
            revenueNow.parentElement.onclick = () => this.showRevenueNowDrillDown();
        }

        // Forecast
        const forecast = document.getElementById('analytics-forecast');
        if (forecast && !forecast.onclick) {
            forecast.parentElement.style.cursor = 'pointer';
            forecast.parentElement.onclick = () => this.showForecastDrillDown();
        }
    },

    exportToPDF(title) {
        const modal = document.getElementById('analytics-modal');
        if (!modal) return;

        const content = modal.querySelector('.p-6').innerHTML;
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>${title}</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; }
                        h1 { color: #059669; }
                        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background-color: #f3f4f6; }
                        .bg-green-50 { background: #f0fdf4; padding: 15px; margin: 10px 0; border-radius: 8px; }
                        .bg-blue-50 { background: #eff6ff; padding: 15px; margin: 10px 0; border-radius: 8px; }
                        .bg-orange-50 { background: #fff7ed; padding: 15px; margin: 10px 0; border-radius: 8px; }
                        .bg-purple-50 { background: #faf5ff; padding: 15px; margin: 10px 0; border-radius: 8px; }
                    </style>
                </head>
                <body>
                    <h1>${title}</h1>
                    <p>${new Date().toLocaleDateString()}</p>
                    ${content}
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    },

    shareViaEmail(title) {
        const modal = document.getElementById('analytics-modal');
        if (!modal) return;

        const contentDiv = modal.querySelector('.p-6');
        const textContent = contentDiv.innerText;

        const subject = encodeURIComponent(`${title} - ${new Date().toLocaleDateString()}`);
        const body = encodeURIComponent(`${title}\n${'='.repeat(60)}\n\n${textContent}\n\n${'='.repeat(60)}\nGenerated by MciPro Golf Management Platform\nhttps://mcipro-golf-platform.netlify.app`);
        const mailtoLink = `mailto:?subject=${subject}&body=${body}`;

        window.location.href = mailtoLink;
    }
};

// Initialize when analytics tab is shown
document.addEventListener('DOMContentLoaded', function() {
    const analyticsTab = document.getElementById('manager-analytics-tab');
    if (analyticsTab) {
        analyticsTab.addEventListener('click', function() {
            setTimeout(() => {
                AnalyticsDrillDown.attachDrillDownHandlers();
            }, 200);
        });
    }
});

// Export for global access
window.AnalyticsDrillDown = AnalyticsDrillDown;
