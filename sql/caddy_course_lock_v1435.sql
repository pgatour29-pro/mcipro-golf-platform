-- v1435 (2026-10-02) — Pete: "the caddy golf course and live tracking on course set to that golf course once
-- they register and select the golf course they work at and can't change the course anymore until they leave
-- and go to a new course and like any job that data stays with that golf course and the caddy will have to
-- register a new dashboard with a new golf course".
--
--   * ONE course per caddy account. caddy_profile_write refuses a second registration while she is still
--     registered somewhere (it already refused a caddy changing course_id on her own row — v1397).
--   * The old "Unassigned" placeholder row is not a course: registering completes / replaces it, once.
--   * caddy_leave_course(): she leaves. Her row STAYS on that course's roster (name, number, photo, rating,
--     reviews, bookings, work schedule) as inactive, unlinked from her login (former_user_id, left_at).
--     Refused while she is out on the course or still has bookings there — a caddy can never drop a
--     booking (rule 2026-09-17); the caddy master moves them first.
--   * A left row can only ever be re-claimed by the SAME person (she comes back to that course). A new
--     caddy who is handed the same number gets a fresh row — never the old caddy's rating and reviews.
--   * caddy_sync_from_notebook skips left rows for the same reason.
-- Rollback: sql/caddy_course_lock_v1435_ROLLBACK.sql

alter table public.caddy_profiles
    add column if not exists left_at timestamptz,
    add column if not exists former_user_id text;
create index if not exists idx_caddy_profiles_former on public.caddy_profiles (former_user_id) where former_user_id is not null;

