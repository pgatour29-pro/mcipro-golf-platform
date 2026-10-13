-- Chee Chan sample day v2 (2026-10-13): the sample groups and caddy jobs are now written EXACTLY the way the
-- tee sheet writes them (proshop-teesheet.html syncCaddyJobs), so the sheet's own save keeps them instead of
-- cancelling them. v1 put only a caddyNumber on each golfer; the sheet keeps a job only for a golfer that
-- carries the caddy's caddyId, so the first real edit on a sample group (an assignment at 14:21) cancelled
-- every sample job of that group and the desk drew the group wrong.
--   golfer  = { name, caddyId, caddyNumber, caddyName, caddyLocalName }
--   job     = one per golfer with a caddy: golfer_name = that golfer, caddie_name 'Caddy #N', booking_source
--             'proshop_teesheet', tee/start/end (4h30), 18 holes, ฿400, confirmed by 'Pro shop'
--   open    = caddiesNeeded rows: caddie_name 'Unassigned', golfer_name = the lead golfer, pending
-- Past days are finished rounds: sent out at the tee time, back 4h20 later, paid.

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
  r record; g jsonb; golfers jsonb; i int; v_cid uuid; v_cname text; v_cnum text; bid text; nb int := 0; nj int; need int; lead text;
  tee time; endt time; tstamp timestamptz;
  -- distinct made-up golfers (the desk matches a golfer to a job by NAME; "Test Player 6-1" and "Test Player 6-3"
  -- read as the same person once digits are dropped, so every sample golfer needs a name of their own)
  nm text[] := array['Test Arthur Bellamy','Test Kenji Morioka','Test Lars Henning','Test Daniel Okafor',
    'Test Minho Seo','Test Oliver Pratt','Test Ravi Menon','Test Hugo Lindqvist','Test Takeshi Aoki','Test Callum Reid',
    'Test Joon Baek','Test Marco Bellini','Test Pieter Vos','Test Sanjay Rao','Test Felix Brandt','Test Ewan Fraser',
    'Test Haruto Kaneda','Test Mateo Rios','Test Niklas Berg','Test Tomas Novak','Test Ian Whitlock','Test Sung Park',
    'Test Luca Ferri','Test Aiden Cole','Test Kaito Mori','Test Rhys Morgan','Test Jonas Weber','Test Owen Hartley',
    'Test Yuto Hayashi','Test Leo Marchetti','Test Ben Ashford','Test Seo-jun Lim'];
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

  for r in select * from (values
   (1,'07:00','A','Test Group Sunrise',4,array[1,2,3,4],0),
   (2,'08:10','B','Test Group Lakeside',3,array[5,6,7],0),
   (3,'09:30','A','Test Group Harbour',4,array[8,9,10,11],0),
   (4,'10:40','B','Test Group Seaview',2,array[12,13],0),
   (5,'12:20','A','Test Group Palm',4,array[14,15,16,17],0),
   (6,'13:50','B','Test Group Hilltop',4,array[18,19],2),
   (7,'14:30','A','Test Group Riverside',3,array[20,21,22],0),
   (8,'15:10','B','Test Walk-in',2,array[]::int[],2)) v(n,t,crs,nm,pl,cads,need)
  loop
    -- the 4-golfer capacity check is DEFERRED (fires at commit): skip a slot that is already full that day
    if (select coalesce(sum(greatest(coalesce(b.players,1),1)),0) from bookings b
         where b.course_id = 'cheechan' and b.date = d and left(coalesce(b.time,''),5) = r.t and b.kind = 'tee'
           and not coalesce(b.deleted,false) and coalesce(b.source,'') in ('teesheet','hotdeal')
           and coalesce(b.tee_sheet_course,'A') = r.crs and coalesce(b.tee_number,1) = 1) + r.pl > 4 then
      continue;
    end if;
    bid := 'psgtest-' || tag || '-' || r.n;
    tee := r.t::time; endt := (r.t::time + interval '270 minutes')::time; tstamp := (d + tee) at time zone 'Asia/Bangkok';
    need := case when past then 0 else r.need end;
    golfers := '[]'::jsonb;
    for i in 1..r.pl loop
      v_cid := null; v_cname := null; v_cnum := null;
      if i <= coalesce(array_length(r.cads,1),0) then
        select id, name, caddy_number::text into v_cid, v_cname, v_cnum from caddy_profiles
         where created_by = 'claude-test-chee-chan' and caddy_number::text = r.cads[i]::text limit 1;
      end if;
      if v_cid is not null then
        g := jsonb_build_object('name', nm[(r.n-1)*4 + i], 'caddyId', v_cid, 'caddyNumber', v_cnum, 'caddyName', v_cname, 'caddyLocalName', '');
      else
        g := jsonb_build_object('name', nm[(r.n-1)*4 + i], 'caddyId', null, 'caddyNumber', '', 'caddyName', '', 'caddyLocalName', '');
      end if;
      golfers := golfers || g;
    end loop;
    lead := nm[(r.n-1)*4 + 1];
    insert into bookings (id, group_id, date, time, tee_time, players, name, golfer_name, course_id, course_name, source, booking_type, status, tee_sheet_course, tee_number, kind, deleted, booking_data)
    values (bid, bid, d, r.t, (d||'T'||r.t||':00'), r.pl, r.nm, lead, 'cheechan', 'Chee Chan Golf Resort', 'teesheet', 'regular', 'confirmed', r.crs, 1, 'tee', false,
            jsonb_build_object('caddiesNeeded', need, 'groupName', r.nm, 'golfers', golfers));
    nb := nb + 1;
    -- one job per golfer with a caddy (a caddy already out elsewhere that day — the 4h30 guard — is skipped)
    for g in select * from jsonb_array_elements(golfers) loop
      if g->>'caddyId' is null then continue; end if;
      begin
        insert into caddy_bookings (booking_date, tee_time, start_time, end_time, course_id, course_name, holes, payment_amount,
          booking_source, teesheet_booking_id, caddy_id, caddie_name, golfer_name, status, confirmed_at, confirmed_by, payment_status,
          started_at, completed_at, paid_at)
        values (d, tee, tee, endt, 'cheechan', 'Chee Chan Golf Resort', 18, 400,
          'proshop_teesheet', bid, (g->>'caddyId')::uuid, 'Caddy #' || (g->>'caddyNumber'), g->>'name',
          case when past then 'completed' else 'confirmed' end, tstamp - interval '1 day', 'Pro shop',
          case when past then 'paid' else 'pending' end,
          case when past then tstamp end, case when past then tstamp + interval '4 hours 20 minutes' end, case when past then tstamp + interval '4 hours 30 minutes' end);
      exception when others then null;
      end;
    end loop;
    for i in 1..need loop
      insert into caddy_bookings (booking_date, tee_time, start_time, end_time, course_id, course_name, holes, payment_amount,
        booking_source, teesheet_booking_id, caddy_id, caddie_name, golfer_name, status, payment_status)
      values (d, tee, tee, endt, 'cheechan', 'Chee Chan Golf Resort', 18, 400, 'proshop_teesheet', bid, null, 'Unassigned', lead, 'pending', 'pending');
    end loop;
  end loop;
  select count(*) into nj from caddy_bookings where teesheet_booking_id like 'psgtest-'||tag||'-%' and status <> 'cancelled';
  return jsonb_build_object('day', d, 'bookings', nb, 'jobs', nj);
end $$;
revoke all on function public.chee_chan_sample_day(date) from public, anon, authenticated;

-- rebuild every sample day (v1 rows were incoherent with the sheet's own job rules)
delete from caddy_bookings where teesheet_booking_id like 'psgtest-%';
delete from bookings where id like 'psgtest-%';
select public.chee_chan_sample_day(((now() at time zone 'Asia/Bangkok')::date - k)) from generate_series(1,7) k;
select public.chee_chan_sample_day();
select (select count(*) from bookings where id like 'psgtest-%') bookings,
       (select count(*) from caddy_bookings where teesheet_booking_id like 'psgtest-%') jobs,
       (select count(distinct date) from bookings where id like 'psgtest-%') days;
