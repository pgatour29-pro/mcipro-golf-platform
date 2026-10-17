-- 2026-10-17 ops (v1607): Barcelona one caddy pool — roster rows + past caddy history.
-- Rows before: backups/caddy_barcelona_rows_before_v1607.json. Past alerts are skipped by caddy_job_alert (date < today).
create or replace function pg_temp.pool_caddy(p_num text) returns caddy_profiles language sql stable as $$
  select cp.* from caddy_profiles cp
   where not coalesce(cp.is_mock,false) and cp.is_active and cp.left_at is null
     and coalesce(nullif(ltrim(regexp_replace(cp.caddy_number,'\D','','g'),'0'),''),'0') = coalesce(nullif(ltrim(regexp_replace(p_num,'\D','','g'),'0'),''),'0')
     and caddy_facility_key(coalesce(cp.course_name, cp.course_id)) = 'barcelona golf'
   order by (cp.user_id is not null and cp.user_id not like 'CADDY-%') desc, (cp.course_id is not null) desc, cp.created_at
   limit 1 $$;

-- 1. #36 entered twice: keep the St Andrews copy (holds the 10-10 job + review), give it the Green Valley copy's account/PIN
delete from caddy_profiles where id = 'cb2adcde-c1ab-47db-addb-4b45f6041fda' and user_id = 'CADDY-cb2adcdec1ab47dbaddb4b45f6041fda';
update caddy_profiles set user_id = 'CADDY-cb2adcdec1ab47dbaddb4b45f6041fda',
       course_id = 'st-andrews-2000', course_name = 'St. Andrews 2000 Golf Club', updated_at = now()
 where id = '39b91b5b-8269-40e2-abf5-6214cf65dcd1';
update user_profiles set profile_data = jsonb_set(jsonb_set(profile_data, '{roleSpecific,homeClub}', '"st-andrews-2000"'),
       '{roleSpecific,homeClubName}', '"St. Andrews 2000 Golf Club"')
 where line_user_id = 'CADDY-cb2adcdec1ab47dbaddb4b45f6041fda';

-- 2. St Andrews caddies saved with no course (#7, #173, #207, #315) join the pool (trigger gives each a roster account + PIN)
update caddy_profiles set course_id = 'st-andrews-2000', course_name = 'St. Andrews 2000 Golf Club', updated_at = now()
 where id in ('4edcc929-e85d-4ec4-b014-40d5df3d3c5a','9c7c112f-aef7-40b4-9e54-56021e581479','4a5c9981-166a-4b0b-880f-4f444e15383f','ace8df54-2f88-4630-b694-3038a0575d76')
   and course_id is null;

-- 3. golfers' notebook entries at the three courses point at the pool caddy
update caddy_notebook nb set caddy_system_id = (pg_temp.pool_caddy(nb.caddy_number)).id
 where nb.caddy_system_id is null and caddy_facility_key(nb.course_name) = 'barcelona golf'
   and nb.golfer_id not like 'TESTQA%' and (pg_temp.pool_caddy(nb.caddy_number)).id is not null;

-- 4. past caddy jobs at the three courses that never reached the caddy: link her; a round the golfer
--    actually played that day = the job is done
update caddy_bookings b set
    caddy_id = coalesce(b.caddy_id, (pg_temp.pool_caddy(substring(b.caddie_name from '#\s*(\d{1,4})'))).id),
    status = case when exists (select 1 from rounds r where r.golfer_id = b.golfer_id and r.played_at::date = b.booking_date)
                  then 'completed' else b.status end,
    completed_at = case when exists (select 1 from rounds r where r.golfer_id = b.golfer_id and r.played_at::date = b.booking_date)
                  then coalesce(b.completed_at, (b.booking_date + coalesce(b.tee_time, '07:00'::time) + interval '270 minutes') at time zone 'Asia/Bangkok')
                  else b.completed_at end,
    updated_at = now()
 where b.booking_date < (now() at time zone 'Asia/Bangkok')::date
   and b.status = 'pending'
   and caddy_facility_key(coalesce(b.course_name, b.course_id)) = 'barcelona golf';

-- 5. past registrations with a caddy number and a played round but no caddy job: write the completed job
insert into caddy_bookings (golfer_id, user_id, golfer_name, caddie_name, caddy_id, course_id, course_name,
                            booking_date, tee_time, start_time, end_time, holes, status, completed_at, booking_source, special_requests)
select r.player_id, r.player_id, nullif(btrim(coalesce(r.player_name,'')),''), 'Caddy #' || x.num, c.id,
       c.course_id, c.course_name, e.event_date, e.start_time, e.start_time,
       case when e.start_time is null then null else e.start_time + interval '270 minutes' end, 18, 'completed',
       (e.event_date + coalesce(e.start_time, '07:00'::time) + interval '270 minutes') at time zone 'Asia/Bangkok',
       'v1607_backfill', coalesce(e.title, '')
  from event_registrations r
  join society_events e on e.id = r.event_id
  cross join lateral (select distinct (n::int)::text num from regexp_split_to_table(r.caddy_numbers, '\D+') n where n <> '' and length(n) <= 4) x
  cross join lateral (select * from pg_temp.pool_caddy(x.num)) c
 where coalesce(r.caddy_numbers,'') ~ '\d'
   and caddy_facility_key(e.course_name) = 'barcelona golf'
   and e.event_date < (now() at time zone 'Asia/Bangkok')::date
   and coalesce(e.status,'') <> 'cancelled'
   and c.id is not null
   and exists (select 1 from rounds rd where rd.golfer_id = r.player_id
                and (rd.society_event_id::text = e.id::text or rd.played_at::date = e.event_date))
   and not exists (select 1 from caddy_bookings b
                    where b.booking_date = e.event_date and b.status <> 'cancelled'
                      and (b.golfer_id = r.player_id or b.user_id = r.player_id)
                      and coalesce(substring(b.caddie_name from '#\s*0*(\d+)'),
                                   (select nullif(ltrim(regexp_replace(cc.caddy_number,'\D','','g'),'0'),'') from caddy_profiles cc where cc.id = b.caddy_id)) = x.num);
