-- ============================================================================================
-- TAP-IN "Caddy" post type (v1272, 2026-09-19)
-- Pete: "in the Post section lets add Caddy ... the tag will say Caddy just like great shot, course";
-- confirmed "No just add the Caddy chip" (a tag only — no link to a caddy profile).
-- ============================================================================================
alter table public.golf_posts drop constraint if exists golf_posts_kind_check;
alter table public.golf_posts add constraint golf_posts_kind_check
  check (kind in ('round','shot','course','caddy','gear','nineteenth','listing'));

create or replace function public.golf_post_create(p_user text, p_kind text, p_caption text, p_photos text[],
                                                   p_round uuid default null, p_audience text default 'everyone',
                                                   p_mentions text[] default null, p_video text default null, p_muted boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_ph   text;
  v_tail text;
  v_id   uuid;
begin
  if not public.gfd_is_user(p_user) then return jsonb_build_object('ok', false, 'reason', 'not_signed_in'); end if;
  if p_kind not in ('round','shot','course','caddy','gear','nineteenth') then return jsonb_build_object('ok', false, 'reason', 'bad_kind'); end if;
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
  if p_video is not null then
    if p_video !~ '^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/golf-feed-video/[^/]+/[A-Za-z0-9._-]+\.(mp4|webm|mov)$'
       or split_part(substring(p_video from '/golf-feed-video/(.*)$'), '/', 1) <> p_user or p_video like '%..%' then
      return jsonb_build_object('ok', false, 'reason', 'video_not_yours');
    end if;
    if cardinality(p_photos) <> 1 then return jsonb_build_object('ok', false, 'reason', 'video_one_cover'); end if;
  end if;
  if char_length(coalesce(p_caption, '')) > 2200 then return jsonb_build_object('ok', false, 'reason', 'caption_too_long'); end if;
  if p_round is not null and public.gfd_round(p_round, p_user) is null then
    return jsonb_build_object('ok', false, 'reason', 'round_not_yours');
  end if;
  if (select count(*) from public.golf_posts where author_id = p_user and created_at > now() - interval '1 day') >= 30 then
    return jsonb_build_object('ok', false, 'reason', 'too_many');
  end if;
  insert into public.golf_posts (author_id, kind, caption, photos, round_id, audience, video_url, muted, muted_by)
  values (p_user, p_kind, trim(coalesce(p_caption, '')), p_photos, p_round, p_audience, p_video,
          p_video is not null and coalesce(p_muted, false), case when p_video is not null and coalesce(p_muted, false) then 'author' end)
  returning id into v_id;
  perform public.gfd_save_mentions(p_user, v_id, null, trim(coalesce(p_caption, '')), p_mentions);
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

create or replace function public.golf_post_update(p_user text, p_post uuid, p_kind text, p_caption text, p_photos text[],
                                                   p_round uuid default null, p_audience text default 'everyone',
                                                   p_mentions text[] default null, p_video text default null, p_muted boolean default false)
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
  if p_kind not in ('round','shot','course','caddy','gear','nineteenth') then return jsonb_build_object('ok', false, 'reason', 'bad_kind'); end if;
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
  if p_video is not null then
    if p_video !~ '^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/golf-feed-video/[^/]+/[A-Za-z0-9._-]+\.(mp4|webm|mov)$'
       or split_part(substring(p_video from '/golf-feed-video/(.*)$'), '/', 1) <> p_user or p_video like '%..%' then
      return jsonb_build_object('ok', false, 'reason', 'video_not_yours');
    end if;
    if cardinality(p_photos) <> 1 then return jsonb_build_object('ok', false, 'reason', 'video_one_cover'); end if;
  end if;
  if char_length(v_cap) > 2200 then return jsonb_build_object('ok', false, 'reason', 'caption_too_long'); end if;
  if p_round is not null and public.gfd_round(p_round, p_user) is null then
    return jsonb_build_object('ok', false, 'reason', 'round_not_yours');
  end if;
  update public.golf_posts
     set kind = p_kind, caption = v_cap, photos = p_photos, round_id = p_round, audience = p_audience, edited_at = now(),
         video_url = p_video,
         -- an admin mute survives the author's edit; the author's own sound switch follows the edit
         muted = case when v_p.muted_by is not null and v_p.muted_by <> 'author' then v_p.muted
                      else p_video is not null and coalesce(p_muted, false) end,
         muted_by = case when v_p.muted_by is not null and v_p.muted_by <> 'author' then v_p.muted_by
                         when p_video is not null and coalesce(p_muted, false) then 'author' end
   where id = p_post;
  delete from public.golf_mentions m
   where m.post_id = p_post and m.comment_id is null
     and (p_mentions is null or not (m.mentioned_id = any (p_mentions))
          or position('@' || (public.gfd_person(m.mentioned_id)->>'name') in v_cap) = 0);
  perform public.gfd_save_mentions(p_user, p_post, null, v_cap, p_mentions);
  return jsonb_build_object('ok', true, 'id', p_post);
end $$;
