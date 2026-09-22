-- TRGG 2026-09-22: two courses on one day (Pete). The website row carries BOTH events —
-- "LAEM CHABANG (Max 15)" 10.00/11.00 ฿3950 and "SIAM PLANTATION" 08.15/09.15 ฿4050 — but the
-- sync parser stripped the <br /> and kept only Laem Chabang, so Siam Plantation never existed
-- in the app (and a 2026-08-29 session read the date as a course swap). Fixed in the parser
-- (sync-trgg-schedule, same commit). This restores the day:
--   * Siam Plantation event, cloned from the Laem Chabang row (same society settings), stamped
--     sync_source so the fixed sync ADOPTS it instead of inserting a second one.
--   * Laem Chabang max_participants = 15 (the website's "(Max 15)").
-- The new-event LINE trigger is off for the insert: the event teed off at 09:15 today, a
-- "new event" push to every member now would only confuse. Runs as ONE transaction (-f).
-- Registrations are NOT moved: nothing in the data says which of the 21 are at Siam.

alter table public.society_events disable trigger trigger_new_event_notification;

insert into public.society_events
select (jsonb_populate_record(null::public.society_events,
        to_jsonb(e) || jsonb_build_object(
          'id', gen_random_uuid(),
          'title', 'TRGG - Siam Plantation Golf Club',
          'course_name', 'Siam Plantation Golf Club',
          'start_time', '09:15:00',
          'departure_time', '08:15:00',
          'entry_fee', 4050,
          'description', 'Green Fee: ฿4050 (incl. caddy & cart)',
          'transport_fee', 0,
          'max_participants', null,
          'created_at', now(),
          'updated_at', now()))).*
from public.society_events e
where e.id = '944256f5-a505-497e-89f6-2202a10e8aa6'
  and not exists (select 1 from public.society_events x
                  where x.event_date = '2026-09-22' and x.course_name = 'Siam Plantation Golf Club');

alter table public.society_events enable trigger trigger_new_event_notification;

update public.society_events set max_participants = 15
where id = '944256f5-a505-497e-89f6-2202a10e8aa6' and max_participants is distinct from 15;

select id, title, course_name, departure_time, start_time, entry_fee, max_participants, sync_source, status
from public.society_events where event_date = '2026-09-22' and society_id = '7c0e4b72-d925-44bc-afda-38259a7ba346'
order by start_time;
