-- v1513 PROMOTIONS WALL (Pete 2026-10-11): courses post promotions golfers browse inside Tee Times and on the public
-- /tee-time-deals/ page. "Expirations are a must because it needs to sell quickly and the course sets those limits."
-- A wall promotion is a course_offers row with on_wall = true. It is live while status = 'active', valid_to is ahead
-- and (no limit, or places left). Ending needs no write: every reader filters on valid_to.
--   promo_wall(p_test)       anon   live wall rows + live hot deals, public fields only (never segment)
--   promo_post(slug, p, by, pin) / promo_withdraw(slug, id, pin)   the pro shop, with the COURSE'S OWN PIN (a deal is a
--                                   price golfers can book on a public page: same rule as the payment target, v1456).
--                                   10 wrong PINs an hour lock the course's posting for the hour.
--   promo_mine(slug)         anon   the pro shop's list (views, places taken; counts only)
--   promo_seen(id)           anon   +1 view
--   promo_claim(...)         anon   a deal with no tee time to book (or a course without online booking): a ref code
--   teetime_book(..., p_promo)      booking a deal = the tee time + the deal price, places taken under the offer's row lock
--   bookings trigger                a cancelled / unpaid booking hands its places back
-- Followers hear first: segment {audience:'followers', venue} through the existing course_offer delivery.

alter table public.course_offers
  add column if not exists on_wall boolean not null default false,
  add column if not exists venue_slug text,
  add column if not exists price integer,
  add column if not exists was_price integer,
  add column if not exists unit text,
  add column if not exists play_from date,
  add column if not exists play_to date,
  add column if not exists time_from text,
  add column if not exists time_to text,
  add column if not exists limit_total integer,
  add column if not exists limit_left integer,
  add column if not exists photo_url text,
  add column if not exists views integer not null default 0;

alter table public.course_offers drop constraint if exists course_offers_wall_check;
alter table public.course_offers add constraint course_offers_wall_check check (
  not on_wall or (valid_to is not null and venue_slug is not null
                  and (limit_total is null or (limit_total between 1 and 999 and limit_left between 0 and limit_total))));
create index if not exists course_offers_wall_idx on public.course_offers (valid_to) where on_wall and status = 'active';

-- The browser key keeps exactly the columns it had (hot deals, the marketing composer); the wall columns
-- (places left, views, on_wall) are written by the RPCs below only.
revoke insert, update on public.course_offers from anon, authenticated;
grant insert (id, course_id, course_name, audience, offer_type, title, body, cta_label, cta_target, segment, lang, priority,
              valid_from, valid_to, status, created_by, push_sent_at, push_recipients, created_at, updated_at, deal)
   on public.course_offers to anon, authenticated;
grant update (id, course_id, course_name, audience, offer_type, title, body, cta_label, cta_target, segment, lang, priority,
              valid_from, valid_to, status, created_by, push_sent_at, push_recipients, created_at, updated_at, deal)
   on public.course_offers to anon, authenticated;
revoke delete, truncate on public.course_offers from anon, authenticated;

create table if not exists public.course_promo_claims (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.course_offers(id) on delete cascade,
  venue_slug text not null,
  golfer_id text not null,
  golfer_name text,
  qty integer not null default 1 check (qty between 1 and 4),
  booking_id text,
  ref text not null,
  status text not null default 'active' check (status in ('active', 'cancelled')),
  created_at timestamptz not null default now(),
  cancelled_at timestamptz);
create unique index if not exists course_promo_claims_one on public.course_promo_claims (offer_id, golfer_id) where status = 'active';
create index if not exists course_promo_claims_booking on public.course_promo_claims (booking_id) where booking_id is not null;
alter table public.course_promo_claims enable row level security;   -- no policies: RPCs only
revoke all on public.course_promo_claims from anon, authenticated;

-- the courses.id a venue's offers carry (what course_follows / the inbox key on)
create or replace function public._promo_course_id(p_slug text) returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select c.id from public.courses c
                    where public.course_venue(c.id) = p_slug
                    order by (c.id = (select v.course_ref from public.course_venues v where v.slug = p_slug)) desc, length(c.id), c.id
                    limit 1), p_slug)
$$;
revoke execute on function public._promo_course_id(text) from public, anon, authenticated;

