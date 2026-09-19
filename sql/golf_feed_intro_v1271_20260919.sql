-- ============================================================================================
-- TAP-IN intro toast (v1271, 2026-09-19)
-- Pete: "send out a toast notification to all users on the main dashboard of the new Tap-in and they
-- can dismiss it after reading it or viewing the new section". Shown until the golfer opens Tap-In
-- (feed_seen_at) or dismisses it (intro_dismissed_at) — kept on the server so it never comes back
-- on another phone. In-app only; no LINE push.
-- ============================================================================================
alter table public.golf_feed_seen add column if not exists intro_dismissed_at timestamptz;

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
    'mkp', (select count(*) from act where type in ('enquiry','offer')),
    -- the Tap-In intro toast: until the golfer opens Tap-In or dismisses it
    'intro', (select f from s) is null
             and coalesce((select intro_dismissed_at from public.golf_feed_seen where user_id = p_user), null) is null)
$$;

create or replace function public.golf_mark_seen(p_user text, p_what text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.gfd_is_user(p_user) then return jsonb_build_object('ok', false); end if;
  perform public.gfd_ensure_handle(p_user);   -- a golfer opening Tap-In gets a handle
  insert into public.golf_feed_seen (user_id, feed_seen_at, activity_seen_at, following_seen_at, intro_dismissed_at)
  values (p_user, case when p_what = 'feed' then now() end, case when p_what = 'activity' then now() end,
          case when p_what = 'following' then now() end, case when p_what = 'intro' then now() end)
  on conflict (user_id) do update
    set feed_seen_at      = case when p_what = 'feed' then now() else golf_feed_seen.feed_seen_at end,
        activity_seen_at  = case when p_what = 'activity' then now() else golf_feed_seen.activity_seen_at end,
        following_seen_at = case when p_what = 'following' then now() else golf_feed_seen.following_seen_at end,
        intro_dismissed_at = case when p_what = 'intro' then coalesce(golf_feed_seen.intro_dismissed_at, now()) else golf_feed_seen.intro_dismissed_at end;
  return jsonb_build_object('ok', true);
end $$;
