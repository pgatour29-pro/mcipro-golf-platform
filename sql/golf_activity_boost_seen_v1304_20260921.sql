-- ============================================================================================
-- v1304 (Pete 2026-09-21): the cube pushes when likes ARRIVE, not on every reload.
--
-- Pete: "with every reload the same likes are showing up on the cube when there are no new
-- likes, it only needs to push when new likes or comments or messages come in".
--
-- Cause — a rolling timestamp used as a watermark. golf_activity's boosted-likes row has no
-- row of its own to take a `created_at` from, so v1288 invented one at READ time:
--
--     coalesce(p.likes_boost_recent_at, now() - make_interval(secs => (epoch(now()) % 2400)))
--
-- and v1291 deliberately keeps `likes_boost_recent_at` NULL so the "· 16m" stamp AGES instead
-- of pinning to one instant. That is right for the LABEL and fatal for `is_new`, which is
-- `ts > activity_seen_at`: the invented ts is never older than 40 minutes, so 40 minutes after
-- the golfer opens Activity the boosted slice is "new" again — and stays new, for ever, on
-- every reload. Measured on prod before this patch: Pete marked Activity seen at 14:15Z, and at
-- 22:58Z (8h43m later) golf_nav_counts still answered {"activity_new":22,"likes":22} — the same
-- 22 likes lighting the cube badge, the pill and the red Likes chip every single load.
--
-- Real like rows (k.created_at), comments, mentions, follows and 19th Hole rows all carry a real
-- stored timestamp, so they were never affected — they go quiet the moment Activity is opened.
--
-- Fix — split the two jobs the timestamp was doing:
--   * `at`     (display) keeps rolling, so the stamp still ages. Untouched.
--   * `anchor` (new/not-new) is a STORED instant: when this post's boost was last changed.
-- A new column `likes_boost_set_at` records that, maintained by a trigger so no future ops SQL
-- can forget it. Bump a boost → anchor moves to now() → it counts as new once, the cube pushes,
-- the golfer opens Activity → seen_at passes the anchor → silent until the next real change.
--
-- RULE for anything added to golf_activity later: is_new must compare a value that was STORED
-- when the thing happened. Never one derived from now().
-- ============================================================================================

-- 1. when this post's boost last changed ----------------------------------------------------
alter table public.golf_posts add column if not exists likes_boost_set_at timestamptz;

-- Backfill in the past, not at now(): the boosts on prod today are ones Pete has already seen,
-- so they must settle quietly instead of firing the cube one last time.
update public.golf_posts
   set likes_boost_set_at = coalesce(likes_boost_recent_at, created_at)
 where likes_boost_set_at is null
   and (coalesce(likes_boost, 0) > 0 or coalesce(likes_boost_recent, 0) > 0);

create or replace function public.gfd_stamp_boost() returns trigger
 language plpgsql
 SET search_path TO 'public'
as $function$
begin
  if tg_op = 'INSERT' then
    if coalesce(new.likes_boost, 0) > 0 or coalesce(new.likes_boost_recent, 0) > 0 then
      new.likes_boost_set_at := coalesce(new.likes_boost_set_at, now());
    end if;
  elsif new.likes_boost is distinct from old.likes_boost
     or new.likes_boost_recent is distinct from old.likes_boost_recent then
    new.likes_boost_set_at := now();
  end if;
  return new;
end
$function$;

drop trigger if exists trg_gfd_stamp_boost on public.golf_posts;
create trigger trg_gfd_stamp_boost before insert or update on public.golf_posts
  for each row execute function public.gfd_stamp_boost();

-- 2. is_new reads the anchor, `at` keeps rolling --------------------------------------------
-- (live prosrc of v1297 + an `anchor` column on every branch; nothing else changed)
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
           null::integer as window_h, k.created_at as anchor
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
           coalesce(p.likes_boost_set_at, p.likes_boost_recent_at, p.created_at)
      from public.golf_posts p
     where p.author_id = any ((select ids from me)::text[]) and p.deleted_at is null and coalesce(p.likes_boost_recent, 0) > 0
    union all
    select 'comment', c.author_id, p.id, null, c.body, c.created_at, p.author_id, 1, null, null, c.created_at
      from public.golf_post_comments c join public.golf_posts p on p.id = c.post_id
     where p.author_id = any ((select ids from me)::text[]) and c.author_id <> p_user and c.deleted_at is null and p.deleted_at is null
    union all
    -- a mention in a comment on MY post is already there as a comment — don't say it twice
    select 'mention', m.author_id, p.id, null, coalesce(c.body, p.caption), m.created_at, p_user, 1, null, null, m.created_at
      from public.golf_mentions m join public.golf_posts p on p.id = m.post_id
      left join public.golf_post_comments c on c.id = m.comment_id
     where m.mentioned_id = p_user and m.author_id <> p_user
       and (m.comment_id is null or (c.deleted_at is null and p.author_id <> p_user))
       and public.gfd_can_see(p, p_user)
    union all
    select 'follow', f.follower_id, null, null, null, f.created_at, f.followee_id, 1, null, null, f.created_at from public.golf_follows f
     where f.followee_id = any ((select ids from me)::text[]) and f.follower_id <> p_user
    union all
    select 'enquiry', e.buyer_id, null, e.listing_id, l.title, e.created_at, p_user, 1, null, null, e.created_at
      from public.marketplace_enquiries e join public.marketplace_listings l on l.id = e.listing_id
     where e.seller_id = p_user and l.status <> 'deleted'
    union all
    select 'offer', o.buyer_line_id, null, o.listing_id, l.title || case when o.offer_amount is not null then ' · ฿' || o.offer_amount else '' end, o.created_at, p_user, 1, null, null, o.created_at
      from public.marketplace_offers o join public.marketplace_listings l on l.id = o.listing_id
     where l.seller_line_id = p_user and o.buyer_line_id <> p_user and l.status <> 'deleted'
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'type', a.type, 'actor', case when a.actor is not null then public.gfd_person(a.actor) end,
           'post_id', a.post_id, 'listing_id', a.listing_id, 'n', a.n, 'total', a.total, 'window_h', a.window_h,
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
$function$
;
