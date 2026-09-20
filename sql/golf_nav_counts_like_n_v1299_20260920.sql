-- ============================================================================================
-- v1299 (Pete 2026-09-20): the cube counts LIKES, not like ROWS.
--
-- Pete: "make sure to match the numbers in other sections". Raising the post to 97 exposed the
-- last place the two disagree: golf_nav_counts counted `count(*)` over new activity rows, but a
-- like row can CARRY a count — the boosted slice is ONE row worth 22 likes (v1288). So the moment
-- that row goes new, the Tap-In cube would say "1 like" while the Activity list under it says
-- "23 in the past 6 hours", and the numeric badge would read 1.
--
-- This is FUCKUPS-grade déjà vu: v1292 fixed exactly this for the Activity chips ("the chip counts
-- rows while the row counts likes"). The cube badge was the same bug one screen over, still live.
--
-- Fix: `act` carries n, and the two numbers that mean "how much is new" add it up. Every non-like
-- branch of golf_activity emits n = 1, so sum(n) is a no-op for mentions/comments/follows/mkp.
-- ============================================================================================

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
    -- the Tap-In intro toast: until the golfer opens Tap-In or dismisses it
    'intro', (select f from s) is null
             and coalesce((select intro_dismissed_at from public.golf_feed_seen where user_id = p_user), null) is null)
$function$

;
