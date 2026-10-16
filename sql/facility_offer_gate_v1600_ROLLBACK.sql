begin;
drop trigger if exists course_offers_fx_guard on public.course_offers;
drop function if exists public.course_offers_fx_guard();
drop function if exists public.create_facility_offer(text, text, text, integer, text, text, text, timestamptz);
commit;
