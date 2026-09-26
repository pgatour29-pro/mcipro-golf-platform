-- NO DOUBLE BOOKINGS, enforced by the DATABASE (2026-09-26, Pete: bookings are transactions —
-- "the same way we purchase a plane ticket or buying stocks"). Clients can race; the DB can't.
--
-- 1. event_registrations: one row per (event, player). The old unique key was (event_id, user_id)
--    but user_id is NULL on every row (1,962/1,962) — it never protected anything, and 3
--    double-tap pairs got in (identical rows seconds apart, all past events). The later copy of
--    each is backed up to event_registrations_dupes_20260926 and removed with triggers OFF
--    (no waitlist promotion, no partner-link purge, no LINE push).
-- 2. event_waitlist: one row per (event, player).
-- 3. caddy_bookings: one ACTIVE booking per (caddy, date, tee slot).
-- A second insert now fails with 23505 unique_violation — the client shows "already booked".

create table if not exists public.event_registrations_dupes_20260926 as
    select * from public.event_registrations where false;

with d as (
    select id, row_number() over (partition by event_id, player_id order by created_at, id) rn
      from public.event_registrations where player_id is not null
)
insert into public.event_registrations_dupes_20260926
select r.* from public.event_registrations r join d on d.id = r.id where d.rn > 1
on conflict do nothing;

set local session_replication_role = replica;
delete from public.event_registrations r
 using public.event_registrations_dupes_20260926 b where b.id = r.id;
set local session_replication_role = origin;

create unique index if not exists event_registrations_event_player_uniq
    on public.event_registrations (event_id, player_id);

create unique index if not exists event_waitlist_event_player_uniq
    on public.event_waitlist (event_id, player_id);

create unique index if not exists caddy_bookings_active_slot_uniq
    on public.caddy_bookings (caddy_id, booking_date, coalesce(tee_time, start_time))
    where caddy_id is not null and status in ('pending', 'confirmed');

alter table public.event_registrations_dupes_20260926 enable row level security;

-- 4. Waitlist position is assigned HERE, under a per-event lock. The client computed max+1 from its
--    own read, so two golfers joining in the same moment got the SAME position (who is promoted
--    first became arbitrary). Organizer re-ordering is an UPDATE and is untouched.
create or replace function public.event_waitlist_assign_position()
returns trigger language plpgsql as $$
begin
    perform pg_advisory_xact_lock(hashtext('event_waitlist:' || new.event_id::text));
    select coalesce(max(position), 0) + 1 into new.position
      from public.event_waitlist where event_id = new.event_id;
    return new;
end $$;
drop trigger if exists trg_event_waitlist_assign_position on public.event_waitlist;
create trigger trg_event_waitlist_assign_position before insert on public.event_waitlist
    for each row execute function public.event_waitlist_assign_position();
