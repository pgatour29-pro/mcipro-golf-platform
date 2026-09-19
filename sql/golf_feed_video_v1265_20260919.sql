-- ============================================================================================
-- TAP-IN video (v1265, 2026-09-19)
-- Pete: video "cap it at 15 seconds"; on music: "how do we deal with copyright issues for music and
-- any other soundbyte". Decisions (proposed to Pete, building this way):
--   * a post is photos OR one video (<= 15 s, checked on the phone) with ONE cover photo in `photos`
--     (so every thumbnail path — wall tile, activity, profile grid — keeps working unchanged)
--   * the clip is shrunk to 720p on the phone; it lives in the public golf-feed-video bucket under
--     the uploader's own folder — golf_post_create / golf_post_update refuse any other path
--   * sound = only what the phone recorded; the author can post silently (muted, muted_by='author');
--     an admin can mute any clip (golf_post_mute, muted_by=<admin>) and the author's edit can't undo it
--   * "copyright" is a report reason (music or other audio the poster doesn't own)
-- ============================================================================================

alter table public.golf_posts add column if not exists video_url text;
alter table public.golf_posts add column if not exists muted boolean not null default false;
alter table public.golf_posts add column if not exists muted_by text;

alter table public.golf_post_reports drop constraint if exists golf_post_reports_reason_check;
alter table public.golf_post_reports add constraint golf_post_reports_reason_check
  check (reason in ('not_golf','offensive','spam','copyright','other'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('golf-feed-video', 'golf-feed-video', true, 26214400, array['video/mp4','video/webm','video/quicktime'])
on conflict (id) do update set public = true, file_size_limit = 26214400, allowed_mime_types = array['video/mp4','video/webm','video/quicktime'];
drop policy if exists "golf feed videos are public" on storage.objects;
create policy "golf feed videos are public" on storage.objects for select using (bucket_id = 'golf-feed-video');
drop policy if exists "golf feed video upload" on storage.objects;
create policy "golf feed video upload" on storage.objects for insert with check (
  bucket_id = 'golf-feed-video'
  and coalesce((metadata->>'size')::bigint, 0) <= 26214400
  and coalesce(metadata->>'mimetype', '') = any (array['video/mp4','video/webm','video/quicktime'])
);

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
    'video', p.video_url,
    'muted', p.muted,
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

drop function if exists public.golf_post_create(text,text,text,text[],uuid,text,text[]);
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

drop function if exists public.golf_post_update(text,uuid,text,text,text[],uuid,text,text[]);
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

create or replace function public.golf_post_report(p_user text, p_post uuid, p_reason text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_p public.golf_posts;
  v_n integer;
begin
  if not public.gfd_is_user(p_user) then return jsonb_build_object('ok', false, 'reason', 'not_signed_in'); end if;
  if p_reason not in ('not_golf','offensive','spam','copyright','other') then return jsonb_build_object('ok', false, 'reason', 'bad_reason'); end if;
  select * into v_p from public.golf_posts where id = p_post;
  if not found or not public.gfd_can_see(v_p, p_user) then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if v_p.author_id = p_user then return jsonb_build_object('ok', false, 'reason', 'own_post'); end if;
  insert into public.golf_post_reports (post_id, reporter_id, reason) values (p_post, p_user, p_reason) on conflict do nothing;
  if not found then return jsonb_build_object('ok', true, 'already', true); end if;
  -- admins read reports where they already work: Messages > Reports
  insert into public.support_reports (reporter_id, reporter_name, category, subject, body, source)
  values (p_user, public.gfd_person(p_user)->>'name', 'other', 'Tap-In post reported: ' || p_reason,
          'Post ' || p_post || ' by ' || (public.gfd_person(v_p.author_id)->>'name') || ' (' || v_p.author_id || ')' ||
          case when v_p.caption <> '' then E'\nCaption: ' || left(v_p.caption, 300) else '' end, 'golf_feed');
  select count(*) into v_n from public.golf_post_reports where post_id = p_post;
  if v_n >= 3 and v_p.hidden_at is null then
    update public.golf_posts set hidden_at = now(), hidden_by = 'reports' where id = p_post;
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- admins only: a clip plays silent for everyone (music / audio the poster doesn't own)
create or replace function public.golf_post_mute(p_user text, p_post uuid, p_on boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.golf_feed_admins where user_id = p_user) then return jsonb_build_object('ok', false, 'reason', 'not_admin'); end if;
  update public.golf_posts set muted = coalesce(p_on, false), muted_by = case when p_on then p_user end
   where id = p_post and video_url is not null;
  return jsonb_build_object('ok', found);
end $$;

do $$
declare f text;
begin
  foreach f in array array['golf_post_create(text,text,text,text[],uuid,text,text[],text,boolean)',
                           'golf_post_update(text,uuid,text,text,text[],uuid,text,text[],text,boolean)',
                           'golf_post_mute(text,uuid,boolean)', 'golf_post_report(text,uuid,text)']
  loop
    execute format('revoke all on function public.%s from public', f);
    execute format('grant execute on function public.%s to anon, authenticated', f);
  end loop;
  execute 'revoke all on function public.gfd_post_json(public.golf_posts,text) from public, anon, authenticated';
end $$;
