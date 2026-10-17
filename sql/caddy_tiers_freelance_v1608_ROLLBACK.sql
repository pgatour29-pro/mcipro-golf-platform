-- v1608 ROLLBACK
begin;
drop trigger if exists caddy_dayoff_freelance on public.caddy_dayoff_requests;
drop function if exists public.trg_caddy_dayoff_freelance();
drop function if exists public.caddy_freelance_drop(text, uuid, text);
drop function if exists public.caddy_tier_save(text, jsonb);
drop function if exists public.caddy_roster_set(text, uuid, jsonb);
drop function if exists public._caddy_course_ok(text, text, text);
CREATE OR REPLACE FUNCTION public.caddy_profile_write(p_actor text, p_op text, p_id uuid, p_rows jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
                    coalesce(v_new.block_minutes, 270), v_new.tier_code, v_new.golf_handicap)
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
            if v_row.user_id is not null and v_row.user_id <> v_actor and (v_row.user_id !~ '^CADDY-[0-9a-f]{32}$' or exists (select 1 from caddy_pin_logins l where l.user_id = v_row.user_id and l.last_login_at is not null)) then
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
    if p_op = 'claim' and v_row.user_id ~ '^CADDY-[0-9a-f]{32}$' and v_row.user_id <> v_actor then perform public._caddy_handover(v_row.user_id, v_actor); end if;
    return jsonb_build_array(jsonb_build_object('id', p_id));
end $function$
;

