-- ============================================================================================
-- v1302 (Pete 2026-09-20): "What about the algorithm".
--
-- Until now golf_feed was `order by created_at desc` and nothing else. This ranks the EVERYONE
-- wall by how a post is actually doing, so the magazine hero (v1301, mockup B) is the best post
-- on screen instead of merely the newest.
--
-- THE SCORE (gfd_hot):  (likes + 3 x comments) / 2 ^ (age_hours / 36)
--   * likes = the DISPLAYED count, operator boost included — a boosted post is meant to look
--     popular, so it has to rank popular too, or Pete's 97 sits under a post with 4.
--   * a comment is worth 3 likes: it costs more to write one.
--   * 36h half-life: a post from this morning beats last month's with twice the likes. Without
--     decay the same photo owns the hero for ever and the wall stops moving.
--   * views are NOT in the score. Nothing in the schema records one, and storing who looked at
--     what is a new pile of personal data three hours after we stopped exposing who LIKED what
--     (v1297). That is Pete's call to make, not mine — see the note at the bottom.
--
-- RANKED WITHIN THE PAGE WINDOW, not globally: the candidate set is still the newest v_lim posts
-- behind the cursor, and the score only decides their order. That keeps paging honest (no post
-- skipped, none shown twice) and stops an old monster post pinning itself to page 1 for ever.
--
-- Only the EVERYONE wall ranks. Following stays strictly newest-first — people expect to see what
-- their friends just posted, in order — and author/saved/post are untouched.
--
-- Paging had to change with it: the client used to take the cursor from the LAST post in the
-- array, which was the oldest only while the order was chronological. The server now returns the
-- window's own min(created_at) as `cursor`, so the client stops guessing.
-- ============================================================================================

create or replace function public.gfd_hot(p public.golf_posts) returns numeric
language sql stable security definer set search_path = public as $$
  select ( (select count(*) from public.golf_post_likes k where k.post_id = p.id) + coalesce(p.likes_boost, 0)
           + 3 * (select count(*) from public.golf_post_comments c where c.post_id = p.id and c.deleted_at is null)
         )::numeric
         / power(2, greatest(extract(epoch from (now() - p.created_at)), 0) / 3600.0 / 36.0)
$$;

revoke all on function public.gfd_hot(public.golf_posts) from public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.golf_feed(p_user text, p_scope text DEFAULT 'everyone'::text, p_author text DEFAULT NULL::text, p_before timestamp with time zone DEFAULT NULL::timestamp with time zone, p_limit integer DEFAULT 15, p_post uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_lim    integer := least(greatest(coalesce(p_limit, 15), 1), 60);
  v_ranked boolean := coalesce(p_scope, 'everyone') = 'everyone';
  v_posts  jsonb;
  v_n      integer;
  v_cursor timestamptz;
begin
  with cand as materialized (
    select p.* from public.golf_posts p
    where public.gfd_can_see(p, p_user)
      and (p_before is null or p.created_at < p_before)
      and case coalesce(p_scope, 'everyone')
            when 'post'      then p.id = p_post
            when 'author'    then p.author_id = p_author
            when 'saved'     then exists (select 1 from public.golf_post_saves s where s.post_id = p.id and s.user_id = p_user)
            when 'following' then p.author_id = p_user or exists (select 1 from public.golf_follows f where f.follower_id = p_user and f.followee_id = p.author_id)
            else true end
    order by p.created_at desc
    limit v_lim + 1
  ),
  -- the look-ahead row is dropped HERE, by date, before the score can reorder it away
  win as (select * from cand order by created_at desc limit v_lim)
  select coalesce(jsonb_agg(public.gfd_post_json(win, p_user)
                            order by case when v_ranked then public.gfd_hot(win) end desc nulls last,
                                     win.created_at desc), '[]'::jsonb),
         (select count(*) from cand),
         min(win.created_at)
    into v_posts, v_n, v_cursor
  from win;

  return jsonb_build_object('posts', v_posts, 'more', v_n > v_lim, 'cursor', v_cursor);
end $function$;

-- ---------------------------------------------------------------------------------------------
-- NOT BUILT, ON PURPOSE: view tracking.
-- Pete's first question asked for "most viewed and popular". Popular is live above. Most viewed
-- needs a new table keyed (post, viewer) to dedupe a scroll from a read — i.e. a durable record of
-- which golfer looked at which post. That is a bigger privacy surface than likes, and it would be
-- built the same day likes were made anonymous. It ships when Pete says it ships.
-- ---------------------------------------------------------------------------------------------
