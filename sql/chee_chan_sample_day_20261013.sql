-- Chee Chan = the SAMPLE MODEL course (Pete 2026-10-13: "Keep chee chan as a sample model. When chee chan
-- comes on board we can zero everything out"). Every Bangkok day at 00:01 this lays down one coherent sample
-- day at Chee Chan so the pro shop (Glass Home, tee sheet, caddy desk, sales) always has a live-looking day:
--   8 tee-sheet groups 07:00 -> 15:10 ("Test Group ..."), their caddy jobs for test caddies #1-#22,
--   4 jobs still needing a caddy, and 3 shop sales.
-- Nothing is stamped started/completed: the desk's own clock rule (out from tee time until the 4h30 end)
-- moves the day along by itself. Rows are kept 8 days (so "vs last week" has a same-weekday to compare)
-- and older ones are deleted.
--
-- ZERO OUT when Chee Chan comes on board:
--   select cron.unschedule('chee-chan-sample-day');
--   delete from caddy_bookings where teesheet_booking_id like 'psgtest-%';
--   delete from bookings where id like 'psgtest-%';
--   delete from proshop_sales where staff_name = 'psgtest' and course_id = 'cheechan';
--   (the 24 test caddies: delete from caddy_profiles where created_by = 'claude-test-chee-chan', jobs first)

create or replace function public.chee_chan_sample_day()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  d   date := (now() at time zone 'Asia/Bangkok')::date;
  tag text := to_char((now() at time zone 'Asia/Bangkok')::date, 'YYYYMMDD');
  nb int; nj int; ns int;
begin
  -- keep 8 days, drop older
  delete from caddy_bookings where teesheet_booking_id like 'psgtest-%' and booking_date < d - 7;
  delete from bookings where id like 'psgtest-%' and date < d - 7;
  delete from proshop_sales where staff_name = 'psgtest' and course_id = 'cheechan' and created_at < (d - 7)::timestamp at time zone 'Asia/Bangkok';
  -- today's day, once
  if exists (select 1 from bookings where id like 'psgtest-%' and date = d) then
    return jsonb_build_object('day', d, 'skipped', true);
  end if;

  with g(n,t,crs,nm,pl,cads,need) as (values
   (1,'07:00','A','Test Group Sunrise',4,array[1,2,3,4],0),
   (2,'08:10','B','Test Group Lakeside',3,array[5,6,7],0),
   (3,'09:30','A','Test Group Harbour',4,array[8,9,10,11],0),
   (4,'10:40','B','Test Group Seaview',2,array[12,13],0),
   (5,'12:20','A','Test Group Palm',4,array[14,15,16,17],0),
   (6,'13:50','B','Test Group Hilltop',4,array[18,19],2),
   (7,'14:30','A','Test Group Riverside',3,array[20,21,22],0),
   (8,'15:10','B','Test Walk-in',2,array[]::int[],2))
  insert into bookings (id, group_id, date, time, tee_time, players, name, golfer_name, course_id, course_name, source, booking_type, status, tee_sheet_course, tee_number, kind, deleted, booking_data)
  select 'psgtest-'||tag||'-'||n, 'psgtest-'||tag||'-'||n, d, t, (d||'T'||t||':00'), pl, nm, nm, 'cheechan', 'Chee Chan Golf Resort', 'teesheet', 'regular', 'confirmed', crs, 1, 'tee', false,
    jsonb_build_object('caddiesNeeded', need, 'groupName', nm, 'golfers',
      (select jsonb_agg(jsonb_build_object('name', 'Test Player '||n||'-'||i, 'caddyNumber', case when i <= coalesce(array_length(cads,1),0) then cads[i]::text else '' end)) from generate_series(1,pl) i))
  from g;
  get diagnostics nb = row_count;

  with g(n,t,cads) as (values
   (1,'07:00',array[1,2,3,4]),(2,'08:10',array[5,6,7]),(3,'09:30',array[8,9,10,11]),(4,'10:40',array[12,13]),
   (5,'12:20',array[14,15,16,17]),(6,'13:50',array[18,19]),(7,'14:30',array[20,21,22]))
  insert into caddy_bookings (booking_date, caddy_id, caddie_name, course_id, course_name, golfer_name, tee_time, status, teesheet_booking_id)
  select d, cp.id, cp.name, 'cheechan', 'Chee Chan Golf Resort', 'Test Group '||g.n, g.t::time, 'confirmed', 'psgtest-'||tag||'-'||g.n
  from g, unnest(g.cads) c(num) join caddy_profiles cp on cp.created_by = 'claude-test-chee-chan' and cp.caddy_number::text = c.num::text;
  insert into caddy_bookings (booking_date, course_id, course_name, golfer_name, tee_time, status, teesheet_booking_id)
  select d, 'cheechan', 'Chee Chan Golf Resort', x.nm, x.t::time, 'pending', 'psgtest-'||tag||'-'||x.n
  from (values ('Test Group Hilltop','13:50',6),('Test Group Hilltop','13:50',6),('Test Walk-in','15:10',8),('Test Walk-in','15:10',8)) x(nm,t,n);
  select count(*) into nj from caddy_bookings where teesheet_booking_id like 'psgtest-'||tag||'-%';

  insert into proshop_sales (course_id, items, subtotal, discount, total, payment_method, staff_name, customer_name, created_at) values
   ('cheechan','[{"name":"Test balls x12","qty":1,"price":1450}]',1450,0,1450,'cash','psgtest','Test',(d + time '08:15') at time zone 'Asia/Bangkok'),
   ('cheechan','[{"name":"Test glove","qty":2,"price":690}]',1380,0,1380,'card','psgtest','Test',(d + time '10:40') at time zone 'Asia/Bangkok'),
   ('cheechan','[{"name":"Test cap","qty":1,"price":890}]',890,0,890,'transfer','psgtest','Test',(d + time '12:55') at time zone 'Asia/Bangkok');
  ns := 3;
  return jsonb_build_object('day', d, 'bookings', nb, 'jobs', nj, 'sales', ns);
end $$;

revoke all on function public.chee_chan_sample_day() from public, anon, authenticated;

-- 00:01 Bangkok = 17:01 UTC
select cron.unschedule('chee-chan-sample-day') where exists (select 1 from cron.job where jobname = 'chee-chan-sample-day');
select cron.schedule('chee-chan-sample-day', '1 17 * * *', $$select public.chee_chan_sample_day()$$);
select jobid, jobname, schedule from cron.job where jobname = 'chee-chan-sample-day';
