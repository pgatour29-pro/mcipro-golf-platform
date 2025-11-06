// =====================================================
// PAYMENT SYSTEM INTEGRATION
// =====================================================
// Integration layer connecting payment system with existing components

/**
 * Extend SocietyOrganizerManager to include payment tracking
 */
if (window.SocietyOrganizerSystem) {
    // Add payment tracking method
    SocietyOrganizerSystem.openPaymentTracking = function(eventId) {
        PaymentTrackingSystem.openPaymentTracking(eventId);
    };

    // Add payment where breakdown method
    SocietyOrganizerSystem.showPaymentBreakdown = function(eventId) {
        PaymentTrackingSystem.currentEvent = this.events.find(e => e.id === eventId);
        if (PaymentTrackingSystem.currentEvent) {
            PaymentTrackingSystem.showPaymentBreakdown();
        }
    };

    // Override renderConfirmedPlayers to include payment badges
    const originalRenderConfirmed = SocietyOrganizerSystem.renderConfirmedPlayers;
    SocietyOrganizerSystem.renderConfirmedPlayers = async function(registrations) {
        const tbody = document.getElementById('confirmedPlayersTable');
        if (!registrations || registrations.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-gray-500">No registrations yet</td></tr>';
            return;
        }

        // Load payment data for these registrations
        let payments = {};
        try {
            if (this.currentRosterEvent) {
                const paymentData = await PaymentTrackingDB.getEventPayments(this.currentRosterEvent.id);
                paymentData.forEach(p => {
                    payments[p.registration_id] = p;
                });
            }
        } catch (error) {
            console.error('[Integration] Error loading payments:', error);
        }

        tbody.innerHTML = registrations.map(reg => {
            const payment = payments[reg.id];
            const paymentBadge = payment && payment.payment_status === 'paid'
                ? '<span class="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-semibold"><span class="material-symbols-outlined" style="font-size: 14px;">check_circle</span>Paid in Full</span>'
                : payment && payment.payment_status === 'partial'
                ? '<span class="inline-flex items-center gap-1 bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs font-semibold"><span class="material-symbols-outlined" style="font-size: 14px;">pending</span>Partial</span>'
                : '<span class="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-semibold"><span class="material-symbols-outlined" style="font-size: 14px;">cancel</span>Unpaid</span>';

            return `
                <tr class="border-t hover:bg-gray-50">
                    <td class="px-4 py-2">
                        <div class="font-medium">${reg.playerName}</div>
                        <div class="text-xs text-gray-500 mt-1">${paymentBadge}</div>
                    </td>
                    <td class="px-4 py-2">${Math.round(reg.handicap)}</td>
                    <td class="px-4 py-2 text-center">${reg.wantTransport ? '✓' : '-'}</td>
                    <td class="px-4 py-2 text-center">${reg.wantCompetition ? '✓' : '-'}</td>
                    <td class="px-4 py-2 text-center">${(reg.partnerPrefs || []).length}</td>
                    <td class="px-4 py-2 text-center">
                        ${payment ? `฿${payment.total_amount.toLocaleString()}` : '-'}
                    </td>
                    <td class="px-4 py-2 text-center">
                        <button onclick="SocietyOrganizerSystem.removeRegistration('${reg.id}')" class="text-xs text-red-600 hover:underline">
                            Remove
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    };

    // Update event card to include payment tracking button
    const originalRenderEventCard = SocietyOrganizerSystem.renderEventCard;
    SocietyOrganizerSystem.renderEventCard = function(event) {
        const originalHtml = originalRenderEventCard.call(this, event);

        // Insert payment button before the copy link button
        const modifiedHtml = originalHtml.replace(
            '<!-- Copy Registration Link -->',
            `
            <!-- Payment Tracking Button -->
            <button onclick="SocietyOrganizerSystem.openPaymentTracking('${event.id}')" class="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white rounded-lg text-xs py-2.5 font-medium flex items-center justify-center gap-1 mt-2 shadow-md">
                <span class="material-symbols-outlined text-sm">payments</span>
                Payment Tracking
            </button>

            <!-- Payment Breakdown Button -->
            <button onclick="SocietyOrganizerSystem.showPaymentBreakdown('${event.id}')" class="w-full btn-secondary text-xs py-2 mt-2">
                <span class="material-symbols-outlined text-sm">analytics</span>
                Payment Breakdown
            </button>

            <!-- Copy Registration Link -->`
        );

        return modifiedHtml;
    };
}

/**
 * Extend SocietyGolfDB to automatically create payment records
 */
if (window.SocietyGolfDB) {
    const originalRegister = SocietyGolfDB.register;

    SocietyGolfDB.register = async function(eventId, registrationData) {
        // Call original register method
        const result = await originalRegister.call(this, eventId, registrationData);

        // If registration successful and payment preferences exist, update them
        if (result && window.golferPaymentState?.preferences) {
            try {
                // Get the payment record (created by trigger)
                await new Promise(resolve => setTimeout(resolve, 500)); // Wait for trigger

                const { data: payments, error } = await supabase
                    .from('event_payments')
                    .select('id')
                    .eq('registration_id', result.id)
                    .single();

                if (payments && !error) {
                    // Update payment preferences
                    await PaymentTrackingDB.updatePaymentPreferences(
                        payments.id,
                        window.golferPaymentState.preferences
                    );
                }
            } catch (error) {
                console.error('[Integration] Error updating payment preferences:', error);
                // Don't fail registration if payment preference update fails
            }
        }

        return result;
    };
}

/**
 * Initialize golfer payment state when viewing event
 */
function initializeGolferPaymentForEvent(eventData, wantTransport, wantCompetition) {
    window.golferPaymentState = {
        eventId: eventData.id,
        eventData: eventData,
        wantTransport: wantTransport,
        wantCompetition: wantCompetition,
        preferences: null
    };
}

/**
 * Add payment summary to event registration page
 */
function addPaymentSummaryToRegistration() {
    // Find the registration form
    const registrationForm = document.getElementById('eventRegistrationForm');
    if (!registrationForm) return;

    // Add payment info card before submit button
    const submitButton = registrationForm.querySelector('button[type="submit"]');
    if (submitButton) {
        const quickInfoCard = document.getElementById('quickPaymentInfo');
        if (quickInfoCard) {
            submitButton.parentNode.insertBefore(quickInfoCard, submitButton);
        }
    }
}

/**
 * Show payment reminder after registration
 */
function showPaymentReminderAfterRegistration(registrationId, totalAmount, eventName) {
    const modal = `
        <div id="paymentReminderModal" class="modal-backdrop" style="display: flex;">
            <div class="modal-container max-w-md">
                <div class="modal-header bg-gradient-to-r from-green-600 to-green-400 text-white">
                    <div class="text-center w-full">
                        <span class="material-symbols-outlined text-5xl mb-2">check_circle</span>
                        <h2 class="text-xl font-bold">Registration Successful!</h2>
                    </div>
                </div>

                <div class="modal-body text-center">
                    <p class="text-gray-700 mb-4">You've successfully registered for:</p>
                    <h3 class="text-xl font-bold text-gray-900 mb-4">${eventName}</h3>

                    <div class="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 border-2 border-amber-300 mb-4">
                        <div class="text-sm text-gray-700 mb-2">Amount Due:</div>
                        <div class="text-4xl font-bold text-amber-600">฿${totalAmount.toLocaleString()}</div>
                    </div>

                    <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                        <p class="text-sm text-blue-900">
                            <strong>Remember:</strong> Pay according to your selected payment preferences.
                            The organizer will check off your payment when received.
                        </p>
                    </div>

                    <button onclick="closePaymentReminder()" class="btn-primary w-full">
                        Got It!
                    </button>
                </div>
            </div>
        </div>
    `;

    // Remove existing reminder if any
    const existing = document.getElementById('paymentReminderModal');
    if (existing) existing.remove();

    // Add new reminder
    document.body.insertAdjacentHTML('beforeend', modal);
}

function closePaymentReminder() {
    const modal = document.getElementById('paymentReminderModal');
    if (modal) modal.remove();
}

/**
 * Export payment report for accountant
 */
async function exportFullPaymentReport(eventId) {
    try {
        const event = SocietyOrganizerSystem.events.find(e => e.id === eventId);
        if (!event) return;

        const [payments, summary, breakdown] = await Promise.all([
            PaymentTrackingDB.getEventPayments(eventId),
            PaymentTrackingDB.getEventPaymentSummary(eventId),
            PaymentTrackingDB.getPaymentBreakdownByLocation(eventId)
        ]);

        // Generate comprehensive CSV
        const csv = [];

        // Header
        csv.push(['Payment Report']);
        csv.push(['Event', event.name]);
        csv.push(['Date', event.date]);
        csv.push(['']);

        // Summary
        csv.push(['Summary']);
        csv.push(['Total Expected', `฿${summary.total_expected}`]);
        csv.push(['Total Collected', `฿${summary.total_collected}`]);
        csv.push(['Outstanding', `฿${summary.outstanding_balance}`]);
        csv.push(['Payment Rate', `${Math.round(summary.payment_percentage)}%`]);
        csv.push(['']);

        // By Location
        csv.push(['Payment Breakdown by Location']);
        csv.push(['Location', 'Amount', 'Players']);
        Object.entries(breakdown).forEach(([location, data]) => {
            const labels = {
                bar: 'Society Bar',
                course: 'Golf Course',
                online: 'Online',
                organizer: 'Organizer'
            };
            csv.push([labels[location], `฿${data.amount}`, data.count]);
        });
        csv.push(['']);

        // Detailed player list
        csv.push(['Detailed Payment List']);
        csv.push(['Player', 'Total', 'Green', 'Cart', 'Caddy', 'Transport', 'Competition', 'Status', 'Paid At']);
        payments.forEach(p => {
            csv.push([
                p.player_name,
                `฿${p.total_amount}`,
                p.green_fee_paid ? `PAID (฿${p.green_fee_amount})` : `UNPAID (฿${p.green_fee_amount})`,
                p.cart_fee_paid ? `PAID (฿${p.cart_fee_amount})` : `UNPAID (฿${p.cart_fee_amount})`,
                p.caddy_fee_paid ? `PAID (฿${p.caddy_fee_amount})` : `UNPAID (฿${p.caddy_fee_amount})`,
                p.transport_fee_amount > 0
                    ? (p.transport_fee_paid ? `PAID (฿${p.transport_fee_amount})` : `UNPAID (฿${p.transport_fee_amount})`)
                    : 'N/A',
                p.competition_fee_amount > 0
                    ? (p.competition_fee_paid ? `PAID (฿${p.competition_fee_amount})` : `UNPAID (฿${p.competition_fee_amount})`)
                    : 'N/A',
                p.payment_status.toUpperCase(),
                p.paid_at ? new Date(p.paid_at).toLocaleString() : '-'
            ]);
        });

        // Download CSV
        const csvContent = csv.map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${event.name}_payment_report_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);

        NotificationManager.show('Payment report exported', 'success');
    } catch (error) {
        console.error('[Integration] Error exporting report:', error);
        NotificationManager.show('Failed to export report', 'error');
    }
}

/**
 * Quick payment status check for mobile
 */
async function quickPaymentStatus(eventId, playerId) {
    try {
        const payments = await PaymentTrackingDB.getEventPayments(eventId);
        const payment = payments.find(p => p.player_id === playerId);

        if (!payment) {
            return {
                status: 'no_payment',
                message: 'No payment record found'
            };
        }

        return {
            status: payment.payment_status,
            total: payment.total_amount,
            paid: payment.payment_status === 'paid',
            details: {
                green: payment.green_fee_paid,
                cart: payment.cart_fee_paid,
                caddy: payment.caddy_fee_paid,
                transport: payment.transport_fee_paid,
                competition: payment.competition_fee_paid
            }
        };
    } catch (error) {
        console.error('[Integration] Error checking payment status:', error);
        return {
            status: 'error',
            message: 'Failed to check payment status'
        };
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('[PaymentIntegration] Payment tracking system initialized');

    // Add payment summary to registration if form exists
    if (document.getElementById('eventRegistrationForm')) {
        addPaymentSummaryToRegistration();
    }
});
