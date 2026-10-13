-- Chee Chan sample model, part 2: populate the CLASSIC pro shop too (Pete 2026-10-13: "populate the classic
-- version in Chee Chan dashboard"). Everything carries a zero-out key:
--   proshop_products   sku like 'SAMPLE-%'
--   proshop_sales      staff_name = 'psgtest'
--   staff_messages     sender_id like 'sample-%'
--   food_orders        order_number like 'SMP%'
--   bookings / caddy_bookings  'psgtest-%' (the daily sample day, now with the past week backfilled)
-- plus pg_cron 'chee-chan-sample-tick' (every 20 min, 06:30-18:30 Bangkok): new kitchen orders that move
-- NEW -> PREPARING -> READY -> DELIVERED on their own, and shop sales through the day.
-- ZERO OUT: select cron.unschedule('chee-chan-sample-tick'); then the deletes in chee_chan_sample_day_20261013.sql
-- and: delete from proshop_products where course_id='cheechan' and sku like 'SAMPLE-%';
--      delete from staff_messages where course_id='cheechan' and sender_id like 'sample-%';
--      delete from food_orders where venue_key='cheechan' and order_number like 'SMP%';

-- ---------- 1. products: a real-looking shop, a few low on stock ----------
insert into proshop_products (course_id, name, category, price, cost, sku, stock, reorder_level, active)
select 'cheechan', v.name, v.cat, v.price, round(v.price * 0.55), 'SAMPLE-' || lpad(v.n::text, 3, '0'), v.stock, v.reorder, true
from (values
 (1,'Titleist Pro V1 (12)','balls',1950,24,6),(2,'Callaway Chrome Soft (12)','balls',1750,18,6),(3,'TaylorMade TP5 (12)','balls',1850,4,6),
 (4,'Srixon Soft Feel (12)','balls',990,30,8),(5,'Range balls bucket','balls',150,200,20),(6,'Bridgestone e6 (3)','balls',390,3,5),
 (7,'Rental clubs (full set)','clubs',1200,8,2),(8,'Rental clubs (premium)','clubs',1800,4,2),(9,'Sand wedge 56°','clubs',4900,3,2),
 (10,'Putter (blade)','clubs',6500,2,1),(11,'Driver headcover','clubs',890,12,4),
 (12,'Polo shirt (course logo)','apparel',1490,22,6),(13,'Cap (course logo)','apparel',690,35,10),(14,'Sun visor','apparel',590,5,6),
 (15,'Arm sleeves (UV)','apparel',390,40,10),(16,'Rain jacket','apparel',2490,6,3),(17,'Golf socks (3 pairs)','apparel',450,25,8),
 (18,'Glove (men, M)','accessories',690,14,6),(19,'Glove (men, L)','accessories',690,4,6),(20,'Glove (ladies)','accessories',650,9,4),
 (21,'Tees (bag of 50)','accessories',120,60,15),(22,'Ball marker set','accessories',290,20,5),(23,'Divot tool','accessories',250,18,5),
 (24,'Umbrella (course logo)','accessories',1290,7,3),(25,'Cooling towel','accessories',350,2,5),(26,'Sunscreen SPF50','accessories',420,11,4),
 (27,'Water 600ml','drinks',30,180,40),(28,'Gatorade','drinks',45,90,30),(29,'Iced coffee (can)','drinks',55,48,24),
 (30,'Coconut water','drinks',60,36,12),(31,'Chang beer (can)','drinks',80,10,24),
 (32,'Energy bar','snacks',60,40,12),(33,'Banana','snacks',20,30,10),(34,'Mixed nuts','snacks',90,6,10),(35,'Sandwich (turn)','snacks',120,15,6)
) v(n, name, cat, price, stock, reorder)
where not exists (select 1 from proshop_products p where p.course_id = 'cheechan' and p.sku = 'SAMPLE-' || lpad(v.n::text, 3, '0'));

-- ---------- 2. sales: the last 30 days, 3-8 a day, from the shop's own products ----------
do $$
declare d date; k int; i int; t timestamptz; pr record; q int; tot numeric; items jsonb;
begin
  if exists (select 1 from proshop_sales where course_id='cheechan' and staff_name='psgtest' and created_at < now() - interval '2 days') then return; end if;
  for k in 1..30 loop
    d := (now() at time zone 'Asia/Bangkok')::date - k;
    for i in 1..(3 + floor(random()*6))::int loop
      t := (d + time '06:30' + (random() * interval '11 hours')) at time zone 'Asia/Bangkok';
      items := '[]'::jsonb; tot := 0;
      for pr in select id, name, price from proshop_products where course_id='cheechan' and sku like 'SAMPLE-%' order by random() limit (1 + floor(random()*3))::int loop
        q := case when pr.price < 100 then (1 + floor(random()*4))::int else 1 end;
        items := items || jsonb_build_object('product_id', pr.id, 'name', pr.name, 'qty', q, 'price', pr.price);
        tot := tot + pr.price * q;
      end loop;
      insert into proshop_sales (course_id, items, subtotal, discount, total, payment_method, staff_name, customer_name, created_at)
      values ('cheechan', items, tot, 0, tot, (array['cash','card','transfer','cash'])[1 + floor(random()*4)::int], 'psgtest', null, t);
    end loop;
  end loop;
end $$;

-- ---------- 3. messages: team chat, a request to management, a broadcast ----------
insert into staff_messages (course_id, department, msg_type, priority, sender_id, sender_name, sender_role, body, meta, read_by, status, created_at)
select 'cheechan', v.dep, v.typ, v.pri, v.sid, v.sname, v.srole, v.body, '{}'::jsonb, '{}'::text[], 'active', now() - v.ago
from (values
 ('proshop','chat','normal','sample-starter','Starter','starter','Group at 13:50 B-1 is on the tee, two caddies still to come.', interval '35 minutes'),
 ('proshop','chat','normal','sample-caddymaster','Caddy master','caddy_master','Sending #23 and #24 to B-1 now.', interval '31 minutes'),
 ('proshop','chat','normal','sample-kitchen','Kitchen','kitchen','Halfway house is out of iced coffee, restocking by 14:30.', interval '2 hours'),
 ('proshop','chat','normal','sample-proshop2','Front desk','proshop','Walk-in pair for 15:10 paid at the counter.', interval '3 hours'),
 ('proshop','request','high','sample-proshop2','Front desk','proshop','Need 24 more Pro V1 dozens before the weekend society day.', interval '1 day'),
 ('all','broadcast','normal','sample-manager','Management','manager','Course closes 30 minutes early on Friday for green maintenance.', interval '2 days')
) v(dep, typ, pri, sid, sname, srole, body, ago)
where not exists (select 1 from staff_messages m where m.course_id='cheechan' and m.sender_id = v.sid and m.body = v.body);

-- ---------- 4. the sample day: past week backfilled (completed rounds) ----------
create or replace function public.chee_chan_sample_day(p_day date default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  today date := (now() at time zone 'Asia/Bangkok')::date;
  d   date := coalesce(p_day, (now() at time zone 'Asia/Bangkok')::date);
  tag text := to_char(coalesce(p_day, (now() at time zone 'Asia/Bangkok')::date), 'YYYYMMDD');
  past boolean := coalesce(p_day, today) < today;
  nb int; nj int; r record;
begin
  if p_day is null then
    delete from caddy_bookings where teesheet_booking_id like 'psgtest-%' and booking_date < today - 7;
    delete from bookings where id like 'psgtest-%' and date < today - 7;
    delete from proshop_sales where staff_name = 'psgtest' and course_id = 'cheechan' and created_at < (today - 31)::timestamp at time zone 'Asia/Bangkok';
    delete from food_orders where venue_key = 'cheechan' and order_number like 'SMP%' and created_at < (today - 8)::timestamp at time zone 'Asia/Bangkok';
  end if;
  if exists (select 1 from bookings where id like 'psgtest-%' and date = d) then
    return jsonb_build_object('day', d, 'skipped', true);
  end if;

  nb := 0;
  -- one group at a time: a tee time already full that day (TEE_SLOT_FULL, max 4) is simply skipped
  for r in select * from (values
   (1,'07:00','A','Test Group Sunrise',4,array[1,2,3,4],0),
   (2,'08:10','B','Test Group Lakeside',3,array[5,6,7],0),
   (3,'09:30','A','Test Group Harbour',4,array[8,9,10,11],0),
   (4,'10:40','B','Test Group Seaview',2,array[12,13],0),
   (5,'12:20','A','Test Group Palm',4,array[14,15,16,17],0),
   (6,'13:50','B','Test Group Hilltop',4,array[18,19],2),
   (7,'14:30','A','Test Group Riverside',3,array[20,21,22],0),
   (8,'15:10','B','Test Walk-in',2,array[]::int[],2)) g(n,t,crs,nm,pl,cads,need)
  loop
    -- the capacity trigger is DEFERRED (fires at commit), so check the 4-golfer slot here and skip a full one
    if (select coalesce(sum(greatest(coalesce(b.players,1),1)),0) from bookings b
         where b.course_id = 'cheechan' and b.date = d and left(coalesce(b.time,''),5) = r.t and b.kind = 'tee'
           and not coalesce(b.deleted,false) and coalesce(b.source,'') in ('teesheet','hotdeal')
           and coalesce(b.tee_sheet_course,'A') = r.crs and coalesce(b.tee_number,1) = 1) + r.pl > 4 then
      continue;
    end if;
    begin
      insert into bookings (id, group_id, date, time, tee_time, players, name, golfer_name, course_id, course_name, source, booking_type, status, tee_sheet_course, tee_number, kind, deleted, booking_data)
      values ('psgtest-'||tag||'-'||r.n, 'psgtest-'||tag||'-'||r.n, d, r.t, (d||'T'||r.t||':00'), r.pl, r.nm, r.nm, 'cheechan', 'Chee Chan Golf Resort', 'teesheet', 'regular', 'confirmed', r.crs, 1, 'tee', false,
        jsonb_build_object('caddiesNeeded', case when past then 0 else r.need end, 'groupName', r.nm, 'golfers',
          (select jsonb_agg(jsonb_build_object('name', 'Test Player '||r.n||'-'||i, 'caddyNumber', case when i <= coalesce(array_length(r.cads,1),0) then r.cads[i]::text else '' end)) from generate_series(1,r.pl) i)));
      nb := nb + 1;
    exception when others then null;
    end;
  end loop;

  -- one job at a time: a caddy already out elsewhere that day (the 4h30 clash guard) is simply skipped
  for r in
    select cp.id cid, cp.name cname, g.n, g.t
    from (values (1,'07:00',array[1,2,3,4]),(2,'08:10',array[5,6,7]),(3,'09:30',array[8,9,10,11]),(4,'10:40',array[12,13]),
                 (5,'12:20',array[14,15,16,17]),(6,'13:50',array[18,19]),(7,'14:30',array[20,21,22])) g(n,t,cads),
         unnest(g.cads) c(num) join caddy_profiles cp on cp.created_by = 'claude-test-chee-chan' and cp.caddy_number::text = c.num::text
  loop
    begin
      insert into caddy_bookings (booking_date, caddy_id, caddie_name, course_id, course_name, golfer_name, tee_time, status, started_at, completed_at, teesheet_booking_id)
      values (d, r.cid, r.cname, 'cheechan', 'Chee Chan Golf Resort', 'Test Group '||r.n, r.t::time,
        case when past then 'completed' else 'confirmed' end,
        case when past then (d + r.t::time) at time zone 'Asia/Bangkok' end,
        case when past then (d + r.t::time + interval '4 hours 20 minutes') at time zone 'Asia/Bangkok' end,
        'psgtest-'||tag||'-'||r.n);
    exception when others then null;
    end;
  end loop;
  if not past then
    insert into caddy_bookings (booking_date, course_id, course_name, golfer_name, tee_time, status, teesheet_booking_id)
    select d, 'cheechan', 'Chee Chan Golf Resort', x.nm, x.t::time, 'pending', 'psgtest-'||tag||'-'||x.n
    from (values ('Test Group Hilltop','13:50',6),('Test Group Hilltop','13:50',6),('Test Walk-in','15:10',8),('Test Walk-in','15:10',8)) x(nm,t,n);
  end if;
  select count(*) into nj from caddy_bookings where teesheet_booking_id like 'psgtest-'||tag||'-%';
  return jsonb_build_object('day', d, 'bookings', nb, 'jobs', nj);
end $$;
revoke all on function public.chee_chan_sample_day(date) from public, anon, authenticated;
drop function if exists public.chee_chan_sample_day();
select cron.unschedule('chee-chan-sample-day') where exists (select 1 from cron.job where jobname = 'chee-chan-sample-day');
select cron.schedule('chee-chan-sample-day', '1 17 * * *', $$select public.chee_chan_sample_day()$$);
select public.chee_chan_sample_day(((now() at time zone 'Asia/Bangkok')::date - k)) from generate_series(1,7) k;

-- ---------- 5. the living part: kitchen orders + shop sales through the day ----------
create or replace function public.chee_chan_sample_order(p_at timestamptz, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare it record; items jsonb := '[]'::jsonb; sub numeric := 0; q int; dt text; times jsonb;
begin
  for it in select id, name, price, prep_min from menu_items where course_name = 'cheechan' and active and coalesce(available, true) order by random() limit (1 + floor(random()*3))::int loop
    q := (1 + floor(random()*2))::int;
    items := items || jsonb_build_object('mid', it.id, 'name', it.name, 'quantity', q, 'unitPrice', it.price, 'totalPrice', it.price * q, 'prepTime', coalesce(it.prep_min, 10), 'addons', '[]'::jsonb);
    sub := sub + it.price * q;
  end loop;
  if sub = 0 then return; end if;
  dt := (array['halfway','course','pickup','table','halfway'])[1 + floor(random()*5)::int];
  times := jsonb_build_object('confirmed', p_at);
  if p_status in ('preparing','ready','delivered') then times := times || jsonb_build_object('preparing', p_at + interval '4 minutes'); end if;
  if p_status in ('ready','delivered') then times := times || jsonb_build_object('ready', p_at + interval '18 minutes'); end if;
  if p_status = 'delivered' then times := times || jsonb_build_object('delivered', p_at + interval '30 minutes'); end if;
  insert into food_orders (order_number, golfer_id, customer_name, items, subtotal, service_charge, delivery_fee, total, status, delivery_type, delivery_note, course_name, venue_key, status_times, payment_method, created_at, updated_at)
  values ('SMP' || lpad((floor(random()*900000) + 100000)::text, 6, '0'), null, 'Test Player ' || (1 + floor(random()*30))::int, items, sub, round(sub * 0.1),
          case when dt = 'course' then 50 else 0 end, sub + round(sub * 0.1) + case when dt = 'course' then 50 else 0 end,
          p_status, dt, case dt when 'halfway' then 'At the turn' when 'course' then 'Hole ' || (2 + floor(random()*16))::int when 'table' then 'Table ' || (1 + floor(random()*12))::int else 'Counter pickup' end,
          'Chee Chan Golf Resort', 'cheechan', times, (array['counter','cash','card'])[1 + floor(random()*3)::int], p_at, p_at);
end $$;
revoke all on function public.chee_chan_sample_order(timestamptz, text) from public, anon, authenticated;

create or replace function public.chee_chan_sample_tick()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare h numeric := extract(hour from now() at time zone 'Asia/Bangkok') + extract(minute from now() at time zone 'Asia/Bangkok') / 60.0;
  pr record; items jsonb; tot numeric; q int; made int := 0; sold int := 0;
begin
  -- orders move on by themselves (status_times stamped like the kitchen does)
  update food_orders set status = 'preparing', status_times = coalesce(status_times,'{}'::jsonb) || jsonb_build_object('preparing', now()), updated_at = now()
   where venue_key = 'cheechan' and order_number like 'SMP%' and status = 'confirmed' and created_at < now() - interval '12 minutes';
  update food_orders set status = 'ready', status_times = coalesce(status_times,'{}'::jsonb) || jsonb_build_object('ready', now()), updated_at = now()
   where venue_key = 'cheechan' and order_number like 'SMP%' and status = 'preparing' and created_at < now() - interval '30 minutes';
  update food_orders set status = 'delivered', status_times = coalesce(status_times,'{}'::jsonb) || jsonb_build_object('delivered', now()), updated_at = now()
   where venue_key = 'cheechan' and order_number like 'SMP%' and status = 'ready' and created_at < now() - interval '50 minutes';
  if h < 6.5 or h > 18.5 then return jsonb_build_object('quiet', true); end if;
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
  return jsonb_build_object('order', made, 'sale', sold);
end $$;
revoke all on function public.chee_chan_sample_tick() from public, anon, authenticated;
select cron.unschedule('chee-chan-sample-tick') where exists (select 1 from cron.job where jobname = 'chee-chan-sample-tick');
select cron.schedule('chee-chan-sample-tick', '*/20 * * * *', $$select public.chee_chan_sample_tick()$$);

-- kitchen history: the past week delivered, and today so far (a few delivered, one of each live state)
do $$
declare k int; i int; d date := (now() at time zone 'Asia/Bangkok')::date;
begin
  if exists (select 1 from food_orders where venue_key='cheechan' and order_number like 'SMP%') then return; end if;
  for k in 1..7 loop
    for i in 1..(4 + floor(random()*6))::int loop
      perform public.chee_chan_sample_order(((d - k) + time '07:00' + random() * interval '10 hours') at time zone 'Asia/Bangkok', 'delivered');
    end loop;
  end loop;
  for i in 1..5 loop perform public.chee_chan_sample_order(now() - (interval '1 hour' * (1.5 + i)), 'delivered'); end loop;
  perform public.chee_chan_sample_order(now() - interval '35 minutes', 'ready');
  perform public.chee_chan_sample_order(now() - interval '16 minutes', 'preparing');
  perform public.chee_chan_sample_order(now() - interval '4 minutes', 'confirmed');
  perform public.chee_chan_sample_order(now() - interval '1 minute', 'confirmed');
end $$;

select (select count(*) from proshop_products where course_id='cheechan' and sku like 'SAMPLE-%') products,
       (select count(*) from proshop_sales where course_id='cheechan' and staff_name='psgtest') sales,
       (select count(*) from staff_messages where course_id='cheechan' and sender_id like 'sample-%') msgs,
       (select count(*) from food_orders where venue_key='cheechan' and order_number like 'SMP%') orders,
       (select count(distinct date) from bookings where id like 'psgtest-%') days,
       (select string_agg(jobname||' '||schedule, '; ') from cron.job where jobname like 'chee-chan%') crons;
