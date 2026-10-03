-- v1445 COURSE OPEN TEE TIMES FOR SOCIETIES (2026-10-03)
-- A golf course publishes blocks of open tee times ("Mon 13 Oct, 8 groups from 07:00") from its pro shop
-- tee sheet. Every society organizer sees every open block across all courses and TAKES groups out of it
-- instantly — like buying a plane seat: the take is ONE locked transaction in the database, so two
-- societies can never hold the same tee time. A take can be tied to the society's event that day (the
-- course's event block + thread follow), or held for an event the organizer creates next.
--   course_open_times        — the blocks a course offers (one row per block)
--   course_open_time_claims  — what each society took out of a block (its own tee time + group count)
-- Reads are open (anon select, like course_event_slots); EVERY write goes through the SECURITY DEFINER
-- RPCs below — no insert/update/delete policies on the tables.

create table if not exists public.course_open_times (
  id              uuid primary key default gen_random_uuid(),
  course_slug     text not null check (char_length(course_slug) between 1 and 80),
  course_name     text check (char_length(course_name) <= 160),
  play_date       date not null,
  first_tee       text not null check (first_tee ~ '^[0-2][0-9]:[0-5][0-9]$'),
  interval_min    integer not null default 8 check (interval_min between 4 and 30),
  groups          integer not null check (groups between 1 and 60),
  note            text check (char_length(note) <= 300),
  status          text not null default 'open' check (status in ('open','closed')),
  created_by      text,
  created_by_name text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists course_open_times_date_idx on public.course_open_times (play_date, course_slug);

create table if not exists public.course_open_time_claims (
  id              uuid primary key default gen_random_uuid(),
  open_id         uuid not null references public.course_open_times(id) on delete cascade,
  course_slug     text not null,
  play_date       date not null,
  slot_index      integer not null check (slot_index >= 0),
  groups          integer not null check (groups between 1 and 60),
  tee_time        text not null check (tee_time ~ '^[0-2][0-9]:[0-5][0-9]$'),
  society_id      text,
  society_name    text not null check (char_length(society_name) between 1 and 160),
  event_id        uuid references public.society_events(id) on delete set null,
  on_event_block  boolean not null default false,   -- this take IS the event's block on the course sheet
  status          text not null default 'held' check (status in ('held','released')),
  claimed_by      text,
  claimed_by_name text,
  released_side   text check (released_side in ('course','society')),
  released_by     text,
  released_at     timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists course_open_time_claims_open_idx on public.course_open_time_claims (open_id) where status = 'held';
create index if not exists course_open_time_claims_date_idx on public.course_open_time_claims (play_date, course_slug);
create index if not exists course_open_time_claims_event_idx on public.course_open_time_claims (event_id);

alter table public.course_open_times       enable row level security;
alter table public.course_open_time_claims enable row level security;
drop policy if exists tmp_select on public.course_open_times;
drop policy if exists tmp_select on public.course_open_time_claims;
create policy tmp_select on public.course_open_times       for select to anon, authenticated using (true);
create policy tmp_select on public.course_open_time_claims for select to anon, authenticated using (true);
grant select on public.course_open_times, public.course_open_time_claims to anon, authenticated;

do $$ begin
  begin alter publication supabase_realtime add table public.course_open_times; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.course_open_time_claims; exception when duplicate_object then null; end;
end $$;

-- 'HH:MM' + n minutes
create or replace function public._ot_hm(p_hm text, p_min integer) returns text
language sql immutable as $$
  select to_char(time '00:00' + make_interval(mins => split_part(p_hm, ':', 1)::int * 60 + split_part(p_hm, ':', 2)::int + p_min), 'HH24:MI')
$$;

-- tie a held take to a society event: it becomes the event's block on the course sheet when the course has
-- not set one yet; either way the event's course thread records it
create or replace function public._ot_link_event(p_claim_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_ev uuid; v_slug text; v_groups int; v_tee text; v_date date; v_soc text; v_has boolean; v_given int;
begin
  select event_id, course_slug, groups, tee_time, play_date, society_name
    into v_ev, v_slug, v_groups, v_tee, v_date, v_soc
    from course_open_time_claims where id = p_claim_id and status = 'held';
  if not found or v_ev is null then return; end if;
  select true, slots_given into v_has, v_given from course_event_slots where event_id = v_ev for update;
  if v_has is null or v_given is null then
    insert into course_event_slots (event_id, course_slug, slots_given, first_tee, updated_side, updated_by, updated_by_name, updated_at)
    values (v_ev, v_slug, v_groups, v_tee, 'society', 'open-time', v_soc, now())
    on conflict (event_id) do update set slots_given = excluded.slots_given, first_tee = excluded.first_tee,
      updated_side = 'society', updated_by = 'open-time', updated_by_name = excluded.updated_by_name, updated_at = now();
    update course_open_time_claims set on_event_block = true where id = p_claim_id;
  end if;
  insert into event_course_messages (event_id, course_slug, side, sender_id, sender_name, kind, qty, ref_id, body)
  values (v_ev, v_slug, 'society', null, v_soc, 'system', v_groups, p_claim_id,
          v_soc || ' took ' || v_groups || ' open tee time' || case when v_groups = 1 then '' else 's' end || ' from ' || v_tee);
end $$;

-- the course publishes a block
create or replace function public.open_time_publish(p_slug text, p_course_name text, p_date date, p_first_tee text,
  p_interval integer, p_groups integer, p_note text, p_by text, p_by_name text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_start int; v_end int;
begin
  if p_slug is null or p_slug = '' then return jsonb_build_object('ok', false, 'reason', 'no_course'); end if;
  if p_date < (now() at time zone 'Asia/Bangkok')::date then return jsonb_build_object('ok', false, 'reason', 'past'); end if;
  if p_first_tee !~ '^[0-2][0-9]:[0-5][0-9]$' or coalesce(p_groups, 0) < 1 or p_groups > 60 or coalesce(p_interval, 0) < 4 or p_interval > 30 then
    return jsonb_build_object('ok', false, 'reason', 'bad_input');
  end if;
  v_start := split_part(p_first_tee, ':', 1)::int * 60 + split_part(p_first_tee, ':', 2)::int;
  v_end := v_start + p_groups * p_interval;
  -- one course, one day: blocks never overlap (serialised per course-day)
  perform pg_advisory_xact_lock(hashtext('opentime:' || p_slug || ':' || p_date));
  if exists (select 1 from course_open_times o where o.course_slug = p_slug and o.play_date = p_date and o.status = 'open'
             and (split_part(o.first_tee, ':', 1)::int * 60 + split_part(o.first_tee, ':', 2)::int) < v_end
             and (split_part(o.first_tee, ':', 1)::int * 60 + split_part(o.first_tee, ':', 2)::int) + o.groups * o.interval_min > v_start) then
    return jsonb_build_object('ok', false, 'reason', 'overlap');
  end if;
  insert into course_open_times (course_slug, course_name, play_date, first_tee, interval_min, groups, note, created_by, created_by_name)
  values (p_slug, nullif(p_course_name, ''), p_date, p_first_tee, p_interval, p_groups, nullif(trim(coalesce(p_note, '')), ''), p_by, p_by_name)
  returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

-- the course stops offering what is left of a block (societies keep what they already took)
create or replace function public.open_time_close(p_id uuid, p_slug text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  update course_open_times set status = 'closed', updated_at = now() where id = p_id and course_slug = p_slug and status = 'open';
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  return jsonb_build_object('ok', true);
end $$;

-- a society takes N groups: the earliest free run of N back-to-back tee times in the block, under a row lock
create or replace function public.open_time_claim(p_open_id uuid, p_groups integer, p_society_id text, p_society_name text,
  p_event_id uuid, p_by text, p_by_name text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_slug text; v_date date; v_first text; v_int int; v_total int; v_status text;
  v_taken boolean[]; v_run int := 0; v_at int := -1; i int; c record; v_id uuid; v_tee text; v_left int;
begin
  if coalesce(p_groups, 0) < 1 then return jsonb_build_object('ok', false, 'reason', 'bad_input'); end if;
  if coalesce(trim(p_society_name), '') = '' then return jsonb_build_object('ok', false, 'reason', 'no_society'); end if;
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
  values (p_open_id, v_slug, v_date, v_at, p_groups, v_tee, nullif(p_society_id, ''), trim(p_society_name), p_event_id, p_by, p_by_name)
  returning id into v_id;
  update course_open_times set updated_at = now() where id = p_open_id;
  perform _ot_link_event(v_id);
  v_left := (select count(*) from unnest(v_taken) t where not t) - p_groups;
  return jsonb_build_object('ok', true, 'id', v_id, 'tee_time', v_tee, 'left', v_left);
end $$;

-- tie a take to the event the organizer just created (or picked later)
create or replace function public.open_time_link(p_claim_id uuid, p_event_id uuid, p_society_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  update course_open_time_claims c set event_id = p_event_id
   where c.id = p_claim_id and c.status = 'held' and c.event_id is null
     and coalesce(c.society_id, '') = coalesce(p_society_id, '')
     and exists (select 1 from society_events e where e.id = p_event_id and e.event_date = c.play_date);
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  perform _ot_link_event(p_claim_id);
  return jsonb_build_object('ok', true);
end $$;

-- give tee times back: the society that took them, or the course (p_side 'course' + its slug)
create or replace function public.open_time_release(p_claim_id uuid, p_side text, p_actor text, p_by text, p_by_name text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_ev uuid; v_block boolean; v_slug text; v_soc text; v_groups int; v_tee text; v_open uuid;
begin
  select event_id, on_event_block, course_slug, society_name, groups, tee_time, open_id
    into v_ev, v_block, v_slug, v_soc, v_groups, v_tee, v_open
    from course_open_time_claims
   where id = p_claim_id and status = 'held'
     and ((p_side = 'course' and course_slug = p_actor) or (p_side = 'society' and coalesce(society_id, '') = coalesce(p_actor, '')))
   for update;
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  update course_open_time_claims set status = 'released', released_side = p_side, released_by = p_by, released_at = now() where id = p_claim_id;
  update course_open_times set updated_at = now() where id = v_open;
  if v_ev is not null then
    -- the event's block goes back to what the society needs (registrations / pairings) until the course sets it
    if v_block then
      update course_event_slots set slots_given = null, first_tee = null, updated_side = p_side, updated_by = 'open-time',
        updated_by_name = p_by_name, updated_at = now() where event_id = v_ev and updated_by = 'open-time';
    end if;
    insert into event_course_messages (event_id, course_slug, side, sender_id, sender_name, kind, qty, ref_id, body)
    values (v_ev, v_slug, p_side, case when p_side = 'course' then 'course:' || v_slug end, coalesce(nullif(p_by_name, ''), v_soc), 'system', -v_groups, p_claim_id,
            v_groups || ' tee time' || case when v_groups = 1 then '' else 's' end || ' from ' || v_tee || ' given back');
  end if;
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public._ot_link_event(uuid) from public, anon, authenticated;
grant execute on function public.open_time_publish(text, text, date, text, integer, integer, text, text, text) to anon, authenticated;
grant execute on function public.open_time_close(uuid, text) to anon, authenticated;
grant execute on function public.open_time_claim(uuid, integer, text, text, uuid, text, text) to anon, authenticated;
grant execute on function public.open_time_link(uuid, uuid, text) to anon, authenticated;
grant execute on function public.open_time_release(uuid, text, text, text, text) to anon, authenticated;