-- ---------------------------------------------------------------- the wall (public)
create or replace function public.promo_wall(p_test boolean default false) returns jsonb
language sql stable security definer set search_path = public as $$
  with w as (
    select o.id, o.venue_slug slug, o.course_id, coalesce(v.name, o.course_name) course_name, coalesce(v.short_name, v.name, o.course_name) short,
           v.region, v.area, o.offer_type type, false hot, o.title, o.body, o.price, o.was_price, o.unit,
           o.play_from, o.play_to, o.time_from, o.time_to, o.limit_total, o.limit_left,
           coalesce(o.photo_url, nullif(v.photo_url, '')) photo, o.valid_to, o.created_at
      from public.course_offers o left join public.course_venues v on v.slug = o.venue_slug
     where o.on_wall and o.status = 'active' and o.valid_to > now() and (o.valid_from is null or o.valid_from <= now())
       and (o.limit_total is null or o.limit_left > 0)
       and (o.venue_slug <> 'cheechan' or p_test)
    union all
    -- v1219 hot deals: one open tee time the pro shop put up from the sheet
    select o.id, v.slug, o.course_id, coalesce(v.name, o.course_name), coalesce(v.short_name, v.name, o.course_name),
           v.region, v.area, 'tee_time', true, o.title, o.body, case when (o.deal->>'price') ~ '^\d{1,7}(\.\d+)?$' then (o.deal->>'price')::numeric::int end, null, 'per player',
           nullif(o.deal->>'date', '')::date, nullif(o.deal->>'date', '')::date, left(o.deal->>'time', 5), left(o.deal->>'time', 5),
           x.tot, greatest(0, x.tot - x.took),
           nullif(v.photo_url, ''), o.valid_to, o.created_at
      from public.course_offers o left join public.course_venues v on v.slug = public.course_venue(o.course_id)
      cross join lateral (select coalesce(case when (o.deal->>'spots_total') ~ '^\d{1,3}$' then (o.deal->>'spots_total')::int end, 0) tot,
                                 coalesce(case when (o.deal->>'spots_taken') ~ '^\d{1,3}$' then (o.deal->>'spots_taken')::int end, 0) took) x
     where o.cta_target = 'hotdeal' and o.status = 'active' and o.valid_to > now() and o.deal is not null
       and x.tot > x.took
       and o.course_id <> 'zz_test' and (coalesce(v.slug, '') <> 'cheechan' or p_test)
  )
  select coalesce(jsonb_agg(to_jsonb(w) || jsonb_build_object('bookable', coalesce((public.teetime_cfg(w.slug)->>'enabled')::boolean, false))
                            order by w.valid_to), '[]'::jsonb)
    from (select * from w order by valid_to limit 300) w
$$;
grant execute on function public.promo_wall(boolean) to anon, authenticated;

-- course ids a golfer follows -> venue slugs (the wall's Following tab)
drop function if exists public.promo_follow_slugs(text[]);
create or replace function public.promo_follow_slugs(p_ids text[]) returns jsonb   -- {course_id: venue slug}
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_object_agg(x, coalesce(public.course_venue(x), x)), '{}'::jsonb) from (select distinct x from unnest(coalesce(p_ids[1:200], '{}')) x) z
$$;
grant execute on function public.promo_follow_slugs(text[]) to anon, authenticated;

-- ---------------------------------------------------------------- the pro shop
-- the course's own pro shop PIN (proshop_pins, never sent to the browser); null = ok, else the reason
create table if not exists public.promo_pin_fails (slug text not null, at timestamptz not null default now());
create index if not exists promo_pin_fails_slug_at on public.promo_pin_fails (slug, at);
alter table public.promo_pin_fails enable row level security;   -- no policies: server-side only
revoke all on public.promo_pin_fails from anon, authenticated;
create or replace function public._promo_pin_check(p_slug text, p_pin text) returns text
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.proshop_pins pp
                  where pp.course_id = p_slug or pp.course_id = (select v.course_ref from public.course_venues v where v.slug = p_slug)) then
    return 'no_pin';
  end if;
  if (select count(*) from public.promo_pin_fails f where f.slug = p_slug and f.at > now() - interval '1 hour') >= 10 then return 'locked'; end if;
  if not public.teetime_pin_ok(p_slug, p_pin) then
    insert into public.promo_pin_fails (slug) values (p_slug);
    delete from public.promo_pin_fails where at < now() - interval '1 day';
    return 'pin';
  end if;
  return null;
end $$;
revoke execute on function public._promo_pin_check(text, text) from public, anon, authenticated;

