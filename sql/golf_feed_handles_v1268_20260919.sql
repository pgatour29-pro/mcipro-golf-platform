-- ============================================================================================
-- TAP-IN @handles + people search (v1268, 2026-09-19)
-- Pete: "for the followers and following show the users name and id and allow for others to find
-- those users and follow them as well". The "id" is an Instagram-style @handle — a LINE id is the
-- app's login here (identity is client-asserted until Phase-2 auth) and must never be shown.
--   * golf_feed_profiles.handle: unique, [a-z0-9._] 3-24, made from the golfer's name on first need
--     ("Opic, Brittany" → brittany.opic, then brittany.opic2 …), changeable in Edit profile
--   * only real logins (LINE U…, KAKAO-, GOOGLE…) get handles and appear in search
--   * mentions accept "@handle" as well as the older "@Full Name"
-- ============================================================================================

alter table public.golf_feed_profiles add column if not exists handle text;
create unique index if not exists golf_feed_profiles_handle_uq on public.golf_feed_profiles(handle) where handle is not null;
alter table public.golf_feed_profiles drop constraint if exists golf_feed_profiles_handle_ck;
alter table public.golf_feed_profiles add constraint golf_feed_profiles_handle_ck
  check (handle is null or (handle ~ '^[a-z0-9._]{3,24}$' and handle !~ '(^\.|\.$|\.\.)'));

create or replace function public.gfd_is_member(p_id text) returns boolean
language sql immutable as $$ select coalesce(p_id, '') ~ '^(U[0-9a-f]{32}$|KAKAO-|GOOGLE)' $$;

create or replace function public.gfd_handle_ok(p_handle text) returns text
language sql immutable as $$
  select case when p_handle is null or p_handle !~ '^[a-z0-9._]{3,24}$' or p_handle ~ '(^\.|\.$|\.\.)' then 'format'
              when p_handle in ('admin','admins','mycaddipro','tapin','tap.in','tap_in','support','official','help','caddy','caddie',
                                'proshop','organizer','moderator','staff','system','root','null','undefined','everyone') then 'reserved'
              else null end
$$;

-- first need: make one from the name, keep it unique
create or replace function public.gfd_ensure_handle(p_user text) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_h    text;
  v_name text;
  v_base text;
  v_c    text;
  n      integer := 1;
begin
  select handle into v_h from public.golf_feed_profiles where user_id = p_user;
  if v_h is not null then return v_h; end if;
  if not public.gfd_is_member(p_user) or not public.gfd_is_user(p_user) then return null; end if;
  v_name := public.gfd_person(p_user)->>'name';
  if v_name ~ ',' then v_name := trim(split_part(v_name, ',', 2)) || ' ' || trim(split_part(v_name, ',', 1)); end if;
  v_base := left(regexp_replace(regexp_replace(lower(coalesce(v_name, '')), '[^a-z0-9]+', '.', 'g'), '(^\.+|\.+$)', '', 'g'), 20);
  v_base := regexp_replace(v_base, '\.+$', '');
  if char_length(v_base) < 3 or public.gfd_handle_ok(v_base) is not null then v_base := 'golfer'; end if;
  loop
    v_c := case when n = 1 and v_base <> 'golfer' then v_base else v_base || n::text end;
    exit when public.gfd_handle_ok(v_c) is null and not exists (select 1 from public.golf_feed_profiles where handle = v_c);
    n := n + 1;
    if n > 9999 then return null; end if;
  end loop;
  insert into public.golf_feed_profiles (user_id, handle, updated_at) values (p_user, v_c, now())
  on conflict (user_id) do update set handle = coalesce(golf_feed_profiles.handle, excluded.handle);
  return (select handle from public.golf_feed_profiles where user_id = p_user);
end $$;

create or replace function public.gfd_person(p_id text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', p_id,
    'name', coalesce(nullif(trim(up.name), ''), nullif(trim(up.display_name), ''), nullif(trim(up.username), ''), 'Golfer'),
    'avatar', coalesce(nullif(up.profile_data->'media'->>'profilePhoto', ''), nullif(up.profile_data->>'linePictureUrl', ''), nullif(up.picture_url, '')),
    'handle', (select g.handle from public.golf_feed_profiles g where g.user_id = x.id))
  from (select p_id as id) x left join public.user_profiles up on up.line_user_id = x.id
$$;

