-- ============================================================================================
-- TAP-IN: the author can edit a post (v1264, 2026-09-19)
-- Pete: "Make the post editable by the author, currently can't edit only delete".
-- golf_post_update = the only writer of an edit. Same rules as golf_post_create (author only, own
-- photos in golf-feed/<author>/, own finished round, 1-10 photos, caption <= 2200); a 19th Hole
-- listing post is edited through its listing, never here. Caption mentions are re-derived:
-- a golfer no longer tagged (or whose "@Name" left the text) loses the mention; a new tag is
-- added through gfd_save_mentions; a tag that stays keeps its original time (no second alert).
-- edited_at marks the post "Edited".
-- ============================================================================================

alter table public.golf_posts add column if not exists edited_at timestamptz;

create or replace function public.gfd_post_json(p public.golf_posts, p_user text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', p.id, 'kind', p.kind, 'caption', p.caption, 'audience', p.audience, 'created_at', p.created_at,
    'photos', case when p.kind = 'listing' then to_jsonb(coalesce((select l.images from public.marketplace_listings l where l.id = p.listing_id), '{}'::text[]))
                   else to_jsonb(p.photos) end,
    'author', public.gfd_person(p.author_id),
    'mine', p.author_id = p_user,
    'hidden', p.hidden_at is not null,
    'edited_at', p.edited_at,
    'mentions', public.gfd_mentions(p.id, null),
    'likes', (select count(*) from public.golf_post_likes k where k.post_id = p.id),
    'i_liked', exists (select 1 from public.golf_post_likes k where k.post_id = p.id and k.user_id = p_user),
    'i_saved', exists (select 1 from public.golf_post_saves s where s.post_id = p.id and s.user_id = p_user),
    'comments', (select count(*) from public.golf_post_comments c where c.post_id = p.id and c.deleted_at is null),
    'recent', coalesce((select jsonb_agg(jsonb_build_object('name', public.gfd_person(c.author_id)->>'name', 'author_id', c.author_id, 'body', c.body,
                                                            'mentions', public.gfd_mentions(p.id, c.id)) order by c.created_at)
                        from (select * from public.golf_post_comments c where c.post_id = p.id and c.deleted_at is null
                              order by c.created_at desc limit 2) c), '[]'::jsonb),
    'round', case when p.round_id is not null then public.gfd_round(p.round_id, p.author_id) end,
    'listing', case when p.listing_id is not null then public.gfd_listing(p.listing_id, p_user) end)
$$;

create or replace function public.golf_post_update(p_user text, p_post uuid, p_kind text, p_caption text, p_photos text[],
                                                   p_round uuid default null, p_audience text default 'everyone',
                                                   p_mentions text[] default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_p    public.golf_posts;
  v_ph   text;
  v_tail text;
  v_cap  text := trim(coalesce(p_caption, ''));
begin
  if not public.gfd_is_user(p_user) then return jsonb_build_object('ok', false, 'reason', 'not_signed_in'); end if;
  select * into v_p from public.golf_posts where id = p_post for update;
  if not found or v_p.deleted_at is not null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if v_p.author_id <> p_user then return jsonb_build_object('ok', false, 'reason', 'not_yours'); end if;
  if v_p.kind = 'listing' then return jsonb_build_object('ok', false, 'reason', 'is_listing'); end if;
  if p_kind not in ('round','shot','course','gear','nineteenth') then return jsonb_build_object('ok', false, 'reason', 'bad_kind'); end if;
  if coalesce(p_audience, '') not in ('everyone','followers') then return jsonb_build_object('ok', false, 'reason', 'bad_audience'); end if;
  if coalesce(cardinality(p_photos), 0) not between 1 and 10 then return jsonb_build_object('ok', false, 'reason', 'photos'); end if;
  foreach v_ph in array p_photos loop
    if v_ph !~ '^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/golf-feed/' then
      return jsonb_build_object('ok', false, 'reason', 'photo_not_uploaded');
    end if;
    v_tail := substring(v_ph from '/golf-feed/(.*)$');
    if split_part(v_tail, '/', 1) <> p_user or v_tail !~ '^[^/]+/[A-Za-z0-9._-]+$' or v_tail like '%..%' then
      return jsonb_build_object('ok', false, 'reason', 'photo_not_yours');
    end if;
  end loop;
  if char_length(v_cap) > 2200 then return jsonb_build_object('ok', false, 'reason', 'caption_too_long'); end if;
  if p_round is not null and public.gfd_round(p_round, p_user) is null then
    return jsonb_build_object('ok', false, 'reason', 'round_not_yours');
  end if;
  update public.golf_posts
     set kind = p_kind, caption = v_cap, photos = p_photos, round_id = p_round, audience = p_audience, edited_at = now()
   where id = p_post;
  delete from public.golf_mentions m
   where m.post_id = p_post and m.comment_id is null
     and (p_mentions is null or not (m.mentioned_id = any (p_mentions))
          or position('@' || (public.gfd_person(m.mentioned_id)->>'name') in v_cap) = 0);
  perform public.gfd_save_mentions(p_user, p_post, null, v_cap, p_mentions);
  return jsonb_build_object('ok', true, 'id', p_post);
end $$;

revoke all on function public.golf_post_update(text,uuid,text,text,text[],uuid,text,text[]) from public;
grant execute on function public.golf_post_update(text,uuid,text,text,text[],uuid,text,text[]) to anon, authenticated;
revoke all on function public.gfd_post_json(public.golf_posts,text) from public, anon, authenticated;