create or replace function public.caddy_profile_write(p_actor text, p_op text, p_id uuid, p_rows jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
    v_claim text := nullif(coalesce(auth.jwt() ->> 'line_id', ''), '');
    v_actor text;
    v_role text;
    v_mc text;
    v_staff boolean;
    v_self boolean;
    v_own_id uuid;      -- the row that registers her at a real course (v1435: at most one)
    v_blank_id uuid;    -- her "Unassigned" placeholder, if an old client minted one
    v_row caddy_profiles%rowtype;
    v_new caddy_profiles%rowtype;
    v_patch jsonb;
    v_ids jsonb := '[]'::jsonb;
    v_rec jsonb;
    v_self_cols text[] := array['name','phone','email','photo_url','languages','specialties','certifications',
        'availability_days','bio','availability_status','personality','strengths','specialty','gallery_urls',
        'emergency_contact','golf_handicap','experience_years','is_active',
        'sheet_start','sheet_end','block_minutes'];   -- her own work window (CaddyTeeSheet). NEVER the course.
    v_staff_cols text[] := array['name','phone','email','photo_url','course_id','course_name','experience_years',
        'languages','specialties','certifications','is_active','availability_days','created_by','bio','notes',
        'availability_status','caddy_number','personality','strengths','specialty','user_id','is_mock',
        'gallery_urls','emergency_contact','sheet_start','sheet_end','block_minutes','tier_code','golf_handicap'];
    v_cols text[];
begin
    if v_claim is not null and p_actor is not null and p_actor <> v_claim then
        raise exception 'caddy_profile_write: actor does not match the signed-in account' using errcode = '42501';
    end if;
    v_actor := coalesce(v_claim, nullif(p_actor, ''));
    if v_actor is null then
        raise exception 'caddy_profile_write: sign in with LINE to change caddies' using errcode = '42501';
    end if;
    select role, managed_course_id into v_role, v_mc from user_profiles where line_user_id = v_actor;
    if not found then
        raise exception 'caddy_profile_write: unknown account' using errcode = '42501';
    end if;
    v_staff := v_role in ('admin','caddymaster','manager','golf_course_manager','proshop') or v_mc is not null;

    -- v1435: where is this account registered as a caddy right now?
    select id into v_own_id from caddy_profiles
     where user_id = v_actor and left_at is null
       and (course_id is not null or lower(btrim(coalesce(course_name, ''))) not in ('', 'unassigned'))
     order by created_at desc limit 1;
    select id into v_blank_id from caddy_profiles
     where user_id = v_actor and course_id is null
       and lower(btrim(coalesce(course_name, ''))) in ('', 'unassigned')
     order by created_at desc limit 1;

    if p_op = 'insert' then
        if jsonb_typeof(p_rows) = 'object' then p_rows := jsonb_build_array(p_rows); end if;
        if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 or jsonb_array_length(p_rows) > 200 then
            raise exception 'caddy_profile_write: bad rows';
        end if;
        -- a row for HERSELF is a registration, whoever she is (staff adding other caddies is not)
        v_self := not v_staff or (jsonb_array_length(p_rows) = 1 and (p_rows -> 0 ->> 'user_id') = v_actor);
        if v_self then
            if jsonb_array_length(p_rows) <> 1 then raise exception 'caddy_profile_write: not allowed' using errcode = '42501'; end if;
            if v_own_id is not null then
                raise exception 'caddy_profile_write: this account is already registered at a golf course - leave that course first' using errcode = '42501';
            end if;
        end if;
        if not v_staff then
            v_cols := v_self_cols || array['caddy_number','course_id','course_name'];
        else
            v_cols := v_staff_cols;
        end if;

        if v_self and v_blank_id is not null then
            -- her placeholder becomes the registration: fill it in, never mint a second row
            select * into v_row from caddy_profiles where id = v_blank_id for update;
            select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) into v_patch
              from jsonb_each(p_rows -> 0) where key = any (v_cols) and value <> 'null'::jsonb;
            v_patch := v_patch || jsonb_build_object('user_id', v_actor, 'is_mock', false, 'is_active', true);
            p_id := v_blank_id;
        else
            for v_rec in select value from jsonb_array_elements(p_rows) loop
                select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) into v_patch
                  from jsonb_each(v_rec) where key = any (v_cols);
                if not v_staff then v_patch := v_patch || jsonb_build_object('user_id', v_actor, 'is_mock', false); end if;
                v_new := jsonb_populate_record(null::caddy_profiles, v_patch);
                insert into caddy_profiles (name, phone, email, photo_url, course_id, course_name, experience_years,
                    languages, specialties, certifications, is_active, availability_days, created_by, bio, notes,
                    availability_status, caddy_number, personality, strengths, specialty, user_id, is_mock,
                    gallery_urls, emergency_contact, sheet_start, sheet_end, block_minutes, tier_code, golf_handicap)
                values (v_new.name, v_new.phone, v_new.email, v_new.photo_url, v_new.course_id, v_new.course_name,
                    coalesce(v_new.experience_years, 0), v_new.languages, v_new.specialties, v_new.certifications,
                    coalesce(v_new.is_active, true), v_new.availability_days, v_new.created_by, v_new.bio, v_new.notes,
                    coalesce(v_new.availability_status, 'available'), v_new.caddy_number, v_new.personality,
                    v_new.strengths, v_new.specialty, v_new.user_id, coalesce(v_new.is_mock, false), v_new.gallery_urls,
                    v_new.emergency_contact, coalesce(v_new.sheet_start, '06:00'::time), coalesce(v_new.sheet_end, '16:00'::time),
                    coalesce(v_new.block_minutes, 255), v_new.tier_code, v_new.golf_handicap)
                returning to_jsonb(caddy_profiles.*) into v_rec;
                v_ids := v_ids || jsonb_build_array(jsonb_build_object('id', v_rec ->> 'id'));
            end loop;
            return v_ids;
        end if;
    else
        if p_op not in ('update', 'claim') or p_id is null or jsonb_typeof(p_rows) <> 'object' then
            raise exception 'caddy_profile_write: bad request';
        end if;
        select * into v_row from caddy_profiles where id = p_id for update;
        if not found then return '[]'::jsonb; end if;

        if p_op = 'claim' then
            -- bind an UNCLAIMED roster row to this account (registration / first dashboard visit)
            if v_row.user_id is not null and v_row.user_id <> v_actor then
                raise exception 'caddy_profile_write: this caddy is already claimed' using errcode = '42501';
            end if;
            -- v1435: a caddy who left keeps her record at that course; only SHE can pick it up again
            if v_row.left_at is not null and v_row.former_user_id is distinct from v_actor then
                raise exception 'caddy_profile_write: this record belongs to a caddy who left the course' using errcode = '42501';
            end if;
            -- v1435: one course at a time (her "Unassigned" placeholder does not count, and is retired below)
            if v_own_id is not null and v_own_id <> p_id then
                raise exception 'caddy_profile_write: this account is already registered at a golf course - leave that course first' using errcode = '42501';
            end if;
            select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) into v_patch from jsonb_each(p_rows)
             where key = any (array['is_active','languages','name','course_id','course_name','caddy_number']);
            -- course / number / name only fill blanks on a claim — never rewrite the course's record
            if v_row.course_id is not null then v_patch := v_patch - 'course_id'; end if;
            if v_row.course_name is not null then v_patch := v_patch - 'course_name'; end if;
            if v_row.caddy_number is not null then v_patch := v_patch - 'caddy_number'; end if;
            v_patch := v_patch || jsonb_build_object('user_id', v_actor);
            if v_row.left_at is not null then   -- she is back at the course she left
                v_patch := v_patch || jsonb_build_object('left_at', null, 'former_user_id', null, 'is_active', true);
            end if;
            update caddy_profiles set user_id = null, is_active = false, updated_at = now()
             where user_id = v_actor and id <> p_id and course_id is null
               and lower(btrim(coalesce(course_name, ''))) in ('', 'unassigned');
        elsif v_staff then
            select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) into v_patch from jsonb_each(p_rows) where key = any (v_staff_cols);
            -- the course puts a departed caddy's record back in service: it is an ordinary roster row again
            if v_row.left_at is not null and (v_patch ->> 'is_active') = 'true' then
                v_patch := v_patch || jsonb_build_object('left_at', null);
            end if;
        elsif v_row.user_id = v_actor then
            select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) into v_patch from jsonb_each(p_rows) where key = any (v_self_cols);
        else
            raise exception 'caddy_profile_write: you can only change your own caddy profile' using errcode = '42501';
        end if;
    end if;

    v_new := jsonb_populate_record(v_row, v_patch);
    update caddy_profiles set
        name = v_new.name, phone = v_new.phone, email = v_new.email, photo_url = v_new.photo_url,
        course_id = v_new.course_id, course_name = v_new.course_name, experience_years = v_new.experience_years,
        languages = v_new.languages, specialties = v_new.specialties, certifications = v_new.certifications,
        is_active = v_new.is_active, availability_days = v_new.availability_days, created_by = v_new.created_by,
        bio = v_new.bio, notes = v_new.notes, availability_status = v_new.availability_status,
        caddy_number = v_new.caddy_number, personality = v_new.personality, strengths = v_new.strengths,
        specialty = v_new.specialty, user_id = v_new.user_id, is_mock = v_new.is_mock, gallery_urls = v_new.gallery_urls,
        emergency_contact = v_new.emergency_contact, sheet_start = v_new.sheet_start, sheet_end = v_new.sheet_end,
        block_minutes = v_new.block_minutes, tier_code = v_new.tier_code, golf_handicap = v_new.golf_handicap,
        left_at = v_new.left_at, former_user_id = v_new.former_user_id,
        updated_at = now()
    where id = p_id;
    return jsonb_build_array(jsonb_build_object('id', p_id));
