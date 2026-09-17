-- HOT DEALS — caddy pick in the grab sheet (2026-09-17, v1228). Pete: "if booking from this deal we
-- need to fix in booking the caddy from the same process as a one stop shop." The golfer now picks
-- specific caddies from the course's real roster inside the grab sheet; claim_hot_deal takes them as
-- p_caddies [{id, number, name}], re-checks each one under a per-caddy advisory lock (active real
-- caddy of this facility; no other job from ANY source inside her block — floor 255 min — of the tee
-- time; no approved day off) and writes CONFIRMED jobs for the picks plus PENDING 'Unassigned' jobs
-- for the remaining spots. A failed pick returns {ok:false, reason:'caddy_taken', caddy:N} before
-- anything is written. Old clients (5 args) keep working: p_caddies defaults to [].
drop function if exists public.claim_hot_deal(uuid, text, text, integer, boolean);

create or replace function public.claim_hot_deal(
  p_offer_id    uuid,
  p_golfer_id   text,
  p_golfer_name text,
  p_spots       integer,
  p_want_caddy  boolean,
  p_caddies     jsonb default '[]'::jsonb
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
  want_caddy boolean;
  picks   jsonb := '[]'::jsonb;
  pk      jsonb;
  cp      record;
  prefix  text;
  block   integer;
  clash_t time;
  n_pick  integer := 0;
  first_pick jsonb;
  the_date date;
  numbers text[] := '{}';
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

  price    := coalesce((d->>'price')::numeric, 0);
  cfee     := coalesce((d->>'caddy_fee')::numeric, 0);
  rmin     := coalesce((d->>'round_minutes')::integer, 270);
  tee      := (d->>'time')::time;
  the_date := (d->>'date')::date;
  bid      := gen_random_uuid()::text;
  want_caddy := coalesce(p_want_caddy, false)
                or (jsonb_typeof(p_caddies) = 'array' and jsonb_array_length(p_caddies) > 0);
  if coalesce(d->>'caddy', 'none') = 'none' then
    want_caddy := false;                       -- the deal has no caddy at all
  end if;

  -- Validate the picks BEFORE any write.
  prefix := lower(split_part(coalesce(v.course_name, ''), ' ', 1));
  if want_caddy and jsonb_typeof(p_caddies) = 'array' then
    if jsonb_array_length(p_caddies) > p_spots then
      return jsonb_build_object('ok', false, 'reason', 'spots');
    end if;
    for pk in select value from jsonb_array_elements(p_caddies) loop
      if coalesce(pk->>'id', '') !~* '^[0-9a-f]{8}-[0-9a-f-]{27}$' then
        return jsonb_build_object('ok', false, 'reason', 'caddy_taken', 'caddy', coalesce(pk->>'number', '?'));
      end if;
      select * into cp from public.caddy_profiles c
       where c.id = (pk->>'id')::uuid
         and coalesce(c.is_active, false)
         and coalesce(c.is_mock, false) = false
         and (c.course_id = v.course_id or (prefix <> '' and lower(coalesce(c.course_name, '')) like prefix || '%'));
      if not found then
        return jsonb_build_object('ok', false, 'reason', 'caddy_taken', 'caddy', coalesce(pk->>'number', '?'));
      end if;
      if cp.id::text = any(select x->>'id' from jsonb_array_elements(picks) x) then
        return jsonb_build_object('ok', false, 'reason', 'caddy_taken', 'caddy', cp.caddy_number);
      end if;
      -- two grabs racing for the same caddy queue here, and the second one sees the first one's job
      perform pg_advisory_xact_lock(hashtext('caddy:' || cp.id::text));
      block := greatest(255, coalesce(cp.block_minutes, 255));
      select coalesce(cb.tee_time, cb.start_time) into clash_t
        from public.caddy_bookings cb
       where cb.booking_date = the_date
         and coalesce(cb.status, '') <> 'cancelled'
         and (cb.caddy_id = cp.id
              or (cb.caddy_id is null
                  and cb.caddie_name = 'Caddy #' || trim(cp.caddy_number)
                  and (cb.course_id = v.course_id or (prefix <> '' and lower(coalesce(cb.course_name, '')) like prefix || '%'))))
         and coalesce(cb.tee_time, cb.start_time) is not null
         and abs(extract(epoch from (coalesce(cb.tee_time, cb.start_time) - tee)) / 60) < block
       limit 1;
      if found then
        return jsonb_build_object('ok', false, 'reason', 'caddy_taken', 'caddy', cp.caddy_number, 'at', to_char(clash_t, 'HH24:MI'));
      end if;
      if exists (select 1 from public.caddy_dayoff_requests r
                  where r.status = 'approved'
                    and trim(coalesce(r.caddy_number, '')) = trim(cp.caddy_number)
                    and r.date_from <= the_date and r.date_to >= the_date
                    and (r.course_name is null or prefix = '' or lower(r.course_name) like prefix || '%')) then
        return jsonb_build_object('ok', false, 'reason', 'caddy_taken', 'caddy', cp.caddy_number);
      end if;
      picks := picks || jsonb_build_array(jsonb_build_object(
        'id', cp.id::text, 'number', trim(cp.caddy_number),
        'name', coalesce(nullif(trim(cp.name), ''), 'Caddy #' || trim(cp.caddy_number))));
      numbers := numbers || trim(cp.caddy_number);
    end loop;
  end if;
  n_pick := jsonb_array_length(picks);
  first_pick := case when n_pick > 0 then picks->0 else null end;

  -- golfers[]: the picked caddies ride the first N entries; the rest wait for the pro shop
  for i in 1..p_spots loop
    golfers := golfers || jsonb_build_array(jsonb_build_object(
      'name', case when i = 1 then gname else gname || ' +' || (i - 1) end,
      'odoo_id', case when i = 1 then p_golfer_id else null end,
      'caddyId',     case when i <= n_pick then picks->(i-1)->>'id' else null end,
      'caddyNumber', case when i <= n_pick then picks->(i-1)->>'number' else '' end,
      'caddyName',   case when i <= n_pick then picks->(i-1)->>'name' else '' end));
  end loop;

  -- the golfer's tee time, in the shape proshop-teesheet.html reads back (dbRowToBooking)
  insert into public.bookings (
    id, date, time, tee_time, name, golfer_name, golfer_id, players, group_id, kind, booking_type,
    tee_sheet_course, tee_number, course_id, course_name, notes, status, source, is_vip, deleted,
    caddie_id, caddy_number, caddie_name, caddie_status, created_at, updated_at, booking_data)
  values (
    bid, the_date, d->>'time', d->>'time', gname, gname, p_golfer_id, p_spots, bid, 'tee', 'hotdeal',
    d->>'tee_sheet_course', nullif(d->>'tee_number', '')::integer, v.course_id, v.course_name,
    'Hot deal ฿' || trim(to_char(price, 'FM999,999,990')) || '/player'
      || case when n_pick > 0 then ', caddy #' || array_to_string(numbers, ', #')
              when want_caddy then ', caddy' else '' end,
    'confirmed', 'hotdeal', false, false,
    first_pick->>'id', coalesce(first_pick->>'number', ''), coalesce(first_pick->>'name', ''),
    case when n_pick > 0 then 'confirmed' when want_caddy then 'pending' else null end,
    now(), now(),
    jsonb_build_object(
      'golfers', golfers, 'groupName', null, 'groupIndex', null, 'groupTotal', null,
      'col', d->'col', 'recurringGroupId', null,
      'caddiesNeeded', case when want_caddy then p_spots - n_pick else 0 end,
      'hotDealId', p_offer_id::text, 'hotDealPrice', price,
      'hotDealCaddy', case when want_caddy then 'yes' else 'no' end));

  if want_caddy then
    -- picked caddies: CONFIRMED jobs with her id and the 'Caddy #N' name the app keys on
    for i in 1..n_pick loop
      insert into public.caddy_bookings (
        caddy_id, caddie_name, booking_date, tee_time, start_time, end_time, course_id, course_name,
        holes, payment_amount, payment_status, status, confirmed_at, confirmed_by,
        golfer_id, user_id, golfer_name, booking_source, teesheet_booking_id, special_requests)
      values (
        (picks->(i-1)->>'id')::uuid, 'Caddy #' || (picks->(i-1)->>'number'), the_date, tee, tee, tee + make_interval(mins => rmin),
        v.course_id, v.course_name, 18, cfee, 'pending', 'confirmed', now(), 'Golfer app',
        p_golfer_id, p_golfer_id, gname, 'hotdeal', bid, 'Hot deal booking');
    end loop;
    -- the rest: pending, no number — the caddy master assigns from the rotation (v1218 model)
    for i in (n_pick + 1)..p_spots loop
      insert into public.caddy_bookings (
        caddy_id, caddie_name, booking_date, tee_time, start_time, end_time, course_id, course_name,
        holes, payment_amount, payment_status, status, golfer_id, user_id, golfer_name,
        booking_source, teesheet_booking_id, special_requests)
      values (
        null, 'Unassigned', the_date, tee, tee, tee + make_interval(mins => rmin),
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
                            'date', d->>'date', 'time', d->>'time', 'course_name', v.course_name,
                            'caddies', to_jsonb(numbers));
end
$fn$;

grant execute on function public.claim_hot_deal(uuid, text, text, integer, boolean, jsonb) to anon, authenticated;
