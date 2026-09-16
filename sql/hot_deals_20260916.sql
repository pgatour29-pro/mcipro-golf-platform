-- HOT DEALS (2026-09-16). Pete: "when there are tee times available they want to put up some
-- available times for people to grab and book those specials along with caddies, just like
-- how a Golfnow promotion would go up like hot deals."
--
-- A hot deal is a course_offers row (offer_type='tee_time', cta_target='hotdeal') whose `deal`
-- json holds the slot: {date, time, tee_sheet_course, tee_number, col, spots_total, spots_taken,
-- price, currency, caddy: 'included'|'optional'|'none', caddy_fee, round_minutes,
-- hold_booking_id}. The pro shop's tee sheet posts it and drops a HOLD pill (bookings row,
-- booking_type='hotdeal') on the slot so the counter can't double-book it. Golfers grab spots
-- through claim_hot_deal(), which is the ONLY writer of a grab: it locks the offer row, checks
-- what is left, writes the golfer's bookings row (the same shape the tee sheet reads), the
-- pending "Unassigned" caddy jobs (teesheet_booking_id link, v1218), shrinks or retires the
-- hold, and expires the offer when it sells out. Idempotent.
alter table public.course_offers add column if not exists deal jsonb;
create index if not exists course_offers_tee_time_live_idx
  on public.course_offers (valid_to) where offer_type = 'tee_time' and status = 'active';

create or replace function public.claim_hot_deal(
  p_offer_id   uuid,
  p_golfer_id  text,
  p_golfer_name text,
  p_spots      integer,
  p_want_caddy boolean
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $fn$
declare
  v       record;
  d       jsonb;
  total   integer;
  taken   integer;
  left_   integer;
  bid     text;
  price   numeric;
  cfee    numeric;
  gname   text;
  golfers jsonb := '[]'::jsonb;
  i       integer;
  hold    text;
  hold_label text;
  tee     time;
  rmin    integer;
begin
  if p_spots is null or p_spots < 1 or p_spots > 4 then
    return jsonb_build_object('ok', false, 'reason', 'spots');
  end if;
  if coalesce(p_golfer_id, '') = '' then
    return jsonb_build_object('ok', false, 'reason', 'no_golfer');
  end if;
  gname := coalesce(nullif(trim(p_golfer_name), ''), 'Golfer');

  select * into v from public.course_offers where id = p_offer_id for update;
  if not found or v.offer_type <> 'tee_time' or v.deal is null then
    return jsonb_build_object('ok', false, 'reason', 'not_a_deal');
  end if;
  if v.status <> 'active' then
    return jsonb_build_object('ok', false, 'reason', 'closed');
  end if;
  if v.valid_to is not null and v.valid_to < now() then
    return jsonb_build_object('ok', false, 'reason', 'expired');
  end if;

  d     := v.deal;
  total := coalesce((d->>'spots_total')::integer, 0);
  taken := coalesce((d->>'spots_taken')::integer, 0);
  left_ := total - taken;
  if left_ < p_spots then
    return jsonb_build_object('ok', false, 'reason', 'sold_out', 'left', greatest(left_, 0));
  end if;
  -- one grab per golfer per deal
  if exists (
    select 1 from public.bookings b
    where b.golfer_id = p_golfer_id
      and (b.booking_data->>'hotDealId') = p_offer_id::text
      and coalesce(b.deleted, false) = false
  ) then
    return jsonb_build_object('ok', false, 'reason', 'already');
  end if;

  price := coalesce((d->>'price')::numeric, 0);
  cfee  := coalesce((d->>'caddy_fee')::numeric, 0);
  rmin  := coalesce((d->>'round_minutes')::integer, 270);
  tee   := (d->>'time')::time;
  bid   := gen_random_uuid()::text;

  for i in 1..p_spots loop
    golfers := golfers || jsonb_build_array(jsonb_build_object(
      'name', case when i = 1 then gname else gname || ' +' || (i - 1) end,
      'odoo_id', case when i = 1 then p_golfer_id else null end,
      'caddyId', null, 'caddyNumber', '', 'caddyName', ''));
  end loop;

  -- the golfer's tee time, in the shape proshop-teesheet.html reads back (dbRowToBooking)
  insert into public.bookings (
    id, date, time, tee_time, name, golfer_name, golfer_id, players, group_id, kind, booking_type,
    tee_sheet_course, tee_number, course_id, course_name, notes, status, source, is_vip, deleted,
    caddie_status, created_at, updated_at, booking_data)
  values (
    bid, (d->>'date')::date, d->>'time', d->>'time', gname, gname, p_golfer_id, p_spots, bid, 'tee', 'hotdeal',
    d->>'tee_sheet_course', nullif(d->>'tee_number', '')::integer, v.course_id, v.course_name,
    'Hot deal ฿' || trim(to_char(price, 'FM999,999,990')) || '/player' || case when p_want_caddy then ', caddy' else '' end,
    'confirmed', 'hotdeal', false, false,
    case when p_want_caddy then 'pending' else null end, now(), now(),
    jsonb_build_object(
      'golfers', golfers, 'groupName', null, 'groupIndex', null, 'groupTotal', null,
      'col', d->'col', 'recurringGroupId', null,
      'caddiesNeeded', case when p_want_caddy then p_spots else 0 end,
      'hotDealId', p_offer_id::text, 'hotDealPrice', price,
      'hotDealCaddy', case when p_want_caddy then 'yes' else 'no' end));

  -- caddy jobs: pending, no number — the caddy master assigns from the rotation (v1218 model)
  if p_want_caddy then
    for i in 1..p_spots loop
      insert into public.caddy_bookings (
        caddy_id, caddie_name, booking_date, tee_time, start_time, end_time, course_id, course_name,
        holes, payment_amount, payment_status, status, golfer_id, user_id, golfer_name,
        booking_source, teesheet_booking_id, special_requests)
      values (
        null, 'Unassigned', (d->>'date')::date, tee, tee, tee + make_interval(mins => rmin),
        v.course_id, v.course_name, 18, cfee, 'pending', 'pending', p_golfer_id, p_golfer_id, gname,
        'hotdeal', bid, 'Hot deal booking');
    end loop;
  end if;

  taken := taken + p_spots;
  left_ := total - taken;
  d := d || jsonb_build_object('spots_taken', taken);

  -- shrink or retire the pro shop's HOLD pill on the sheet
  hold := d->>'hold_booking_id';
  if hold is not null then
    if left_ <= 0 then
      update public.bookings set deleted = true, updated_at = now() where id = hold;
    else
      hold_label := 'HOT DEAL ฿' || trim(to_char(price, 'FM999,999,990')) || ' · ' || left_ || ' left';
      update public.bookings
         set players = left_, name = hold_label, golfer_name = hold_label, updated_at = now(),
             booking_data = jsonb_set(
               jsonb_set(coalesce(booking_data, '{}'::jsonb), '{golfers}', jsonb_build_array(jsonb_build_object('name', hold_label, 'caddyId', null, 'caddyNumber', '', 'caddyName', ''))),
               '{hotDeal,spotsLeft}', to_jsonb(left_), true)
       where id = hold;
    end if;
  end if;

  update public.course_offers
     set deal = d,
         status = case when left_ <= 0 then 'expired' else status end,
         updated_at = now()
   where id = p_offer_id;

  return jsonb_build_object('ok', true, 'booking_id', bid, 'left', left_,
                            'date', d->>'date', 'time', d->>'time', 'course_name', v.course_name);
end
$fn$;

grant execute on function public.claim_hot_deal(uuid, text, text, integer, boolean) to anon, authenticated;
