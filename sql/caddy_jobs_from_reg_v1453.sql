-- v1453 (2026-10-04) — a caddy number on an event registration ALWAYS has a caddy job.
--
-- Pete: "why is the caddy data not synced when pulled up on the pro shop tee sheet".
-- Evidence: TRGG Pattaya CC Mon 5 Oct — Pete's registration carries caddy 109 (golfer Register
-- form, index.html registerPlayer), but no caddy_bookings row existed, so the pro shop Caddy Desk
-- showed "0 loops" and #109 FREE in the queue while the group panel showed her booked for 09:05.
-- About 12 code paths write event_registrations.caddy_numbers; only 3 of them also create the job.
-- v1395 already made the DB cancel a job whose number LEFT the registration
-- (trg_caddy_jobs_follow_reg); this is the other half: a number that ARRIVES gets its job,
-- whichever screen wrote it.
--
-- Rules:
--  * upcoming events only (event_date >= today in Bangkok), never a cancelled event / registration
--  * one live job per golfer + date + caddy number — any existing live row (golfer app, Book a
--    Caddy, pro shop) counts, so the client paths that already write a job never get a second one
--  * job time = the golfer's GROUP tee time from the pairings, else the event start
--  * her profile is linked only on a sure match (same course name / course id, or a facility word
--    that only one club uses); otherwise the row carries the event's course name like the golfer path
--  * a clash (DB 4:15 gate) or any other error skips that one caddy with a WARNING — a
--    registration is NEVER refused because of a caddy job
--  * status 'pending', booking_source 'event_registration' (so trg_caddy_jobs_follow_reg governs it),
--    special_requests = event title (how CourseLink ties the job to the event)

create or replace function public.caddy_jobs_ensure(p_event_id text, p_player_id text, p_player_name text, p_caddy_numbers text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
    e       record;
    cp      record;
    v_num   text;
    v_t     text;
    v_tee   time;
    v_word  text;
    v_clubs int;
    v_made  int := 0;
begin
    if coalesce(p_player_id, '') = '' or p_player_id like 'TESTQA%' then return 0; end if;
    if coalesce(btrim(p_caddy_numbers), '') = '' then return 0; end if;

    select se.id, se.title, se.event_date, se.start_time, se.course_name, se.course_id, se.status
      into e from public.society_events se where se.id::text = p_event_id;
    if e.event_date is null or coalesce(e.status, '') = 'cancelled' then return 0; end if;
    if e.event_date < (now() at time zone 'Asia/Bangkok')::date then return 0; end if;

    -- the golfer's group tee time, else the event start
    select g->>'teeTime' into v_t
      from public.event_pairings p
      cross join lateral jsonb_array_elements(case when jsonb_typeof(p.groups) = 'array' then p.groups else '[]'::jsonb end) g
     where p.event_id::text = p_event_id
       and exists (select 1 from jsonb_array_elements(case when jsonb_typeof(g->'players') = 'array' then g->'players' else '[]'::jsonb end) x
                    where x->>'playerId' = p_player_id
                       or (coalesce(x->>'playerId', '') = '' and lower(btrim(x->>'playerName')) = lower(btrim(coalesce(p_player_name, '')))))
     limit 1;
    v_tee := case when v_t ~ '^\d{1,2}:\d{2}' then substring(v_t from '^\d{1,2}:\d{2}')::time else e.start_time end;

    for v_num in
        select distinct (n::int)::text from regexp_split_to_table(p_caddy_numbers, '\D+') n where n <> '' and length(n) <= 4
    loop
        perform 1
           from public.caddy_bookings b
          where b.booking_date = e.event_date
            and b.status <> 'cancelled'
            and (b.golfer_id = p_player_id or b.user_id = p_player_id)
            and coalesce(substring(b.caddie_name from '#\s*0*(\d+)'),
                         (select nullif(ltrim(regexp_replace(c.caddy_number, '\D', '', 'g'), '0'), '')
                            from public.caddy_profiles c where c.id = b.caddy_id)) = v_num;
        if found then continue; end if;

        -- her profile at this venue (sure matches only)
        select c.id, c.course_name, c.course_id into cp
          from public.caddy_profiles c
         where c.is_active and not coalesce(c.is_mock, false)
           and nullif(ltrim(regexp_replace(c.caddy_number, '\D', '', 'g'), '0'), '') = v_num
           and (lower(btrim(c.course_name)) = lower(btrim(coalesce(e.course_name, '')))
                or (e.course_id is not null and c.course_id = e.course_id::text))
         limit 1;
        if cp.id is null then
            v_word := split_part(lower(btrim(coalesce(e.course_name, ''))), ' ', 1);
            if length(v_word) >= 5 then
                select count(distinct lower(btrim(c.course_name))) into v_clubs
                  from public.caddy_profiles c
                 where c.is_active and not coalesce(c.is_mock, false)
                   and split_part(lower(btrim(c.course_name)), ' ', 1) = v_word;
                if v_clubs = 1 then
                    select c.id, c.course_name, c.course_id into cp
                      from public.caddy_profiles c
                     where c.is_active and not coalesce(c.is_mock, false)
                       and nullif(ltrim(regexp_replace(c.caddy_number, '\D', '', 'g'), '0'), '') = v_num
                       and split_part(lower(btrim(c.course_name)), ' ', 1) = v_word
                     limit 1;
                end if;
            end if;
        end if;

        begin
            insert into public.caddy_bookings (golfer_id, user_id, golfer_name, caddie_name, caddy_id, course_id, course_name,
                                               booking_date, tee_time, start_time, end_time, holes, status, booking_source, special_requests)
            values (p_player_id, p_player_id, nullif(btrim(coalesce(p_player_name, '')), ''), 'Caddy #' || v_num, cp.id,
                    coalesce(cp.course_id, e.course_id::text), coalesce(cp.course_name, e.course_name),
                    e.event_date, v_tee, v_tee, case when v_tee is null then null else v_tee + interval '255 minutes' end, 18,
                    'pending', 'event_registration', coalesce(e.title, ''));
            v_made := v_made + 1;
        exception when others then
            raise warning '[caddy_jobs_ensure] event % golfer % caddy #%: %', p_event_id, p_player_id, v_num, sqlerrm;
        end;
    end loop;
    return v_made;
end
$$;

create or replace function public.caddy_jobs_from_registration()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if coalesce(new.status, '') = 'cancelled' then return null; end if;
    begin
        perform public.caddy_jobs_ensure(new.event_id::text, new.player_id, new.player_name, new.caddy_numbers);
    exception when others then
        raise warning '[caddy_jobs_from_registration] %', sqlerrm;
    end;
    return null;
end
$$;

drop trigger if exists trg_caddy_jobs_from_reg on public.event_registrations;
create trigger trg_caddy_jobs_from_reg
    after insert or update of caddy_numbers, status on public.event_registrations
    for each row
    when (coalesce(btrim(new.caddy_numbers), '') <> '')
    execute function public.caddy_jobs_from_registration();

revoke all on function public.caddy_jobs_ensure(text, text, text, text) from public, anon, authenticated;
