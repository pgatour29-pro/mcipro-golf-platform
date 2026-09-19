-- Tap-In pages (v1278, 2026-09-19). Pete: "make sure society organizers and golf course have their own
-- Tap-in profiles so they also can add to the feed" + "also the caddies" + "anyone in any department in
-- the golf course can have a Tap-in". Approved mockups: design-mockups/tapin-pages/.
--
-- A PAGE is an author id that is not a person:
--   'society:<society_profiles.id>'  posted by the society's organizer account, its organizer team
--                                    (society_organizer_roles) and Tap-In admins
--   'course:<courses.id>'            posted by the course's staff (user_profiles.managed_course_id + a staff
--                                    role / is_staff — every department) and Tap-In admins
-- Caddies post as themselves; their profile carries a caddy badge from caddy_profiles.
-- Page ids are never "users": gfd_is_user() still only accepts real logins, so nothing can sign in as a page.

alter table public.golf_posts add column if not exists posted_by text;   -- who really posted a page's post (never shown)

-- a course row that gets a page: the facility, not its nines / loops / combos
create or replace function public.gfd_course_page_ok(p_course text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.courses c where c.id = p_course
                  and c.name !~* '( nine\y|nine \(| loop$|\(with |\+|- course [a-z]\y|- (east|west) course)')
$$;

-- a nine / combo row -> its facility's page ('phoenix_lake' -> 'phoenix_gold', 'greenwood_a' -> 'greenwood')
create or replace function public.gfd_course_page_id(p_course text) returns text
language plpgsql stable security definer set search_path = public as $$
declare v_stem text := p_course; v_hit text[];
begin
  if p_course is null or p_course = '' then return null; end if;
  if public.gfd_course_page_ok(p_course) then return p_course; end if;
  while v_stem ~ '_' loop
    v_stem := regexp_replace(v_stem, '_[^_]*$', '');
    if public.gfd_course_page_ok(v_stem) then return v_stem; end if;
    v_hit := array(select c.id from public.courses c where c.id like replace(v_stem, '_', '\_') || '\_%' and public.gfd_course_page_ok(c.id));
    if cardinality(v_hit) = 1 then return v_hit[1]; end if;
  end loop;
  return null;
end $$;

create or replace function public.gfd_is_page(p_id text) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when coalesce(p_id, '') ~ '^society:[0-9a-f-]{36}$' then exists (select 1 from public.society_profiles s where s.id::text = substr(p_id, 9))
    when coalesce(p_id, '') ~ '^course:[A-Za-z0-9_-]+$' then public.gfd_course_page_ok(substr(p_id, 8))
    else false end
$$;

-- society logos are stored relative ('./societylogos/jgts.jpg'): the app serves them from its own origin
create or replace function public.gfd_logo_url(p_logo text) returns text
language sql immutable as $$
  select case when p_logo is null or trim(p_logo) = '' then null
              when p_logo ~* '^https://' then p_logo
              when p_logo ~ '^\.?/?[A-Za-z0-9._/-]+$' and p_logo !~ '\.\.' then 'https://mycaddipro.com/' || regexp_replace(p_logo, '^\.?/', '')
              else null end
$$;

-- the ids this login may post as: itself, its societies, its course
create or replace function public.gfd_acting_ids(p_user text) returns text[]
language sql stable security definer set search_path = public as $$
  select case when not public.gfd_is_user(p_user) then array[]::text[] else
    array[p_user]
    || coalesce(array(select 'society:' || s.id::text from public.society_profiles s
                       where s.organizer_id = p_user
                          or exists (select 1 from public.society_organizer_roles r where r.organizer_id = s.organizer_id and r.user_id = p_user)
                          or exists (select 1 from public.golf_feed_admins a where a.user_id = p_user)
                       order by s.society_name), '{}'::text[])
    || coalesce(array(select 'course:' || public.gfd_course_page_id(up.managed_course_id) from public.user_profiles up
                       where up.line_user_id = p_user and public.gfd_course_page_id(up.managed_course_id) is not null
                         and (coalesce(up.is_staff, false)
                              or up.role in ('manager','golf_course_manager','proshop','caddymaster','marketing','maintenance','admin','staff')
                              or exists (select 1 from public.golf_feed_admins a where a.user_id = p_user))), '{}'::text[])
  end
$$;

