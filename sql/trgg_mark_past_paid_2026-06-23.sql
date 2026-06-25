-- Pete (2026-06-23): mark all TRGG registrations for events ALREADY HELD (event_date <= today) as
-- PAID, attributing the payment to each event's date. Upcoming events stay pending. This moves the
-- past-event Outstanding into Revenue. Trigger disabled to avoid any waitlist-promotion side effects.
begin;
alter table public.event_registrations disable trigger trg_auto_promote_on_reg_change;
update public.event_registrations r
   set payment_status = 'paid',
       amount_paid     = r.total_fee,
       paid_at         = e.event_date::timestamptz,
       paid_by         = 'organizer-bulk-2026-06-23'
  from public.society_events e
 where r.event_id = e.id
   and e.title like 'TRGG%'
   and e.event_date <= date '2026-06-23'
   and r.payment_status is distinct from 'paid';
alter table public.event_registrations enable trigger trg_auto_promote_on_reg_change;
commit;
