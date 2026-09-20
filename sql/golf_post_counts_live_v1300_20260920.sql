-- ============================================================================================
-- v1300 (Pete 2026-09-20): "I want it pushed all the time" / "As new likes come".
--
-- The like count only moved when the feed refetched. This is the read behind a live repaint:
-- the NUMBERS for the posts currently on screen, in one call.
--
-- It returns counts and the caller's own like/save state — never a liker. That is deliberate:
-- v1297 stopped the API handing out who liked what, and a live-updating endpoint is exactly the
-- kind of thing that would quietly put it back. A number is not a name.
--
-- Capped at 60 ids: the wall renders far fewer, and an unbounded array is a free table scan for
-- anyone holding the anon key.
-- ============================================================================================

create or replace function public.golf_post_counts(p_user text, p_ids uuid[]) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id',       p.id,
           'likes',    (select count(*) from public.golf_post_likes k where k.post_id = p.id) + coalesce(p.likes_boost, 0),
           'comments', (select count(*) from public.golf_post_comments c where c.post_id = p.id and c.deleted_at is null),
           'i_liked',  exists (select 1 from public.golf_post_likes k where k.post_id = p.id and k.user_id = p_user),
           'i_saved',  exists (select 1 from public.golf_post_saves s where s.post_id = p.id and s.user_id = p_user))), '[]'::jsonb)
    from public.golf_posts p
   where p.id = any (p_ids[1:60])
     and p.deleted_at is null
     and public.gfd_can_see(p, p_user)
$$;

revoke all on function public.golf_post_counts(text,uuid[]) from public;
grant execute on function public.golf_post_counts(text,uuid[]) to anon, authenticated;
