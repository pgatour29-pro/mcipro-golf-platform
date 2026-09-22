-- ============================================================================================
-- v1320 (Pete 2026-09-22): Tap-In like drip — Pete Park's photos climb every hour, capped at 220.
--
-- Pete: "insert a script just for Pete Park's photos have likes spread out through the day where
-- the count of likes go up incrementally each hr for 24 hours a day until i tell you to stop the
-- script ... not to have any of the photos go over the count of 220".
--
-- Built on the existing operator display boost (`golf_posts.likes_boost`, v1266 — disclosed in the
-- Terms as a promotional adjustment on MyCaddiPro's own posts, never attributed to a golfer):
--   * golf_like_drip      — WHO drips and the CAP. One row per author. `active=false` = stop.
--   * golf_like_drip_log  — every hourly step (post, when, how many). The "N in the past 6 hours"
--                           line under Activity is the SUM of these steps inside the post's window,
--                           so the slice is always what actually arrived (seed coherence rule).
--   * gfd_like_drip_tick() — pg_cron `tapin-like-drip` at minute 3 of every hour, 24 h a day.
--       - every eligible post of a drip author (not deleted/hidden, not a 19th Hole listing, has a
--         photo or a video) gets +1 at least, more in the Bangkok day and evening:
--             00-05 → 1 · 06-08 → 1-3 · 09-17 → 1-4 · 18-22 → 1-5 · 23 → 1-2
--         and only +1 per hour for the last 20 before the cap, so it eases into 220.
--       - real likes + boost never go past the cap. A new post of Pete's joins on the next hour.
--       - a step pins `likes_boost_recent_at` to the step's time, so Activity's "· 12m" is true.
--         (v1291 kept that NULL only because the window was read off the stamp; the window has
--         lived in `likes_boost_recent_hours` since v1291, so a pinned stamp is safe now.)
--       - with no step (capped, or stopped) the slice still slides down as old steps age out.
--   * trg_gfd_like_drip_clamp — a REAL like on a capped post takes one off the boost, so the post
--     never reads 221 for up to an hour.
--   * gfd_stamp_boost (v1304) now stamps only when a count goes UP. A slice sliding down or a
--     clamp is not news — stamping it would light the cube for likes that never came (the exact
--     v1304 bug). Every increase still stamps, so each hourly step pushes once.
--
-- STOP (when Pete says so):  update public.golf_like_drip set active = false, stopped_at = now()
--                            where author_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';
--   then, after the window has drained (6 h), select cron.unschedule('tapin-like-drip');
-- ============================================================================================

-- 1. who drips, and the ceiling ---------------------------------------------------------------
create table if not exists public.golf_like_drip (
  author_id  text primary key,
  cap        integer not null check (cap > 0),
  active     boolean not null default true,
  started_at timestamptz not null default now(),
  stopped_at timestamptz
);
alter table public.golf_like_drip enable row level security;
revoke all on public.golf_like_drip from anon, authenticated;

create table if not exists public.golf_like_drip_log (
  id      bigserial primary key,
  post_id uuid not null references public.golf_posts(id) on delete cascade,
  at      timestamptz not null default now(),
  n       integer not null check (n > 0)
);
create index if not exists golf_like_drip_log_post_at on public.golf_like_drip_log (post_id, at);
alter table public.golf_like_drip_log enable row level security;
revoke all on public.golf_like_drip_log from anon, authenticated;

insert into public.golf_like_drip (author_id, cap)
values ('U2b6d976f19bca4b2f4374ae0e10ed873', 220)          -- Pete Park
on conflict (author_id) do update set cap = excluded.cap, active = true, stopped_at = null;

-- 2. the boost stamp: only an INCREASE is news -----------------------------------------------
create or replace function public.gfd_stamp_boost() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if coalesce(new.likes_boost, 0) > 0 or coalesce(new.likes_boost_recent, 0) > 0 then
      new.likes_boost_set_at := coalesce(new.likes_boost_set_at, now());
    end if;
  -- v1320: a count going DOWN (the recent slice ageing out, a clamp at the cap) is not a new like;
  -- stamping it would light the cube for likes that never arrived.
  elsif coalesce(new.likes_boost, 0) > coalesce(old.likes_boost, 0)
     or coalesce(new.likes_boost_recent, 0) > coalesce(old.likes_boost_recent, 0) then
    new.likes_boost_set_at := now();
  end if;
  return new;
end $$;

-- 3. the hourly step --------------------------------------------------------------------------
create or replace function public.gfd_like_drip_tick() returns jsonb
language plpgsql set search_path = public as $$
declare
  d record; p record;
  v_h      int := extract(hour from now() at time zone 'Asia/Bangkok')::int;
  v_max    int;
  v_real   int; v_room int; v_inc int; v_boost int; v_recent int;
  v_out    jsonb := '[]'::jsonb;
begin
  v_max := case when v_h < 6 then 1 when v_h < 9 then 3 when v_h < 18 then 4 when v_h < 23 then 5 else 2 end;
  for d in select * from golf_like_drip loop
    for p in select * from golf_posts g
              where g.author_id = d.author_id and g.deleted_at is null and g.hidden_at is null
                and g.kind <> 'listing'
                and (coalesce(array_length(g.photos, 1), 0) > 0 or g.video_url is not null)
              for update loop
      select count(*) into v_real from golf_post_likes where post_id = p.id;
      v_room := d.cap - v_real - p.likes_boost;
      v_inc  := 0;
      if d.active and v_room > 0 then
        v_inc := least(case when v_room <= 20 then 1 else 1 + floor(random() * v_max)::int end, v_room);
        insert into golf_like_drip_log (post_id, n) values (p.id, v_inc);
      end if;
      -- never past the cap, even when real likes alone have climbed toward it
      v_boost := greatest(0, least(p.likes_boost + v_inc, d.cap - v_real));
      select coalesce(sum(n), 0) into v_recent from golf_like_drip_log
       where post_id = p.id and at > now() - make_interval(hours => p.likes_boost_recent_hours);
      if v_boost is distinct from p.likes_boost or v_recent is distinct from p.likes_boost_recent or v_inc > 0 then
        update golf_posts
           set likes_boost = v_boost,
               likes_boost_recent = v_recent,
               likes_boost_recent_at = case when v_inc > 0 then now() else likes_boost_recent_at end
         where id = p.id;
      end if;
      v_out := v_out || jsonb_build_object('post', p.id, 'add', v_inc, 'shows', v_real + v_boost, 'recent', v_recent);
    end loop;
  end loop;
  return v_out;
end $$;
revoke all on function public.gfd_like_drip_tick() from public, anon, authenticated;

-- 4. a real like on a capped post takes one off the boost --------------------------------------
create or replace function public.gfd_like_drip_clamp() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update golf_posts g
     set likes_boost = greatest(0, d.cap - (select count(*) from golf_post_likes k where k.post_id = g.id))
    from golf_like_drip d
   where g.id = new.post_id and d.author_id = g.author_id and g.likes_boost > 0
     and (select count(*) from golf_post_likes k where k.post_id = g.id) + g.likes_boost > d.cap;
  return null;
end $$;
revoke all on function public.gfd_like_drip_clamp() from public, anon, authenticated;

drop trigger if exists trg_gfd_like_drip_clamp on public.golf_post_likes;
create trigger trg_gfd_like_drip_clamp after insert on public.golf_post_likes
  for each row execute function public.gfd_like_drip_clamp();

-- 5. every hour, 24 h a day (minute 3 — clear of the :11 and :17 sweeps) ----------------------
select cron.schedule('tapin-like-drip', '3 * * * *', $cron$select public.gfd_like_drip_tick()$cron$);