drop function if exists public.promo_post(text, jsonb, text);
drop function if exists public.promo_withdraw(text, uuid);
create or replace function public.promo_post(p_slug text, p jsonb, p_by text default null, p_pin text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v record; v_type text; v_title text; v_body text; v_price int; v_was int; v_unit text; v_from date; v_to date;
  v_tf text; v_tt text; v_end timestamptz; v_lim int; v_photo text; v_id uuid; v_today date := (now() at time zone 'Asia/Bangkok')::date;
  clean text := '[<>"`]';
begin
  select slug, name into v from public.course_venues where slug = p_slug and coalesce(active, true);
  if not found then return jsonb_build_object('ok', false, 'reason', 'no_course'); end if;
  v_type := public._promo_pin_check(p_slug, p_pin);
  if v_type is not null then return jsonb_build_object('ok', false, 'reason', v_type); end if;
  if jsonb_typeof(p) <> 'object' then return jsonb_build_object('ok', false, 'reason', 'bad_input'); end if;
  v_type := p->>'type';
  if v_type not in ('tee_time', 'society_package', 'caddy', 'food_beverage', 'promotion') then return jsonb_build_object('ok', false, 'reason', 'type'); end if;
  v_title := left(trim(regexp_replace(coalesce(p->>'title', ''), clean, '', 'g')), 40);
  if v_title = '' then return jsonb_build_object('ok', false, 'reason', 'title'); end if;
  v_body := nullif(left(trim(regexp_replace(coalesce(p->>'body', ''), clean, '', 'g')), 300), '');
  v_unit := nullif(left(trim(regexp_replace(coalesce(p->>'unit', ''), clean, '', 'g')), 30), '');
  v_price := case when coalesce(p->>'price', '') ~ '^\d{1,6}$' then (p->>'price')::int end;
  v_was := case when coalesce(p->>'was_price', '') ~ '^\d{1,6}$' then (p->>'was_price')::int end;
  if v_was is not null and (v_price is null or v_was <= v_price) then v_was := null; end if;
  v_from := case when coalesce(p->>'play_from', '') ~ '^\d{4}-\d{2}-\d{2}$' then (p->>'play_from')::date end;
  v_to := case when coalesce(p->>'play_to', '') ~ '^\d{4}-\d{2}-\d{2}$' then (p->>'play_to')::date end;
  if v_from is not null and v_from < v_today then v_from := v_today; end if;
  if v_to is not null and (v_to < v_today or v_to > v_today + 180) then return jsonb_build_object('ok', false, 'reason', 'days'); end if;
  if v_from is not null and v_to is not null and v_to < v_from then return jsonb_build_object('ok', false, 'reason', 'days'); end if;
  v_tf := case when coalesce(p->>'time_from', '') ~ '^([01]\d|2[0-3]):[0-5]\d$' then p->>'time_from' end;
  v_tt := case when coalesce(p->>'time_to', '') ~ '^([01]\d|2[0-3]):[0-5]\d$' then p->>'time_to' end;
  if v_tf is not null and v_tt is not null and v_tt < v_tf then return jsonb_build_object('ok', false, 'reason', 'hours'); end if;
  -- the end time is REQUIRED and set by the course
  begin v_end := (p->>'valid_to')::timestamptz; exception when others then v_end := null; end;
  if v_end is null then return jsonb_build_object('ok', false, 'reason', 'ends'); end if;
  if v_end < now() + interval '5 minutes' or v_end > now() + interval '60 days' then return jsonb_build_object('ok', false, 'reason', 'ends'); end if;
  v_lim := case when coalesce(p->>'limit', '') ~ '^\d{1,3}$' and (p->>'limit')::int between 1 and 999 then (p->>'limit')::int end;
  v_photo := case when coalesce(p->>'photo_url', '') ~ '^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/course-media/[A-Za-z0-9._/-]+$' then p->>'photo_url' end;
  perform pg_advisory_xact_lock(hashtext('promo:' || p_slug));
  if (select count(*) from public.course_offers o where o.venue_slug = p_slug and o.on_wall and o.status = 'active' and o.valid_to > now()) >= 12 then
    return jsonb_build_object('ok', false, 'reason', 'too_many');
  end if;
  if (select count(*) from public.course_offers o where o.venue_slug = p_slug and o.on_wall and o.created_at > now() - interval '1 day') >= 30 then
    return jsonb_build_object('ok', false, 'reason', 'too_many');
  end if;
  insert into public.course_offers (course_id, course_name, audience, offer_type, title, body, cta_label, cta_target, segment, priority,
    valid_from, valid_to, status, created_by, on_wall, venue_slug, price, was_price, unit, play_from, play_to, time_from, time_to,
    limit_total, limit_left, photo_url)
  values (public._promo_course_id(p_slug), v.name, 'golfer', v_type, v_title, coalesce(v_body, ''), 'See the deal', 'promo',
    jsonb_build_object('audience', 'followers', 'venue', p_slug), 'normal',
    now(), v_end, 'active', left(coalesce(p_by, 'Pro shop'), 80), true, p_slug, v_price, v_was, v_unit, v_from, v_to, v_tf, v_tt,
    v_lim, v_lim, v_photo)
  returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;
grant execute on function public.promo_post(text, jsonb, text, text) to anon, authenticated;

create or replace function public.promo_withdraw(p_slug text, p_id uuid, p_pin text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare n int; why text;
begin
  why := public._promo_pin_check(p_slug, p_pin);
  if why is not null then return jsonb_build_object('ok', false, 'reason', why); end if;
  update public.course_offers set status = 'deleted', updated_at = now()
   where id = p_id and venue_slug = p_slug and on_wall and status = 'active';
  get diagnostics n = row_count;
  return jsonb_build_object('ok', n = 1);
end $$;
grant execute on function public.promo_withdraw(text, uuid, text) to anon, authenticated;

create or replace function public.promo_mine(p_slug text) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(r order by r.live desc, r.valid_to desc), '[]'::jsonb) from (
    select o.id, o.offer_type type, o.title, o.price, o.was_price, o.status, o.valid_to, o.created_at, o.limit_total, o.limit_left, o.views,
           (o.status = 'active' and o.valid_to > now() and (o.limit_total is null or o.limit_left > 0)) live,
           (select coalesce(sum(k.qty), 0) from public.course_promo_claims k where k.offer_id = o.id and k.status = 'active') taken,
           (select count(*) from public.course_offer_reads cr where cr.offer_id = o.id) reached
      from public.course_offers o
     where o.venue_slug = p_slug and o.on_wall and o.created_at > now() - interval '60 days'
     order by o.created_at desc limit 40) r
$$;
grant execute on function public.promo_mine(text) to anon, authenticated;

create or replace function public.promo_seen(p_id uuid) returns void
language sql security definer set search_path = public as $$
  update public.course_offers set views = views + 1 where id = p_id and on_wall and status = 'active' and valid_to > now()
$$;
grant execute on function public.promo_seen(uuid) to anon, authenticated;

-- a deal with no tee time to book (caddy, food & drink, other) or at a course without online booking:
-- the golfer gets a code to show at the pro shop; places come off the limit under the same row lock
create or replace function public.promo_claim(p_id uuid, p_golfer_id text, p_golfer_name text, p_qty integer default 1) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  o_id uuid; o_slug text; o_left int; o_total int; v_ref text; v_name text; v_have text;
begin
  if coalesce(p_golfer_id, '') = '' then return jsonb_build_object('ok', false, 'reason', 'no_golfer'); end if;
  -- a verified login can only claim as itself (LINE-only sessions carry no token yet: Auth Phase 2 binds this fully)
  if public.line_id() is not null and public.line_id() <> p_golfer_id then return jsonb_build_object('ok', false, 'reason', 'no_golfer'); end if;
  if coalesce(p_qty, 0) < 1 or p_qty > 4 then return jsonb_build_object('ok', false, 'reason', 'qty'); end if;
  select o.id, o.venue_slug, o.limit_left, o.limit_total into o_id, o_slug, o_left, o_total
    from public.course_offers o where o.id = p_id and o.on_wall and o.status = 'active' and o.valid_to > now() for update;
  if o_id is null then return jsonb_build_object('ok', false, 'reason', 'deal_gone'); end if;
  select k.ref into v_have from public.course_promo_claims k where k.offer_id = p_id and k.golfer_id = p_golfer_id and k.status = 'active';
  if v_have is not null then return jsonb_build_object('ok', true, 'ref', v_have, 'already', true); end if;
  if o_total is not null and coalesce(o_left, 0) < p_qty then
    return jsonb_build_object('ok', false, 'reason', 'deal_left', 'left', greatest(0, coalesce(o_left, 0)));
  end if;
  v_name := coalesce(nullif(left(regexp_replace(trim(coalesce(p_golfer_name, '')), '[<>""''`&]', '', 'g'), 60), ''), 'Golfer');
  v_ref := 'DEAL-' || upper(substr(translate(encode(decode(md5(gen_random_uuid()::text), 'hex'), 'base64'), '+/=0O1Il', 'XYZ'), 1, 5));
  insert into public.course_promo_claims (offer_id, venue_slug, golfer_id, golfer_name, qty, ref) values (p_id, o_slug, p_golfer_id, v_name, p_qty, v_ref);
  update public.course_offers set limit_left = case when limit_total is null then null else limit_left - p_qty end, updated_at = now() where id = p_id;
  return jsonb_build_object('ok', true, 'ref', v_ref, 'left', case when o_total is null then null else o_left - p_qty end);
end $$;
grant execute on function public.promo_claim(uuid, text, text, integer) to anon, authenticated;

-- the golfer's own deal codes (shown again in the sheet)
create or replace function public.promo_my_claims(p_golfer_id text) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('offer_id', k.offer_id, 'ref', k.ref, 'qty', k.qty, 'booking_id', k.booking_id)), '[]'::jsonb)
    from public.course_promo_claims k where k.golfer_id = p_golfer_id and k.status = 'active' and k.created_at > now() - interval '90 days'
     and (public.line_id() is null or public.line_id() = p_golfer_id)
