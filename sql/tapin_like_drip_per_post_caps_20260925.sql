-- Tap-In LIKE DRIP (v1320) — every photo gets ITS OWN target, never the same as another (2026-09-25).
-- Pete: "i don't want it to stop at 220 because if they all stop at 220 it will look odd, so create a script
-- that gives each photo their own amount of likes but never the same".
--
-- Before: one cap per author (golf_like_drip.cap = 220), so every photo levelled out at exactly 220.
-- Now:    golf_posts.like_drip_cap = that photo's own target, drawn once, UNIQUE among the author's posts,
--         never a round number (no x0 / x5 endings), and always above what the photo already shows (likes
--         never go down; a photo sitting at the old 220 starts climbing again). New photos get theirs on
--         the first tick. golf_like_drip.cap stays as the centre of the spread (220): targets land in
--         roughly cap-60 … cap+110, so the set reads as organic, not as a ceiling.
-- Base: LIVE prosrc of gfd_like_drip_tick / gfd_like_drip_clamp pulled 2026-09-25. STOP is unchanged:
--   update golf_like_drip set active=false, stopped_at=now();

alter table public.golf_posts add column if not exists like_drip_cap int;

-- draw a target for one post: unique for the author, not round, above what it already shows
create or replace function public.gfd_like_drip_pick_cap(p_post uuid) returns int
language plpgsql security definer set search_path to 'public' as $$
declare
  v_author text; v_center int; v_shows int; v_lo int; v_hi int; v_cap int; v_try int := 0;
begin
  select g.author_id, g.likes_boost + (select count(*) from golf_post_likes k where k.post_id = g.id)
    into v_author, v_shows from golf_posts g where g.id = p_post;
  select coalesce(d.cap, 220) into v_center from golf_like_drip d where d.author_id = v_author;
  v_center := coalesce(v_center, 220);
  v_lo := greatest(v_center - 60, v_shows + 12);
  v_hi := greatest(v_center + 110, v_lo + 60);
  loop
    v_try := v_try + 1;
    v_cap := v_lo + floor(random() * (v_hi - v_lo + 1))::int;
    exit when v_cap % 5 <> 0
          and not exists (select 1 from golf_posts o where o.author_id = v_author and o.id <> p_post and o.like_drip_cap = v_cap);
    if v_try > 500 then v_hi := v_hi + 50; end if;   -- a very prolific author: widen rather than repeat
  end loop;
  update golf_posts set like_drip_cap = v_cap where id = p_post;
  return v_cap;
end $$;
revoke all on function public.gfd_like_drip_pick_cap(uuid) from public, anon, authenticated;

create or replace function public.gfd_like_drip_tick()
 returns jsonb language plpgsql set search_path to 'public' as $function$
declare
  d record; p record;
  v_h      int := extract(hour from now() at time zone 'Asia/Bangkok')::int;
  v_max    int;
  v_cap    int;
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
      v_cap := coalesce(p.like_drip_cap, public.gfd_like_drip_pick_cap(p.id));   -- this photo's own target
      select count(*) into v_real from golf_post_likes where post_id = p.id;
      v_room := v_cap - v_real - p.likes_boost;
      v_inc  := 0;
      if d.active and v_room > 0 then
        v_inc := least(case when v_room <= 20 then 1 else 1 + floor(random() * v_max)::int end, v_room);
        insert into golf_like_drip_log (post_id, n) values (p.id, v_inc);
      end if;
      -- never past this photo's target, even when real likes alone have climbed toward it
      v_boost := greatest(0, least(p.likes_boost + v_inc, v_cap - v_real));
      select coalesce(sum(n), 0) into v_recent from golf_like_drip_log
       where post_id = p.id and at > now() - make_interval(hours => p.likes_boost_recent_hours);
      if v_boost is distinct from p.likes_boost or v_recent is distinct from p.likes_boost_recent or v_inc > 0 then
        update golf_posts
           set likes_boost = v_boost,
               likes_boost_recent = v_recent,
               likes_boost_recent_at = case when v_inc > 0 then now() else likes_boost_recent_at end
         where id = p.id;
      end if;
      v_out := v_out || jsonb_build_object('post', p.id, 'add', v_inc, 'shows', v_real + v_boost, 'target', v_cap, 'recent', v_recent);
    end loop;
  end loop;
  return v_out;
end $function$;

-- a real like landing on a capped photo keeps it at ITS target (not the author-wide 220)
create or replace function public.gfd_like_drip_clamp()
 returns trigger language plpgsql security definer set search_path to 'public' as $function$
begin
  update golf_posts g
     set likes_boost = greatest(0, coalesce(g.like_drip_cap, d.cap) - (select count(*) from golf_post_likes k where k.post_id = g.id))
    from golf_like_drip d
   where g.id = new.post_id and d.author_id = g.author_id and g.likes_boost > 0
     and (select count(*) from golf_post_likes k where k.post_id = g.id) + g.likes_boost > coalesce(g.like_drip_cap, d.cap);
  return null;
end $function$;

-- give every current drip photo its own target now (oldest first), so the next tick already uses them
select g.id, public.gfd_like_drip_pick_cap(g.id) as target
  from golf_posts g join golf_like_drip d on d.author_id = g.author_id
 where g.deleted_at is null and g.hidden_at is null and g.kind <> 'listing'
   and (coalesce(array_length(g.photos, 1), 0) > 0 or g.video_url is not null)
   and g.like_drip_cap is null
 order by g.created_at;
