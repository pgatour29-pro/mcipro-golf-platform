-- 2026-09-17 (v1226): course_offers was never in the realtime publication, so the golfer app's
-- hot-deals strip had nothing to listen to — a withdrawn or sold-out deal stayed on screen until
-- the Booking tab was reopened. Mirrors sql/realtime_add_rounds_20260821.sql.
alter publication supabase_realtime add table public.course_offers;