create or replace function public.gfd_save_mentions(p_author text, p_post uuid, p_comment uuid, p_text text, p_ids text[]) returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_id   text;
  v_name text;
  v_n    integer := 0;
begin
  if p_ids is null then return 0; end if;
  foreach v_id in array p_ids[1:10] loop
    continue when v_id is null or v_id = p_author or not public.gfd_is_user(v_id);
    v_name := public.gfd_person(v_id)->>'name';
    -- "@Full Name" (older posts) or "@handle"
    continue when position('@' || v_name in coalesce(p_text, '')) = 0
              and position('@' || coalesce((select handle from public.golf_feed_profiles where user_id = v_id), '#none#') in lower(coalesce(p_text, ''))) = 0;
    insert into public.golf_mentions (post_id, comment_id, author_id, mentioned_id)
    values (p_post, p_comment, p_author, v_id) on conflict do nothing;
    if found then v_n := v_n + 1; end if;
  end loop;
  return v_n;
end $$;

create or replace function public.golf_mark_seen(p_user text, p_what text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.gfd_is_user(p_user) then return jsonb_build_object('ok', false); end if;
  perform public.gfd_ensure_handle(p_user);   -- a golfer opening Tap-In gets a handle
  insert into public.golf_feed_seen (user_id, feed_seen_at, activity_seen_at, following_seen_at)
  values (p_user, case when p_what = 'feed' then now() end, case when p_what = 'activity' then now() end,
          case when p_what = 'following' then now() end)
  on conflict (user_id) do update
    set feed_seen_at      = case when p_what = 'feed' then now() else golf_feed_seen.feed_seen_at end,
        activity_seen_at  = case when p_what = 'activity' then now() else golf_feed_seen.activity_seen_at end,
        following_seen_at = case when p_what = 'following' then now() else golf_feed_seen.following_seen_at end;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.golf_follow_list(p_user text, p_target text, p_which text) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(public.gfd_person(x.id) || jsonb_build_object(
           'i_follow', exists (select 1 from public.golf_follows f where f.follower_id = p_user and f.followee_id = x.id),
           'follows_me', exists (select 1 from public.golf_follows f where f.follower_id = x.id and f.followee_id = p_user),
           'is_me', x.id = p_user) order by x.created_at desc), '[]'::jsonb)
  from (select case when p_which = 'following' then f.followee_id else f.follower_id end as id, f.created_at
        from public.golf_follows f
        where case when p_which = 'following' then f.follower_id else f.followee_id end = p_target
        order by f.created_at desc limit 500) x
$$;

create or replace function public.golf_handle_available(p_user text, p_handle text) returns jsonb
language sql stable security definer set search_path = public as $$
  select case when public.gfd_handle_ok(lower(trim(coalesce(p_handle, '')))) is not null
              then jsonb_build_object('ok', true, 'available', false, 'reason', public.gfd_handle_ok(lower(trim(coalesce(p_handle, '')))))
              when exists (select 1 from public.golf_feed_profiles where handle = lower(trim(p_handle)) and user_id <> p_user)
              then jsonb_build_object('ok', true, 'available', false, 'reason', 'taken')
              else jsonb_build_object('ok', true, 'available', true) end
$$;