CREATE OR REPLACE FUNCTION public.golfer_set_booking_caddy(p_booking_id text, p_golfer_id text, p_caddy_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  b        record;
  golfers  jsonb;
  i        integer := -1;
  k        integer;
  slot     jsonb;
  old_id   text;
  old_num  text;
  cp       record;
  prefix   text;
  block    integer;
  clash_t  time;
  tee      time;
  end_t    time;
  fee      numeric := 0;
  the_date date;
  need     integer;
  any_caddy boolean;
  first_slot jsonb;
  old_job  record;
  old_job_id uuid := null;  -- scalars, not record fields: a record that never got a row cannot be read
  old_end  time := null;
  old_fee  numeric := null;
  picked   jsonb := null;   -- the caddy set by this call (the cancel branch never assigns cp)
begin
  if coalesce(p_golfer_id, '') = '' or coalesce(p_booking_id, '') = '' then
    return jsonb_build_object('ok', false, 'reason', 'bad_args');
  end if;
  select * into b from public.bookings where id = p_booking_id for update;
  if not found or coalesce(b.deleted, false) then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  if coalesce(b.source, '') not in ('teesheet', 'hotdeal') then
    return jsonb_build_object('ok', false, 'reason', 'not_proshop');
  end if;
  golfers := coalesce(b.booking_data->'golfers', '[]'::jsonb);
  if jsonb_typeof(golfers) <> 'array' then golfers := '[]'::jsonb; end if;
  -- my slot: the golfers[] entry carrying my id, else slot 0 when the row is mine
  for k in 0 .. jsonb_array_length(golfers) - 1 loop
    if golfers->k->>'odoo_id' = p_golfer_id then i := k; exit; end if;
  end loop;
  if i < 0 and b.golfer_id = p_golfer_id then
    if jsonb_array_length(golfers) = 0 then
      golfers := jsonb_build_array(jsonb_build_object('name', coalesce(b.golfer_name, b.name, 'Golfer'), 'odoo_id', p_golfer_id, 'caddyId', null, 'caddyNumber', '', 'caddyName', ''));
    end if;
    i := 0;
  end if;
  if i < 0 then
    return jsonb_build_object('ok', false, 'reason', 'not_yours');
  end if;
  slot    := golfers->i;
  old_id  := nullif(slot->>'caddyId', '');
  old_num := nullif(trim(coalesce(slot->>'caddyNumber', '')), '');
  the_date := b.date;
  tee      := nullif(b.time, '')::time;
  need     := coalesce((b.booking_data->>'caddiesNeeded')::integer, 0);
  prefix   := lower(split_part(coalesce(b.course_name, ''), ' ', 1));

  -- the slot's current job (by caddy id, else by the 'Caddy #N' name) — cancelled either way
  select * into old_job from public.caddy_bookings cb
   where cb.teesheet_booking_id = p_booking_id and coalesce(cb.status, '') <> 'cancelled'
     and ((old_id is not null and cb.caddy_id::text = old_id) or (old_num is not null and cb.caddie_name = 'Caddy #' || old_num))
   order by cb.created_at limit 1;
  if found then old_job_id := old_job.id; old_end := old_job.end_time; old_fee := old_job.payment_amount; end if;

  if p_caddy_id is null then
    if old_job_id is not null then
      update public.caddy_bookings set status = 'cancelled', cancelled_at = now(), cancellation_reason = 'Caddy cancelled by the golfer', updated_at = now() where id = old_job_id;
    end if;
    slot := slot || jsonb_build_object('caddyId', null, 'caddyNumber', '', 'caddyName', '', 'caddyLocalName', '');
    golfers := jsonb_set(golfers, array[i::text], slot, true);
  else
    select * into cp from public.caddy_profiles c
     where c.id = p_caddy_id and coalesce(c.is_active, false) and coalesce(c.is_mock, false) = false
       and (c.course_id = b.course_id or (prefix <> '' and lower(coalesce(c.course_name, '')) like prefix || '%'));
    if not found then
      return jsonb_build_object('ok', false, 'reason', 'caddy_taken', 'caddy', '?');
    end if;
    -- not twice in one group
    for k in 0 .. jsonb_array_length(golfers) - 1 loop
      if k <> i and trim(coalesce(golfers->k->>'caddyNumber', '')) = trim(cp.caddy_number) then
        return jsonb_build_object('ok', false, 'reason', 'in_group', 'caddy', cp.caddy_number);
      end if;
    end loop;
    perform pg_advisory_xact_lock(hashtext('caddy:' || cp.id::text));
    block := greatest(270, coalesce(cp.block_minutes, 270));
    if tee is not null then
      select coalesce(cb.tee_time, cb.start_time) into clash_t
        from public.caddy_bookings cb
       where cb.booking_date = the_date
         and coalesce(cb.status, '') <> 'cancelled'
         and (old_job_id is null or cb.id <> old_job_id)
         and (cb.caddy_id = cp.id
              or (cb.caddy_id is null and cb.caddie_name = 'Caddy #' || trim(cp.caddy_number)
                  and (cb.course_id = b.course_id or (prefix <> '' and lower(coalesce(cb.course_name, '')) like prefix || '%'))))
         and coalesce(cb.tee_time, cb.start_time) is not null
         and abs(extract(epoch from (coalesce(cb.tee_time, cb.start_time) - tee)) / 60) < block
       limit 1;
      if found then
        return jsonb_build_object('ok', false, 'reason', 'caddy_taken', 'caddy', cp.caddy_number, 'at', to_char(clash_t, 'HH24:MI'));
      end if;
    end if;
    if exists (select 1 from public.caddy_dayoff_requests r
                where r.status = 'approved' and trim(coalesce(r.caddy_number, '')) = trim(cp.caddy_number)
                  and r.date_from <= the_date and r.date_to >= the_date
                  and (r.course_name is null or prefix = '' or lower(r.course_name) like prefix || '%')) then
      return jsonb_build_object('ok', false, 'reason', 'caddy_taken', 'caddy', cp.caddy_number, 'off', true);
    end if;

    if old_job_id is not null then
      update public.caddy_bookings set status = 'cancelled', cancelled_at = now(), cancellation_reason = 'Replaced by the golfer', updated_at = now() where id = old_job_id;
      end_t := old_end; fee := coalesce(old_fee, 0);
    else
      -- no caddy on this slot yet: a pending 'Unassigned' job becomes this one — but only when the
      -- open jobs cover every caddy-less slot including mine (a golfer who cancelled their own caddy
      -- and picks again must not eat a job that belongs to another player in the group)
      if need >= (select count(*) from jsonb_array_elements(golfers) with ordinality as t(g, ord)
                   where (ord - 1) <> i and nullif(g->>'caddyId', '') is null and nullif(g->>'caddyNumber', '') is null) + 1 then
        select * into old_job from public.caddy_bookings cb
         where cb.teesheet_booking_id = p_booking_id and cb.caddy_id is null and cb.status = 'pending' order by cb.created_at limit 1;
        if found then old_job_id := old_job.id; old_end := old_job.end_time; old_fee := old_job.payment_amount; end if;
      end if;
      if old_job_id is not null then
        update public.caddy_bookings set status = 'cancelled', cancelled_at = now(), cancellation_reason = 'Filled by the golfer', updated_at = now() where id = old_job_id;
        end_t := old_end; fee := coalesce(old_fee, 0);
        need := greatest(0, need - 1);
      end if;
    end if;
    if end_t is null and tee is not null then end_t := tee + make_interval(mins => 270); end if;

    insert into public.caddy_bookings (
      caddy_id, caddie_name, booking_date, tee_time, start_time, end_time, course_id, course_name,
      holes, payment_amount, payment_status, status, confirmed_at, confirmed_by,
      golfer_id, user_id, golfer_name, booking_source, teesheet_booking_id, special_requests)
    values (
      cp.id, 'Caddy #' || trim(cp.caddy_number), the_date, tee, tee, end_t, b.course_id, b.course_name,
      18, fee, 'pending', 'confirmed', now(), 'Golfer app',
      p_golfer_id, p_golfer_id, coalesce(slot->>'name', b.golfer_name, 'Golfer'), 'golfer_app', p_booking_id, 'Chosen by the golfer in the app');

    picked := jsonb_build_object('id', cp.id::text, 'number', trim(cp.caddy_number), 'name', coalesce(nullif(trim(cp.name), ''), 'Caddy #' || trim(cp.caddy_number)));
    slot := slot || jsonb_build_object('caddyId', cp.id::text, 'caddyNumber', trim(cp.caddy_number),
                                       'caddyName', coalesce(nullif(trim(cp.name), ''), 'Caddy #' || trim(cp.caddy_number)), 'caddyLocalName', '');
    golfers := jsonb_set(golfers, array[i::text], slot, true);
  end if;

  -- the row mirrors slot 0 like a pro shop save does
  first_slot := golfers->0;
  any_caddy := exists (select 1 from jsonb_array_elements(golfers) g where nullif(g->>'caddyId', '') is not null or nullif(g->>'caddyNumber', '') is not null);
  update public.bookings
     set booking_data = jsonb_set(jsonb_set(coalesce(booking_data, '{}'::jsonb), '{golfers}', golfers, true), '{caddiesNeeded}', to_jsonb(need), true),
         caddie_id = nullif(first_slot->>'caddyId', ''),
         caddy_number = nullif(first_slot->>'caddyNumber', ''),
         caddie_name = nullif(first_slot->>'caddyName', ''),
         caddie_status = case when any_caddy then 'confirmed' when need > 0 then 'pending' else null end,
         updated_at = now()
   where id = p_booking_id;

  return jsonb_build_object('ok', true, 'slot', i, 'caddiesNeeded', need, 'caddy', picked);
end
$function$
;
-- caddy_job_drops and caddy_profiles.is_freelance are kept (data); drop by hand if truly unwanted
commit;
