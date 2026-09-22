-- v1325 (2026-09-22) — 👍 THUMBS UP on the Results page.
-- Pete: "In the results section next to the players name I want a like 👍 in the same way we it in Tap-in
-- with the hearts but the thumbs up and show the user id unlike Tap-in. This is to show support and say good
-- job in the results page and send the thumbs up count to the player inbox in the Tap-in profile section."
--
-- * One thumbs up per giver, per player, per event. Givers are real logins (gfd_is_user); a player can't
--   thumb themselves. The cheered player can be anyone on that event's results (guests included — they just
--   have no inbox).
-- * NOT anonymous (unlike Tap-In likes, v1287/v1297): result_thumbs_get names the givers — Pete asked for it.
-- * The player's Tap-In Activity gets a 'thumb' row per giver (golf_activity), grouped per event by the client;
--   golf_nav_counts adds 'thumbs' so the Tap-In badge/cube counts them.
-- * Table is RLS-on with NO client policy — the two RPCs are the only door (Tap-In pattern).
--   golf_activity / golf_nav_counts below are the LIVE definitions (pulled 2026-09-22) + the thumb branch.

create table if not exists public.result_thumbs (
  event_id   uuid not null references public.society_events(id) on delete cascade,
  player_id  text not null,
  giver_id   text not null,
  created_at timestamptz not null default now(),
  primary key (event_id, player_id, giver_id)
);
create index if not exists result_thumbs_player_idx on public.result_thumbs (player_id, created_at desc);
alter table public.result_thumbs enable row level security;

-- Every player's count on one event, whether the caller gave one, and WHO gave them (newest first, ≤50).
create or replace function public.result_thumbs_get(p_user text, p_event uuid)
returns jsonb language sql stable security definer set search_path to 'public' as $$
  select coalesce(jsonb_object_agg(x.player_id, jsonb_build_object('n', x.n, 'mine', x.mine, 'givers', x.givers)), '{}'::jsonb)
  from (
    select t.player_id, count(*)::int as n,
           bool_or(t.giver_id = coalesce(p_user, '')) as mine,
           (select coalesce(jsonb_agg(public.gfd_person(g.giver_id) order by g.created_at desc), '[]'::jsonb)
              from (select t3.giver_id, t3.created_at from public.result_thumbs t3
                     where t3.event_id = p_event and t3.player_id = t.player_id
                     order by t3.created_at desc limit 50) g) as givers
      from public.result_thumbs t
     where t.event_id = p_event
     group by t.player_id
  ) x
$$;

-- Set (p_on true) or take back (false) the caller's thumbs up. Idempotent — the client sends the state it wants.
create or replace function public.result_thumb_set(p_user text, p_event uuid, p_player text, p_on boolean)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_n int; v_mine boolean;
begin
  if not public.gfd_is_user(p_user) then raise exception 'sign in to give a thumbs up'; end if;
  if coalesce(p_player, '') = '' then raise exception 'no player'; end if;
  if p_player = p_user then raise exception 'you cannot give yourself a thumbs up'; end if;
  if p_on then
    -- only a golfer who is actually on this event's results can be cheered
    if not (exists (select 1 from public.event_results r where r.event_id = p_event::text and r.player_id = p_player)
         or exists (select 1 from public.rounds r where r.society_event_id = p_event and r.golfer_id = p_player)
         or exists (select 1 from public.scorecards s where s.event_id = p_event::text and s.player_id = p_player)
         or exists (select 1 from public.event_registrations g where g.event_id = p_event and g.player_id = p_player)) then
      raise exception 'that golfer is not on this event';
    end if;
    insert into public.result_thumbs (event_id, player_id, giver_id) values (p_event, p_player, p_user)
    on conflict do nothing;
  else
    delete from public.result_thumbs where event_id = p_event and player_id = p_player and giver_id = p_user;
  end if;
  select count(*)::int, bool_or(giver_id = p_user) into v_n, v_mine
    from public.result_thumbs where event_id = p_event and player_id = p_player;
  return jsonb_build_object('n', coalesce(v_n, 0), 'mine', coalesce(v_mine, false));