drop function if exists public.golf_profile_update(text, text);
create or replace function public.golf_profile_update(p_user text, p_bio text, p_handle text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_h text := lower(trim(coalesce(p_handle, '')));
begin
  if not public.gfd_is_user(p_user) then return jsonb_build_object('ok', false, 'reason', 'not_signed_in'); end if;
  if char_length(trim(coalesce(p_bio, ''))) > 160 then return jsonb_build_object('ok', false, 'reason', 'too_long'); end if;
  if p_handle is not null then
    if public.gfd_handle_ok(v_h) is not null then return jsonb_build_object('ok', false, 'reason', 'handle_' || public.gfd_handle_ok(v_h)); end if;
    if exists (select 1 from public.golf_feed_profiles where handle = v_h and user_id <> p_user) then return jsonb_build_object('ok', false, 'reason', 'handle_taken'); end if;
  end if;
  insert into public.golf_feed_profiles (user_id, bio, handle, updated_at) values (p_user, trim(coalesce(p_bio, '')), nullif(v_h, ''), now())
  on conflict (user_id) do update set bio = excluded.bio, handle = coalesce(nullif(v_h, ''), golf_feed_profiles.handle), updated_at = now();
  return jsonb_build_object('ok', true, 'handle', (select handle from public.golf_feed_profiles where user_id = p_user));
end $$;

-- find golfers: name or @handle, real logins only; people I follow, then my followers, then name-start matches
create or replace function public.golf_people_search(p_user text, p_q text) returns jsonb
language sql stable security definer set search_path = public as $$
  with q as (select lower(regexp_replace(trim(coalesce(p_q, '')), '^@', '')) as s)
  select coalesce(jsonb_agg(public.gfd_person(x.id) || jsonb_build_object('i_follow', x.rank = 0 or x.fol, 'follows_me', x.fme)
                            order by x.rank, x.starts, x.nm), '[]'::jsonb)
  from (
    select up.line_user_id as id, coalesce(nullif(trim(up.name), ''), up.display_name) as nm,
           exists (select 1 from public.golf_follows f where f.follower_id = p_user and f.followee_id = up.line_user_id) as fol,
           exists (select 1 from public.golf_follows f where f.followee_id = p_user and f.follower_id = up.line_user_id) as fme,
           case when exists (select 1 from public.golf_follows f where f.follower_id = p_user and f.followee_id = up.line_user_id) then 0
                when exists (select 1 from public.golf_follows f where f.followee_id = p_user and f.follower_id = up.line_user_id) then 1
                else 2 end as rank,
           case when lower(coalesce(nullif(trim(up.name), ''), up.display_name, '')) like (select s from q) || '%' or g.handle like (select s from q) || '%' then 0
                when lower(coalesce(nullif(trim(up.name), ''), up.display_name, '')) ~ ('(^|[\s,])' || regexp_replace((select s from q), '([.*+?^${}()|\[\]\\])', '\\\1', 'g')) then 1
                else 2 end as starts
    from public.user_profiles up
    left join public.golf_feed_profiles g on g.user_id = up.line_user_id
    where char_length((select s from q)) >= 2
      and up.line_user_id <> coalesce(p_user, '')
      and public.gfd_is_member(up.line_user_id)
      and (lower(coalesce(nullif(trim(up.name), ''), up.display_name, '')) like '%' || replace(replace((select s from q), '%', ''), '_', '\_') || '%'
           or g.handle like '%' || replace(replace((select s from q), '%', ''), '_', '\_') || '%')
    order by rank, starts, nm
    limit 12
  ) x
$$;

-- "Suggested for you": people who follow me that I don't follow back, then golfers posting lately
create or replace function public.golf_people_suggest(p_user text) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(public.gfd_person(x.id) || jsonb_build_object('i_follow', false, 'follows_me', x.fme) order by x.k, x.ts desc), '[]'::jsonb)
  from (
    select id, bool_or(fme) fme, min(k) k, max(ts) ts from (
      select f.follower_id as id, true as fme, 0 as k, f.created_at as ts from public.golf_follows f
       where f.followee_id = p_user
         and not exists (select 1 from public.golf_follows b where b.follower_id = p_user and b.followee_id = f.follower_id)
      union all
      select p.author_id, false, 1, max(p.created_at) from public.golf_posts p
       where p.deleted_at is null and p.hidden_at is null and p.author_id <> p_user and p.created_at > now() - interval '30 days'
         and not exists (select 1 from public.golf_follows b where b.follower_id = p_user and b.followee_id = p.author_id)
       group by p.author_id
    ) u where public.gfd_is_member(id)
    group by id order by min(k), max(ts) desc limit 12
  ) x
$$;

do $$
declare f text;
begin
  foreach f in array array['golf_handle_available(text,text)', 'golf_profile_update(text,text,text)', 'golf_people_search(text,text)',
                           'golf_people_suggest(text)', 'golf_follow_list(text,text,text)', 'golf_mark_seen(text,text)']
  loop
    execute format('revoke all on function public.%s from public', f);
    execute format('grant execute on function public.%s to anon, authenticated', f);
  end loop;
  foreach f in array array['gfd_ensure_handle(text)', 'gfd_person(text)', 'gfd_save_mentions(text,uuid,uuid,text,text[])']
  loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
  end loop;
end $$;

-- every real login gets a handle now (oldest accounts first, so they get the plain ones)
do $$
declare r record;
begin
  for r in select line_user_id from public.user_profiles where public.gfd_is_member(line_user_id) order by created_at nulls last loop
    perform public.gfd_ensure_handle(r.line_user_id);
  end loop;
end $$;
