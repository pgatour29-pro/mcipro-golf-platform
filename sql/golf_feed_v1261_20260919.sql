-- ============================================================================================
-- GOLF FEED + 19th HOLE UPGRADE (v1261, 2026-09-19)
-- Pete: "let's create a golf specific instagram and marketplace ... allow following and
-- subscribers just like instagram and put it into their personal feed". Approved mockups:
-- design-mockups/golf-feed/ (the mockup is the spec).
--
-- Decisions (Pete, 2026-09-19): following is free; a post is seen by everyone on MyCaddiPro
-- unless the author picks "Followers only"; the feed never appears in society organizer
-- dashboards; the 19th Hole gains a listing chat in Messages, Reserve / Sold to a buyer who
-- asked, listings on the wall, and a hand-over at a society event both people are registered for.
--
-- Shape:
--   * Every table here is RLS-on with NO client policy. Reads and writes go through the
--     SECURITY DEFINER functions below, which take the caller's id (p_user) like the rest of the
--     app does until Phase-2 auth. "Followers only" is therefore enforced by these functions,
--     not by the database's own identity — say so, never claim it is locked.
--   * A Verified round is READ from `rounds` at every view (the round must be the author's and
--     completed) — it is never stored on the post, so nobody can type a score.
--   * A 19th Hole listing becomes a wall post automatically (trigger), and it is visible exactly
--     while the listing is active. Its photos are the listing's own, read at view time.
--   * Listing history is a log (`marketplace_listing_events`) written by a trigger, so EVERY
--     surface that changes a listing (old Mark-sold button, offers, the new Reserve / Sold to) is
--     recorded. The acting user comes from the `gfd.actor` setting the RPCs set.
-- ============================================================================================

-- ---------------------------------------------------------------- tables
create table if not exists public.golf_posts (
  id          uuid primary key default gen_random_uuid(),
  author_id   text not null,
  kind        text not null check (kind in ('round','shot','course','gear','nineteenth','listing')),
  caption     text not null default '' check (char_length(caption) <= 2200),
  photos      text[] not null default '{}',
  round_id    uuid references public.rounds(id) on delete set null,
  listing_id  uuid references public.marketplace_listings(id) on delete cascade,
  audience    text not null default 'everyone' check (audience in ('everyone','followers')),
  created_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  hidden_at   timestamptz,
  hidden_by   text,
  constraint golf_posts_photos_ck check (kind = 'listing' or cardinality(photos) between 1 and 10),
  constraint golf_posts_listing_ck check ((kind = 'listing') = (listing_id is not null))
);
create unique index if not exists golf_posts_listing_uq on public.golf_posts(listing_id) where listing_id is not null;
create index if not exists golf_posts_wall_ix on public.golf_posts(created_at desc) where deleted_at is null;
create index if not exists golf_posts_author_ix on public.golf_posts(author_id, created_at desc);

