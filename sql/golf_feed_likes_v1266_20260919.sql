-- ============================================================================================
-- TAP-IN likes: count on the wall, "Liked by", who liked it, and an operator boost (v1266, 2026-09-19)
-- Pete: "in the general feed ... the bottom left corner of the image with the likes before they tap";
-- "is it just showing the counts along with the users who liked it?"; "don't show the users id on
-- the likes"; "put 58 likes on pete park post of the bacon brothers and Britt".
--   * golf_post_likers: the REAL people who liked a post (names + photos; the screen shows no ids)
--   * likes_boost: an operator-set number ADDED to a post's displayed count. It is never attributed
--     to anyone — it is not in golf_post_likes, not in "Liked by", not in the likers list, not in
--     anyone's Activity. Set only by SQL (operator decision, recorded here), never by a client RPC.
-- ============================================================================================

alter table public.golf_posts add column if not exists likes_boost integer not null default 0;
alter table public.golf_posts drop constraint if exists golf_posts_likes_boost_ck;
alter table public.golf_posts add constraint golf_posts_likes_boost_ck check (likes_boost between 0 and 100000);

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

create or replace function public.golf_post_like(p_user text, p_post uuid, p_on boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_p public.golf_posts;
begin
  if not public.gfd_is_user(p_user) then return jsonb_build_object('ok', false, 'reason', 'not_signed_in'); end if;
  select * into v_p from public.golf_posts where id = p_post;
  if not found or not public.gfd_can_see(v_p, p_user) then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if p_on then insert into public.golf_post_likes (post_id, user_id) values (p_post, p_user) on conflict do nothing;
  else delete from public.golf_post_likes where post_id = p_post and user_id = p_user; end if;
  return jsonb_build_object('ok', true, 'i_liked', p_on,
                            'likes', (select count(*) from public.golf_post_likes where post_id = p_post) + coalesce(v_p.likes_boost, 0));
end $$;

create or replace function public.golf_post_likers(p_user text, p_post uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_p public.golf_posts;
begin
  select * into v_p from public.golf_posts where id = p_post;
  if not found or not public.gfd_can_see(v_p, p_user) then return '[]'::jsonb; end if;
  return coalesce((select jsonb_agg(public.gfd_person(k.user_id) || jsonb_build_object(
                     'i_follow', exists (select 1 from public.golf_follows f where f.follower_id = p_user and f.followee_id = k.user_id),
                     'is_me', k.user_id = p_user) order by k.created_at desc)
                   from (select * from public.golf_post_likes where post_id = p_post order by created_at desc limit 500) k), '[]'::jsonb);
end $$;

revoke all on function public.golf_post_likers(text,uuid) from public;
grant execute on function public.golf_post_likers(text,uuid) to anon, authenticated;
revoke all on function public.golf_post_like(text,uuid,boolean) from public;
grant execute on function public.golf_post_like(text,uuid,boolean) to anon, authenticated;
revoke all on function public.gfd_post_json(public.golf_posts,text) from public, anon, authenticated;

-- Pete, 2026-09-19: "put 58 likes on pete park post of the bacon brothers and Britt"
update public.golf_posts set likes_boost = 58
 where id = 'a9982da5-29fd-4b24-b280-2f0ae9070934' and author_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';
