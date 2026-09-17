-- GOLFER ACTIONS ON A PRO SHOP TEE TIME (2026-09-17, v1234). Pete: "if canceling a booked time it can
-- be canceled from both the golfers and the proshop … [the Caddy cube] needs to … show what caddy is
-- booked and if that caddy needs to be cancelled from that spot or replace it with another caddy."
-- Both functions verify the tee time belongs to the calling golfer (bookings.golfer_id or a
-- booking_data.golfers[] entry with that odoo_id) before touching anything; the caddy change
-- re-checks availability under the same per-caddy lock claim_hot_deal uses.

-- The golfer cancels the whole tee time: the sheet row is soft-deleted (the tee sheet drops it on
-- its realtime refetch), every caddy job it owns is cancelled (never deleted — the caddy master
-- sees a cancel), and a hot-deal grab hands its spots back to the offer and its HOLD pill.
create or replace function public.golfer_cancel_booking(p_booking_id text, p_golfer_id text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $fn$
declare
  b        record;
  n_jobs   integer := 0;
  offer    record;
  d        jsonb;
  total    integer;
  taken    integer;
  left_    integer;
  price    numeric;
  hold     text;
  hold_label text;
begin
  if coalesce(p_golfer_id, '') = '' or coalesce(p_booking_id, '') = '' then
    return jsonb_build_object('ok', false, 'reason', 'bad_args');
  end if;
  select * into b from public.bookings where id = p_booking_id for update;
  if not found or coalesce(b.deleted, false) then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  if coalesce(b.source, '') not in ('teesheet', 'hotdeal') then
    return jsonb_build_object('ok', false, 'reason', 'not_proshop');
  end if;
  if not (b.golfer_id = p_golfer_id
          or exists (select 1 from jsonb_array_elements(coalesce(b.booking_data->'golfers', '[]'::jsonb)) g where g->>'odoo_id' = p_golfer_id)) then
    return jsonb_build_object('ok', false, 'reason', 'not_yours');
  end if;

  update public.bookings set deleted = true, updated_at = now() where id = p_booking_id;

  update public.caddy_bookings
     set status = 'cancelled', cancelled_at = now(), cancellation_reason = 'Tee time cancelled by the golfer', updated_at = now()
   where teesheet_booking_id = p_booking_id and coalesce(status, '') <> 'cancelled';
  get diagnostics n_jobs = row_count;

  -- a hot-deal grab gives its spots back
  if b.booking_data ? 'hotDealId' and nullif(b.booking_data->>'hotDealId', '') is not null then
    select * into offer from public.course_offers where id = (b.booking_data->>'hotDealId')::uuid for update;
    if found and offer.deal is not null then
      d     := offer.deal;
      total := coalesce((d->>'spots_total')::integer, 0);
      taken := greatest(0, coalesce((d->>'spots_taken')::integer, 0) - coalesce(b.players, 1));
      left_ := total - taken;
      price := coalesce((d->>'price')::numeric, 0);
      d := d || jsonb_build_object('spots_taken', taken);
      update public.course_offers
         set deal = d,
             status = case when offer.status = 'expired' and left_ > 0 and (offer.valid_to is null or offer.valid_to > now()) then 'active' else offer.status end,
             updated_at = now()
       where id = offer.id;
      hold := d->>'hold_booking_id';
      if hold is not null and left_ > 0 then
        hold_label := 'HOT DEAL ฿' || trim(to_char(price, 'FM999,999,990')) || ' · ' || left_ || ' left';
        update public.bookings
           set deleted = false, players = left_, name = hold_label, golfer_name = hold_label, updated_at = now(),
               booking_data = jsonb_set(
                 jsonb_set(coalesce(booking_data, '{}'::jsonb), '{golfers}', jsonb_build_array(jsonb_build_object('name', hold_label, 'caddyId', null, 'caddyNumber', '', 'caddyName', ''))),
                 '{hotDeal,spotsLeft}', to_jsonb(left_), true)
         where id = hold;
      end if;
    end if;
  end if;

  return jsonb_build_object('ok', true, 'cancelled_jobs', n_jobs);
end
$fn$;
grant execute on function public.golfer_cancel_booking(text, text) to anon, authenticated;

-- The golfer's caddy on their own slot of a pro shop tee time: p_caddy_id NULL cancels the caddy
-- for that slot; a caddy_profiles id replaces it (or fills an open "Unassigned" job) after the
-- same checks the hot-deal grab makes: active real caddy of this facility, no other job inside
-- her block of the tee time, no approved day off, not already on another slot of this group.
create or replace function public.golfer_set_booking_caddy(p_booking_id text, p_golfer_id text, p_caddy_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $fn$
declare
  b        record;
  golfers  jsonb;
  i        integer := -1;
  k        integer;
  slot     jsonb;
  old_id   text;
  old_num  text;
  cp       record;
  prefix   text;
  block    integer;
  clash_t  time;
  tee      time;
  end_t    time;
  fee      numeric := 0;
  the_date date;
  need     integer;
  any_caddy boolean;
  first_slot jsonb;
  old_job  record;
  picked   jsonb := null;   -- the caddy set by this call (the cancel branch never assigns cp)
begin
  if coalesce(p_golfer_id, '') = '' or coalesce(p_booking_id, '') = '' then
    return jsonb_build_object('ok', false, 'reason', 'bad_args');
  end if;
  select * into b from public.bookings where id = p_booking_id for update;
  if not found or coalesce(b.deleted, false) then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  if coalesce(b.source, '') not in ('teesheet', 'hotdeal') then
    return jsonb_build_object('ok', false, 'reason', 'not_proshop');
  end if;
  golfers := coalesce(b.booking_data->'golfers', '[]'::jsonb);
  if jsonb_typeof(golfers) <> 'array' then golfers := '[]'::jsonb; end if;
  -- my slot: the golfers[] entry carrying my id, else slot 0 when the row is mine
  for k in 0 .. jsonb_array_length(golfers) - 1 loop
    if golfers->k->>'odoo_id' = p_golfer_id then i := k; exit; end if;
  end loop;
  if i < 0 and b.golfer_id = p_golfer_id then
    if jsonb_array_length(golfers) = 0 then
      golfers := jsonb_build_array(jsonb_build_object('name', coalesce(b.golfer_name, b.name, 'Golfer'), 'odoo_id', p_golfer_id, 'caddyId', null, 'caddyNumber', '', 'caddyName', ''));
    end if;
    i := 0;
  end if;
  if i < 0 then
    return jsonb_build_object('ok', false, 'reason', 'not_yours');
  end if;
  slot    := golfers->i;
  old_id  := nullif(slot->>'caddyId', '');
  old_num := nullif(trim(coalesce(slot->>'caddyNumber', '')), '');
  the_date := b.date;
  tee      := nullif(b.time, '')::time;
  need     := coalesce((b.booking_data->>'caddiesNeeded')::integer, 0);
  prefix   := lower(split_part(coalesce(b.course_name, ''), ' ', 1));

  -- the slot's current job (by caddy id, else by the 'Caddy #N' name) — cancelled either way
  select * into old_job from public.caddy_bookings cb
   where cb.teesheet_booking_id = p_booking_id and coalesce(cb.status, '') <> 'cancelled'
     and ((old_id is not null and cb.caddy_id::text = old_id) or (old_num is not null and cb.caddie_name = 'Caddy #' || old_num))
   order by cb.created_at limit 1;

  if p_caddy_id is null then
    if old_job.id is not null then
      update public.caddy_bookings set status = 'cancelled', cancelled_at = now(), cancellation_reason = 'Caddy cancelled by the golfer', updated_at = now() where id = old_job.id;
    end if;
    slot := slot || jsonb_build_object('caddyId', null, 'caddyNumber', '', 'caddyName', '', 'caddyLocalName', '');
    golfers := jsonb_set(golfers, array[i::text], slot, true);
  else
    select * into cp from public.caddy_profiles c
     where c.id = p_caddy_id and coalesce(c.is_active, false) and coalesce(c.is_mock, false) = false
       and (c.course_id = b.course_id or (prefix <> '' and lower(coalesce(c.course_name, '')) like prefix || '%'));
    if not found then
      return jsonb_build_object('ok', false, 'reason', 'caddy_taken', 'caddy', '?');
    end if;
    -- not twice in one group
    for k in 0 .. jsonb_array_length(golfers) - 1 loop
      if k <> i and trim(coalesce(golfers->k->>'caddyNumber', '')) = trim(cp.caddy_number) then
        return jsonb_build_object('ok', false, 'reason', 'in_group', 'caddy', cp.caddy_number);
      end if;
    end loop;
    perform pg_advisory_xact_lock(hashtext('caddy:' || cp.id::text));
    block := greatest(255, coalesce(cp.block_minutes, 255));
    if tee is not null then
      select coalesce(cb.tee_time, cb.start_time) into clash_t
        from public.caddy_bookings cb
       where cb.booking_date = the_date
         and coalesce(cb.status, '') <> 'cancelled'
         and (old_job.id is null or cb.id <> old_job.id)
         and (cb.caddy_id = cp.id
              or (cb.caddy_id is null and cb.caddie_name = 'Caddy #' || trim(cp.caddy_number)
                  and (cb.course_id = b.course_id or (prefix <> '' and lower(coalesce(cb.course_name, '')) like prefix || '%'))))
         and coalesce(cb.tee_time, cb.start_time) is not null
         and abs(extract(epoch from (coalesce(cb.tee_time, cb.start_time) - tee)) / 60) < block
       limit 1;
      if found then
        return jsonb_build_object('ok', false, 'reason', 'caddy_taken', 'caddy', cp.caddy_number, 'at', to_char(clash_t, 'HH24:MI'));
      end if;
    end if;
    if exists (select 1 from public.caddy_dayoff_requests r
                where r.status = 'approved' and trim(coalesce(r.caddy_number, '')) = trim(cp.caddy_number)
                  and r.date_from <= the_date and r.date_to >= the_date
                  and (r.course_name is null or prefix = '' or lower(r.course_name) like prefix || '%')) then
      return jsonb_build_object('ok', false, 'reason', 'caddy_taken', 'caddy', cp.caddy_number, 'off', true);
    end if;

    if old_job.id is not null then
      update public.caddy_bookings set status = 'cancelled', cancelled_at = now(), cancellation_reason = 'Replaced by the golfer', updated_at = now() where id = old_job.id;
      end_t := old_job.end_time; fee := coalesce(old_job.payment_amount, 0);
    else
      -- no caddy on this slot yet: a pending 'Unassigned' job becomes this one — but only when the
      -- open jobs cover every caddy-less slot including mine (a golfer who cancelled their own caddy
      -- and picks again must not eat a job that belongs to another player in the group)
      old_job := null;
      if need >= (select count(*) from jsonb_array_elements(golfers) with ordinality as t(g, ord)
                   where (ord - 1) <> i and nullif(g->>'caddyId', '') is null and nullif(g->>'caddyNumber', '') is null) + 1 then
        select * into old_job from public.caddy_bookings cb
         where cb.teesheet_booking_id = p_booking_id and cb.caddy_id is null and cb.status = 'pending' order by cb.created_at limit 1;
      end if;
      if old_job.id is not null then
        update public.caddy_bookings set status = 'cancelled', cancelled_at = now(), cancellation_reason = 'Filled by the golfer', updated_at = now() where id = old_job.id;
        end_t := old_job.end_time; fee := coalesce(old_job.payment_amount, 0);
        need := greatest(0, need - 1);
      end if;
    end if;
    if end_t is null and tee is not null then end_t := tee + make_interval(mins => 255); end if;

    insert into public.caddy_bookings (
      caddy_id, caddie_name, booking_date, tee_time, start_time, end_time, course_id, course_name,
      holes, payment_amount, payment_status, status, confirmed_at, confirmed_by,
      golfer_id, user_id, golfer_name, booking_source, teesheet_booking_id, special_requests)
    values (
      cp.id, 'Caddy #' || trim(cp.caddy_number), the_date, tee, tee, end_t, b.course_id, b.course_name,
      18, fee, 'pending', 'confirmed', now(), 'Golfer app',
      p_golfer_id, p_golfer_id, coalesce(slot->>'name', b.golfer_name, 'Golfer'), 'golfer_app', p_booking_id, 'Chosen by the golfer in the app');

    picked := jsonb_build_object('id', cp.id::text, 'number', trim(cp.caddy_number), 'name', coalesce(nullif(trim(cp.name), ''), 'Caddy #' || trim(cp.caddy_number)));
    slot := slot || jsonb_build_object('caddyId', cp.id::text, 'caddyNumber', trim(cp.caddy_number),
                                       'caddyName', coalesce(nullif(trim(cp.name), ''), 'Caddy #' || trim(cp.caddy_number)), 'caddyLocalName', '');
    golfers := jsonb_set(golfers, array[i::text], slot, true);
  end if;

  -- the row mirrors slot 0 like a pro shop save does
  first_slot := golfers->0;
  any_caddy := exists (select 1 from jsonb_array_elements(golfers) g where nullif(g->>'caddyId', '') is not null or nullif(g->>'caddyNumber', '') is not null);
  update public.bookings
     set booking_data = jsonb_set(jsonb_set(coalesce(booking_data, '{}'::jsonb), '{golfers}', golfers, true), '{caddiesNeeded}', to_jsonb(need), true),
         caddie_id = nullif(first_slot->>'caddyId', ''),
         caddy_number = nullif(first_slot->>'caddyNumber', ''),
         caddie_name = nullif(first_slot->>'caddyName', ''),
         caddie_status = case when any_caddy then 'confirmed' when need > 0 then 'pending' else null end,
         updated_at = now()
   where id = p_booking_id;

  return jsonb_build_object('ok', true, 'slot', i, 'caddiesNeeded', need, 'caddy', picked);
end
$fn$;
grant execute on function public.golfer_set_booking_caddy(text, text, uuid) to anon, authenticated;
