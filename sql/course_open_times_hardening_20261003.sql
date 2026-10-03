-- v1446 hardening for course open tee times (security review of v1445)
-- 1) No markup in free-text fields that other screens render (society/course names, notes).
-- 2) A claim with a society id takes the society's REAL name from society_profiles — never the client's text.
alter table public.course_open_time_claims drop constraint if exists course_open_time_claims_society_name_plain;
alter table public.course_open_time_claims add constraint course_open_time_claims_society_name_plain check (society_name !~ '[<>]');
alter table public.course_open_times drop constraint if exists course_open_times_text_plain;
alter table public.course_open_times add constraint course_open_times_text_plain check (coalesce(course_name, '') !~ '[<>]' and coalesce(note, '') !~ '[<>]');

create or replace function public.open_time_claim(p_open_id uuid, p_groups integer, p_society_id text, p_society_name text,
  p_event_id uuid, p_by text, p_by_name text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_slug text; v_date date; v_first text; v_int int; v_total int; v_status text; v_name text;
  v_taken boolean[]; v_run int := 0; v_at int := -1; i int; c record; v_id uuid; v_tee text; v_left int;
begin
  if coalesce(p_groups, 0) < 1 then return jsonb_build_object('ok', false, 'reason', 'bad_input'); end if;
  v_name := trim(coalesce(p_society_name, ''));
  if coalesce(p_society_id, '') <> '' then
    select society_name into v_name from society_profiles where id::text = p_society_id;
    if not found then
      select name into v_name from societies where id::text = p_society_id;
      if not found then return jsonb_build_object('ok', false, 'reason', 'no_society'); end if;
    end if;
  end if;
  v_name := trim(regexp_replace(coalesce(v_name, ''), '[<>]', '', 'g'));
  if v_name = '' then return jsonb_build_object('ok', false, 'reason', 'no_society'); end if;
  select course_slug, play_date, first_tee, interval_min, groups, status
    into v_slug, v_date, v_first, v_int, v_total, v_status
    from course_open_times where id = p_open_id for update;
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if v_status <> 'open' then return jsonb_build_object('ok', false, 'reason', 'closed'); end if;
  if v_date < (now() at time zone 'Asia/Bangkok')::date then return jsonb_build_object('ok', false, 'reason', 'past'); end if;
  if p_event_id is not null and not exists (select 1 from society_events where id = p_event_id and event_date = v_date) then
    return jsonb_build_object('ok', false, 'reason', 'bad_event');
  end if;
  v_taken := array_fill(false, array[v_total]);
  for c in select slot_index, groups from course_open_time_claims where open_id = p_open_id and status = 'held' loop
    for i in c.slot_index .. least(c.slot_index + c.groups - 1, v_total - 1) loop v_taken[i + 1] := true; end loop;
  end loop;
  for i in 0 .. v_total - 1 loop
    if v_taken[i + 1] then v_run := 0; else v_run := v_run + 1; if v_run = p_groups then v_at := i - p_groups + 1; exit; end if; end if;
  end loop;
  if v_at < 0 then
    v_left := (select count(*) from unnest(v_taken) t where not t);
    return jsonb_build_object('ok', false, 'reason', case when v_left = 0 then 'sold_out' else 'not_enough' end, 'left', v_left);
  end if;
  v_tee := _ot_hm(v_first, v_at * v_int);
  insert into course_open_time_claims (open_id, course_slug, play_date, slot_index, groups, tee_time, society_id, society_name,
    event_id, claimed_by, claimed_by_name)
  values (p_open_id, v_slug, v_date, v_at, p_groups, v_tee, nullif(p_society_id, ''), v_name, p_event_id, p_by, p_by_name)
  returning id into v_id;
  update course_open_times set updated_at = now() where id = p_open_id;
  perform _ot_link_event(v_id);
  v_left := (select count(*) from unnest(v_taken) t where not t) - p_groups;
  return jsonb_build_object('ok', true, 'id', v_id, 'tee_time', v_tee, 'left', v_left);
end $$;

-- publish: strip markup from the course name + note before they are stored
create or replace function public.open_time_publish(p_slug text, p_course_name text, p_date date, p_first_tee text,
  p_interval integer, p_groups integer, p_note text, p_by text, p_by_name text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_start int; v_end int;
begin
  if p_slug is null or p_slug = '' or p_slug !~ '^[a-z0-9-]{1,80}$' then return jsonb_build_object('ok', false, 'reason', 'no_course'); end if;
  if p_date < (now() at time zone 'Asia/Bangkok')::date then return jsonb_build_object('ok', false, 'reason', 'past'); end if;
  if p_first_tee !~ '^[0-2][0-9]:[0-5][0-9]$' or coalesce(p_groups, 0) < 1 or p_groups > 60 or coalesce(p_interval, 0) < 4 or p_interval > 30 then
    return jsonb_build_object('ok', false, 'reason', 'bad_input');
  end if;
  v_start := split_part(p_first_tee, ':', 1)::int * 60 + split_part(p_first_tee, ':', 2)::int;
  v_end := v_start + p_groups * p_interval;
  perform pg_advisory_xact_lock(hashtext('opentime:' || p_slug || ':' || p_date));
  if exists (select 1 from course_open_times o where o.course_slug = p_slug and o.play_date = p_date and o.status = 'open'
             and (split_part(o.first_tee, ':', 1)::int * 60 + split_part(o.first_tee, ':', 2)::int) < v_end
             and (split_part(o.first_tee, ':', 1)::int * 60 + split_part(o.first_tee, ':', 2)::int) + o.groups * o.interval_min > v_start) then
    return jsonb_build_object('ok', false, 'reason', 'overlap');
  end if;
  insert into course_open_times (course_slug, course_name, play_date, first_tee, interval_min, groups, note, created_by, created_by_name)
  values (p_slug, nullif(regexp_replace(coalesce(p_course_name, ''), '[<>]', '', 'g'), ''), p_date, p_first_tee, p_interval, p_groups,
          nullif(trim(regexp_replace(coalesce(p_note, ''), '[<>]', '', 'g')), ''), p_by, p_by_name)
  returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;
