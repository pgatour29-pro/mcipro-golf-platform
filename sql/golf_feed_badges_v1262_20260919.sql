-- ============================================================================================
-- GOLF FEED badges + @mentions (v1262, 2026-09-19)
-- Pete: "add the New badge on the upper corner and also badges to new feed and mentions, likes,
-- follows and any interactions".
--   * @mentions in captions and comments: golf_mentions rows, written ONLY by golf_post_create /
--     golf_comment_add, and only for a golfer whose "@Name" is really in the text. A mention shows
--     in the mentioned golfer's Activity only if they can see the post (Followers only holds).
--   * golf_nav_counts now breaks the new items down: Everyone posts, Following posts, and each
--     kind of interaction (mentions, likes, comments, follows, 19th Hole enquiries/offers), plus
--     the seen stamps so the wall can mark what arrived since the last visit.
--   * golf_feed_seen.following_seen_at — the Following tab has its own "new" line.
-- Same shape as v1261: RLS-on, no client policy, SECURITY DEFINER RPCs keyed on p_user (the app's
-- caller id until Phase-2 auth).
-- ============================================================================================

create table if not exists public.golf_mentions (
  id           uuid primary key default gen_random_uuid(),
  post_id      uuid not null references public.golf_posts(id) on delete cascade,
  comment_id   uuid references public.golf_post_comments(id) on delete cascade,
  author_id    text not null,
  mentioned_id text not null,
  created_at   timestamptz not null default now()
);
create unique index if not exists golf_mentions_uq on public.golf_mentions(post_id, coalesce(comment_id, '00000000-0000-0000-0000-000000000000'::uuid), mentioned_id);
create index if not exists golf_mentions_who_ix on public.golf_mentions(mentioned_id, created_at desc);
alter table public.golf_mentions enable row level security;

alter table public.golf_feed_seen add column if not exists following_seen_at timestamptz;

-- mentions of a post's caption (comment_id null) or of one comment, as [{id,name}]
create or replace function public.gfd_mentions(p_post uuid, p_comment uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(public.gfd_person(m.mentioned_id) order by m.created_at), '[]'::jsonb)
  from public.golf_mentions m
  where m.post_id = p_post and m.comment_id is not distinct from p_comment
$$;

-- record the mentions of a caption / comment: real golfers, not the author, and "@Name" must be in the text
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
    continue when position('@' || v_name in coalesce(p_text, '')) = 0;
    insert into public.golf_mentions (post_id, comment_id, author_id, mentioned_id)
    values (p_post, p_comment, p_author, v_id) on conflict do nothing;
    if found then v_n := v_n + 1; end if;
  end loop;
  return v_n;
end $$;

-- the @ picker: people I follow first, then my followers, then everyone else
create or replace function public.golf_people_search(p_user text, p_q text) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(public.gfd_person(x.id) order by x.rank, x.starts, x.nm), '[]'::jsonb)
  from (
    select up.line_user_id as id, coalesce(nullif(trim(up.name), ''), up.display_name) as nm,
           case when exists (select 1 from public.golf_follows f where f.follower_id = p_user and f.followee_id = up.line_user_id) then 0
                when exists (select 1 from public.golf_follows f where f.followee_id = p_user and f.follower_id = up.line_user_id) then 1
                else 2 end as rank,
           -- "Pa" → Paul…, then …Pa at a word start (Anderson, Paul), then anywhere (JOA Golf Pattaya)
           case when coalesce(nullif(trim(up.name), ''), up.display_name, '') ilike trim(p_q) || '%' then 0
                when coalesce(nullif(trim(up.name), ''), up.display_name, '') ~* ('(^|[\s,])' || regexp_replace(trim(p_q), '([.*+?^${}()|\[\]\\])', '\\\1', 'g')) then 1
                else 2 end as starts
    from public.user_profiles up
    where char_length(trim(coalesce(p_q, ''))) >= 2
      and up.line_user_id <> coalesce(p_user, '')
      and up.line_user_id !~ '^(MANUAL|TRGG-GUEST|TRGG-HCP|GUEST)'
      and coalesce(nullif(trim(up.name), ''), up.display_name, '') ilike '%' || replace(replace(trim(p_q), '%', ''), '_', '') || '%'
    order by rank, starts, nm
    limit 8
  ) x
$$;

-- ---------------------------------------------------------------- create / comment take mentions
drop function if exists public.golf_post_create(text, text, text, text[], uuid, text);
create or replace function public.golf_post_create(p_user text, p_kind text, p_caption text, p_photos text[],
                                                   p_round uuid default null, p_audience text default 'everyone',
                                                   p_mentions text[] default null)
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
  perform public.gfd_save_mentions(p_user, v_id, null, trim(coalesce(p_caption, '')), p_mentions);
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