end $$;

revoke all on function public.caddy_profile_write(text, text, uuid, jsonb) from public;
grant execute on function public.caddy_profile_write(text, text, uuid, jsonb) to anon, authenticated;


-- She leaves the course. Returns {ok:true, course_name, caddy_number} or {ok:false, reason, ...}:
--   none      — this account is not registered at a course
--   on_course — she is out with a golfer right now
--   bookings  — she still has bookings there (count, next date); the caddy master moves them first
create or replace function public.caddy_leave_course(p_actor text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
    v_claim text := nullif(coalesce(auth.jwt() ->> 'line_id', ''), '');
    v_actor text;
    v_row caddy_profiles%rowtype;
    v_today date := (now() at time zone 'Asia/Bangkok')::date;
    v_num text;
    v_live int; v_n int; v_next date;
begin
    if v_claim is not null and p_actor is not null and p_actor <> v_claim then
        raise exception 'caddy_leave_course: actor does not match the signed-in account' using errcode = '42501';
    end if;
    v_actor := coalesce(v_claim, nullif(p_actor, ''));
    if v_actor is null then
        raise exception 'caddy_leave_course: sign in with LINE first' using errcode = '42501';
    end if;
    if not exists (select 1 from user_profiles where line_user_id = v_actor) then
        raise exception 'caddy_leave_course: unknown account' using errcode = '42501';
    end if;

    select * into v_row from caddy_profiles
     where user_id = v_actor and left_at is null
       and (course_id is not null or lower(btrim(coalesce(course_name, ''))) not in ('', 'unassigned'))
     order by created_at desc limit 1
       for update;
    if not found then return jsonb_build_object('ok', false, 'reason', 'none'); end if;

    v_num := nullif(ltrim(regexp_replace(coalesce(v_row.caddy_number, ''), '\D', '', 'g'), '0'), '');
    select count(*) filter (where b.status = 'in_progress' or (b.started_at is not null and b.booking_date = v_today)),
           count(*), min(b.booking_date)
      into v_live, v_n, v_next
      from caddy_bookings b
     where b.booking_date >= v_today
       and b.status not in ('cancelled', 'completed') and b.completed_at is null
       and (b.caddy_id = v_row.id
            -- event jobs carry no caddy_id: the job is "Caddy #N" at her course
            or (b.caddy_id is null and v_num is not null
                and substring(b.caddie_name from '#\s*0*(\d+)') = v_num
                and caddy_facility_key(b.course_name) = caddy_facility_key(v_row.course_name)));
    if v_live > 0 then return jsonb_build_object('ok', false, 'reason', 'on_course'); end if;
    if v_n > 0 then return jsonb_build_object('ok', false, 'reason', 'bookings', 'count', v_n, 'next', v_next); end if;

    -- the record stays with the course; the login lets go of it (and of any placeholder it still holds)
    update caddy_profiles set
        former_user_id = v_actor, user_id = null, is_active = false, updated_at = now(),
        left_at = case when course_id is not null or lower(btrim(coalesce(course_name, ''))) not in ('', 'unassigned')
                       then now() else left_at end
     where user_id = v_actor;

    -- her account no longer carries that course's number, so nothing re-links her on the next open
    update user_profiles set
        caddy_number = null,
        home_club = case when home_club is not distinct from v_row.course_name or role = 'caddie' then null else home_club end,
        profile_data = case when profile_data is null then null else
            (((case when jsonb_typeof(profile_data -> 'roleSpecific') = 'object'
                    then jsonb_set(profile_data, '{roleSpecific}',
                           (profile_data -> 'roleSpecific') - 'caddyNumber' - 'homeClubName' - 'claimId'
                           - (case when (profile_data -> 'roleSpecific') ? 'homeClubName' then 'homeClub' else '' end))
                    else profile_data end)
              #- '{caddyInfo,caddyNumber}') #- '{personalInfo,caddyNumber}') - 'caddy_number' end
     where line_user_id = v_actor;

    -- the caddy master is told, in the requests list she already watches
    begin
        insert into caddy_assistance_requests (course_id, caddy_user_id, caddy_name, caddy_number, request_type)
        values (v_row.course_id, v_actor, coalesce(nullif(btrim(v_row.name), ''), 'Caddy'), v_row.caddy_number, 'left');
    exception when others then
        raise warning '[caddy_leave_course] notice: %', sqlerrm;
    end;

    return jsonb_build_object('ok', true, 'course_name', v_row.course_name, 'caddy_number', v_row.caddy_number);
end $$;

revoke all on function public.caddy_leave_course(text) from public;
grant execute on function public.caddy_leave_course(text) to anon, authenticated;


-- My Caddies -> roster sync (live definition + one guard): a number that belonged to a caddy who LEFT
-- is a different person now, so it gets its own row instead of landing on her record.
CREATE OR REPLACE FUNCTION public.caddy_sync_from_notebook(p_number text, p_name text, p_course text, p_photo text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_num text := trim(coalesce(p_number,''));
        v_key text; v_cid text; v_cname text; v_row record; v_name text;
BEGIN
  IF v_num = '' OR v_num !~ '^[A-Za-z0-9]{1,8}$' THEN RETURN; END IF;
  -- '003' and '3' are the same bib; compare with leading zeros stripped (never store an empty key)
  v_key := ltrim(v_num, '0'); IF v_key = '' THEN v_key := '0'; END IF;
  IF v_num ~ '^\d+$' THEN v_num := v_key; END IF;
  v_cid := caddy_resolve_course_id(p_course);
  IF v_cid IS NOT NULL THEN
    SELECT name INTO v_cname FROM courses WHERE id = v_cid;
  ELSE
    v_cname := nullif(trim(coalesce(p_course,'')), '');
  END IF;
  IF v_cname IS NULL THEN RETURN; END IF;  -- numbers are per-course: no course, no sync

  -- a real name is anything that is not blank and not the placeholder
  v_name := nullif(trim(coalesce(p_name,'')), '');
  IF v_name IS NOT NULL AND v_name ~* '^caddy\s*#?\s*\d*$' THEN v_name := NULL; END IF;

  SELECT * INTO v_row FROM caddy_profiles
   WHERE is_mock = false AND left_at IS NULL AND ltrim(caddy_number, '0') = v_key   -- v1435: never a departed caddy's record
     AND (   (v_cid IS NOT NULL AND course_id = v_cid)
          OR caddy_facility_key(course_name) = caddy_facility_key(v_cname))
   ORDER BY (course_id = v_cid) DESC NULLS LAST, created_at
   LIMIT 1;

  IF v_row.id IS NOT NULL THEN
    IF v_row.user_id IS NOT NULL THEN RETURN; END IF;     -- caddy owns it now
    IF v_row.created_by IS NOT NULL THEN RETURN; END IF;  -- v1370: the golf course owns it
    UPDATE caddy_profiles SET
      photo_url = coalesce(nullif(p_photo,''), photo_url),
      name = CASE WHEN v_name IS NOT NULL
                   AND (name IS NULL OR name = '' OR name ~* '^caddy\s*#')
                  THEN v_name ELSE name END,
      updated_at = now()
    WHERE id = v_row.id;
    RETURN;
  END IF;

  -- v1412: a caddy a golfer played with is on the course's roster even before anyone typed her
  -- name; 'Caddy #N' is the placeholder every surface renders, replaced above when a name arrives.
  INSERT INTO caddy_profiles (id, name, caddy_number, course_id, course_name, photo_url,
                              is_active, is_mock, bio, created_at, updated_at)
  VALUES (gen_random_uuid(),
          coalesce(v_name, 'Caddy #' || v_num),
          v_num, v_cid, v_cname, nullif(p_photo,''),
          true, false,
          CASE WHEN v_name IS NULL THEN 'Synced from My Caddies (number only)' ELSE 'Synced from My Caddies notebook' END,
          now(), now());
END $function$;
