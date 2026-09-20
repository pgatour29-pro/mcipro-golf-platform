-- v1288 (Pete 2026-09-20): the Activity centre counts likes the same way a post does.
--
-- A like row no longer names anyone (v1287), so Activity shows a number — and that number has to
-- agree with the number on the post, which includes the operator-set `likes_boost` disclosed in the
-- Terms. Real like rows now carry n = 1; a post with `likes_boost_recent` set also emits ONE row
-- carrying that count, stamped `likes_boost_recent_at` (default: six hours ago). The client sums the
-- n's per post, so "17 likes on your post · 6h" is one row, not seventeen.
--
-- These two columns are operator-set from SQL only — nothing in the app writes them, exactly like
-- likes_boost, and a boosted count is never attributed to a person anywhere.

alter table public.golf_posts
  add column if not exists likes_boost_recent    integer not null default 0,
  add column if not exists likes_boost_recent_at timestamptz;

CREATE OR REPLACE FUNCTION public.golf_activity(p_user text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with seen as (select coalesce((select activity_seen_at from public.golf_feed_seen where user_id = p_user), '-infinity'::timestamptz) as seen_at),
  me as (select public.gfd_acting_ids(p_user) as ids),
  a as (
    select 'like' as type, k.user_id as actor, p.id as post_id, null::uuid as listing_id, null::text as body, k.created_at as ts, p.author_id as owner, 1 as n,
           (select count(*) from public.golf_post_likes k2 where k2.post_id = p.id) + coalesce(p.likes_boost, 0) as total
      from public.golf_post_likes k join public.golf_posts p on p.id = k.post_id
     where p.author_id = any ((select ids from me)::text[]) and k.user_id <> p_user and p.deleted_at is null
    union all
    -- the boosted slice of a post's likes: one row, no actor, never attributed to a golfer
    select 'like', null, p.id, null, null, coalesce(p.likes_boost_recent_at, now() - interval '6 hours'), p.author_id, p.likes_boost_recent,
           (select count(*) from public.golf_post_likes k2 where k2.post_id = p.id) + coalesce(p.likes_boost, 0)
      from public.golf_posts p
     where p.author_id = any ((select ids from me)::text[]) and p.deleted_at is null and coalesce(p.likes_boost_recent, 0) > 0
    union all
    select 'comment', c.author_id, p.id, null, c.body, c.created_at, p.author_id, 1, null
      from public.golf_post_comments c join public.golf_posts p on p.id = c.post_id
     where p.author_id = any ((select ids from me)::text[]) and c.author_id <> p_user and c.deleted_at is null and p.deleted_at is null
    union all
    -- a mention in a comment on MY post is already there as a comment — don't say it twice
    select 'mention', m.author_id, p.id, null, coalesce(c.body, p.caption), m.created_at, p_user, 1, null
      from public.golf_mentions m join public.golf_posts p on p.id = m.post_id
      left join public.golf_post_comments c on c.id = m.comment_id
     where m.mentioned_id = p_user and m.author_id <> p_user
       and (m.comment_id is null or (c.deleted_at is null and p.author_id <> p_user))
       and public.gfd_can_see(p, p_user)
    union all
    select 'follow', f.follower_id, null, null, null, f.created_at, f.followee_id, 1, null from public.golf_follows f
     where f.followee_id = any ((select ids from me)::text[]) and f.follower_id <> p_user
    union all
    select 'enquiry', e.buyer_id, null, e.listing_id, l.title, e.created_at, p_user, 1, null
      from public.marketplace_enquiries e join public.marketplace_listings l on l.id = e.listing_id
     where e.seller_id = p_user and l.status <> 'deleted'
    union all
    select 'offer', o.buyer_line_id, null, o.listing_id, l.title || case when o.offer_amount is not null then ' · ฿' || o.offer_amount else '' end, o.created_at, p_user, 1, null
      from public.marketplace_offers o join public.marketplace_listings l on l.id = o.listing_id
     where l.seller_line_id = p_user and o.buyer_line_id <> p_user and l.status <> 'deleted'
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'type', a.type, 'actor', case when a.actor is not null then public.gfd_person(a.actor) end,
           'post_id', a.post_id, 'listing_id', a.listing_id, 'n', a.n, 'total', a.total,
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
$function$;