$$;
grant execute on function public.promo_my_claims(text) to anon, authenticated;

-- a cancelled or unpaid booking hands the deal's places back (every cancel path sets bookings.deleted)
create or replace function public._promo_booking_gone() returns trigger
language plpgsql security definer set search_path = public as $$
declare k record;
begin
  for k in update public.course_promo_claims set status = 'cancelled', cancelled_at = now()
            where booking_id = new.id and status = 'active' returning offer_id, qty loop
    update public.course_offers set limit_left = least(limit_total, limit_left + k.qty), updated_at = now()
     where id = k.offer_id and limit_total is not null;
  end loop;
  return null;
end $$;
drop trigger if exists trg_promo_booking_gone on public.bookings;
create trigger trg_promo_booking_gone after update of deleted on public.bookings
  for each row when (new.deleted is true and old.deleted is distinct from true and (new.booking_data->'app') ? 'promo')
  execute function public._promo_booking_gone();

drop function if exists public.teetime_book(text, date, text, integer, text, text, jsonb, integer, text, text);
CREATE OR REPLACE FUNCTION public.teetime_book(p_slug text, p_date date, p_time text, p_col integer, p_golfer_id text, p_golfer_name text, p_players jsonb, p_carts integer DEFAULT 0, p_pay text DEFAULT NULL::text, p_notes text DEFAULT NULL::text, p_promo uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  c jsonb; v_nines text[]; v_tees int; v_nine text; v_tee int; n int; key_ text; booked int; blocked boolean;
  now_bkk timestamp := (now() at time zone 'Asia/Bangkok'); m int; v_start int; v_step int;
  bid text; ref text; gname text; golfers jsonb := '[]'::jsonb; pl jsonb; i int;
  cp record; prefix text; blk int; clash_t time; picks int := 0; want_any int := 0; nums text[] := '{}';
  first_pick jsonb := null; tee time; rmin int; fee jsonb; green int; caddy_fee int; cart_fee int;
  carts int; total int; rule text; amount int := 0; due timestamptz; state text; app jsonb; cancel_until timestamp;
  cad jsonb; job_rows jsonb := '[]'::jsonb;
  -- v1513: a Promotions Wall deal booked with the time
  pr_id uuid; pr_title text; pr_price int; pr_was int; pr_type text; pr_left int; pr_total int; pr_from date; pr_to date;
  pr_tf text; pr_tt text; pr_slug text; pr_ok boolean := false;
begin
  if coalesce(p_golfer_id, '') = '' then return jsonb_build_object('ok', false, 'reason', 'no_golfer'); end if;
  if jsonb_typeof(p_players) <> 'array' or jsonb_array_length(p_players) < 1 or jsonb_array_length(p_players) > 4 then
    return jsonb_build_object('ok', false, 'reason', 'players');
  end if;
  n := jsonb_array_length(p_players);
  c := public.teetime_cfg(p_slug);
  if c is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if not (c->>'enabled')::boolean then return jsonb_build_object('ok', false, 'reason', 'closed'); end if;
  m := public.teetime_min(p_time);
  v_start := public.teetime_min(c->>'start'); v_step := (c->>'interval')::int;
  if m is null or (m - v_start) % v_step <> 0 or m < public.teetime_min(c->>'open_from') or m > public.teetime_min(c->>'open_until') then
    return jsonb_build_object('ok', false, 'reason', 'off_grid');
  end if;
  if p_date > now_bkk::date + (c->>'days')::int then return jsonb_build_object('ok', false, 'reason', 'too_far'); end if;
  if (p_date + make_interval(mins => m)) < now_bkk + make_interval(mins => (c->>'lead_min')::int) then
    return jsonb_build_object('ok', false, 'reason', 'past');
  end if;
  select array_agg(x order by o) into v_nines from jsonb_array_elements_text(c->'nines') with ordinality as a(x, o);
  v_tees := (c->>'tees')::int;
  if p_col is null or p_col < 0 or p_col >= array_length(v_nines, 1) * v_tees then return jsonb_build_object('ok', false, 'reason', 'off_grid'); end if;
  v_nine := v_nines[(p_col / v_tees) + 1]; v_tee := (p_col % v_tees) + 1;
  -- names and notes land in the pro shop sheet's markup: no HTML characters, ever
  gname := coalesce(nullif(left(regexp_replace(trim(coalesce(p_golfer_name, '')), '[<>"''`&]', '', 'g'), 60), ''), 'Golfer');
  p_time := public.teetime_hhmm(m);

  -- the same lock the 4-per-slot trigger takes: two golfers racing for the last spots queue here
  key_ := p_slug || '|' || p_date::text || '|' || p_time || '|' || v_nine || '|' || v_tee::text;
  perform pg_advisory_xact_lock(hashtext('teeslot:' || key_));
  select g.booked, g.blocked into booked, blocked from public.teetime_grid(p_slug, p_date) g where g.t = p_time and g.col = p_col;
  if blocked then return jsonb_build_object('ok', false, 'reason', 'blocked'); end if;
  if coalesce(booked, 0) + n > 4 then return jsonb_build_object('ok', false, 'reason', 'full', 'left', greatest(0, 4 - coalesce(booked, 0))); end if;
  -- a double tap is not a second booking
  if exists (select 1 from public.bookings b where b.golfer_id = p_golfer_id and b.date = p_date and left(b.time, 5) = p_time
               and b.course_id = p_slug and b.booking_type = 'app' and not coalesce(b.deleted, false)) then
    return jsonb_build_object('ok', false, 'reason', 'already');
  end if;

  -- v1513: a deal from the Promotions Wall. Its row lock queues golfers racing for the last places;
  -- the deal's own days, hours, end time and places are checked here, never trusted from the phone.
  if p_promo is not null then
    select o.id, o.title, o.price, o.was_price, o.offer_type, o.limit_left, o.limit_total, o.play_from, o.play_to, o.time_from, o.time_to, o.venue_slug
      into pr_id, pr_title, pr_price, pr_was, pr_type, pr_left, pr_total, pr_from, pr_to, pr_tf, pr_tt, pr_slug
      from public.course_offers o
     where o.id = p_promo and o.on_wall and o.status = 'active' and o.valid_to > now()
     for update;
    if pr_id is null then return jsonb_build_object('ok', false, 'reason', 'deal_gone'); end if;
    if pr_slug is distinct from p_slug then return jsonb_build_object('ok', false, 'reason', 'deal_course'); end if;
    if (pr_from is not null and p_date < pr_from) or (pr_to is not null and p_date > pr_to) then
      return jsonb_build_object('ok', false, 'reason', 'deal_day');
    end if;
    if (pr_tf is not null and p_time < pr_tf) or (pr_tt is not null and p_time > pr_tt) then
      return jsonb_build_object('ok', false, 'reason', 'deal_time');
    end if;
    if pr_total is not null and coalesce(pr_left, 0) < n then
      return jsonb_build_object('ok', false, 'reason', 'deal_left', 'left', greatest(0, coalesce(pr_left, 0)));
    end if;
    if exists (select 1 from public.course_promo_claims k where k.offer_id = p_promo and k.golfer_id = p_golfer_id and k.status = 'active') then
      return jsonb_build_object('ok', false, 'reason', 'deal_already');
    end if;
    pr_ok := true;
  end if;

  tee := p_time::time;
  rmin := (c->>'round_min')::int;
  prefix := lower(split_part(coalesce(c->>'name', ''), ' ', 1));
  caddy_fee := coalesce((c->'rates'->>'caddy18')::int, 0);
  if pr_ok and pr_type = 'society_package' and coalesce(pr_price, 0) > 0 then caddy_fee := 0; end if;   -- the package price includes them

  -- players + their caddies, every pick validated BEFORE any write
  i := 0;
  for pl in select value from jsonb_array_elements(p_players) loop
    i := i + 1;
    cad := null;
    if coalesce(pl->>'caddy', 'any') ~* '^[0-9a-f]{8}-[0-9a-f-]{27}$' then
      select * into cp from public.caddy_profiles x
       where x.id = (pl->>'caddy')::uuid and coalesce(x.is_active, false) and not coalesce(x.is_mock, false)
         and (x.course_id = p_slug or (prefix <> '' and lower(coalesce(x.course_name, '')) like prefix || '%'));
      if not found then return jsonb_build_object('ok', false, 'reason', 'caddy_taken', 'caddy', '?'); end if;
      if exists (select 1 from jsonb_array_elements(golfers) gx where gx->>'caddyId' = cp.id::text) then
        return jsonb_build_object('ok', false, 'reason', 'caddy_taken', 'caddy', cp.caddy_number);
      end if;
      perform pg_advisory_xact_lock(hashtext('caddy:' || cp.id::text));
      blk := greatest(270, coalesce(cp.block_minutes, 270));
      select coalesce(cb.tee_time, cb.start_time) into clash_t from public.caddy_bookings cb
       where cb.booking_date = p_date and coalesce(cb.status, '') <> 'cancelled'
         and (cb.caddy_id = cp.id or (cb.caddy_id is null and cb.caddie_name = 'Caddy #' || trim(cp.caddy_number)
              and (cb.course_id = p_slug or (prefix <> '' and lower(coalesce(cb.course_name, '')) like prefix || '%'))))
         and coalesce(cb.tee_time, cb.start_time) is not null
         and abs(extract(epoch from (coalesce(cb.tee_time, cb.start_time) - tee)) / 60) < blk
       limit 1;
      if found then return jsonb_build_object('ok', false, 'reason', 'caddy_taken', 'caddy', cp.caddy_number, 'at', to_char(clash_t, 'HH24:MI')); end if;
      if exists (select 1 from public.caddy_dayoff_requests r where r.status = 'approved'
                  and trim(coalesce(r.caddy_number, '')) = trim(cp.caddy_number) and r.date_from <= p_date and r.date_to >= p_date
                  and (r.course_name is null or prefix = '' or lower(r.course_name) like prefix || '%')) then
        return jsonb_build_object('ok', false, 'reason', 'caddy_taken', 'caddy', cp.caddy_number);
      end if;
      cad := jsonb_build_object('id', cp.id::text, 'number', trim(cp.caddy_number), 'name', coalesce(nullif(trim(cp.name), ''), 'Caddy #' || trim(cp.caddy_number)));
      picks := picks + 1; nums := nums || trim(cp.caddy_number);
      if first_pick is null then first_pick := cad; end if;
    elsif coalesce(pl->>'caddy', 'any') = 'any' then
      want_any := want_any + 1;
    end if;
    golfers := golfers || jsonb_build_array(jsonb_build_object(
      'name', coalesce(nullif(left(regexp_replace(trim(coalesce(pl->>'name', '')), '[<>"''`&]', '', 'g'), 60), ''), case when i = 1 then gname else gname || ' +' || (i - 1) end),
      'odoo_id', case when i = 1 then p_golfer_id else nullif(trim(coalesce(pl->>'id', '')), '') end,
      'caddyId', cad->>'id', 'caddyNumber', coalesce(cad->>'number', ''), 'caddyName', coalesce(cad->>'name', ''),
      'caddyWanted', case when cad is not null then 'picked' when coalesce(pl->>'caddy', 'any') = 'any' then 'any' else 'none' end));
  end loop;

  -- the bill, from the course's own rates (null when the course shows none)
  fee := public.teetime_green_fee(c, p_date, p_time);
  green := coalesce((fee->>'price')::int, 0);
  if pr_ok and coalesce(pr_price, 0) > 0 then green := pr_price; end if;   -- the deal price replaces the green fee
  carts := greatest(0, least(n, coalesce(p_carts, 0)));
  cart_fee := coalesce((c->'rates'->>'cart18')::int, 0);
  if pr_ok and pr_type = 'society_package' and coalesce(pr_price, 0) > 0 then cart_fee := 0; end if;
  total := case when fee is null and not (pr_ok and coalesce(pr_price, 0) > 0) then null else green * n + caddy_fee * (picks + want_any) + cart_fee * carts end;
  rule := c->>'rule';
  if rule = 'deposit' and p_pay = 'full' and (c->>'allow_full')::boolean and total is not null then rule := 'full'; end if;
  amount := case rule when 'deposit' then (c->>'deposit_pp')::int * n when 'full' then coalesce(total, 0) else 0 end;
  if rule in ('deposit', 'full') and amount <= 0 then rule := 'none'; amount := 0; end if;
  state := case when rule = 'none' then 'booked' else 'due' end;
  due := case when state = 'due' then now() + make_interval(mins => (c->>'pay_min')::int) else null end;
  cancel_until := (p_date + make_interval(mins => m)) - make_interval(hours => (c->>'cancel_h')::int);
  bid := gen_random_uuid()::text;
  ref := 'MCP-' || upper(substr(translate(encode(decode(md5(bid), 'hex'), 'base64'), '+/=0O1Il', 'XYZ'), 1, 5));
  app := jsonb_build_object('v', 1, 'ref', ref, 'rule', rule, 'amount', amount, 'deposit_pp', case when rule = 'deposit' then (c->>'deposit_pp')::int else null end,
    'state', state, 'due_at', due, 'cancel_until', to_char(cancel_until, 'YYYY-MM-DD"T"HH24:MI'), 'carts', carts,
    'quote', case when total is null then null else jsonb_build_object('period', case when pr_ok and coalesce(pr_price, 0) > 0 then 'Deal' else fee->>'label' end, 'green_pp', green, 'caddy_pp', caddy_fee,
                 'caddies', picks + want_any, 'cart_each', cart_fee, 'total', total) end,
    'pay_to', c->'pay_to', 'allow_full', coalesce((c->>'allow_full')::boolean, false) and total is not null, 'created_at', now(), 'booker', p_golfer_id);

  if pr_ok then
    app := app || jsonb_build_object('promo', jsonb_build_object('id', pr_id, 'title', pr_title, 'price', pr_price, 'was', pr_was, 'type', pr_type));
    p_notes := 'Deal: ' || pr_title || coalesce(' · ' || nullif(trim(p_notes), ''), '');
  end if;

  insert into public.bookings (
    id, date, time, tee_time, name, golfer_name, golfer_id, players, group_id, kind, booking_type,
    tee_sheet_course, tee_number, course_id, course_name, notes, status, source, is_vip, deleted,
    caddie_id, caddy_number, caddie_name, caddie_status, created_at, updated_at, booking_data)
  values (
    bid, p_date, p_time, p_date::text || 'T' || p_time || ':00', gname, gname, p_golfer_id, n, bid, 'tee', 'app',
    v_nine, v_tee, p_slug, c->>'name',
    left(regexp_replace(coalesce(nullif(trim(p_notes), ''), ''), '[<>"`]', '', 'g'), 300),
    'confirmed', 'teesheet', false, false,
    first_pick->>'id', coalesce(first_pick->>'number', ''), coalesce(first_pick->>'name', ''),
    case when picks > 0 then 'confirmed' when want_any > 0 then 'pending' else null end,
    now(), now(),
    jsonb_build_object('golfers', golfers, 'groupName', null, 'groupIndex', null, 'groupTotal', null, 'col', p_col,
      'recurringGroupId', null, 'caddiesNeeded', want_any, 'app', app));

  -- caddy jobs: picked = confirmed with her id; "pro shop assigns" = Unassigned pending (caddy master assigns)
  for pl in select value from jsonb_array_elements(golfers) loop
    if pl->>'caddyWanted' = 'picked' then
      insert into public.caddy_bookings (caddy_id, caddie_name, booking_date, tee_time, start_time, end_time, course_id, course_name,
        holes, payment_amount, payment_status, status, confirmed_at, confirmed_by, golfer_id, user_id, golfer_name,
        booking_source, teesheet_booking_id, special_requests)
      values ((pl->>'caddyId')::uuid, 'Caddy #' || (pl->>'caddyNumber'), p_date, tee, tee, tee + make_interval(mins => rmin), p_slug, c->>'name',
        18, caddy_fee, 'pending', 'confirmed', now(), 'Golfer app', coalesce(pl->>'odoo_id', p_golfer_id), coalesce(pl->>'odoo_id', p_golfer_id),
        pl->>'name', 'app_teetime', bid, 'Tee time ' || ref);
    elsif pl->>'caddyWanted' = 'any' then
      insert into public.caddy_bookings (caddy_id, caddie_name, booking_date, tee_time, start_time, end_time, course_id, course_name,
        holes, payment_amount, payment_status, status, golfer_id, user_id, golfer_name, booking_source, teesheet_booking_id, special_requests)
      values (null, 'Unassigned', p_date, tee, tee, tee + make_interval(mins => rmin), p_slug, c->>'name',
        18, caddy_fee, 'pending', 'pending', coalesce(pl->>'odoo_id', p_golfer_id), coalesce(pl->>'odoo_id', p_golfer_id), pl->>'name',
        'app_teetime', bid, 'Tee time ' || ref);
    end if;
  end loop;

  if pr_ok then
    update public.course_offers set limit_left = case when limit_total is null then null else limit_left - n end, updated_at = now() where id = pr_id;
    insert into public.course_promo_claims (offer_id, venue_slug, golfer_id, golfer_name, qty, booking_id, ref)
    values (pr_id, p_slug, p_golfer_id, gname, n, bid, ref);
  end if;

  return jsonb_build_object('ok', true, 'deal', pr_ok, 'booking_id', bid, 'ref', ref, 'state', state, 'rule', rule, 'amount', amount,
    'due_at', due, 'date', p_date, 'time', p_time, 'nine', v_nine, 'course', c->>'name', 'caddies', to_jsonb(nums));
end $function$

;
grant execute on function public.teetime_book(text, date, text, integer, text, text, jsonb, integer, text, text, uuid) to anon, authenticated;

CREATE OR REPLACE FUNCTION public.offer_segment_ids(p_hcp_min numeric, p_hcp_max numeric, p_course_names text[], p_lang text, p_played_since date, p_audience text, p_venue text, p_dows integer[], p_days integer)
 RETURNS SETOF text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  today date := (now() at time zone 'Asia/Bangkok')::date;
  d0 date := today - greatest(7, least(coalesce(p_days, 90), 366));
  reg text := (select region from public.course_venues where slug = p_venue);
begin
  if p_audience in ('never_here', 'lapsed_elsewhere', 'market', 'caddy_users', 'followers') and p_venue is null then return; end if;
  if p_audience is not null and p_audience not in ('never_here', 'lapsed_elsewhere', 'market', 'caddy_users', 'followers') then return; end if;
  return query
  with nm as (select z.n, public.venue_of(z.n) v from (select distinct course_name n from public.rounds) z),
  rv as (
    select x.golfer_id, (x.played_at at time zone 'Asia/Bangkok')::date d, nm.v
    from public.rounds x join nm on nm.n = x.course_name join public.course_venues cv on cv.slug = nm.v
    where x.golfer_id is not null and x.golfer_id <> '' and x.played_at is not null
      and (p_audience is not null or p_dows is not null or p_venue is not null) and (reg is null or cv.region = reg)
  ),
  here as (
    select x.golfer_id from public.rounds x
    where p_audience is null and p_course_names is not null
      and (x.course_name = any(p_course_names) or x.course_name in (select n from nm where nm.v = p_venue))
      and (p_played_since is null or coalesce(x.played_at, x.completed_at, x.created_at) >= p_played_since)
  ),
  never_here as (
    select golfer_id from rv where d >= d0 and p_audience = 'never_here'
    except select golfer_id from rv where v = p_venue
  ),
  lapsed as (
    select golfer_id from rv where v = p_venue and p_audience = 'lapsed_elsewhere' group by golfer_id having max(d) < today - 90
    intersect select golfer_id from rv where v <> p_venue and d >= d0
  ),
  in_market as (select distinct golfer_id from rv where d >= d0 and p_audience = 'market'),
  caddy_users as (   -- booked a caddy in the region in the window (Chee Chan = tester course, left out)
    select distinct coalesce(nullif(b.golfer_id, ''), nullif(b.user_id, '')) golfer_id
    from public.caddy_bookings b join public.course_venues cv on cv.slug = public.venue_for_course(b.course_id, b.course_name)
    where p_audience = 'caddy_users' and coalesce(b.status, '') <> 'cancelled' and b.booking_date between d0 and today
      and (reg is null or cv.region = reg) and (cv.slug <> 'cheechan' or p_venue = 'cheechan')
  ),
  followers as (   -- v1513: everyone following this venue (any course id of it); a wall promotion reaches them
    select cf.golfer_line_id golfer_id from public.course_follows cf
    where p_audience = 'followers' and (cf.course_id = p_venue or public.course_venue(cf.course_id) = p_venue)
  ),
  on_days as (select golfer_id from rv where p_dows is not null and d >= d0 and extract(isodow from d)::int = any(p_dows))
  select distinct p.line_user_id
  from public.user_profiles p
  where p.line_user_id is not null and p.line_user_id <> ''
    and (p_hcp_min is null or p.handicap_index >= p_hcp_min)
    and (p_hcp_max is null or p.handicap_index <= p_hcp_max)
    and (p_lang is null or lower(coalesce(p.language, p.preferred_language, 'en')) = lower(p_lang))
    and (p_audience is not null or p_course_names is null or p.line_user_id in (select golfer_id from here))
    and (p_audience is distinct from 'never_here' or p.line_user_id in (select golfer_id from never_here))
    and (p_audience is distinct from 'lapsed_elsewhere' or p.line_user_id in (select golfer_id from lapsed))
    and (p_audience is distinct from 'market' or p.line_user_id in (select golfer_id from in_market))
    and (p_audience is distinct from 'caddy_users' or p.line_user_id in (select golfer_id from caddy_users))
    and (p_audience is distinct from 'followers' or p.line_user_id in (select golfer_id from followers))
    and (p_dows is null or p.line_user_id in (select golfer_id from on_days));
end $function$

;
notify pgrst, 'reload schema';