end $$;

revoke all on function public.result_thumbs_get(text, uuid) from public;
revoke all on function public.result_thumb_set(text, uuid, text, boolean) from public;
grant execute on function public.result_thumbs_get(text, uuid) to anon, authenticated;
grant execute on function public.result_thumb_set(text, uuid, text, boolean) to anon, authenticated;

-- ---------------------------------------------------------------- Tap-In Activity: + 'thumb' rows
CREATE OR REPLACE FUNCTION public.golf_activity(p_user text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with seen as (select coalesce((select activity_seen_at from public.golf_feed_seen where user_id = p_user), '-infinity'::timestamptz) as seen_at),
  me as (select public.gfd_acting_ids(p_user) as ids),
  a as (
    select 'like' as type, null::text as actor, p.id as post_id, null::uuid as listing_id, null::text as body, k.created_at as ts, p.author_id as owner, 1 as n,
           (select count(*) from public.golf_post_likes k2 where k2.post_id = p.id) + coalesce(p.likes_boost, 0) as total,
           null::integer as window_h, k.created_at as anchor, null::uuid as ev_id
      from public.golf_post_likes k join public.golf_posts p on p.id = k.post_id
     where p.author_id = any ((select ids from me)::text[]) and k.user_id <> p_user and p.deleted_at is null
    union all
    -- the boosted slice of a post's likes: one row, no actor, never attributed to a golfer.
    -- `ts` is a rolling stamp so the label ages ("· 16m"); `anchor` is when the boost was set,
    -- so this row is new ONCE per change instead of on every read (v1304).
    select 'like', null, p.id, null, null,
           coalesce(p.likes_boost_recent_at, now() - make_interval(secs => (extract(epoch from now())::bigint % 2400))),
           p.author_id, p.likes_boost_recent,
           (select count(*) from public.golf_post_likes k2 where k2.post_id = p.id) + coalesce(p.likes_boost, 0),
           coalesce(p.likes_boost_recent_hours, 6),
           coalesce(p.likes_boost_set_at, p.likes_boost_recent_at, p.created_at), null
      from public.golf_posts p
     where p.author_id = any ((select ids from me)::text[]) and p.deleted_at is null and coalesce(p.likes_boost_recent, 0) > 0
    union all
    select 'comment', c.author_id, p.id, null, c.body, c.created_at, p.author_id, 1, null, null, c.created_at, null
      from public.golf_post_comments c join public.golf_posts p on p.id = c.post_id
     where p.author_id = any ((select ids from me)::text[]) and c.author_id <> p_user and c.deleted_at is null and p.deleted_at is null
    union all
    -- a mention in a comment on MY post is already there as a comment — don't say it twice
    select 'mention', m.author_id, p.id, null, coalesce(c.body, p.caption), m.created_at, p_user, 1, null, null, m.created_at, null
      from public.golf_mentions m join public.golf_posts p on p.id = m.post_id
      left join public.golf_post_comments c on c.id = m.comment_id
     where m.mentioned_id = p_user and m.author_id <> p_user
       and (m.comment_id is null or (c.deleted_at is null and p.author_id <> p_user))
       and public.gfd_can_see(p, p_user)
    union all
    select 'follow', f.follower_id, null, null, null, f.created_at, f.followee_id, 1, null, null, f.created_at, null from public.golf_follows f
     where f.followee_id = any ((select ids from me)::text[]) and f.follower_id <> p_user
    union all
    select 'enquiry', e.buyer_id, null, e.listing_id, l.title, e.created_at, p_user, 1, null, null, e.created_at, null
      from public.marketplace_enquiries e join public.marketplace_listings l on l.id = e.listing_id
     where e.seller_id = p_user and l.status <> 'deleted'
    union all
    select 'offer', o.buyer_line_id, null, o.listing_id, l.title || case when o.offer_amount is not null then ' · ฿' || o.offer_amount else '' end, o.created_at, p_user, 1, null, null, o.created_at, null
      from public.marketplace_offers o join public.marketplace_listings l on l.id = o.listing_id
     where l.seller_line_id = p_user and o.buyer_line_id <> p_user and l.status <> 'deleted'
    union all
    -- v1325: a 👍 on my result — the giver IS named (Pete: "show the user id unlike Tap-in")
    select 'thumb', t.giver_id, null, null, coalesce(nullif(trim(e.course_name), ''), e.title), t.created_at, p_user, 1, null, null, t.created_at, t.event_id
      from public.result_thumbs t join public.society_events e on e.id = t.event_id
     where t.player_id = p_user and t.giver_id <> p_user
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'type', a.type, 'actor', case when a.actor is not null then public.gfd_person(a.actor) end,
           'post_id', a.post_id, 'listing_id', a.listing_id, 'event_id', a.ev_id, 'n', a.n, 'total', a.total, 'window_h', a.window_h,
           'body', a.body, 'at', a.ts, 'is_new', a.anchor > (select seen_at from seen),
           -- which of my pages it happened on (null = me)
           'page', case when a.owner is distinct from p_user then public.gfd_person(a.owner) end,
           'i_follow', a.actor is not null and exists (select 1 from public.golf_follows f where f.follower_id = p_user and f.followee_id = a.actor),
           'thumb', case
              when a.post_id is not null then (select case when p.kind = 'listing' then (select l.images[1] from public.marketplace_listings l where l.id = p.listing_id) else p.photos[1] end
                                               from public.golf_posts p where p.id = a.post_id)
              when a.listing_id is not null then (select l.images[1] from public.marketplace_listings l where l.id = a.listing_id) end)
         order by a.ts desc), '[]'::jsonb)
  from (select * from a order by ts desc limit 80) a