create or replace function public.gfd_can_act(p_user text, p_as text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(p_as, '') <> '' and p_as = any (public.gfd_acting_ids(p_user))
$$;

-- a person, a page or a caddy, as every screen shows it
create or replace function public.gfd_person(p_id text) returns jsonb
language sql stable security definer set search_path = public as $$
  select case
    when p_id like 'society:%' then coalesce((
      select jsonb_build_object('id', p_id, 'name', s.society_name, 'avatar', public.gfd_logo_url(s.society_logo),
                                'kind', 'society', 'verified', true,
                                'handle', (select g.handle from public.golf_feed_profiles g where g.user_id = p_id))
      from public.society_profiles s where s.id::text = substr(p_id, 9)), jsonb_build_object('id', p_id, 'name', 'Society', 'kind', 'society'))
    when p_id like 'course:%' then coalesce((
      select jsonb_build_object('id', p_id, 'name', c.name, 'avatar', null, 'kind', 'course', 'verified', true,
                                'handle', (select g.handle from public.golf_feed_profiles g where g.user_id = p_id))
      from public.courses c where c.id = substr(p_id, 8)), jsonb_build_object('id', p_id, 'name', 'Golf course', 'kind', 'course'))
    else (
      select jsonb_build_object(
        'id', p_id,
        'name', coalesce(nullif(trim(up.name), ''), nullif(trim(up.display_name), ''), nullif(trim(up.username), ''), 'Golfer'),
        -- a caddy without a profile picture shows her roster photo
        'avatar', coalesce(nullif(up.profile_data->'media'->>'profilePhoto', ''), nullif(up.profile_data->>'linePictureUrl', ''), nullif(up.picture_url, ''), cd.photo),
        'handle', (select g.handle from public.golf_feed_profiles g where g.user_id = x.id),
        'kind', case when cd.c is not null then 'caddy' else 'golfer' end,
        'caddy', cd.c)
      from (select p_id as id) x
      left join public.user_profiles up on up.line_user_id = x.id
      left join lateral (
        select jsonb_build_object('number', cp.caddy_number, 'course', cp.course_name) as c,
               case when cp.photo_url ~ '^https://' then cp.photo_url end as photo
          from public.caddy_profiles cp
         where cp.user_id = x.id and coalesce(cp.caddy_number, '') <> '' and cp.course_id is not null
           and coalesce(cp.is_active, true) and not coalesce(cp.is_mock, false)
         order by cp.updated_at desc nulls last limit 1) cd on true)
  end
$$;

-- handles: people from their name (unchanged); pages from the page name, whole words, 24 max
create or replace function public.gfd_ensure_handle(p_user text) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_h    text;
  v_name text;
  v_base text;
  v_fb   text;
  v_c    text;
  n      integer := 1;
begin
  select handle into v_h from public.golf_feed_profiles where user_id = p_user;
  if v_h is not null then return v_h; end if;
  if public.gfd_is_page(p_user) then
    v_name := regexp_replace(public.gfd_person(p_user)->>'name', '\([^)]*\)', '', 'g');
    v_base := regexp_replace(regexp_replace(lower(coalesce(v_name, '')), '[^a-z0-9]+', '.', 'g'), '(^\.+|\.+$)', '', 'g');
    while char_length(v_base) > 24 and v_base ~ '\.' loop v_base := regexp_replace(v_base, '\.[^.]*$', ''); end loop;
    v_base := regexp_replace(left(v_base, 24), '\.+$', '');
    v_base := regexp_replace(v_base, '\.(and|the|of|at)$', '');   -- never end on a joining word
    v_fb := case when p_user like 'society:%' then 'golf.society' else 'golf.course' end;
  else
    if not public.gfd_is_member(p_user) or not public.gfd_is_user(p_user) then return null; end if;
    v_name := public.gfd_person(p_user)->>'name';
    if v_name ~ ',' then v_name := trim(split_part(v_name, ',', 2)) || ' ' || trim(split_part(v_name, ',', 1)); end if;
    v_base := left(regexp_replace(regexp_replace(lower(coalesce(v_name, '')), '[^a-z0-9]+', '.', 'g'), '(^\.+|\.+$)', '', 'g'), 20);
    v_base := regexp_replace(v_base, '\.+$', '');
    v_fb := 'golfer';
  end if;
  if char_length(v_base) < 3 or public.gfd_handle_ok(v_base) is not null then v_base := v_fb; end if;
  loop
    v_c := case when n = 1 and v_base <> v_fb then v_base else left(v_base, 24 - char_length(n::text)) || n::text end;
    exit when public.gfd_handle_ok(v_c) is null and not exists (select 1 from public.golf_feed_profiles where handle = v_c);
    n := n + 1;
    if n > 9999 then return null; end if;
  end loop;
  insert into public.golf_feed_profiles (user_id, handle, updated_at) values (p_user, v_c, now())
  on conflict (user_id) do update set handle = coalesce(golf_feed_profiles.handle, excluded.handle);
  return (select handle from public.golf_feed_profiles where user_id = p_user);
end $$;

-- "Post as": me first, then my societies, then my course
create or replace function public.golf_my_pages(p_user text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_ids text[] := public.gfd_acting_ids(p_user); v_id text;
begin
  foreach v_id in array v_ids loop perform public.gfd_ensure_handle(v_id); end loop;
  return coalesce((select jsonb_agg(public.gfd_person(i.id) order by i.o) from unnest(v_ids) with ordinality as i(id, o)), '[]'::jsonb);
end $$;

-- the page's own staff see its followers-only and hidden posts like their own
create or replace function public.gfd_can_see(p_post public.golf_posts, p_user text) returns boolean
language sql stable security definer set search_path = public as $$
  select p_post.deleted_at is null
     and (p_post.hidden_at is null or p_post.author_id = p_user or exists (select 1 from public.golf_feed_admins a where a.user_id = p_user)
          or (p_post.author_id ~ '^(society|course):' and public.gfd_can_act(p_user, p_post.author_id)))
     and (p_post.audience = 'everyone' or p_post.author_id = p_user
          or exists (select 1 from public.golf_follows f where f.follower_id = p_user and f.followee_id = p_post.author_id)
          or (p_post.author_id ~ '^(society|course):' and public.gfd_can_act(p_user, p_post.author_id)))
     and (p_post.kind <> 'listing' or exists (select 1 from public.marketplace_listings l where l.id = p_post.listing_id and l.status = 'active'))
$$;

create or replace function public.gfd_post_json(p public.golf_posts, p_user text) returns jsonb
language sql stable security definer set search_path = public as $$
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
    -- the names under a post: up to two REAL likers, people I follow first (never a boosted number's "people")
    'liked_by', coalesce((select jsonb_agg(jsonb_build_object('id', x.user_id, 'name', public.gfd_person(x.user_id)->>'name') order by x.f, x.created_at desc)
                          from (select k.user_id, k.created_at,
                                       case when exists (select 1 from public.golf_follows f where f.follower_id = p_user and f.followee_id = k.user_id) then 0 else 1 end as f
                                from public.golf_post_likes k where k.post_id = p.id and k.user_id <> p_user
                                order by 3, k.created_at desc limit 2) x), '[]'::jsonb),
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
$$;

-- posting: p_as = the page (or null = me). Photos stay in the uploader's own folder.
drop function if exists public.golf_post_create(text, text, text, text[], uuid, text, text[], text, boolean);
create or replace function public.golf_post_create(p_user text, p_kind text, p_caption text, p_photos text[], p_round uuid default null,
                                                   p_audience text default 'everyone', p_mentions text[] default null,
                                                   p_video text default null, p_muted boolean default false, p_as text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_ph     text;
  v_tail   text;
  v_id     uuid;
  v_author text := coalesce(nullif(p_as, ''), p_user);
begin
  if not public.gfd_is_user(p_user) then return jsonb_build_object('ok', false, 'reason', 'not_signed_in'); end if;
  if v_author <> p_user and not public.gfd_can_act(p_user, v_author) then return jsonb_build_object('ok', false, 'reason', 'not_your_page'); end if;
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
  if p_round is not null and (v_author <> p_user or public.gfd_round(p_round, p_user) is null) then
    return jsonb_build_object('ok', false, 'reason', 'round_not_yours');
  end if;
  if (select count(*) from public.golf_posts where coalesce(posted_by, author_id) = p_user and created_at > now() - interval '1 day') >= 30 then
    return jsonb_build_object('ok', false, 'reason', 'too_many');
  end if;
  insert into public.golf_posts (author_id, posted_by, kind, caption, photos, round_id, audience, video_url, muted, muted_by)
  values (v_author, p_user, p_kind, trim(coalesce(p_caption, '')), p_photos, p_round, p_audience, p_video,
          p_video is not null and coalesce(p_muted, false), case when p_video is not null and coalesce(p_muted, false) then 'author' end)
  returning id into v_id;
  perform public.gfd_save_mentions(v_author, v_id, null, trim(coalesce(p_caption, '')), p_mentions);
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

-- editing: the author, or anyone who may post as the page. Photos already on the post may stay
-- (another staff member edits a colleague's page post); new ones come from the editor's own folder.
create or replace function public.golf_post_update(p_user text, p_post uuid, p_kind text, p_caption text, p_photos text[], p_round uuid default null,
                                                   p_audience text default 'everyone', p_mentions text[] default null,
                                                   p_video text default null, p_muted boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_p    public.golf_posts;
  v_ph   text;
  v_tail text;
  v_cap  text := trim(coalesce(p_caption, ''));
  v_page boolean;
begin
  if not public.gfd_is_user(p_user) then return jsonb_build_object('ok', false, 'reason', 'not_signed_in'); end if;
  select * into v_p from public.golf_posts where id = p_post for update;
  if not found or v_p.deleted_at is not null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  v_page := v_p.author_id ~ '^(society|course):';
  if v_p.author_id <> p_user and not (v_page and public.gfd_can_act(p_user, v_p.author_id)) then return jsonb_build_object('ok', false, 'reason', 'not_yours'); end if;
  if v_p.kind = 'listing' then return jsonb_build_object('ok', false, 'reason', 'is_listing'); end if;
  if p_kind not in ('round','shot','course','caddy','gear','nineteenth') then return jsonb_build_object('ok', false, 'reason', 'bad_kind'); end if;
  if coalesce(p_audience, '') not in ('everyone','followers') then return jsonb_build_object('ok', false, 'reason', 'bad_audience'); end if;
  if coalesce(cardinality(p_photos), 0) not between 1 and 10 then return jsonb_build_object('ok', false, 'reason', 'photos'); end if;
  foreach v_ph in array p_photos loop
    continue when v_ph = any (v_p.photos);
    if v_ph !~ '^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/golf-feed/' then
      return jsonb_build_object('ok', false, 'reason', 'photo_not_uploaded');
    end if;
    v_tail := substring(v_ph from '/golf-feed/(.*)$');
    if split_part(v_tail, '/', 1) <> p_user or v_tail !~ '^[^/]+/[A-Za-z0-9._-]+$' or v_tail like '%..%' then
      return jsonb_build_object('ok', false, 'reason', 'photo_not_yours');
    end if;
  end loop;
  if p_video is not null and p_video is distinct from v_p.video_url then
    if p_video !~ '^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/golf-feed-video/[^/]+/[A-Za-z0-9._-]+\.(mp4|webm|mov)$'
       or split_part(substring(p_video from '/golf-feed-video/(.*)$'), '/', 1) <> p_user or p_video like '%..%' then
      return jsonb_build_object('ok', false, 'reason', 'video_not_yours');
    end if;
  end if;
  if p_video is not null and cardinality(p_photos) <> 1 then return jsonb_build_object('ok', false, 'reason', 'video_one_cover'); end if;
  if char_length(v_cap) > 2200 then return jsonb_build_object('ok', false, 'reason', 'caption_too_long'); end if;
  if p_round is not null and (v_page or public.gfd_round(p_round, p_user) is null) then
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
  perform public.gfd_save_mentions(v_p.author_id, p_post, null, v_cap, p_mentions);
  return jsonb_build_object('ok', true, 'id', p_post);
end $$;

create or replace function public.golf_post_delete(p_user text, p_post uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_p public.golf_posts;
begin
  select * into v_p from public.golf_posts where id = p_post;
  if not found or v_p.deleted_at is not null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if v_p.author_id <> p_user and not (v_p.author_id ~ '^(society|course):' and public.gfd_can_act(p_user, v_p.author_id)) then
    return jsonb_build_object('ok', false, 'reason', 'not_yours');
  end if;
  if v_p.kind = 'listing' then return jsonb_build_object('ok', false, 'reason', 'is_listing'); end if;
  update public.golf_posts set deleted_at = now() where id = p_post;
  return jsonb_build_object('ok', true);
end $$;

-- profiles: a page (society / course) or a person (a caddy gets her caddy card)
create or replace function public.golf_profile(p_user text, p_target text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v jsonb; v_today date := (now() at time zone 'Asia/Bangkok')::date;
begin
  if public.gfd_is_page(p_target) then
    v := public.gfd_person(p_target) || jsonb_build_object(
      'is_me', false, 'is_page', true,
      'can_post', public.gfd_can_act(p_user, p_target),
      'bio', coalesce((select bio from public.golf_feed_profiles where user_id = p_target), ''),
      'posts', (select count(*) from public.golf_posts p where p.author_id = p_target and public.gfd_can_see(p, p_user)),
      'followers', (select count(*) from public.golf_follows where followee_id = p_target),
      'following', 0,
      'i_follow', exists (select 1 from public.golf_follows where follower_id = p_user and followee_id = p_target),
      'follows_me', false,
      'is_admin', exists (select 1 from public.golf_feed_admins where user_id = p_user));
    if p_target like 'society:%' then
      v := v || coalesce((select jsonb_build_object(
          'society_id', s.id,
          'since', (s.created_at at time zone 'Asia/Bangkok')::date,
          'events_week', (select count(*) from public.society_events e
                           where e.society_id = s.id
                             and e.status = 'published' and not coalesce(e.is_private, false)
                             and e.event_date between v_today and v_today + 6),
          'events_month', (select count(*) from public.society_events e
                            where e.society_id = s.id
                              and e.status = 'published' and not coalesce(e.is_private, false)
                              and e.event_date between v_today and v_today + 29))
        from public.society_profiles s where s.id::text = substr(p_target, 9)), '{}'::jsonb);
    else
      v := v || coalesce((select jsonb_build_object(
          'course_id', c.id, 'holes', c.total_holes, 'par', c.par, 'location', c.location,
          'caddies', (select count(*) from public.caddy_profiles cp
                       where cp.course_id = c.id and coalesce(cp.is_active, true) and not coalesce(cp.is_mock, false)))
        from public.courses c where c.id = substr(p_target, 8)), '{}'::jsonb);
    end if;
    return v;
  end if;
  return (
    select public.gfd_person(t.id) || jsonb_build_object(
      'is_me', t.id = p_user,
      'bio', coalesce((select bio from public.golf_feed_profiles where user_id = t.id), ''),
      'since', coalesce(up.member_since, (up.created_at at time zone 'Asia/Bangkok')::date),
      -- a golfer's society is shown to themselves only (society isolation)
      'society', case when t.id = p_user then nullif(trim(coalesce(up.society_name, '')), '') end,
      'posts', (select count(*) from public.golf_posts p where p.author_id = t.id and public.gfd_can_see(p, p_user)),
      'followers', (select count(*) from public.golf_follows where followee_id = t.id),
      'following', (select count(*) from public.golf_follows where follower_id = t.id),
      'i_follow', exists (select 1 from public.golf_follows where follower_id = p_user and followee_id = t.id),
      'follows_me', exists (select 1 from public.golf_follows where follower_id = t.id and followee_id = p_user),
      'hcp', coalesce((select sh.handicap_index from public.society_handicaps sh where sh.golfer_id = t.id and sh.society_id is null
                       order by sh.updated_at desc nulls last limit 1), up.handicap_index),
      'rounds', (select count(*) from public.rounds r where r.golfer_id = t.id),
      'best', (select min(r.total_gross) from public.rounds r
               where r.golfer_id = t.id and r.status = 'completed' and r.total_gross > 0 and coalesce(r.holes_played, 18) = 18
                 and not public.is_team_round(r.scoring_formats, r.team_size, r.scramble_config, r.game_config, r.society_event_id)),
      'is_admin', exists (select 1 from public.golf_feed_admins where user_id = p_user),
      -- the caddy card: her own course's numbers, from the booking system (never typed here)
      'caddy_card', (select jsonb_build_object('caddy_id', cp.id, 'number', cp.caddy_number, 'course', cp.course_name, 'course_id', cp.course_id,
                                               'rating', cp.rating, 'reviews', coalesce(cp.total_reviews, 0), 'rounds', coalesce(cp.total_rounds, 0),
                                               'years', coalesce(cp.experience_years, 0))
                       from public.caddy_profiles cp
                      where cp.user_id = t.id and coalesce(cp.caddy_number, '') <> '' and cp.course_id is not null
                        and coalesce(cp.is_active, true) and not coalesce(cp.is_mock, false)
                      order by cp.updated_at desc nulls last limit 1))
    from (select p_target as id) t join public.user_profiles up on up.line_user_id = t.id);
end $$;

-- a page can be followed like a golfer; only people follow
create or replace function public.golf_follow(p_user text, p_target text, p_on boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.gfd_is_user(p_user) then return jsonb_build_object('ok', false, 'reason', 'not_signed_in'); end if;
  if p_target = p_user or not (public.gfd_is_user(p_target) or public.gfd_is_page(p_target)) then return jsonb_build_object('ok', false, 'reason', 'bad_target'); end if;
  if p_on then insert into public.golf_follows (follower_id, followee_id) values (p_user, p_target) on conflict do nothing;
  else delete from public.golf_follows where follower_id = p_user and followee_id = p_target; end if;
  return jsonb_build_object('ok', true, 'i_follow', p_on,
                            'followers', (select count(*) from public.golf_follows where followee_id = p_target));
end $$;

-- edit a profile: mine, or a page I post for (p_as)
drop function if exists public.golf_profile_update(text, text, text);
create or replace function public.golf_profile_update(p_user text, p_bio text, p_handle text default null, p_as text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_h text := lower(trim(coalesce(p_handle, ''))); v_who text := coalesce(nullif(p_as, ''), p_user);
begin
  if not public.gfd_is_user(p_user) then return jsonb_build_object('ok', false, 'reason', 'not_signed_in'); end if;
  if v_who <> p_user and not public.gfd_can_act(p_user, v_who) then return jsonb_build_object('ok', false, 'reason', 'not_your_page'); end if;
  if char_length(trim(coalesce(p_bio, ''))) > 160 then return jsonb_build_object('ok', false, 'reason', 'too_long'); end if;
  if p_handle is not null then
    if public.gfd_handle_ok(v_h) is not null then return jsonb_build_object('ok', false, 'reason', 'handle_' || public.gfd_handle_ok(v_h)); end if;
    if exists (select 1 from public.golf_feed_profiles where handle = v_h and user_id <> v_who) then return jsonb_build_object('ok', false, 'reason', 'handle_taken'); end if;
  end if;
  insert into public.golf_feed_profiles (user_id, bio, handle, updated_at) values (v_who, trim(coalesce(p_bio, '')), nullif(v_h, ''), now())
  on conflict (user_id) do update set bio = excluded.bio, handle = coalesce(nullif(v_h, ''), golf_feed_profiles.handle), updated_at = now();
  return jsonb_build_object('ok', true, 'handle', (select handle from public.golf_feed_profiles where user_id = v_who));
end $$;

drop function if exists public.golf_handle_available(text, text);
create or replace function public.golf_handle_available(p_user text, p_handle text, p_as text default null) returns jsonb
language sql stable security definer set search_path = public as $$
  select case when public.gfd_handle_ok(lower(trim(coalesce(p_handle, '')))) is not null
              then jsonb_build_object('ok', true, 'available', false, 'reason', public.gfd_handle_ok(lower(trim(coalesce(p_handle, '')))))
              when exists (select 1 from public.golf_feed_profiles where handle = lower(trim(p_handle)) and user_id <> coalesce(nullif(p_as, ''), p_user))
              then jsonb_build_object('ok', true, 'available', false, 'reason', 'taken')
              else jsonb_build_object('ok', true, 'available', true) end
$$;

-- search: golfers and caddies (as before) + society and course pages
create or replace function public.golf_people_search(p_user text, p_q text) returns jsonb
language sql stable security definer set search_path = public as $$
  with q as (select lower(regexp_replace(trim(coalesce(p_q, '')), '^@', '')) as s),
  qq as (select s, replace(replace(s, '%', ''), '_', '\_') as l,
                '(^|[\s,(-])' || regexp_replace(s, '([.*+?^${}()|\[\]\\])', '\\\1', 'g') as w from q),
  people as (
    select up.line_user_id as id, coalesce(nullif(trim(up.name), ''), up.display_name) as nm,
           exists (select 1 from public.golf_follows f where f.follower_id = p_user and f.followee_id = up.line_user_id) as fol,
           exists (select 1 from public.golf_follows f where f.followee_id = p_user and f.follower_id = up.line_user_id) as fme,
           case when exists (select 1 from public.golf_follows f where f.follower_id = p_user and f.followee_id = up.line_user_id) then 0
                when exists (select 1 from public.golf_follows f where f.followee_id = p_user and f.follower_id = up.line_user_id) then 1
                else 2 end as rank,
           case when lower(coalesce(nullif(trim(up.name), ''), up.display_name, '')) like (select s from qq) || '%' or g.handle like (select s from qq) || '%' then 0
                when lower(coalesce(nullif(trim(up.name), ''), up.display_name, '')) ~ (select w from qq) then 1
                else 2 end as starts, 1 as pg
    from public.user_profiles up
    left join public.golf_feed_profiles g on g.user_id = up.line_user_id
    where char_length((select s from qq)) >= 2
      and up.line_user_id <> coalesce(p_user, '')
      and public.gfd_is_member(up.line_user_id)
      and (lower(coalesce(nullif(trim(up.name), ''), up.display_name, '')) like '%' || (select l from qq) || '%'
           or g.handle like '%' || (select l from qq) || '%')
    order by rank, starts, nm
    limit 12),
  pages as (
    select x.id, x.nm,
           exists (select 1 from public.golf_follows f where f.follower_id = p_user and f.followee_id = x.id) as fol, false as fme,
           case when exists (select 1 from public.golf_follows f where f.follower_id = p_user and f.followee_id = x.id) then 0 else 2 end as rank,
           case when lower(x.nm) like (select s from qq) || '%' or g.handle like (select s from qq) || '%' then 0
                when lower(x.nm) ~ (select w from qq) then 1 else 2 end as starts, 0 as pg
    from (select 'society:' || s.id::text as id, s.society_name as nm from public.society_profiles s
          union all
          select 'course:' || c.id, c.name from public.courses c where public.gfd_course_page_ok(c.id)) x
    left join public.golf_feed_profiles g on g.user_id = x.id
    where char_length((select s from qq)) >= 2
      and (lower(x.nm) like '%' || (select l from qq) || '%' or g.handle like '%' || (select l from qq) || '%')
    order by rank, starts, x.nm
    limit 6)
  select coalesce(jsonb_agg(public.gfd_person(x.id) || jsonb_build_object('i_follow', x.fol, 'follows_me', x.fme)
                            order by x.rank, x.starts, x.pg, x.nm), '[]'::jsonb)
  from (select * from people union all select * from pages) x
$$;

-- suggestions: people and pages who post, my followers I don't follow back, my own society's page
create or replace function public.golf_people_suggest(p_user text) returns jsonb
language sql stable security definer set search_path = public as $$
  with me as (select public.gfd_acting_ids(p_user) as ids)
  select coalesce(jsonb_agg(public.gfd_person(x.id) || jsonb_build_object('i_follow', false, 'follows_me', x.fme) order by x.k, x.ts desc), '[]'::jsonb)
  from (
    select id, bool_or(fme) fme, min(k) k, max(ts) ts from (
      select f.follower_id as id, true as fme, 0 as k, f.created_at as ts from public.golf_follows f
       where f.followee_id = p_user
      union all
      -- the golfer's OWN society page (their membership only — never another society's)
      select 'society:' || m.society_id::text, false, 0, now() from public.society_members m
       where m.golfer_id = p_user and m.society_id is not null
      union all
      select 'society:' || up.society_id::text, false, 0, now() from public.user_profiles up
       where up.line_user_id = p_user and up.society_id is not null
      union all
      select p.author_id, false, 1, max(p.created_at) from public.golf_posts p
       where p.deleted_at is null and p.hidden_at is null and p.author_id <> p_user and p.created_at > now() - interval '30 days'
       group by p.author_id
    ) u where (public.gfd_is_member(id) or public.gfd_is_page(id))
          and not exists (select 1 from public.golf_follows b where b.follower_id = p_user and b.followee_id = u.id)
          and u.id <> coalesce(p_user, '') and not (u.id = any ((select ids from me)::text[]))
    group by id order by min(k), max(ts) desc limit 12
  ) x
$$;

-- activity: my posts AND the posts of the pages I post for (likes, comments, follows of the page)
create or replace function public.golf_activity(p_user text) returns jsonb
language sql stable security definer set search_path = public as $$
  with seen as (select coalesce((select activity_seen_at from public.golf_feed_seen where user_id = p_user), '-infinity'::timestamptz) as seen_at),
  me as (select public.gfd_acting_ids(p_user) as ids),
  a as (
    select 'like' as type, k.user_id as actor, p.id as post_id, null::uuid as listing_id, null::text as body, k.created_at as ts, p.author_id as owner
      from public.golf_post_likes k join public.golf_posts p on p.id = k.post_id
     where p.author_id = any ((select ids from me)::text[]) and k.user_id <> p_user and p.deleted_at is null
    union all
    select 'comment', c.author_id, p.id, null, c.body, c.created_at, p.author_id
      from public.golf_post_comments c join public.golf_posts p on p.id = c.post_id
     where p.author_id = any ((select ids from me)::text[]) and c.author_id <> p_user and c.deleted_at is null and p.deleted_at is null
    union all
    -- a mention in a comment on MY post is already there as a comment — don't say it twice
    select 'mention', m.author_id, p.id, null, coalesce(c.body, p.caption), m.created_at, p_user
      from public.golf_mentions m join public.golf_posts p on p.id = m.post_id
      left join public.golf_post_comments c on c.id = m.comment_id
     where m.mentioned_id = p_user and m.author_id <> p_user
       and (m.comment_id is null or (c.deleted_at is null and p.author_id <> p_user))
       and public.gfd_can_see(p, p_user)
    union all
    select 'follow', f.follower_id, null, null, null, f.created_at, f.followee_id from public.golf_follows f
     where f.followee_id = any ((select ids from me)::text[]) and f.follower_id <> p_user
    union all
    select 'enquiry', e.buyer_id, null, e.listing_id, l.title, e.created_at, p_user
      from public.marketplace_enquiries e join public.marketplace_listings l on l.id = e.listing_id
     where e.seller_id = p_user and l.status <> 'deleted'
    union all
    select 'offer', o.buyer_line_id, null, o.listing_id, l.title || case when o.offer_amount is not null then ' · ฿' || o.offer_amount else '' end, o.created_at, p_user
      from public.marketplace_offers o join public.marketplace_listings l on l.id = o.listing_id
     where l.seller_line_id = p_user and o.buyer_line_id <> p_user and l.status <> 'deleted'
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'type', a.type, 'actor', public.gfd_person(a.actor), 'post_id', a.post_id, 'listing_id', a.listing_id,
           'body', a.body, 'at', a.ts, 'is_new', a.ts > (select seen_at from seen),
           -- which of my pages it happened on (null = me)
           'page', case when a.owner is distinct from p_user then public.gfd_person(a.owner) end,
           'i_follow', exists (select 1 from public.golf_follows f where f.follower_id = p_user and f.followee_id = a.actor),
           'thumb', case
              when a.post_id is not null then (select case when p.kind = 'listing' then (select l.images[1] from public.marketplace_listings l where l.id = p.listing_id) else p.photos[1] end
                                               from public.golf_posts p where p.id = a.post_id)
              when a.listing_id is not null then (select l.images[1] from public.marketplace_listings l where l.id = a.listing_id) end)
         order by a.ts desc), '[]'::jsonb)
  from (select * from a order by ts desc limit 80) a
$$;

-- grants: the app calls these with the anon key (p_user = the LINE login, as every Tap-In RPC)
do $$
declare f text;
begin
  foreach f in array array['golf_post_create(text,text,text,text[],uuid,text,text[],text,boolean,text)',
                           'golf_post_update(text,uuid,text,text,text[],uuid,text,text[],text,boolean)',
                           'golf_post_delete(text,uuid)', 'golf_profile(text,text)', 'golf_follow(text,text,boolean)',
                           'golf_profile_update(text,text,text,text)', 'golf_handle_available(text,text,text)',
                           'golf_people_search(text,text)', 'golf_people_suggest(text)', 'golf_activity(text)', 'golf_my_pages(text)']
  loop
    execute format('revoke all on function public.%s from public', f);
    execute format('grant execute on function public.%s to anon, authenticated', f);
  end loop;
  foreach f in array array['gfd_course_page_ok(text)', 'gfd_course_page_id(text)', 'gfd_is_page(text)', 'gfd_logo_url(text)',
                           'gfd_acting_ids(text)', 'gfd_can_act(text,text)', 'gfd_person(text)', 'gfd_ensure_handle(text)',
                           'gfd_can_see(golf_posts,text)', 'gfd_post_json(golf_posts,text)']
  loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
  end loop;
end $$;

-- page handles: the societies' own short names, every course from its name
do $$
declare r record;
begin
  for r in select 'society:' || s.id::text as id,
                  case when s.society_name ilike 'Travellers Rest%' then 'trgg'
                       when s.society_name ilike 'JGTS%' then 'jgts'
                       when s.society_name ilike 'JOA%' then 'joagolf' end as h
             from public.society_profiles s loop
    if r.h is not null and not exists (select 1 from public.golf_feed_profiles where handle = r.h) then
      insert into public.golf_feed_profiles (user_id, handle, updated_at) values (r.id, r.h, now())
      on conflict (user_id) do update set handle = coalesce(golf_feed_profiles.handle, excluded.handle);
    end if;
    perform public.gfd_ensure_handle(r.id);
  end loop;
  for r in select 'course:' || c.id as id from public.courses c where public.gfd_course_page_ok(c.id) order by c.name loop
    perform public.gfd_ensure_handle(r.id);
  end loop;
end $$;
