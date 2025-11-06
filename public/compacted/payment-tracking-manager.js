// =====================================================
// PAYMENT TRACKING MANAGER
// =====================================================
// UI management for organizer payment tracking

class PaymentTrackingManager {
    constructor() {
        this.currentEvent = null;
        this.currentPayments = [];
        this.currentFilter = 'all';
        this.currentPayment = null;
        this.summary = null;
    }

    /**
     * Open payment tracking modal for an event
     */
    async openPaymentTracking(eventId) {
        this.currentEvent = SocietyOrganizerSystem.events.find(e => e.id === eventId);
        if (!this.currentEvent) return;

        // Show modal
        document.getElementById('paymentTrackingModal').style.display = 'flex';

        // Set event details
        document.getElementById('paymentEventName').textContent = this.currentEvent.name;
        document.getElementById('paymentEventDate').textContent = this.currentEvent.date;

        // Load payment data
        await this.loadPaymentData();

        // Subscribe to realtime updates
        PaymentTrackingDB.subscribeToPayments(eventId, () => {
            this.loadPaymentData();
        });
    }

    /**
     * Load all payment data for current event
     */
    async loadPaymentData() {
        try {
            // Load payments and summary in parallel
            const [payments, summary] = await Promise.all([
                PaymentTrackingDB.getEventPayments(this.currentEvent.id),
                PaymentTrackingDB.getEventPaymentSummary(this.currentEvent.id)
            ]);

            this.currentPayments = payments;
            this.summary = summary;

            // Update UI
            this.updateSummaryDisplay();
            this.updateFilterCounts();
            this.renderPaymentTable();
        } catch (error) {
            console.error('[PaymentTracking] Error loading data:', error);
            NotificationManager.show('Failed to load payment data', 'error');
        }
    }

    /**
     * Update summary display
     */
    updateSummaryDisplay() {
        if (!this.summary) return;

        document.getElementById('totalExpected').textContent = `฿${this.summary.total_expected?.toLocaleString() || 0}`;
        document.getElementById('totalCollected').textContent = `฿${this.summary.total_collected?.toLocaleString() || 0}`;
        document.getElementById('outstandingBalance').textContent = `฿${this.summary.outstanding_balance?.toLocaleString() || 0}`;
        document.getElementById('paymentPercentage').textContent = `${Math.round(this.summary.payment_percentage || 0)}%`;
    }

    /**
     * Update filter tab counts
     */
    updateFilterCounts() {
        const counts = {
            all: this.currentPayments.length,
            unpaid: this.currentPayments.filter(p => p.payment_status === 'unpaid').length,
            partial: this.currentPayments.filter(p => p.payment_status === 'partial').length,
            paid: this.currentPayments.filter(p => p.payment_status === 'paid').length
        };

        document.getElementById('countAll').textContent = counts.all;
        document.getElementById('countUnpaid').textContent = counts.unpaid;
        document.getElementById('countPartial').textContent = counts.partial;
        document.getElementById('countPaid').textContent = counts.paid;
    }

