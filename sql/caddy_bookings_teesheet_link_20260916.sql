-- Pro shop tee sheet <-> caddy jobs link (2026-09-16, Bangpakong side-by-side trial with G1).
-- A tee-time booking on the Live Tee Sheet (public.bookings, source='teesheet') owns N rows in
-- caddy_bookings: one per picked caddy (status confirmed) plus one per "caddy needed" without a
-- number (status pending, caddy_id NULL) for the caddy master to assign. The link lets an edit
-- or cancel on the sheet hit exactly its own jobs instead of guessing by (caddy, date, time).
-- Idempotent. No triggers on caddy_bookings (checked 2026-09-16), so nothing here notifies anyone.
alter table public.caddy_bookings add column if not exists teesheet_booking_id text;
create index if not exists caddy_bookings_teesheet_booking_idx on public.caddy_bookings (teesheet_booking_id) where teesheet_booking_id is not null;
create index if not exists caddy_bookings_date_course_idx on public.caddy_bookings (booking_date, course_name);