drop function if exists public.golf_comment_add(text, uuid, text);
create or replace function public.golf_comment_add(p_user text, p_post uuid, p_body text, p_mentions text[] default null) returns jsonb
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
  perform public.gfd_save_mentions(p_user, p_post, v_id, v_body, p_mentions);
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

-- ---------------------------------------------------------------- posts + comments carry their mentions
create or replace function public.gfd_post_json(p public.golf_posts, p_user text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', p.id, 'kind', p.kind, 'caption', p.caption, 'audience', p.audience, 'created_at', p.created_at,
    'photos', case when p.kind = 'listing' then to_jsonb(coalesce((select l.images from public.marketplace_listings l where l.id = p.listing_id), '{}'::text[]))
                   else to_jsonb(p.photos) end,
    'author', public.gfd_person(p.author_id),
    'mine', p.author_id = p_user,
    'hidden', p.hidden_at is not null,
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

create or replace function public.golf_comments(p_user text, p_post uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_p public.golf_posts;
begin
  select * into v_p from public.golf_posts where id = p_post;
  if not found or not public.gfd_can_see(v_p, p_user) then return '[]'::jsonb; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'author', public.gfd_person(c.author_id), 'body', c.body, 'created_at', c.created_at,
                                                       'mentions', public.gfd_mentions(p_post, c.id),
                                                       'can_delete', c.author_id = p_user or v_p.author_id = p_user) order by c.created_at)
                   from public.golf_post_comments c where c.post_id = p_post and c.deleted_at is null), '[]'::jsonb);
end $$;

-- ---------------------------------------------------------------- activity gains mentions
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
    -- a mention in a comment on MY post is already there as a comment — don't say it twice
    select 'mention', m.author_id, p.id, null, coalesce(c.body, p.caption), m.created_at
      from public.golf_mentions m join public.golf_posts p on p.id = m.post_id
      left join public.golf_post_comments c on c.id = m.comment_id
     where m.mentioned_id = p_user and m.author_id <> p_user
       and (m.comment_id is null or (c.deleted_at is null and p.author_id <> p_user))
       and public.gfd_can_see(p, p_user)
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
  from (select * from a order by ts desc limit 80) a
$$;

-- ---------------------------------------------------------------- counts, broken down
create or replace function public.golf_nav_counts(p_user text) returns jsonb
language sql stable security definer set search_path = public as $$
  with s as (select (select feed_seen_at from public.golf_feed_seen where user_id = p_user) f,
                    (select following_seen_at from public.golf_feed_seen where user_id = p_user) fo),
  act as (select e->>'type' as type from jsonb_array_elements(public.golf_activity(p_user)) e where (e->>'is_new')::boolean)
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
    'activity_new', (select count(*) from act),
    'mentions', (select count(*) from act where type = 'mention'),
    'likes', (select count(*) from act where type = 'like'),
    'comments', (select count(*) from act where type = 'comment'),
    'follows', (select count(*) from act where type = 'follow'),
    'mkp', (select count(*) from act where type in ('enquiry','offer')))
$$;

create or replace function public.golf_mark_seen(p_user text, p_what text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.gfd_is_user(p_user) then return jsonb_build_object('ok', false); end if;
  insert into public.golf_feed_seen (user_id, feed_seen_at, activity_seen_at, following_seen_at)
  values (p_user, case when p_what = 'feed' then now() end, case when p_what = 'activity' then now() end,
          case when p_what = 'following' then now() end)
  on conflict (user_id) do update
    set feed_seen_at      = case when p_what = 'feed' then now() else golf_feed_seen.feed_seen_at end,
        activity_seen_at  = case when p_what = 'activity' then now() else golf_feed_seen.activity_seen_at end,
        following_seen_at = case when p_what = 'following' then now() else golf_feed_seen.following_seen_at end;
  return jsonb_build_object('ok', true);
end $$;

do $$
declare f text;
begin
  foreach f in array array['golf_post_create(text,text,text,text[],uuid,text,text[])', 'golf_comment_add(text,uuid,text,text[])',
                           'golf_people_search(text,text)']
  loop
    execute format('revoke all on function public.%s from public', f);
    execute format('grant execute on function public.%s to anon, authenticated', f);
  end loop;
  foreach f in array array['gfd_mentions(uuid,uuid)', 'gfd_save_mentions(text,uuid,uuid,text,text[])', 'gfd_post_json(public.golf_posts,text)']
  loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
  end loop;
end $$;
