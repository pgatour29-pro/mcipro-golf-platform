-- ============================================================================================
-- v1297 (Pete 2026-09-20): likes are anonymous ON THE SERVER, not just on the screen.
--
-- Pete, after being shown that the DB could still name a liker: "Exactly. Just keep it this way
-- do not show".
--
-- v1287 deleted the "Liked by …" line and the likers name list from the UI, but the API kept
-- shipping the names:
--   * gfd_post_json still returned `liked_by` (id + name of up to 2 real likers) on EVERY post
--     in EVERY feed read. The client never read the field — it just travelled.
--   * golf_activity still named the `actor` of each like. The client collapses like rows to
--     "{n} likes on your post" and drops the actor, so again: never read, just travelled.
--   * golf_post_likers (the whole list, up to 500 names) was still granted to anon, and every
--     one of these takes p_user as a plain argument — so ANY caller could pass ANY line id.
--
-- Nothing in public/golf-feed.js reads liked_by, or an actor on a like row (it rebuilds like
-- rows at golf-feed.js:1491-1495 without one). This patch is invisible to the UI.
--
-- Anonymity that only the client honours is not anonymity. The name stops at the database.
-- ============================================================================================

-- 1. the post payload no longer carries liker names (real_likes, a bare count, stays)
CREATE OR REPLACE FUNCTION public.gfd_post_json(p golf_posts, p_user text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select jsonb_build_object(
    'id', p.id, 'kind', p.kind, 'caption', p.caption, 'audience', p.audience, 'created_at', p.created_at,
    'photos', case when p.kind = 'listing' then to_jsonb(coalesce((select l.images from public.marketplace_listings l where l.id = p.listing_id), '{}'::text[]))
                   else to_jsonb(p.photos) end,
    'author', public.gfd_person(p.author_id),
    -- a page's post is "mine" for everyone who may post as that page (edit / delete)
    'mine', p.author_id = p_user or (p.author_id ~ '^(society|course):' and public.gfd_can_act(p_user, p.author_id)),
    'hidden', p.hidden_at is not null,
    'edited_at', p.edited_at,
    'video', p.video_url,
    'muted', p.muted,
    'mentions', public.gfd_mentions(p.id, null),
    'likes', (select count(*) from public.golf_post_likes k where k.post_id = p.id) + coalesce(p.likes_boost, 0),
    'real_likes', (select count(*) from public.golf_post_likes k where k.post_id = p.id),
    'i_liked', exists (select 1 from public.golf_post_likes k where k.post_id = p.id and k.user_id = p_user),
    'i_saved', exists (select 1 from public.golf_post_saves s where s.post_id = p.id and s.user_id = p_user),
    'comments', (select count(*) from public.golf_post_comments c where c.post_id = p.id and c.deleted_at is null),
    'recent', coalesce((select jsonb_agg(jsonb_build_object('name', public.gfd_person(c.author_id)->>'name', 'author_id', c.author_id, 'body', c.body,
                                                            'mentions', public.gfd_mentions(p.id, c.id)) order by c.created_at)
                        from (select * from public.golf_post_comments c where c.post_id = p.id and c.deleted_at is null
                              order by c.created_at desc limit 2) c), '[]'::jsonb),
    'round', case when p.round_id is not null then public.gfd_round(p.round_id, p.author_id) end,
    'listing', case when p.listing_id is not null then public.gfd_listing(p.listing_id, p_user) end)
$function$

;

-- 2. Activity: a like is a number, never a person
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
           null::integer as window_h
      from public.golf_post_likes k join public.golf_posts p on p.id = k.post_id
     where p.author_id = any ((select ids from me)::text[]) and k.user_id <> p_user and p.deleted_at is null
    union all
    -- the boosted slice of a post's likes: one row, no actor, never attributed to a golfer
    select 'like', null, p.id, null, null,
           coalesce(p.likes_boost_recent_at, now() - make_interval(secs => (extract(epoch from now())::bigint % 2400))),
           p.author_id, p.likes_boost_recent,
           (select count(*) from public.golf_post_likes k2 where k2.post_id = p.id) + coalesce(p.likes_boost, 0),
           coalesce(p.likes_boost_recent_hours, 6)
      from public.golf_posts p
     where p.author_id = any ((select ids from me)::text[]) and p.deleted_at is null and coalesce(p.likes_boost_recent, 0) > 0
    union all
    select 'comment', c.author_id, p.id, null, c.body, c.created_at, p.author_id, 1, null, null
      from public.golf_post_comments c join public.golf_posts p on p.id = c.post_id
     where p.author_id = any ((select ids from me)::text[]) and c.author_id <> p_user and c.deleted_at is null and p.deleted_at is null
    union all
    -- a mention in a comment on MY post is already there as a comment — don't say it twice
    select 'mention', m.author_id, p.id, null, coalesce(c.body, p.caption), m.created_at, p_user, 1, null, null
      from public.golf_mentions m join public.golf_posts p on p.id = m.post_id
      left join public.golf_post_comments c on c.id = m.comment_id
     where m.mentioned_id = p_user and m.author_id <> p_user
       and (m.comment_id is null or (c.deleted_at is null and p.author_id <> p_user))
       and public.gfd_can_see(p, p_user)
    union all
    select 'follow', f.follower_id, null, null, null, f.created_at, f.followee_id, 1, null, null from public.golf_follows f
     where f.followee_id = any ((select ids from me)::text[]) and f.follower_id <> p_user
    union all
    select 'enquiry', e.buyer_id, null, e.listing_id, l.title, e.created_at, p_user, 1, null, null
      from public.marketplace_enquiries e join public.marketplace_listings l on l.id = e.listing_id
     where e.seller_id = p_user and l.status <> 'deleted'
    union all
    select 'offer', o.buyer_line_id, null, o.listing_id, l.title || case when o.offer_amount is not null then ' · ฿' || o.offer_amount else '' end, o.created_at, p_user, 1, null, null
      from public.marketplace_offers o join public.marketplace_listings l on l.id = o.listing_id
     where l.seller_line_id = p_user and o.buyer_line_id <> p_user and l.status <> 'deleted'
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'type', a.type, 'actor', case when a.actor is not null then public.gfd_person(a.actor) end,
           'post_id', a.post_id, 'listing_id', a.listing_id, 'n', a.n, 'total', a.total, 'window_h', a.window_h,
           'body', a.body, 'at', a.ts, 'is_new', a.ts > (select seen_at from seen),
           -- which of my pages it happened on (null = me)
           'page', case when a.owner is distinct from p_user then public.gfd_person(a.owner) end,
           'i_follow', a.actor is not null and exists (select 1 from public.golf_follows f where f.follower_id = p_user and f.followee_id = a.actor),
           'thumb', case
              when a.post_id is not null then (select case when p.kind = 'listing' then (select l.images[1] from public.marketplace_listings l where l.id = p.listing_id) else p.photos[1] end
                                               from public.golf_posts p where p.id = a.post_id)
              when a.listing_id is not null then (select l.images[1] from public.marketplace_listings l where l.id = a.listing_id) end)
         order by a.ts desc), '[]'::jsonb)
  from (select * from a order by ts desc limit 80) a
$function$

;

-- 3. the likers list is operator-only now: no client path calls it, and anon must not.
revoke all on function public.golf_post_likers(text,uuid) from anon, authenticated, public;
