-- Chee Chan sample model v3 (Pete 2026-10-13): "i want Nin #1 caddies dashboard for this sample model dashboard to be
-- active. create a script that keeps her working throughout the week and put it on the caddy roster and board and tee
-- sheet with mock golfers, we can zero out everything later".
--
-- * The sample WEEK: every day from today to today+7 always exists (the daily 00:01 job tops it up), so the tee sheet,
--   the desk board and a caddy's "next 14 days" are never empty.
-- * Nin (#1, the PIN 000010 sample caddy) works TWO loops a day: 07:00 Test Group Sunrise and 12:00 Test Group Orchid
--   (4h30 apart = the caddy block, never a clash).
-- * The day moves by itself (chee-chan-sample-tick, every 20 min): a sample job is sent out at its tee time, back in
--   4h20 later, paid 10 minutes after that — the board, the desk, Home and her dashboard all walk through the day.
--   Only psgtest jobs are touched; anything a tester creates or changes by hand is theirs.
-- * The rotation for Chee Chan moves daily so the desk queue and her "Today's Rotation" card are live.
-- ZERO OUT: unschedule chee-chan-sample-day + chee-chan-sample-tick, then the deletes listed in
-- chee_chan_sample_day_20261013.sql / chee_chan_sample_classic_20261013.sql, and
--   delete from caddy_rotation_config where course_name = 'Chee Chan Golf Resort' and updated_by = 'sample';

create or replace function public.chee_chan_sample_day(p_day date default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  today date := (now() at time zone 'Asia/Bangkok')::date;
  d date; tag text; past boolean;
  r record; g jsonb; golfers jsonb; i int; k int; v_cid uuid; v_cname text; v_cnum text; bid text;
  nb int := 0; nj int := 0; need int; lead text; tee time; endt time; tstamp timestamptz;
  nm text[] := array['Test Arthur Bellamy','Test Kenji Morioka','Test Lars Henning','Test Daniel Okafor',
    'Test Minho Seo','Test Oliver Pratt','Test Ravi Menon','Test Hugo Lindqvist','Test Takeshi Aoki','Test Callum Reid',
    'Test Joon Baek','Test Marco Bellini','Test Pieter Vos','Test Sanjay Rao','Test Felix Brandt','Test Ewan Fraser',
    'Test Haruto Kaneda','Test Mateo Rios','Test Niklas Berg','Test Tomas Novak','Test Ian Whitlock','Test Sung Park',
    'Test Luca Ferri','Test Aiden Cole','Test Kaito Mori','Test Rhys Morgan','Test Jonas Weber','Test Owen Hartley',
    'Test Yuto Hayashi','Test Leo Marchetti','Test Ben Ashford','Test Seo-jun Lim','Test Henrik Dahl','Test Kofi Mensah',
    'Test Ryo Sakamoto','Test Elliot Shaw'];
begin
  -- the daily call: tidy old days, keep the whole coming week laid down, move the rotation
  if p_day is null then
    delete from caddy_bookings where teesheet_booking_id like 'psgtest-%' and booking_date < today - 7;
    delete from bookings where id like 'psgtest-%' and date < today - 7;
    delete from proshop_sales where staff_name = 'psgtest' and course_id = 'cheechan' and created_at < (today - 31)::timestamp at time zone 'Asia/Bangkok';
    delete from food_orders where venue_key = 'cheechan' and order_number like 'SMP%' and created_at < (today - 8)::timestamp at time zone 'Asia/Bangkok';
    for k in 0..7 loop
      g := public.chee_chan_sample_day(today + k);
      nb := nb + coalesce((g->>'bookings')::int, 0); nj := nj + coalesce((g->>'jobs')::int, 0);
    end loop;
    insert into caddy_rotation_config (course_name, rotation_date, start_number, active_count, updated_by, updated_at)
    values ('Chee Chan Golf Resort', today, 1 + ((extract(doy from today)::int * 7) % 50), 50, 'sample', now())
    on conflict (course_name) do update set rotation_date = excluded.rotation_date, start_number = excluded.start_number,
      active_count = excluded.active_count, updated_at = now()
    where caddy_rotation_config.updated_by = 'sample' or caddy_rotation_config.updated_by is null;
    return jsonb_build_object('week_from', today, 'bookings_added', nb, 'jobs_added', nj);
  end if;

  d := p_day; tag := to_char(p_day, 'YYYYMMDD'); past := p_day < today;
  for r in select * from (values
   (1,'07:00','A','Test Group Sunrise',4,array[1,2,3,4],0),
   (2,'08:10','B','Test Group Lakeside',3,array[5,6,7],0),
   (3,'09:30','A','Test Group Harbour',4,array[8,9,10,11],0),
   (4,'10:40','B','Test Group Seaview',2,array[12,13],0),
   (9,'12:00','B','Test Group Orchid',3,array[1,23,24],0),
   (5,'12:20','A','Test Group Palm',4,array[14,15,16,17],0),
   (6,'13:50','B','Test Group Hilltop',4,array[18,19],2),
   (7,'14:30','A','Test Group Riverside',3,array[20,21,22],0),
   (8,'15:10','B','Test Walk-in',2,array[]::int[],2)) v(n,t,crs,gname,pl,cads,need)
  loop
    bid := 'psgtest-' || tag || '-' || r.n;
    -- Nin's second loop runs Mon/Tue/Thu/Sat: Wed, Fri and Sun afternoons stay OPEN so a tester can book her,
    -- and the busy days are there to test the waitlist
    if r.n = 9 and extract(dow from d) in (3, 5, 0) then continue; end if;
    if exists (select 1 from bookings where id = bid) then continue; end if;   -- per group: adding a group never redoes a day
    -- the 4-golfer capacity check is DEFERRED (fires at commit): skip a slot that is already full that day
    if (select coalesce(sum(greatest(coalesce(b.players,1),1)),0) from bookings b
         where b.course_id = 'cheechan' and b.date = d and left(coalesce(b.time,''),5) = r.t and b.kind = 'tee'
           and not coalesce(b.deleted,false) and coalesce(b.source,'') in ('teesheet','hotdeal')
           and coalesce(b.tee_sheet_course,'A') = r.crs and coalesce(b.tee_number,1) = 1) + r.pl > 4 then
      continue;
    end if;
    tee := r.t::time; endt := (r.t::time + interval '270 minutes')::time; tstamp := (d + tee) at time zone 'Asia/Bangkok';
    need := case when past then 0 else r.need end;
    golfers := '[]'::jsonb;
    for i in 1..r.pl loop
      v_cid := null; v_cname := null; v_cnum := null;
      if i <= coalesce(array_length(r.cads,1),0) then
        select id, name, caddy_number::text into v_cid, v_cname, v_cnum from caddy_profiles
         where created_by = 'claude-test-chee-chan' and caddy_number::text = r.cads[i]::text limit 1;
      end if;
      golfers := golfers || jsonb_build_object('name', nm[(r.n-1)*4 + i], 'caddyId', v_cid, 'caddyNumber', coalesce(v_cnum, ''),
                                               'caddyName', coalesce(v_cname, ''), 'caddyLocalName', '');
    end loop;
    lead := nm[(r.n-1)*4 + 1];
    insert into bookings (id, group_id, date, time, tee_time, players, name, golfer_name, course_id, course_name, source, booking_type, status, tee_sheet_course, tee_number, kind, deleted, booking_data)
    values (bid, bid, d, r.t, (d||'T'||r.t||':00'), r.pl, r.gname, lead, 'cheechan', 'Chee Chan Golf Resort', 'teesheet', 'regular', 'confirmed', r.crs, 1, 'tee', false,
            jsonb_build_object('caddiesNeeded', need, 'groupName', r.gname, 'golfers', golfers));
    nb := nb + 1;
    for g in select * from jsonb_array_elements(golfers) loop
      if g->>'caddyId' is null then continue; end if;
      begin
        insert into caddy_bookings (booking_date, tee_time, start_time, end_time, course_id, course_name, holes, payment_amount,
          booking_source, teesheet_booking_id, caddy_id, caddie_name, golfer_name, status, confirmed_at, confirmed_by, payment_status,
          started_at, completed_at, paid_at)
        values (d, tee, tee, endt, 'cheechan', 'Chee Chan Golf Resort', 18, 400,
          'proshop_teesheet', bid, (g->>'caddyId')::uuid, 'Caddy #' || (g->>'caddyNumber'), g->>'name',
          case when past then 'completed' else 'confirmed' end, least(now(), tstamp - interval '1 day'), 'Pro shop',
          case when past then 'paid' else 'pending' end,
          case when past then tstamp end, case when past then tstamp + interval '4 hours 20 minutes' end, case when past then tstamp + interval '4 hours 30 minutes' end);
        nj := nj + 1;
      exception when others then null;   -- a caddy already out elsewhere that day (the 4h30 guard) is skipped
      end;
    end loop;
    for i in 1..need loop
      insert into caddy_bookings (booking_date, tee_time, start_time, end_time, course_id, course_name, holes, payment_amount,
        booking_source, teesheet_booking_id, caddy_id, caddie_name, golfer_name, status, payment_status)
      values (d, tee, tee, endt, 'cheechan', 'Chee Chan Golf Resort', 18, 400, 'proshop_teesheet', bid, null, 'Unassigned', lead, 'pending', 'pending');
      nj := nj + 1;
    end loop;
  end loop;
  return jsonb_build_object('day', d, 'bookings', nb, 'jobs', nj);
end $$;
revoke all on function public.chee_chan_sample_day(date) from public, anon, authenticated;

-- the day moves by itself: sample jobs go out at their tee time, come back 4h20 later, are paid 10 min after
create or replace function public.chee_chan_sample_tick()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  nowb timestamp := now() at time zone 'Asia/Bangkok';
  h numeric := extract(hour from now() at time zone 'Asia/Bangkok') + extract(minute from now() at time zone 'Asia/Bangkok') / 60.0;
  pr record; items jsonb; tot numeric; q int; made int := 0; sold int := 0; sent int; back int; paid int;
begin
  update caddy_bookings set started_at = (booking_date + tee_time) at time zone 'Asia/Bangkok', updated_at = now()
   where teesheet_booking_id like 'psgtest-%' and booking_date = nowb::date and caddy_id is not null
     and status = 'confirmed' and started_at is null and (booking_date + tee_time) <= nowb;
  get diagnostics sent = row_count;
  update caddy_bookings set status = 'completed', completed_at = (booking_date + tee_time + interval '4 hours 20 minutes') at time zone 'Asia/Bangkok', updated_at = now()
   where teesheet_booking_id like 'psgtest-%' and booking_date = nowb::date and caddy_id is not null
     and status = 'confirmed' and started_at is not null and completed_at is null and (booking_date + tee_time + interval '4 hours 20 minutes') <= nowb;
  get diagnostics back = row_count;
  update caddy_bookings set payment_status = 'paid', paid_at = (booking_date + tee_time + interval '4 hours 30 minutes') at time zone 'Asia/Bangkok', updated_at = now()
   where teesheet_booking_id like 'psgtest-%' and booking_date = nowb::date and status = 'completed'
     and coalesce(payment_status, 'pending') <> 'paid' and (booking_date + tee_time + interval '4 hours 30 minutes') <= nowb;
  get diagnostics paid = row_count;

  -- kitchen orders move on by themselves (status_times stamped like the kitchen does)
  update food_orders set status = 'preparing', status_times = coalesce(status_times,'{}'::jsonb) || jsonb_build_object('preparing', now()), updated_at = now()
   where venue_key = 'cheechan' and order_number like 'SMP%' and status = 'confirmed' and created_at < now() - interval '12 minutes';
  update food_orders set status = 'ready', status_times = coalesce(status_times,'{}'::jsonb) || jsonb_build_object('ready', now()), updated_at = now()
   where venue_key = 'cheechan' and order_number like 'SMP%' and status = 'preparing' and created_at < now() - interval '30 minutes';
  update food_orders set status = 'delivered', status_times = coalesce(status_times,'{}'::jsonb) || jsonb_build_object('delivered', now()), updated_at = now()
   where venue_key = 'cheechan' and order_number like 'SMP%' and status = 'ready' and created_at < now() - interval '50 minutes';
  if h >= 6.5 and h <= 18.5 then
    if random() < 0.6 then perform public.chee_chan_sample_order(now(), 'confirmed'); made := 1; end if;
    if random() < 0.45 then
      items := '[]'::jsonb; tot := 0;
      for pr in select id, name, price from proshop_products where course_id='cheechan' and sku like 'SAMPLE-%' order by random() limit (1 + floor(random()*2))::int loop
        q := case when pr.price < 100 then (1 + floor(random()*4))::int else 1 end;
        items := items || jsonb_build_object('product_id', pr.id, 'name', pr.name, 'qty', q, 'price', pr.price); tot := tot + pr.price * q;
      end loop;
      if tot > 0 then
        insert into proshop_sales (course_id, items, subtotal, discount, total, payment_method, staff_name, created_at)
        values ('cheechan', items, tot, 0, tot, (array['cash','card','transfer'])[1 + floor(random()*3)::int], 'psgtest', now());
        sold := 1;
      end if;
    end if;
  end if;
  return jsonb_build_object('sent', sent, 'back', back, 'paid', paid, 'order', made, 'sale', sold);
end $$;
revoke all on function public.chee_chan_sample_tick() from public, anon, authenticated;

-- lay the week down now and catch today up to the clock
select public.chee_chan_sample_day();
select public.chee_chan_sample_tick();
select d.date, count(*) groups, sum(d.players) players,
       (select count(*) from caddy_bookings j join caddy_profiles c on c.id = j.caddy_id
         where c.user_id = 'SAMPLE-CADDY-CC01' and j.booking_date = d.date and j.status <> 'cancelled') nin_loops
  from bookings d where d.id like 'psgtest-%' and d.date >= (now() at time zone 'Asia/Bangkok')::date - 1
 group by d.date order by d.date;
