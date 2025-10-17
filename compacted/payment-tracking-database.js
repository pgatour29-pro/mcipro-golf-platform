// =====================================================
// PAYMENT TRACKING DATABASE LAYER
// =====================================================
// Supabase integration for event payment tracking

class PaymentTrackingDB {
    constructor() {
        this.subscriptions = [];
    }

    // =====================================================
    // PAYMENT RECORDS
    // =====================================================

    /**
     * Get all payment records for an event
     */
    async getEventPayments(eventId) {
        try {
            const { data, error } = await supabase
                .from('event_payments')
                .select(`
                    *,
                    registration:event_registrations(
                        handicap,
                        want_transport,
                        want_competition
                    )
                `)
                .eq('event_id', eventId)
                .order('player_name', { ascending: true });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('[PaymentDB] Error getting payments:', error);
            throw error;
        }
    }

    /**
     * Get payment record for a specific registration
     */
    async getPaymentByRegistration(registrationId) {
        try {
            const { data, error } = await supabase
                .from('event_payments')
                .select('*')
                .eq('registration_id', registrationId)
                .single();

            if (error && error.code !== 'PGRST116') throw error; // Ignore not found
            return data || null;
        } catch (error) {
            console.error('[PaymentDB] Error getting payment:', error);
            throw error;
        }
    }

    /**
     * Update golfer payment preferences
     */
    async updatePaymentPreferences(paymentId, preferences) {
        try {
            const { data, error } = await supabase
                .from('event_payments')
                .update({
                    pay_green_at: preferences.payGreenAt,
                    pay_cart_at: preferences.payCartAt,
                    pay_caddy_at: preferences.payCaddyAt,
                    pay_transport_at: preferences.payTransportAt,
                    pay_competition_at: preferences.payCompetitionAt,
                    updated_at: new Date().toISOString()
                })
                .eq('id', paymentId)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('[PaymentDB] Error updating preferences:', error);
            throw error;
        }
    }

    /**
     * Mark individual fee components as paid
     */
    async markFeePaid(paymentId, feeType, markedBy, method = 'cash', notes = null) {
        try {
            const updates = {
                [`${feeType}_paid`]: true,
                marked_paid_by: markedBy,
                payment_method: method,
                updated_at: new Date().toISOString()
            };

            if (notes) {
                updates.payment_notes = notes;
            }

            const { data, error } = await supabase
                .from('event_payments')
                .update(updates)
                .eq('id', paymentId)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('[PaymentDB] Error marking fee paid:', error);
            throw error;
        }
    }

    /**
     * Mark individual fee components as unpaid
     */
    async markFeeUnpaid(paymentId, feeType) {
        try {
            const updates = {
                [`${feeType}_paid`]: false,
                updated_at: new Date().toISOString()
            };

            const { data, error } = await supabase
                .from('event_payments')
                .update(updates)
                .eq('id', paymentId)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('[PaymentDB] Error marking fee unpaid:', error);
            throw error;
        }
    }

    /**
     * Mark entire payment as paid (all components)
     */
    async markPaymentFullyPaid(paymentId, markedBy, method = 'cash', notes = null) {
        try {
            // Use the stored procedure for atomic operation
            const { data, error } = await supabase
                .rpc('mark_payment_paid', {
                    p_payment_id: paymentId,
                    p_marked_by: markedBy,
                    p_method: method,
                    p_notes: notes
                });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('[PaymentDB] Error marking payment fully paid:', error);
            throw error;
        }
    }

    /**
     * Get payment summary for an event
     */
    async getEventPaymentSummary(eventId) {
        try {
            const { data, error } = await supabase
                .rpc('get_event_payment_summary', {
                    p_event_id: eventId
                });

            if (error) throw error;
            return data || {
                total_registrations: 0,
                paid_count: 0,
                unpaid_count: 0,
                partial_count: 0,
                total_expected: 0,
                total_collected: 0,
                outstanding_balance: 0,
                payment_percentage: 0
            };
        } catch (error) {
            console.error('[PaymentDB] Error getting payment summary:', error);
            throw error;
        }
    }

    /**
     * Get payments by status
     */
    async getPaymentsByStatus(eventId, status) {
        try {
            const { data, error } = await supabase
                .from('event_payments')
                .select('*')
                .eq('event_id', eventId)
                .eq('payment_status', status)
                .order('player_name', { ascending: true });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('[PaymentDB] Error getting payments by status:', error);
            throw error;
        }
    }

