-- Pete 2026-09-22: "for right now lets turn off the chips deduction from the next events until the
-- organizers tell they want it activated". Per-society switch, OFF by default. While off, the organizer
-- Settle sheet has no "Apply to fees" (OrgLiteRegistrations._applyToFees refuses too). Chips still show
-- and can still be paid in cash. To switch a society ON when its organizers ask:
--   update public.society_payout_templates set chips_to_fees = true where society_id = '<society id>';
alter table public.society_payout_templates add column if not exists chips_to_fees boolean not null default false;
