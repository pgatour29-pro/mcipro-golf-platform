-- v1466 (2026-10-05) CADDY BLOCK 4:15 -> 4:30.
-- Pete: "average round will take 4:15 and buffering of completion of the round and preparing for the
-- next assignment they need at least 15 minutes". One round now holds a caddy for 270 minutes
-- (255 round + 15 turnaround) everywhere the database decides it:
--   1. caddy_profiles.block_minutes: every caddy below 270 lifted, default 270, floor CHECK 270
--   2. the eight functions that carried the 255 literal are rewritten FROM THEIR LIVE SOURCE
--      (never from a repo file) with 270 in its place
--   3. NEW trigger: a job's end_time always covers her block. Writers stored whatever they liked
--      (a moved tee time kept its old end -> a 3h45 bar on the pro shop caddy board); now the
--      database sets it, so the board, "back about" and the caddy's own sheet all read one length.
-- Rollback: caddy_block_270_v1466_ROLLBACK.sql

alter table public.caddy_profiles drop constraint if exists caddy_profiles_block_minutes_floor;
update public.caddy_profiles set block_minutes = 270 where block_minutes is null or block_minutes < 270;
alter table public.caddy_profiles alter column block_minutes set default 270;
alter table public.caddy_profiles add constraint caddy_profiles_block_minutes_floor check (block_minutes >= 270);

do $$
declare r record; d text; n int := 0;
begin
    for r in select p.oid, p.proname from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
              where ns.nspname = 'public'
                and p.proname in ('caddy_bookings_no_clash','caddy_jobs_ensure','caddy_profile_write','claim_hot_deal',
                                  'golfer_set_booking_caddy','qr_book_caddy','qr_venue_caddies','teetime_book')
    loop
        d := pg_get_functiondef(r.oid);
        if d !~ '\m255\M' then raise exception 'no 255 literal left in % — already migrated?', r.proname; end if;
        execute regexp_replace(d, '\m255\M', '270', 'g');
        n := n + 1;
    end loop;
    if n <> 8 then raise exception 'expected 8 functions, rewrote %', n; end if;
end $$;

create or replace function public.caddy_bookings_end_covers_block()
returns trigger language plpgsql as $fn$
declare
    v_t time; v_block int; v_min int;
begin
    if new.status in ('cancelled', 'completed') then return new; end if;     -- history keeps what it had
    v_t := coalesce(new.tee_time, new.start_time);
    if v_t is null or coalesce(new.holes, 18) < 18 then return new; end if;  -- a 9-hole job keeps its own end
    select greatest(270, coalesce(block_minutes, 270)) into v_block from public.caddy_profiles where id = new.caddy_id;
    v_block := coalesce(v_block, 270);
    v_min := least((extract(epoch from v_t) / 60)::int + v_block, 23 * 60 + 59);
    if new.end_time is null
       or (extract(epoch from new.end_time) / 60)::int < v_min
       or (tg_op = 'UPDATE' and v_t is distinct from coalesce(old.tee_time, old.start_time)
           and new.end_time is not distinct from old.end_time) then           -- tee moved, end left behind
        new.end_time := make_time(v_min / 60, v_min % 60, 0);
    end if;
    return new;
end $fn$;

drop trigger if exists trg_caddy_bookings_end_covers_block on public.caddy_bookings;
create trigger trg_caddy_bookings_end_covers_block
    before insert or update on public.caddy_bookings
    for each row execute function public.caddy_bookings_end_covers_block();

-- upcoming jobs pick up the new length now (no alert: caddy_job_alert only fires on a tee/date/caddy change)
update public.caddy_bookings set end_time = end_time
 where booking_date >= (now() at time zone 'Asia/Bangkok')::date and status not in ('cancelled', 'completed');