create table if not exists public.golf_post_likes (
  post_id    uuid not null references public.golf_posts(id) on delete cascade,
  user_id    text not null,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create table if not exists public.golf_post_saves (
  post_id    uuid not null references public.golf_posts(id) on delete cascade,
  user_id    text not null,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create table if not exists public.golf_post_comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.golf_posts(id) on delete cascade,
  author_id  text not null,
  body       text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists golf_post_comments_post_ix on public.golf_post_comments(post_id, created_at);
create table if not exists public.golf_follows (
  follower_id text not null,
  followee_id text not null,
  created_at  timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
create index if not exists golf_follows_followee_ix on public.golf_follows(followee_id);
create table if not exists public.golf_feed_profiles (
  user_id    text primary key,
  bio        text not null default '' check (char_length(bio) <= 160),
  updated_at timestamptz not null default now()
);
create table if not exists public.golf_feed_seen (
  user_id          text primary key,
  feed_seen_at     timestamptz,
  activity_seen_at timestamptz
);
create table if not exists public.golf_post_reports (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.golf_posts(id) on delete cascade,
  reporter_id text not null,
  reason      text not null check (reason in ('not_golf','offensive','spam','other')),
  created_at  timestamptz not null default now(),
  unique (post_id, reporter_id)
);
create table if not exists public.golf_feed_admins (user_id text primary key);
insert into public.golf_feed_admins values ('U2b6d976f19bca4b2f4374ae0e10ed873') on conflict do nothing;

-- 19th Hole
alter table public.marketplace_listings
  add column if not exists reserved_for      text,
  add column if not exists reserved_at       timestamptz,
  add column if not exists sold_to           text,
  add column if not exists sold_at           timestamptz,
  add column if not exists handover_event_id uuid references public.society_events(id) on delete set null;

create table if not exists public.marketplace_enquiries (
  listing_id uuid not null references public.marketplace_listings(id) on delete cascade,
  buyer_id   text not null,
  seller_id  text not null,
  created_at timestamptz not null default now(),
  last_at    timestamptz not null default now(),
  primary key (listing_id, buyer_id)
);
create index if not exists marketplace_enquiries_pair_ix on public.marketplace_enquiries(buyer_id, seller_id, last_at desc);
create index if not exists marketplace_enquiries_seller_ix on public.marketplace_enquiries(seller_id, last_at desc);

create table if not exists public.marketplace_listing_events (
  id         bigserial primary key,
  listing_id uuid not null references public.marketplace_listings(id) on delete cascade,
  actor_id   text,
  event      text not null check (event in ('listed','reserved','unreserved','sold','relisted','deleted','expired','handover_set','handover_cleared')),
  buyer_id   text,
  event_id   uuid,
  created_at timestamptz not null default now()
);
create index if not exists marketplace_listing_events_ix on public.marketplace_listing_events(listing_id, created_at);

alter table public.golf_posts                 enable row level security;
alter table public.golf_post_likes            enable row level security;
alter table public.golf_post_saves            enable row level security;
alter table public.golf_post_comments         enable row level security;
alter table public.golf_follows               enable row level security;
alter table public.golf_feed_profiles         enable row level security;
alter table public.golf_feed_seen             enable row level security;
alter table public.golf_post_reports          enable row level security;
alter table public.golf_feed_admins           enable row level security;
alter table public.marketplace_enquiries      enable row level security;
alter table public.marketplace_listing_events enable row level security;

-- ---------------------------------------------------------------- storage: the feed's photos
-- Public bucket (the app shows photos by URL, like the 19th Hole). The browser shrinks every
-- photo to a JPEG first (EXIF and GPS gone) and screens it (image-screen, fails closed).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('golf-feed', 'golf-feed', true, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 2097152, allowed_mime_types = array['image/jpeg','image/png','image/webp'];
drop policy if exists "golf feed photos are public" on storage.objects;
create policy "golf feed photos are public" on storage.objects for select using (bucket_id = 'golf-feed');
drop policy if exists "golf feed photo upload" on storage.objects;
create policy "golf feed photo upload" on storage.objects for insert with check (
  bucket_id = 'golf-feed'
  and coalesce((metadata->>'size')::integer, 0) <= 2097152
  and coalesce(metadata->>'mimetype', '') = any (array['image/jpeg','image/png','image/webp'])
);

-- ---------------------------------------------------------------- helpers
create or replace function public.gfd_person(p_id text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', p_id,
    'name', coalesce(nullif(trim(up.name), ''), nullif(trim(up.display_name), ''), nullif(trim(up.username), ''), 'Golfer'),
    'avatar', coalesce(nullif(up.profile_data->'media'->>'profilePhoto', ''), nullif(up.profile_data->>'linePictureUrl', ''), nullif(up.picture_url, '')))
  from (select p_id as id) x left join public.user_profiles up on up.line_user_id = x.id
$$;

-- "TRGG" from "TRGG - BURAPHA C-D"; otherwise the society's name
create or replace function public.gfd_event_label(p_event uuid) returns text
language sql stable security definer set search_path = public as $$
  select case when e.title ~ '^\s*[A-Za-z0-9]{2,6}\s+-\s' then upper(trim(split_part(e.title, ' - ', 1)))
              else coalesce(sp.society_name, s.name, '') end
  from public.society_events e
  left join public.society_profiles sp on sp.id = e.society_id
  left join public.societies s on s.id = e.society_id
  where e.id = p_event
$$;

create or replace function public.gfd_bkk_today() returns date
language sql stable as $$ select (now() at time zone 'Asia/Bangkok')::date $$;

create or replace function public.gfd_registered(p_event uuid, p_user text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.event_registrations r
                 where r.event_id = p_event and r.player_id = p_user and coalesce(r.status, 'registered') <> 'cancelled')
$$;

create or replace function public.gfd_round(p_round uuid, p_author text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', r.id, 'course', r.course_name, 'gross', r.total_gross, 'pts', r.total_stableford,
    'hcp', r.handicap_used, 'holes', r.holes_played,
    'date', coalesce((r.played_at at time zone 'UTC')::date, (r.completed_at at time zone 'Asia/Bangkok')::date),
    'team', public.is_team_round(r.scoring_formats, r.team_size, r.scramble_config, r.game_config, r.society_event_id),
    'society', case when r.society_event_id is not null then public.gfd_event_label(r.society_event_id) end)
  from public.rounds r
  where r.id = p_round and r.golfer_id = p_author and r.status = 'completed' and coalesce(r.total_gross, 0) > 0
$$;

create or replace function public.gfd_handover(p_event uuid, p_seller text, p_viewer text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'event_id', e.id, 'society', public.gfd_event_label(e.id), 'course', e.course_name, 'date', e.event_date,
    'seller_registered', public.gfd_registered(e.id, p_seller),
    'viewer_registered', case when p_viewer is null or p_viewer = p_seller then null else public.gfd_registered(e.id, p_viewer) end)
  from public.society_events e
  where e.id = p_event and e.event_date >= public.gfd_bkk_today() and public.gfd_registered(e.id, p_seller)
$$;

create or replace function public.gfd_listing(p_listing uuid, p_viewer text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', l.id, 'title', l.title, 'price', l.price, 'price_type', l.price_type, 'listing_type', l.listing_type,
    'status', l.status, 'reserved', l.reserved_for is not null, 'reserved_for_me', l.reserved_for = p_viewer,
    'handover', case when l.handover_event_id is not null then public.gfd_handover(l.handover_event_id, l.seller_line_id, p_viewer) end)
  from public.marketplace_listings l where l.id = p_listing
$$;

create or replace function public.gfd_can_see(p_post public.golf_posts, p_user text) returns boolean
language sql stable security definer set search_path = public as $$
  select p_post.deleted_at is null
     and (p_post.hidden_at is null or p_post.author_id = p_user or exists (select 1 from public.golf_feed_admins a where a.user_id = p_user))
     and (p_post.audience = 'everyone' or p_post.author_id = p_user
          or exists (select 1 from public.golf_follows f where f.follower_id = p_user and f.followee_id = p_post.author_id))
     and (p_post.kind <> 'listing' or exists (select 1 from public.marketplace_listings l where l.id = p_post.listing_id and l.status = 'active'))
$$;

create or replace function public.gfd_post_json(p public.golf_posts, p_user text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', p.id, 'kind', p.kind, 'caption', p.caption, 'audience', p.audience, 'created_at', p.created_at,
    'photos', case when p.kind = 'listing' then to_jsonb(coalesce((select l.images from public.marketplace_listings l where l.id = p.listing_id), '{}'::text[]))
                   else to_jsonb(p.photos) end,
    'author', public.gfd_person(p.author_id),
    'mine', p.author_id = p_user,
    'hidden', p.hidden_at is not null,
    'likes', (select count(*) from public.golf_post_likes k where k.post_id = p.id),
    'i_liked', exists (select 1 from public.golf_post_likes k where k.post_id = p.id and k.user_id = p_user),
    'i_saved', exists (select 1 from public.golf_post_saves s where s.post_id = p.id and s.user_id = p_user),
    'comments', (select count(*) from public.golf_post_comments c where c.post_id = p.id and c.deleted_at is null),
    'recent', coalesce((select jsonb_agg(jsonb_build_object('name', public.gfd_person(c.author_id)->>'name', 'body', c.body) order by c.created_at)
                        from (select * from public.golf_post_comments c where c.post_id = p.id and c.deleted_at is null
                              order by c.created_at desc limit 2) c), '[]'::jsonb),
    'round', case when p.round_id is not null then public.gfd_round(p.round_id, p.author_id) end,
    'listing', case when p.listing_id is not null then public.gfd_listing(p.listing_id, p_user) end)
$$;

create or replace function public.gfd_is_user(p_user text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(p_user, '') <> '' and exists (select 1 from public.user_profiles where line_user_id = p_user)
$$;

-- ---------------------------------------------------------------- the feed
-- p_scope: everyone | following | author (p_author) | saved | post (p_post)
create or replace function public.golf_feed(p_user text, p_scope text default 'everyone', p_author text default null,
                                            p_before timestamptz default null, p_limit integer default 15, p_post uuid default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_lim   integer := least(greatest(coalesce(p_limit, 15), 1), 60);
  v_posts jsonb;
  v_n     integer;
begin
  select coalesce(jsonb_agg(public.gfd_post_json(x, p_user) order by x.created_at desc), '[]'::jsonb), count(*)
    into v_posts, v_n
  from (
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
  ) x;
  if v_n > v_lim then
    v_posts := v_posts - v_lim;   -- drop the look-ahead row
  end if;
  return jsonb_build_object('posts', v_posts, 'more', v_n > v_lim);
end $$;

create or replace function public.golf_post_create(p_user text, p_kind text, p_caption text, p_photos text[],
                                                   p_round uuid default null, p_audience text default 'everyone')
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
  if char_length(coalesce(p_caption, '')) > 2200 then return jsonb_build_object('ok', false, 'reason', 'caption_too_long'); end if;
  if p_round is not null and public.gfd_round(p_round, p_user) is null then
    return jsonb_build_object('ok', false, 'reason', 'round_not_yours');
  end if;
  if (select count(*) from public.golf_posts where author_id = p_user and created_at > now() - interval '1 day') >= 30 then
    return jsonb_build_object('ok', false, 'reason', 'too_many');
  end if;
  insert into public.golf_posts (author_id, kind, caption, photos, round_id, audience)
  values (p_user, p_kind, trim(coalesce(p_caption, '')), p_photos, p_round, p_audience)
  returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

create or replace function public.golf_post_delete(p_user text, p_post uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_p public.golf_posts;
begin
  select * into v_p from public.golf_posts where id = p_post;
  if not found or v_p.deleted_at is not null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if v_p.author_id <> p_user then return jsonb_build_object('ok', false, 'reason', 'not_yours'); end if;
  if v_p.kind = 'listing' then return jsonb_build_object('ok', false, 'reason', 'is_listing'); end if;
  update public.golf_posts set deleted_at = now() where id = p_post;
  return jsonb_build_object('ok', true);
end $$;

-- admins only: take a post off the wall / put it back
create or replace function public.golf_post_hide(p_user text, p_post uuid, p_on boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.golf_feed_admins where user_id = p_user) then return jsonb_build_object('ok', false, 'reason', 'not_admin'); end if;
  update public.golf_posts set hidden_at = case when p_on then now() end, hidden_by = case when p_on then p_user end where id = p_post;
  return jsonb_build_object('ok', found);
end $$;

create or replace function public.golf_post_like(p_user text, p_post uuid, p_on boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_p public.golf_posts;
begin
  if not public.gfd_is_user(p_user) then return jsonb_build_object('ok', false, 'reason', 'not_signed_in'); end if;
  select * into v_p from public.golf_posts where id = p_post;
  if not found or not public.gfd_can_see(v_p, p_user) then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if p_on then insert into public.golf_post_likes (post_id, user_id) values (p_post, p_user) on conflict do nothing;
  else delete from public.golf_post_likes where post_id = p_post and user_id = p_user; end if;
  return jsonb_build_object('ok', true, 'i_liked', p_on, 'likes', (select count(*) from public.golf_post_likes where post_id = p_post));
end $$;

create or replace function public.golf_post_save(p_user text, p_post uuid, p_on boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_p public.golf_posts;
begin
  if not public.gfd_is_user(p_user) then return jsonb_build_object('ok', false, 'reason', 'not_signed_in'); end if;
  select * into v_p from public.golf_posts where id = p_post;
  if not found or not public.gfd_can_see(v_p, p_user) then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if p_on then insert into public.golf_post_saves (post_id, user_id) values (p_post, p_user) on conflict do nothing;
  else delete from public.golf_post_saves where post_id = p_post and user_id = p_user; end if;
  return jsonb_build_object('ok', true, 'i_saved', p_on);
end $$;

create or replace function public.golf_comments(p_user text, p_post uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_p public.golf_posts;
begin
  select * into v_p from public.golf_posts where id = p_post;
  if not found or not public.gfd_can_see(v_p, p_user) then return '[]'::jsonb; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'author', public.gfd_person(c.author_id), 'body', c.body, 'created_at', c.created_at,
                                                       'can_delete', c.author_id = p_user or v_p.author_id = p_user) order by c.created_at)
                   from public.golf_post_comments c where c.post_id = p_post and c.deleted_at is null), '[]'::jsonb);
end $$;

create or replace function public.golf_comment_add(p_user text, p_post uuid, p_body text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_p    public.golf_posts;
  v_body text := trim(coalesce(p_body, ''));
  v_id   uuid;
begin
  if not public.gfd_is_user(p_user) then return jsonb_build_object('ok', false, 'reason', 'not_signed_in'); end if;
  if char_length(v_body) not between 1 and 1000 then return jsonb_build_object('ok', false, 'reason', 'length'); end if;
  select * into v_p from public.golf_posts where id = p_post;
  if not found or not public.gfd_can_see(v_p, p_user) then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if (select count(*) from public.golf_post_comments where author_id = p_user and created_at > now() - interval '1 hour') >= 60 then
    return jsonb_build_object('ok', false, 'reason', 'too_many');
  end if;
  insert into public.golf_post_comments (post_id, author_id, body) values (p_post, p_user, v_body) returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

create or replace function public.golf_comment_delete(p_user text, p_comment uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  update public.golf_post_comments c set deleted_at = now()
   where c.id = p_comment and c.deleted_at is null
     and (c.author_id = p_user or exists (select 1 from public.golf_posts p where p.id = c.post_id and p.author_id = p_user));
  return jsonb_build_object('ok', found);
end $$;

create or replace function public.golf_post_report(p_user text, p_post uuid, p_reason text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_p public.golf_posts;
  v_n integer;
begin
  if not public.gfd_is_user(p_user) then return jsonb_build_object('ok', false, 'reason', 'not_signed_in'); end if;
  if p_reason not in ('not_golf','offensive','spam','other') then return jsonb_build_object('ok', false, 'reason', 'bad_reason'); end if;
  select * into v_p from public.golf_posts where id = p_post;
  if not found or not public.gfd_can_see(v_p, p_user) then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if v_p.author_id = p_user then return jsonb_build_object('ok', false, 'reason', 'own_post'); end if;
  insert into public.golf_post_reports (post_id, reporter_id, reason) values (p_post, p_user, p_reason) on conflict do nothing;
  if not found then return jsonb_build_object('ok', true, 'already', true); end if;
  -- admins read reports where they already work: Messages > Reports
  insert into public.support_reports (reporter_id, reporter_name, category, subject, body, source)
  values (p_user, public.gfd_person(p_user)->>'name', 'other', 'Golf Feed post reported: ' || p_reason,
          'Post ' || p_post || ' by ' || (public.gfd_person(v_p.author_id)->>'name') || ' (' || v_p.author_id || ')' ||
          case when v_p.caption <> '' then E'\nCaption: ' || left(v_p.caption, 300) else '' end, 'golf_feed');
  select count(*) into v_n from public.golf_post_reports where post_id = p_post;
  if v_n >= 3 and v_p.hidden_at is null then
    update public.golf_posts set hidden_at = now(), hidden_by = 'reports' where id = p_post;
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- ---------------------------------------------------------------- people
create or replace function public.golf_follow(p_user text, p_target text, p_on boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.gfd_is_user(p_user) then return jsonb_build_object('ok', false, 'reason', 'not_signed_in'); end if;
  if not public.gfd_is_user(p_target) or p_target = p_user then return jsonb_build_object('ok', false, 'reason', 'bad_target'); end if;
  if p_on then insert into public.golf_follows (follower_id, followee_id) values (p_user, p_target) on conflict do nothing;
  else delete from public.golf_follows where follower_id = p_user and followee_id = p_target; end if;
  return jsonb_build_object('ok', true, 'i_follow', p_on,
                            'followers', (select count(*) from public.golf_follows where followee_id = p_target));
end $$;

create or replace function public.golf_follow_list(p_user text, p_target text, p_which text) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(public.gfd_person(x.id) || jsonb_build_object(
           'i_follow', exists (select 1 from public.golf_follows f where f.follower_id = p_user and f.followee_id = x.id),
           'is_me', x.id = p_user) order by x.created_at desc), '[]'::jsonb)
  from (select case when p_which = 'following' then f.followee_id else f.follower_id end as id, f.created_at
        from public.golf_follows f
        where case when p_which = 'following' then f.follower_id else f.followee_id end = p_target
        order by f.created_at desc limit 500) x
$$;

create or replace function public.golf_profile(p_user text, p_target text) returns jsonb
language sql stable security definer set search_path = public as $$
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
    'is_admin', exists (select 1 from public.golf_feed_admins where user_id = p_user))
  from (select p_target as id) t join public.user_profiles up on up.line_user_id = t.id
$$;

create or replace function public.golf_profile_update(p_user text, p_bio text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.gfd_is_user(p_user) then return jsonb_build_object('ok', false, 'reason', 'not_signed_in'); end if;
  if char_length(trim(coalesce(p_bio, ''))) > 160 then return jsonb_build_object('ok', false, 'reason', 'too_long'); end if;
  insert into public.golf_feed_profiles (user_id, bio, updated_at) values (p_user, trim(coalesce(p_bio, '')), now())
  on conflict (user_id) do update set bio = excluded.bio, updated_at = now();
  return jsonb_build_object('ok', true);
end $$;

-- the composer's round picker: the author's own finished rounds, newest first
create or replace function public.golf_my_rounds(p_user text) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(public.gfd_round(r.id, p_user) || jsonb_build_object(
           'posted', exists (select 1 from public.golf_posts p where p.round_id = r.id and p.deleted_at is null))
         order by r.completed_at desc nulls last), '[]'::jsonb)
  from (select r.id, r.completed_at from public.rounds r
        where r.golfer_id = p_user and r.status = 'completed' and coalesce(r.total_gross, 0) > 0
        order by r.completed_at desc nulls last limit 8) r
$$;

-- ---------------------------------------------------------------- activity + counts
create or replace function public.golf_activity(p_user text) returns jsonb
language sql stable security definer set search_path = public as $$
  with seen as (select coalesce((select activity_seen_at from public.golf_feed_seen where user_id = p_user), '-infinity'::timestamptz) as seen_at),
  a as (
    select 'like' as type, k.user_id as actor, p.id as post_id, null::uuid as listing_id, null::text as body, k.created_at as ts
      from public.golf_post_likes k join public.golf_posts p on p.id = k.post_id
     where p.author_id = p_user and k.user_id <> p_user and p.deleted_at is null
    union all
    select 'comment', c.author_id, p.id, null, c.body, c.created_at
      from public.golf_post_comments c join public.golf_posts p on p.id = c.post_id
     where p.author_id = p_user and c.author_id <> p_user and c.deleted_at is null and p.deleted_at is null
    union all
    select 'follow', f.follower_id, null, null, null, f.created_at from public.golf_follows f where f.followee_id = p_user
    union all
    select 'enquiry', e.buyer_id, null, e.listing_id, l.title, e.created_at
      from public.marketplace_enquiries e join public.marketplace_listings l on l.id = e.listing_id
     where e.seller_id = p_user and l.status <> 'deleted'
    union all
    select 'offer', o.buyer_line_id, null, o.listing_id, l.title || case when o.offer_amount is not null then ' · ฿' || o.offer_amount else '' end, o.created_at
      from public.marketplace_offers o join public.marketplace_listings l on l.id = o.listing_id
     where l.seller_line_id = p_user and o.buyer_line_id <> p_user and l.status <> 'deleted'
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'type', a.type, 'actor', public.gfd_person(a.actor), 'post_id', a.post_id, 'listing_id', a.listing_id,
           'body', a.body, 'at', a.ts, 'is_new', a.ts > (select seen_at from seen),
           'i_follow', exists (select 1 from public.golf_follows f where f.follower_id = p_user and f.followee_id = a.actor),
           'thumb', case
              when a.post_id is not null then (select case when p.kind = 'listing' then (select l.images[1] from public.marketplace_listings l where l.id = p.listing_id) else p.photos[1] end
                                               from public.golf_posts p where p.id = a.post_id)
              when a.listing_id is not null then (select l.images[1] from public.marketplace_listings l where l.id = a.listing_id) end)
         order by a.ts desc), '[]'::jsonb)
  from (select * from a order by ts desc limit 60) a
$$;

create or replace function public.golf_nav_counts(p_user text) returns jsonb
language sql stable security definer set search_path = public as $$
  with s as (select (select feed_seen_at from public.golf_feed_seen where user_id = p_user) f,
                    coalesce((select activity_seen_at from public.golf_feed_seen where user_id = p_user), '-infinity'::timestamptz) a)
  select jsonb_build_object(
    'feed_new', (select count(*) from public.golf_posts p
                 where p.author_id <> p_user and public.gfd_can_see(p, p_user)
                   and p.created_at > coalesce((select f from s), now() - interval '7 days')),
    'activity_new', (select count(*) from jsonb_array_elements(public.golf_activity(p_user)) e where (e->>'is_new')::boolean))
$$;

create or replace function public.golf_mark_seen(p_user text, p_what text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.gfd_is_user(p_user) then return jsonb_build_object('ok', false); end if;
  insert into public.golf_feed_seen (user_id, feed_seen_at, activity_seen_at)
  values (p_user, case when p_what = 'feed' then now() end, case when p_what = 'activity' then now() end)
  on conflict (user_id) do update
    set feed_seen_at     = case when p_what = 'feed' then now() else golf_feed_seen.feed_seen_at end,
        activity_seen_at = case when p_what = 'activity' then now() else golf_feed_seen.activity_seen_at end;
  return jsonb_build_object('ok', true);
end $$;

-- ---------------------------------------------------------------- 19th Hole: listings on the wall
create or replace function public.gfd_listing_to_post() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(cardinality(new.images), 0) >= 1 and new.status = 'active' and coalesce(new.seller_line_id, '') <> '' then
    insert into public.golf_posts (author_id, kind, caption, listing_id, created_at)
    values (new.seller_line_id, 'listing', coalesce(new.title, ''), new.id, coalesce(new.created_at, now()))
    on conflict do nothing;
  end if;
  return new;
end $$;
drop trigger if exists trg_gfd_listing_to_post on public.marketplace_listings;
create trigger trg_gfd_listing_to_post after insert or update of images, status on public.marketplace_listings
  for each row execute function public.gfd_listing_to_post();

-- ---------------------------------------------------------------- 19th Hole: history log
create or replace function public.mkp_log_listing() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_actor text := nullif(current_setting('gfd.actor', true), '');
begin
  if tg_op = 'INSERT' then
    insert into public.marketplace_listing_events (listing_id, actor_id, event) values (new.id, coalesce(v_actor, new.seller_line_id), 'listed');
    return new;
  end if;
  if new.status is distinct from old.status then
    insert into public.marketplace_listing_events (listing_id, actor_id, event, buyer_id)
    values (new.id, coalesce(v_actor, new.seller_line_id),
            case new.status when 'sold' then 'sold' when 'active' then 'relisted' when 'deleted' then 'deleted' else 'expired' end,
            case when new.status = 'sold' then new.sold_to end);
  end if;
  if new.reserved_for is distinct from old.reserved_for and new.status = 'active' then
    insert into public.marketplace_listing_events (listing_id, actor_id, event, buyer_id)
    values (new.id, coalesce(v_actor, new.seller_line_id), case when new.reserved_for is null then 'unreserved' else 'reserved' end,
            coalesce(new.reserved_for, old.reserved_for));
  end if;
  if new.handover_event_id is distinct from old.handover_event_id then
    insert into public.marketplace_listing_events (listing_id, actor_id, event, event_id)
    values (new.id, coalesce(v_actor, new.seller_line_id), case when new.handover_event_id is null then 'handover_cleared' else 'handover_set' end,
            coalesce(new.handover_event_id, old.handover_event_id));
  end if;
  return new;
end $$;
drop trigger if exists trg_mkp_log_listing on public.marketplace_listings;
create trigger trg_mkp_log_listing after insert or update on public.marketplace_listings
  for each row execute function public.mkp_log_listing();

-- ---------------------------------------------------------------- 19th Hole: RPCs
-- a buyer asks about a listing (Message seller / Make Offer): remembered so the chat can show
-- the listing, and so the seller can Reserve / Sell to them
create or replace function public.mkp_enquire(p_user text, p_listing uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_l public.marketplace_listings;
begin
  if not public.gfd_is_user(p_user) then return jsonb_build_object('ok', false, 'reason', 'not_signed_in'); end if;
  select * into v_l from public.marketplace_listings where id = p_listing;
  if not found or v_l.status = 'deleted' then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if v_l.seller_line_id = p_user then return jsonb_build_object('ok', false, 'reason', 'own_listing'); end if;
  insert into public.marketplace_enquiries (listing_id, buyer_id, seller_id) values (p_listing, p_user, v_l.seller_line_id)
  on conflict (listing_id, buyer_id) do update set last_at = now();
  return jsonb_build_object('ok', true, 'seller_id', v_l.seller_line_id, 'title', v_l.title);
end $$;

-- the seller's "N people asked" list: enquiries + offers, newest contact first
create or replace function public.mkp_listing_people(p_user text, p_listing uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_l public.marketplace_listings;
begin
  select * into v_l from public.marketplace_listings where id = p_listing;
  if not found or v_l.seller_line_id <> p_user then return '[]'::jsonb; end if;
  return coalesce((
    select jsonb_agg(public.gfd_person(b.buyer) || jsonb_build_object(
             'offer', (select jsonb_build_object('amount', o.offer_amount, 'type', o.offer_type, 'status', o.status, 'at', o.created_at)
                       from public.marketplace_offers o where o.listing_id = p_listing and o.buyer_line_id = b.buyer
                       order by o.created_at desc limit 1),
             'last_msg', (select jsonb_build_object('text', left(m.message_text, 140), 'at', m.created_at, 'mine', m.sender_line_id = p_user)
                          from public.direct_messages m
                          where (m.sender_line_id = b.buyer and m.recipient_line_id = p_user) or (m.sender_line_id = p_user and m.recipient_line_id = b.buyer)
                          order by m.created_at desc limit 1),
             'unread', (select count(*) from public.direct_messages m where m.sender_line_id = b.buyer and m.recipient_line_id = p_user and not coalesce(m.is_read, false)),
             'at', b.ts,
             'reserved', v_l.reserved_for = b.buyer)
           order by b.ts desc)
    from (select buyer, max(ts) as ts from (
            select e.buyer_id as buyer, e.last_at as ts from public.marketplace_enquiries e where e.listing_id = p_listing
            union all
            select o.buyer_line_id, o.created_at from public.marketplace_offers o
             where o.listing_id = p_listing and o.status in ('pending','accepted') and o.buyer_line_id <> p_user) u
          group by buyer) b), '[]'::jsonb);
end $$;

-- the seller's upcoming society events (the hand-over picker)
create or replace function public.mkp_handover_options(p_user text) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('event_id', e.id, 'society', public.gfd_event_label(e.id), 'course', e.course_name, 'date', e.event_date)
                            order by e.event_date, e.start_time nulls last), '[]'::jsonb)
  from (select e.* from public.society_events e
        where e.event_date >= public.gfd_bkk_today() and public.gfd_registered(e.id, p_user)
        order by e.event_date, e.start_time nulls last limit 12) e
$$;

create or replace function public.mkp_listing_extras(p_user text, p_listing uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_l public.marketplace_listings; v_seller boolean;
begin
  select * into v_l from public.marketplace_listings where id = p_listing;
  if not found then return null; end if;
  v_seller := v_l.seller_line_id = p_user;
  return jsonb_build_object(
    'is_seller', v_seller,
    'status', v_l.status,
    'handover', case when v_l.handover_event_id is not null then public.gfd_handover(v_l.handover_event_id, v_l.seller_line_id, p_user) end,
    'reserved_for', case when v_l.reserved_for is not null and v_l.status = 'active' and (v_seller or v_l.reserved_for = p_user) then public.gfd_person(v_l.reserved_for) end,
    'reserved', v_l.reserved_for is not null and v_l.status = 'active',
    'sold_to', case when v_seller and v_l.sold_to is not null then public.gfd_person(v_l.sold_to) end,
    'people', case when v_seller then public.mkp_listing_people(p_user, p_listing) end,
    'listed_at', v_l.created_at, 'price', v_l.price, 'views', coalesce(v_l.views, 0));
end $$;

create or replace function public.mkp_set_handover(p_user text, p_listing uuid, p_event uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_l public.marketplace_listings;
begin
  select * into v_l from public.marketplace_listings where id = p_listing;
  if not found or v_l.seller_line_id <> p_user then return jsonb_build_object('ok', false, 'reason', 'not_yours'); end if;
  if p_event is not null and not exists (select 1 from public.society_events e
                                         where e.id = p_event and e.event_date >= public.gfd_bkk_today() and public.gfd_registered(e.id, p_user)) then
    return jsonb_build_object('ok', false, 'reason', 'not_registered');
  end if;
  perform set_config('gfd.actor', p_user, true);
  update public.marketplace_listings set handover_event_id = p_event, updated_at = now() where id = p_listing;
  return jsonb_build_object('ok', true);
end $$;

-- p_action: reserve | unreserve | sold | relist. Reserve / Sold to = someone who asked
-- (enquiry or offer); Sold with no buyer = "sold to someone not listed".
create or replace function public.mkp_set_state(p_user text, p_listing uuid, p_action text, p_buyer text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_l public.marketplace_listings;
begin
  select * into v_l from public.marketplace_listings where id = p_listing for update;
  if not found or v_l.seller_line_id <> p_user then return jsonb_build_object('ok', false, 'reason', 'not_yours'); end if;
  if v_l.status = 'deleted' then return jsonb_build_object('ok', false, 'reason', 'deleted'); end if;
  if p_buyer is not null and not exists (
       select 1 from public.marketplace_enquiries e where e.listing_id = p_listing and e.buyer_id = p_buyer
       union all
       select 1 from public.marketplace_offers o where o.listing_id = p_listing and o.buyer_line_id = p_buyer) then
    return jsonb_build_object('ok', false, 'reason', 'not_a_buyer');
  end if;
  perform set_config('gfd.actor', p_user, true);
  if p_action = 'reserve' then
    if p_buyer is null then return jsonb_build_object('ok', false, 'reason', 'no_buyer'); end if;
    if v_l.status <> 'active' then return jsonb_build_object('ok', false, 'reason', 'not_active'); end if;
    update public.marketplace_listings set reserved_for = p_buyer, reserved_at = now(), updated_at = now() where id = p_listing;
  elsif p_action = 'unreserve' then
    update public.marketplace_listings set reserved_for = null, reserved_at = null, updated_at = now() where id = p_listing;
  elsif p_action = 'sold' then
    update public.marketplace_listings set status = 'sold', sold_to = p_buyer, sold_at = now(), reserved_for = null, reserved_at = null, updated_at = now()
     where id = p_listing;
  elsif p_action = 'relist' then
    update public.marketplace_listings set status = 'active', sold_to = null, sold_at = null, updated_at = now() where id = p_listing;
  else
    return jsonb_build_object('ok', false, 'reason', 'bad_action');
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- the listing card on top of a chat: the latest listing these two talked about
create or replace function public.mkp_chat_context(p_user text, p_partner text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'listing_id', l.id, 'title', l.title, 'image', l.images[1], 'price', l.price, 'price_type', l.price_type,
    'status', l.status, 'partner_role', case when x.buyer = p_partner then 'buyer' else 'seller' end,
    'reserved_for', case when l.reserved_for is not null and l.status = 'active' then public.gfd_person(l.reserved_for)->>'name' end,
    'reserved_for_me', l.reserved_for = p_user and l.status = 'active',
    'sold_to_name', case when l.status = 'sold' and l.sold_to is not null then public.gfd_person(l.sold_to)->>'name' end)
  from (select e.listing_id, e.buyer_id as buyer, e.last_at as ts from public.marketplace_enquiries e
         where (e.buyer_id = p_user and e.seller_id = p_partner) or (e.buyer_id = p_partner and e.seller_id = p_user)
        union all
        select o.listing_id, o.buyer_line_id, o.created_at from public.marketplace_offers o join public.marketplace_listings l2 on l2.id = o.listing_id
         where (o.buyer_line_id = p_user and l2.seller_line_id = p_partner) or (o.buyer_line_id = p_partner and l2.seller_line_id = p_user)
        order by ts desc limit 1) x
  join public.marketplace_listings l on l.id = x.listing_id
  where l.status <> 'deleted'
$$;

-- ---------------------------------------------------------------- grants
do $$
declare f text;
begin
  foreach f in array array[
    'golf_feed(text,text,text,timestamptz,integer,uuid)', 'golf_post_create(text,text,text,text[],uuid,text)',
    'golf_post_delete(text,uuid)', 'golf_post_hide(text,uuid,boolean)', 'golf_post_like(text,uuid,boolean)',
    'golf_post_save(text,uuid,boolean)', 'golf_comments(text,uuid)', 'golf_comment_add(text,uuid,text)',
    'golf_comment_delete(text,uuid)', 'golf_post_report(text,uuid,text)', 'golf_follow(text,text,boolean)',
    'golf_follow_list(text,text,text)', 'golf_profile(text,text)', 'golf_profile_update(text,text)',
    'golf_my_rounds(text)', 'golf_activity(text)', 'golf_nav_counts(text)', 'golf_mark_seen(text,text)',
    'mkp_enquire(text,uuid)', 'mkp_listing_people(text,uuid)', 'mkp_handover_options(text)',
    'mkp_listing_extras(text,uuid)', 'mkp_set_handover(text,uuid,uuid)', 'mkp_set_state(text,uuid,text,text)',
    'mkp_chat_context(text,text)']
  loop
    execute format('revoke all on function public.%s from public', f);
    execute format('grant execute on function public.%s to anon, authenticated', f);
  end loop;
  -- helpers are internal
  foreach f in array array['gfd_person(text)', 'gfd_event_label(uuid)', 'gfd_registered(uuid,text)', 'gfd_round(uuid,text)',
                           'gfd_handover(uuid,text,text)', 'gfd_listing(uuid,text)', 'gfd_can_see(public.golf_posts,text)',
                           'gfd_post_json(public.golf_posts,text)', 'gfd_is_user(text)']
  loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
  end loop;
end $$;

-- ---------------------------------------------------------------- backfill: active listings with photos go on the wall
insert into public.golf_posts (author_id, kind, caption, listing_id, created_at)
select l.seller_line_id, 'listing', coalesce(l.title, ''), l.id, l.created_at
from public.marketplace_listings l
where l.status = 'active' and coalesce(cardinality(l.images), 0) >= 1 and coalesce(l.seller_line_id, '') <> ''
on conflict do nothing;

insert into public.marketplace_listing_events (listing_id, actor_id, event, created_at)
select l.id, l.seller_line_id, 'listed', l.created_at from public.marketplace_listings l
where not exists (select 1 from public.marketplace_listing_events e where e.listing_id = l.id and e.event = 'listed');
