-- ROLLBACK for sql/caddy_course_lock_v1435.sql — restores the v1397 caddy_profile_write and the pre-v1435
-- caddy_sync_from_notebook, drops caddy_leave_course. The two columns (left_at, former_user_id) are left in
-- place: they hold who left which course, and dropping them would lose that.

drop function if exists public.caddy_leave_course(text);

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
    v_row caddy_profiles%rowtype;
    v_new caddy_profiles%rowtype;
    v_patch jsonb;
    v_ids jsonb := '[]'::jsonb;
    v_rec jsonb;
    v_self_cols text[] := array['name','phone','email','photo_url','languages','specialties','certifications',
        'availability_days','bio','availability_status','personality','strengths','specialty','gallery_urls',
        'emergency_contact','golf_handicap','experience_years','is_active',
        'sheet_start','sheet_end','block_minutes'];   -- her own work window (CaddyTeeSheet)
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

    if p_op = 'insert' then
        if jsonb_typeof(p_rows) = 'object' then p_rows := jsonb_build_array(p_rows); end if;
        if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 or jsonb_array_length(p_rows) > 200 then
            raise exception 'caddy_profile_write: bad rows';
        end if;
        if not v_staff then
            -- self-registration: exactly one row, always hers, and only if she has none yet
            if jsonb_array_length(p_rows) <> 1 then raise exception 'caddy_profile_write: not allowed' using errcode = '42501'; end if;
            if exists (select 1 from caddy_profiles where user_id = v_actor) then
                raise exception 'caddy_profile_write: this account already has a caddy profile' using errcode = '42501';
            end if;
            v_cols := v_self_cols || array['caddy_number','course_id','course_name'];
        else
            v_cols := v_staff_cols;
        end if;
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
        if v_row.user_id is null and exists (select 1 from caddy_profiles where user_id = v_actor and id <> p_id) then
            raise exception 'caddy_profile_write: this account already has a caddy profile' using errcode = '42501';
        end if;
        select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) into v_patch from jsonb_each(p_rows)
         where key = any (array['is_active','languages','name','course_id','course_name','caddy_number']);
        -- course / number / name only fill blanks on a claim — never rewrite the course's record
        if v_row.course_id is not null then v_patch := v_patch - 'course_id'; end if;
        if v_row.course_name is not null then v_patch := v_patch - 'course_name'; end if;
        if v_row.caddy_number is not null then v_patch := v_patch - 'caddy_number'; end if;
        v_patch := v_patch || jsonb_build_object('user_id', v_actor);
    elsif v_staff then
        select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) into v_patch from jsonb_each(p_rows) where key = any (v_staff_cols);
    elsif v_row.user_id = v_actor then
        select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) into v_patch from jsonb_each(p_rows) where key = any (v_self_cols);
    else
        raise exception 'caddy_profile_write: you can only change your own caddy profile' using errcode = '42501';
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
        updated_at = now()
    where id = p_id;
    return jsonb_build_array(jsonb_build_object('id', p_id));
end $$;

revoke all on function public.caddy_profile_write(text, text, uuid, jsonb) from public;
grant execute on function public.caddy_profile_write(text, text, uuid, jsonb) to anon, authenticated;

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
   WHERE is_mock = false AND ltrim(caddy_number, '0') = v_key
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