    /**
     * Render payment table
     */
    renderPaymentTable() {
        const tbody = document.getElementById('paymentChecklistTable');
        const emptyState = document.getElementById('paymentEmptyState');

        // Filter payments
        let filtered = this.currentPayments;
        if (this.currentFilter !== 'all') {
            filtered = this.currentPayments.filter(p => p.payment_status === this.currentFilter);
        }

        if (filtered.length === 0) {
            tbody.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';

        tbody.innerHTML = filtered.map(payment => {
            const handicap = payment.registration?.[0]?.handicap || '-';

            return `
                <tr class="border-t hover:bg-gray-50" data-payment-id="${payment.id}">
                    <td class="px-3 py-2">
                        <div class="font-medium text-gray-900">${payment.player_name}</div>
                        ${payment.payment_status === 'paid' ? '<div class="text-xs text-green-600">Paid in Full</div>' : ''}
                    </td>
                    <td class="px-3 py-2 text-center text-sm">${Math.round(handicap)}</td>
                    <td class="px-3 py-2 text-right text-sm">
                        ${this.renderFeeCell(payment, 'green_fee', payment.green_fee_amount)}
                    </td>
                    <td class="px-3 py-2 text-right text-sm">
                        ${this.renderFeeCell(payment, 'cart_fee', payment.cart_fee_amount)}
                    </td>
                    <td class="px-3 py-2 text-right text-sm">
                        ${this.renderFeeCell(payment, 'caddy_fee', payment.caddy_fee_amount)}
                    </td>
                    <td class="px-3 py-2 text-right text-sm">
                        ${payment.transport_fee_amount > 0
                            ? this.renderFeeCell(payment, 'transport_fee', payment.transport_fee_amount)
                            : '<span class="text-gray-400">-</span>'
                        }
                    </td>
                    <td class="px-3 py-2 text-right text-sm">
                        ${payment.competition_fee_amount > 0
                            ? this.renderFeeCell(payment, 'competition_fee', payment.competition_fee_amount)
                            : '<span class="text-gray-400">-</span>'
                        }
                    </td>
                    <td class="px-3 py-2 text-right font-bold">
                        ฿${payment.total_amount.toLocaleString()}
                    </td>
                    <td class="px-3 py-2 text-center">
                        ${this.renderStatusBadge(payment.payment_status)}
                    </td>
                    <td class="px-3 py-2 text-center">
                        <button onclick="PaymentTrackingSystem.openPaymentDetail('${payment.id}')"
                                class="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-lg hover:bg-green-200 font-medium">
                            ${payment.payment_status === 'paid' ? 'View' : 'Mark Paid'}
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    /**
     * Render individual fee cell with checkbox
     */
    renderFeeCell(payment, feeType, amount) {
        const isPaid = payment[`${feeType}_paid`];

        if (amount === 0) {
            return '<span class="text-gray-400">-</span>';
        }

        return `
            <div class="flex items-center justify-end gap-2">
                <input type="checkbox"
                       class="fee-checkbox"
                       ${isPaid ? 'checked' : ''}
                       onchange="PaymentTrackingSystem.toggleFee('${payment.id}', '${feeType}', this.checked)"
                       ${payment.payment_status === 'paid' ? 'disabled' : ''}>
                <span class="${isPaid ? 'text-green-600 font-medium' : 'text-gray-900'}">
                    ฿${amount.toLocaleString()}
                </span>
            </div>
        `;
    }

    /**
     * Render status badge
     */
    renderStatusBadge(status) {
        const badges = {
            paid: '<span class="payment-status-badge payment-status-paid">Paid</span>',
            unpaid: '<span class="payment-status-badge payment-status-unpaid">Unpaid</span>',
            partial: '<span class="payment-status-badge payment-status-partial">Partial</span>'
        };
        return badges[status] || badges.unpaid;
    }

    /**
     * Filter payments by status
     */
    filterPayments(filter) {
        this.currentFilter = filter;

        // Update button states
        document.querySelectorAll('.payment-filter-btn').forEach(btn => {
            btn.classList.remove('active', 'border-b-2', 'border-green-600', 'text-green-600');
            btn.classList.add('text-gray-600');
        });

        const activeBtn = document.getElementById(`filter${filter.charAt(0).toUpperCase() + filter.slice(1)}`);
        activeBtn.classList.add('active', 'border-b-2', 'border-green-600', 'text-green-600');
        activeBtn.classList.remove('text-gray-600');

        // Re-render table
        this.renderPaymentTable();
    }

    /**
     * Toggle individual fee paid status
     */
    async toggleFee(paymentId, feeType, isPaid) {
        try {
            const organizerId = AppState.currentUser?.lineUserId;

            if (isPaid) {
                await PaymentTrackingDB.markFeePaid(paymentId, feeType, organizerId);
            } else {
                await PaymentTrackingDB.markFeeUnpaid(paymentId, feeType);
            }

            NotificationManager.show('Payment updated', 'success');
            await this.loadPaymentData();
        } catch (error) {
            console.error('[PaymentTracking] Error toggling fee:', error);
            NotificationManager.show('Failed to update payment', 'error');
        }
    }

    /**
     * Open payment detail modal
     */
    async openPaymentDetail(paymentId) {
        const payment = this.currentPayments.find(p => p.id === paymentId);
        if (!payment) return;

        this.currentPayment = payment;

        // Set header
        document.getElementById('detailPlayerName').textContent = payment.player_name;
        document.getElementById('detailTotalAmount').textContent = `Total: ฿${payment.total_amount.toLocaleString()}`;

        // Render fee breakdown
        this.renderFeeBreakdown(payment);

        // Show modal
        document.getElementById('paymentDetailModal').style.display = 'flex';
    }

    /**
     * Render fee breakdown in detail modal
     */
    renderFeeBreakdown(payment) {
        const container = document.getElementById('feeBreakdownContainer');

        const fees = [
            { type: 'green_fee', label: 'Green Fee', amount: payment.green_fee_amount, paid: payment.green_fee_paid, where: payment.pay_green_at },
            { type: 'cart_fee', label: 'Cart Fee', amount: payment.cart_fee_amount, paid: payment.cart_fee_paid, where: payment.pay_cart_at },
            { type: 'caddy_fee', label: 'Caddy Fee', amount: payment.caddy_fee_amount, paid: payment.caddy_fee_paid, where: payment.pay_caddy_at },
            { type: 'transport_fee', label: 'Transport Fee', amount: payment.transport_fee_amount, paid: payment.transport_fee_paid, where: payment.pay_transport_at },
            { type: 'competition_fee', label: 'Competition Fee', amount: payment.competition_fee_amount, paid: payment.competition_fee_paid, where: payment.pay_competition_at }
        ];

        container.innerHTML = fees
            .filter(fee => fee.amount > 0)
            .map(fee => {
                const whereLabel = {
                    bar: 'Society Bar',
                    course: 'Golf Course',
                    online: 'Online',
                    organizer: 'Organizer'
                }[fee.where] || 'Not Set';

                return `
                    <div class="fee-item ${fee.paid ? 'paid' : ''}">
                        <div class="flex items-center gap-3">
                            <input type="checkbox"
                                   class="fee-checkbox"
                                   ${fee.paid ? 'checked' : ''}
                                   onchange="PaymentTrackingSystem.toggleDetailFee('${fee.type}', this.checked)">
                            <div>
                                <div class="font-medium text-gray-900">${fee.label}</div>
                                <div class="text-xs text-gray-500">Pay at: ${whereLabel}</div>
                            </div>
                        </div>
                        <div class="text-lg font-bold ${fee.paid ? 'text-green-600' : 'text-gray-900'}">
                            ฿${fee.amount.toLocaleString()}
                        </div>
                    </div>
                `;
            }).join('');
    }

    /**
     * Toggle fee in detail modal
     */
    async toggleDetailFee(feeType, isPaid) {
        try {
            const organizerId = AppState.currentUser?.lineUserId;

            if (isPaid) {
                await PaymentTrackingDB.markFeePaid(this.currentPayment.id, feeType, organizerId);
            } else {
                await PaymentTrackingDB.markFeeUnpaid(this.currentPayment.id, feeType);
            }

            // Reload payment data
            await this.loadPaymentData();

            // Update current payment
            this.currentPayment = this.currentPayments.find(p => p.id === this.currentPayment.id);

            // Re-render breakdown
            this.renderFeeBreakdown(this.currentPayment);

            NotificationManager.show('Payment updated', 'success');
        } catch (error) {
            console.error('[PaymentTracking] Error toggling fee:', error);
            NotificationManager.show('Failed to update payment', 'error');
        }
    }

    /**
     * Mark all fees as paid for current payment
     */
    async markAllPaid() {
        try {
            const organizerId = AppState.currentUser?.lineUserId;
            const method = document.getElementById('paymentMethod').value;
            const notes = document.getElementById('paymentNotes').value.trim();

            await PaymentTrackingDB.markPaymentFullyPaid(
                this.currentPayment.id,
                organizerId,
                method,
                notes || null
            );

            NotificationManager.show('Payment marked as paid in full', 'success');

            // Close detail modal
            this.closePaymentDetail();

            // Reload data
            await this.loadPaymentData();
        } catch (error) {
            console.error('[PaymentTracking] Error marking all paid:', error);
            NotificationManager.show('Failed to mark payment', 'error');
        }
    }

    /**
     * Show payment breakdown by location
     */
    async showPaymentBreakdown() {
        try {
            const breakdown = await PaymentTrackingDB.getPaymentBreakdownByLocation(this.currentEvent.id);

            // Update displays
            ['bar', 'course', 'online', 'organizer'].forEach(location => {
                document.getElementById(`${location}Amount`).textContent = `฿${breakdown[location].amount.toLocaleString()}`;
                document.getElementById(`${location}Count`).textContent = `${breakdown[location].count} players`;

                // Show fee breakdown
                const feesContainer = document.getElementById(`${location}Fees`);
                if (breakdown[location].fees.length > 0) {
                    const summary = {};
                    breakdown[location].fees.forEach(fee => {
                        if (!summary[fee.type]) summary[fee.type] = 0;
                        summary[fee.type] += fee.amount;
                    });

                    feesContainer.innerHTML = Object.entries(summary)
                        .map(([type, amount]) => `<div>${type}: ฿${amount.toLocaleString()}</div>`)
                        .join('');
                } else {
                    feesContainer.innerHTML = '<div class="text-gray-400">No fees</div>';
                }
            });

            // Show modal
            document.getElementById('paymentWhereModal').style.display = 'flex';
        } catch (error) {
            console.error('[PaymentTracking] Error showing breakdown:', error);
            NotificationManager.show('Failed to load breakdown', 'error');
        }
    }

    /**
     * Export payment checklist to CSV
     */
    async exportPaymentChecklist() {
        try {
            const rows = await PaymentTrackingDB.exportPaymentChecklist(this.currentEvent.id);

            const csv = rows.map(row => row.join(',')).join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${this.currentEvent.name}_payment_checklist.csv`;
            a.click();
            window.URL.revokeObjectURL(url);

            NotificationManager.show('Payment checklist exported', 'success');
        } catch (error) {
            console.error('[PaymentTracking] Error exporting:', error);
            NotificationManager.show('Failed to export checklist', 'error');
        }
    }

    /**
     * Refresh payment data
     */
    async refreshPaymentData() {
        NotificationManager.show('Refreshing payment data...', 'info');
        await this.loadPaymentData();
        NotificationManager.show('Payment data refreshed', 'success');
    }

    /**
     * Close payment tracking modal
     */
    closePaymentTracking() {
        document.getElementById('paymentTrackingModal').style.display = 'none';
        PaymentTrackingDB.unsubscribeAll();
        this.currentEvent = null;
        this.currentPayments = [];
    }

    /**
     * Close payment detail modal
     */
    closePaymentDetail() {
        document.getElementById('paymentDetailModal').style.display = 'none';
        this.currentPayment = null;
    }

    /**
     * Close payment where modal
     */
    closePaymentWhere() {
        document.getElementById('paymentWhereModal').style.display = 'none';
    }
}

// Initialize global instance
window.PaymentTrackingSystem = new PaymentTrackingManager();

// Global helper functions
function closePaymentTracking() {
    PaymentTrackingSystem.closePaymentTracking();
}

function filterPayments(filter) {
    PaymentTrackingSystem.filterPayments(filter);
}

function closePaymentDetail() {
    PaymentTrackingSystem.closePaymentDetail();
}

function markAllPaid() {
    PaymentTrackingSystem.markAllPaid();
}

function exportPaymentChecklist() {
    PaymentTrackingSystem.exportPaymentChecklist();
}

function refreshPaymentData() {
    PaymentTrackingSystem.refreshPaymentData();
}

function closePaymentWhere() {
    PaymentTrackingSystem.closePaymentWhere();
}
