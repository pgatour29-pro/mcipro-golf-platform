-- 1on1 DISCOVER (v1097, 2026-09-03) — Pete: "the 1on1 functionality needs to be better and at the same level of
-- MyCaddiPro or likes of Tinder". Adds: saved partners (likes), ratings after completed rounds, "saved by N" for
-- partners, and a richer oo_search (rating, saved flag, rounds together). RLS: authenticated only, same identity model.

-- ---------- saved partners ----------
create table if not exists public.oo_likes (
  member_id   text not null,
  partner_id  uuid not null references public.oo_partners(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (member_id, partner_id)
);
alter table public.oo_likes enable row level security;
revoke all on public.oo_likes from anon;
grant select, insert, delete on public.oo_likes to authenticated;
drop policy if exists oo_likes_sel on public.oo_likes;
create policy oo_likes_sel on public.oo_likes for select to authenticated
  using (member_id = public.oo_uid() or partner_id = public.oo_partner_id() or public.oo_is_admin());
drop policy if exists oo_likes_ins on public.oo_likes;
create policy oo_likes_ins on public.oo_likes for insert to authenticated
  with check (member_id = public.oo_uid() and public.oo_is_member());
drop policy if exists oo_likes_del on public.oo_likes;
create policy oo_likes_del on public.oo_likes for delete to authenticated
  using (member_id = public.oo_uid());

-- ---------- ratings (one per completed booking, by the member) ----------
create table if not exists public.oo_reviews (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null unique references public.oo_bookings(id) on delete cascade,
  member_id   text not null,
  partner_id  uuid not null references public.oo_partners(id) on delete cascade,
  rating      int  not null check (rating between 1 and 5),
  comment     text,
  status      text not null default 'visible' check (status in ('visible','hidden')),
  created_at  timestamptz not null default now()
);
create index if not exists oo_reviews_partner_idx on public.oo_reviews(partner_id, status);
alter table public.oo_reviews enable row level security;
revoke all on public.oo_reviews from anon;
grant select on public.oo_reviews to authenticated;
drop policy if exists oo_reviews_sel on public.oo_reviews;
create policy oo_reviews_sel on public.oo_reviews for select to authenticated
  using (member_id = public.oo_uid() or partner_id = public.oo_partner_id() or public.oo_is_admin()
         or (status = 'visible' and public.oo_is_member()));

create or replace function public.oo_review(p_booking uuid, p_rating int, p_comment text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_uid text := public.oo_uid(); v_b public.oo_bookings; v_row jsonb;
begin
  if not public.oo_is_member() then raise exception 'not_a_member' using errcode = '42501'; end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then raise exception 'bad_rating'; end if;
  select * into v_b from public.oo_bookings where id = p_booking;
  if v_b.id is null or v_b.member_id <> v_uid then raise exception 'not_your_booking' using errcode = '42501'; end if;
  if not (v_b.status = 'completed' or (v_b.status = 'accepted' and v_b.date_to < public.oo_today())) then raise exception 'not_played_yet'; end if;
  insert into public.oo_reviews (booking_id, member_id, partner_id, rating, comment)
  values (p_booking, v_uid, v_b.partner_id, p_rating, nullif(trim(coalesce(p_comment, '')), ''))
  on conflict (booking_id) do update set rating = excluded.rating, comment = excluded.comment, created_at = now()
  returning to_jsonb(oo_reviews.*) into v_row;
  return v_row;
end $$;

create or replace function public.oo_admin_set_review(p_review uuid, p_status text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_row jsonb;
begin
  if not public.oo_is_admin() then raise exception 'not_admin' using errcode = '42501'; end if;
  if p_status not in ('visible','hidden') then raise exception 'bad_status'; end if;
  update public.oo_reviews set status = p_status where id = p_review returning to_jsonb(oo_reviews.*) into v_row;
  return v_row;
end $$;

-- ---------- partner: how many members saved me ----------
create or replace function public.oo_partner_saved_count() returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from public.oo_likes l where l.partner_id = public.oo_partner_id()
$$;

-- ---------- richer search: rating, saved flag, rounds played together ----------
drop function if exists public.oo_search(date, date, text, text);
create or replace function public.oo_search(p_from date, p_to date, p_course text default null, p_lang text default null)
returns table (id uuid, user_id text, display_name text, bio text, languages text[], handicap numeric, home_course_name text,
               courses_known text[], area_tips text, day_rate numeric, currency text, cover_path text, photo_count int,
               rating_avg numeric, rating_n int, liked boolean, rounds_together int, cover_media_id uuid)
language plpgsql stable security definer set search_path = public as $$
declare v_uid text := public.oo_uid();
begin
  if not public.oo_is_member() then raise exception 'not_a_member' using errcode = '42501'; end if;
  if p_from is null or p_to is null or p_to < p_from or p_from < public.oo_today() or p_to - p_from >= 90 then
    raise exception 'bad_range';
  end if;
  return query
    select p.id, p.user_id, p.display_name, p.bio, p.languages, p.handicap, p.home_course_name, p.courses_known, p.area_tips,
           p.day_rate, p.currency,
           (select m.storage_path from public.oo_media m where m.id = p.cover_media_id and m.status = 'visible'),
           (select count(*)::int from public.oo_media m where m.partner_id = p.id and m.kind = 'photo' and m.status = 'visible'),
           (select round(avg(r.rating)::numeric, 1) from public.oo_reviews r where r.partner_id = p.id and r.status = 'visible'),
           (select count(*)::int from public.oo_reviews r where r.partner_id = p.id and r.status = 'visible'),
           exists (select 1 from public.oo_likes l where l.partner_id = p.id and l.member_id = v_uid),
           (select count(*)::int from public.oo_bookings b where b.partner_id = p.id and b.member_id = v_uid and b.status = 'completed'),
           p.cover_media_id
    from public.oo_partners p
    where p.society_id = public.oo_default_society()
      and p.status = 'approved' and p.is_active
      and public.oo_partner_free(p.id, p_from, p_to)
      and (p_course is null or p.home_course_name ilike '%'||p_course||'%'
           or exists (select 1 from unnest(p.courses_known) c where c ilike '%'||p_course||'%'))
      and (p_lang is null or exists (select 1 from unnest(p.languages) l where l ilike p_lang||'%'))
    order by (select count(*) from public.oo_reviews r where r.partner_id = p.id and r.status = 'visible') desc, p.display_name;
end $$;

-- saved partners list for the member (no date filter — Liked view), same shape as search
create or replace function public.oo_liked() returns table (id uuid, user_id text, display_name text, bio text, languages text[], handicap numeric, home_course_name text,
               courses_known text[], area_tips text, day_rate numeric, currency text, cover_path text, photo_count int,
               rating_avg numeric, rating_n int, liked boolean, rounds_together int, cover_media_id uuid)
language plpgsql stable security definer set search_path = public as $$
declare v_uid text := public.oo_uid();
begin
  if not public.oo_is_member() then raise exception 'not_a_member' using errcode = '42501'; end if;
  return query
    select p.id, p.user_id, p.display_name, p.bio, p.languages, p.handicap, p.home_course_name, p.courses_known, p.area_tips,
           p.day_rate, p.currency,
           (select m.storage_path from public.oo_media m where m.id = p.cover_media_id and m.status = 'visible'),
           (select count(*)::int from public.oo_media m where m.partner_id = p.id and m.kind = 'photo' and m.status = 'visible'),
           (select round(avg(r.rating)::numeric, 1) from public.oo_reviews r where r.partner_id = p.id and r.status = 'visible'),
           (select count(*)::int from public.oo_reviews r where r.partner_id = p.id and r.status = 'visible'),
           true,
           (select count(*)::int from public.oo_bookings b where b.partner_id = p.id and b.member_id = v_uid and b.status = 'completed'),
           p.cover_media_id
    from public.oo_likes l join public.oo_partners p on p.id = l.partner_id
    where l.member_id = v_uid and p.status = 'approved' and p.is_active
    order by l.created_at desc;
end $$;

revoke all on function public.oo_review(uuid, int, text) from public;
revoke all on function public.oo_admin_set_review(uuid, text) from public;
revoke all on function public.oo_partner_saved_count() from public;
revoke all on function public.oo_search(date, date, text, text) from public;
revoke all on function public.oo_liked() from public;
grant execute on function public.oo_review(uuid, int, text) to authenticated;
grant execute on function public.oo_admin_set_review(uuid, text) to authenticated;
grant execute on function public.oo_partner_saved_count() to authenticated;
grant execute on function public.oo_search(date, date, text, text) to authenticated;
grant execute on function public.oo_liked() to authenticated;