    /**
     * Get payment breakdown by location (bar, course, etc.)
     */
    async getPaymentBreakdownByLocation(eventId) {
        try {
            const payments = await this.getEventPayments(eventId);

            const breakdown = {
                bar: { count: 0, amount: 0, fees: [] },
                course: { count: 0, amount: 0, fees: [] },
                online: { count: 0, amount: 0, fees: [] },
                organizer: { count: 0, amount: 0, fees: [] }
            };

            payments.forEach(payment => {
                // Green fee
                if (payment.pay_green_at && payment.green_fee_amount > 0) {
                    breakdown[payment.pay_green_at].amount += payment.green_fee_amount;
                    breakdown[payment.pay_green_at].fees.push({
                        type: 'green',
                        player: payment.player_name,
                        amount: payment.green_fee_amount
                    });
                }

                // Cart fee
                if (payment.pay_cart_at && payment.cart_fee_amount > 0) {
                    breakdown[payment.pay_cart_at].amount += payment.cart_fee_amount;
                    breakdown[payment.pay_cart_at].fees.push({
                        type: 'cart',
                        player: payment.player_name,
                        amount: payment.cart_fee_amount
                    });
                }

                // Caddy fee
                if (payment.pay_caddy_at && payment.caddy_fee_amount > 0) {
                    breakdown[payment.pay_caddy_at].amount += payment.caddy_fee_amount;
                    breakdown[payment.pay_caddy_at].fees.push({
                        type: 'caddy',
                        player: payment.player_name,
                        amount: payment.caddy_fee_amount
                    });
                }

                // Transport fee
                if (payment.pay_transport_at && payment.transport_fee_amount > 0) {
                    breakdown[payment.pay_transport_at].amount += payment.transport_fee_amount;
                    breakdown[payment.pay_transport_at].fees.push({
                        type: 'transport',
                        player: payment.player_name,
                        amount: payment.transport_fee_amount
                    });
                }

                // Competition fee
                if (payment.pay_competition_at && payment.competition_fee_amount > 0) {
                    breakdown[payment.pay_competition_at].amount += payment.competition_fee_amount;
                    breakdown[payment.pay_competition_at].fees.push({
                        type: 'competition',
                        player: payment.player_name,
                        amount: payment.competition_fee_amount
                    });
                }
            });

            // Count unique players per location
            Object.keys(breakdown).forEach(location => {
                const uniquePlayers = new Set(breakdown[location].fees.map(f => f.player));
                breakdown[location].count = uniquePlayers.size;
            });

            return breakdown;
        } catch (error) {
            console.error('[PaymentDB] Error getting payment breakdown:', error);
            throw error;
        }
    }

    // =====================================================
    // REALTIME SUBSCRIPTIONS
    // =====================================================

    /**
     * Subscribe to payment changes for an event
     */
    subscribeToPayments(eventId, callback) {
        const subscription = supabase
            .channel(`payments:${eventId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'event_payments',
                    filter: `event_id=eq.${eventId}`
                },
                callback
            )
            .subscribe();

        this.subscriptions.push(subscription);
        return subscription;
    }

    /**
     * Unsubscribe from all payment changes
     */
    unsubscribeAll() {
        this.subscriptions.forEach(sub => {
            supabase.removeChannel(sub);
        });
        this.subscriptions = [];
    }

    // =====================================================
    // EXPORT FUNCTIONS
    // =====================================================

    /**
     * Export payment checklist to CSV
     */
    async exportPaymentChecklist(eventId) {
        try {
            const payments = await this.getEventPayments(eventId);

            const headers = [
                'Player Name',
                'Total Amount',
                'Green Fee',
                'Cart Fee',
                'Caddy Fee',
                'Transport Fee',
                'Competition Fee',
                'Status',
                'Paid At',
                'Notes'
            ];

            const rows = payments.map(p => [
                p.player_name,
                `฿${p.total_amount}`,
                p.green_fee_paid ? 'PAID' : `UNPAID (฿${p.green_fee_amount})`,
                p.cart_fee_paid ? 'PAID' : `UNPAID (฿${p.cart_fee_amount})`,
                p.caddy_fee_paid ? 'PAID' : `UNPAID (฿${p.caddy_fee_amount})`,
                p.transport_fee_amount > 0
                    ? (p.transport_fee_paid ? 'PAID' : `UNPAID (฿${p.transport_fee_amount})`)
                    : 'N/A',
                p.competition_fee_amount > 0
                    ? (p.competition_fee_paid ? 'PAID' : `UNPAID (฿${p.competition_fee_amount})`)
                    : 'N/A',
                p.payment_status.toUpperCase(),
                p.paid_at ? new Date(p.paid_at).toLocaleString() : '-',
                p.payment_notes || '-'
            ]);

            return [headers, ...rows];
        } catch (error) {
            console.error('[PaymentDB] Error exporting checklist:', error);
            throw error;
        }
    }
}

// Initialize global instance
window.PaymentTrackingDB = new PaymentTrackingDB();