$function$;

CREATE OR REPLACE FUNCTION public.golf_nav_counts(p_user text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with s as (select (select feed_seen_at from public.golf_feed_seen where user_id = p_user) f,
                    (select following_seen_at from public.golf_feed_seen where user_id = p_user) fo),
  act as (select e->>'type' as type,
                 -- a like row can CARRY a count (the boosted slice is one row worth many likes),
                 -- so "what's new" has to add up n, not rows. Every other kind sends n = 1.
                 coalesce((e->>'n')::int, 1) as n
            from jsonb_array_elements(public.golf_activity(p_user)) e where (e->>'is_new')::boolean)
  select jsonb_build_object(
    'feed_new', (select count(*) from public.golf_posts p
                 where p.author_id <> p_user and public.gfd_can_see(p, p_user)
                   and p.created_at > coalesce((select f from s), now() - interval '7 days')),
    'following_new', (select count(*) from public.golf_posts p
                      where p.author_id <> p_user and public.gfd_can_see(p, p_user)
                        and exists (select 1 from public.golf_follows f where f.follower_id = p_user and f.followee_id = p.author_id)
                        and p.created_at > coalesce((select fo from s), now() - interval '7 days')),
    'feed_seen_at', coalesce((select f from s), now() - interval '7 days'),
    'following_seen_at', coalesce((select fo from s), now() - interval '7 days'),
    'activity_new', (select coalesce(sum(n), 0) from act),
    'mentions', (select count(*) from act where type = 'mention'),
    'likes', (select coalesce(sum(n), 0) from act where type = 'like'),
    'comments', (select count(*) from act where type = 'comment'),
    'follows', (select count(*) from act where type = 'follow'),
    'mkp', (select count(*) from act where type in ('enquiry','offer')),
    'thumbs', (select count(*) from act where type = 'thumb'),
    -- the Tap-In intro toast: until the golfer opens Tap-In or dismisses it
    'intro', (select f from s) is null
             and coalesce((select intro_dismissed_at from public.golf_feed_seen where user_id = p_user), null) is null)
$function$;
