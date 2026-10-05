-- ROLLBACK for caddy_block_270_v1466.sql — the eight functions exactly as they were live on 2026-10-05
-- (255-minute block), plus the column floor/default and the end-time trigger.
drop trigger if exists trg_caddy_bookings_end_covers_block on public.caddy_bookings;
drop function if exists public.caddy_bookings_end_covers_block();
alter table public.caddy_profiles drop constraint if exists caddy_profiles_block_minutes_floor;
alter table public.caddy_profiles alter column block_minutes set default 255;
update public.caddy_profiles set block_minutes = 255 where block_minutes = 270;
alter table public.caddy_profiles add constraint caddy_profiles_block_minutes_floor check (block_minutes >= 255);

CREATE OR REPLACE FUNCTION public.caddy_bookings_no_clash()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
    v_t time; v_block int; v_name text; v_hit record;
begin
    if new.status = 'cancelled' or new.booking_date is null then return new; end if;
    v_t := coalesce(new.tee_time, new.start_time);
    if v_t is null then return new; end if;
    v_name := nullif(btrim(coalesce(new.caddie_name, '')), '');
    if new.caddy_id is null and (v_name is null or lower(v_name) = 'unassigned') then return new; end if;

    if tg_op = 'UPDATE'
       and new.caddy_id is not distinct from old.caddy_id
       and new.caddie_name is not distinct from old.caddie_name
       and new.booking_date is not distinct from old.booking_date
       and coalesce(new.tee_time, new.start_time) is not distinct from coalesce(old.tee_time, old.start_time)
       and not (old.status = 'cancelled') then
        return new;
    end if;

    perform pg_advisory_xact_lock(hashtext('caddy:' ||
        coalesce(new.caddy_id::text, lower(coalesce(new.course_name, '')) || '|' || lower(v_name)) || ':' || new.booking_date::text));

    select greatest(255, coalesce(block_minutes, 255)) into v_block from public.caddy_profiles where id = new.caddy_id;
    v_block := coalesce(v_block, 255);

    select b.id, coalesce(b.tee_time, b.start_time) t into v_hit
      from public.caddy_bookings b
     where b.id <> new.id
       and b.booking_date = new.booking_date
       and b.status <> 'cancelled'
       and coalesce(b.tee_time, b.start_time) is not null
       and ( (new.caddy_id is not null and b.caddy_id = new.caddy_id)
          or (new.caddy_id is null and b.caddy_id is null and lower(btrim(b.caddie_name)) = lower(v_name)
              and lower(coalesce(b.course_name, '')) = lower(coalesce(new.course_name, ''))) )
       and abs(extract(epoch from (coalesce(b.tee_time, b.start_time) - v_t)) / 60) < v_block
     limit 1;

    if found then
        raise exception 'CADDY_CLASH: already out at % — blocked until % (% min per round)',
            to_char(v_hit.t, 'HH24:MI'), to_char(v_hit.t + make_interval(mins => v_block), 'HH24:MI'), v_block
            using errcode = '23P01';
    end if;
    return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.caddy_jobs_ensure(p_event_id text, p_player_id text, p_player_name text, p_caddy_numbers text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

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
end $function$
;

CREATE OR REPLACE FUNCTION public.claim_hot_deal(p_offer_id uuid, p_golfer_id text, p_golfer_name text, p_spots integer, p_want_caddy boolean, p_caddies jsonb DEFAULT '[]'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v       record;
  d       jsonb;
  total   integer;
  taken   integer;
  left_   integer;
  bid     text;
  price   numeric;
  cfee    numeric;
  gname   text;
  golfers jsonb := '[]'::jsonb;
  i       integer;
  hold    text;
  hold_label text;
  tee     time;
  rmin    integer;
  want_caddy boolean;
  picks   jsonb := '[]'::jsonb;
  pk      jsonb;
  cp      record;
  prefix  text;
  block   integer;
  clash_t time;
  n_pick  integer := 0;
  first_pick jsonb;
  the_date date;
  numbers text[] := '{}';
begin
  if p_spots is null or p_spots < 1 or p_spots > 4 then
    return jsonb_build_object('ok', false, 'reason', 'spots');
  end if;
  if coalesce(p_golfer_id, '') = '' then
    return jsonb_build_object('ok', false, 'reason', 'no_golfer');
  end if;
  gname := coalesce(nullif(trim(p_golfer_name), ''), 'Golfer');

  select * into v from public.course_offers where id = p_offer_id for update;
  if not found or v.offer_type <> 'tee_time' or v.deal is null then
    return jsonb_build_object('ok', false, 'reason', 'not_a_deal');
  end if;
  if v.status <> 'active' then
    return jsonb_build_object('ok', false, 'reason', 'closed');
  end if;
  if v.valid_to is not null and v.valid_to < now() then
    return jsonb_build_object('ok', false, 'reason', 'expired');
  end if;

  d     := v.deal;
  total := coalesce((d->>'spots_total')::integer, 0);
  taken := coalesce((d->>'spots_taken')::integer, 0);
  left_ := total - taken;
  if left_ < p_spots then
    return jsonb_build_object('ok', false, 'reason', 'sold_out', 'left', greatest(left_, 0));
  end if;
  -- one grab per golfer per deal
  if exists (
    select 1 from public.bookings b
    where b.golfer_id = p_golfer_id
      and (b.booking_data->>'hotDealId') = p_offer_id::text
      and coalesce(b.deleted, false) = false
  ) then
    return jsonb_build_object('ok', false, 'reason', 'already');
  end if;

  price    := coalesce((d->>'price')::numeric, 0);
  cfee     := coalesce((d->>'caddy_fee')::numeric, 0);
  rmin     := coalesce((d->>'round_minutes')::integer, 270);
  tee      := (d->>'time')::time;
  the_date := (d->>'date')::date;
  bid      := gen_random_uuid()::text;
  want_caddy := coalesce(p_want_caddy, false)
                or (jsonb_typeof(p_caddies) = 'array' and jsonb_array_length(p_caddies) > 0);
  if coalesce(d->>'caddy', 'none') = 'none' then
    want_caddy := false;                       -- the deal has no caddy at all
  end if;

  -- Validate the picks BEFORE any write.
  prefix := lower(split_part(coalesce(v.course_name, ''), ' ', 1));
  if want_caddy and jsonb_typeof(p_caddies) = 'array' then
    if jsonb_array_length(p_caddies) > p_spots then
      return jsonb_build_object('ok', false, 'reason', 'spots');
    end if;
    for pk in select value from jsonb_array_elements(p_caddies) loop
      if coalesce(pk->>'id', '') !~* '^[0-9a-f]{8}-[0-9a-f-]{27}$' then
        return jsonb_build_object('ok', false, 'reason', 'caddy_taken', 'caddy', coalesce(pk->>'number', '?'));
      end if;
      select * into cp from public.caddy_profiles c
       where c.id = (pk->>'id')::uuid
         and coalesce(c.is_active, false)
         and coalesce(c.is_mock, false) = false
         and (c.course_id = v.course_id or (prefix <> '' and lower(coalesce(c.course_name, '')) like prefix || '%'));
      if not found then
        return jsonb_build_object('ok', false, 'reason', 'caddy_taken', 'caddy', coalesce(pk->>'number', '?'));
      end if;
      if cp.id::text = any(select x->>'id' from jsonb_array_elements(picks) x) then
        return jsonb_build_object('ok', false, 'reason', 'caddy_taken', 'caddy', cp.caddy_number);
      end if;
      -- two grabs racing for the same caddy queue here, and the second one sees the first one's job
      perform pg_advisory_xact_lock(hashtext('caddy:' || cp.id::text));
      block := greatest(255, coalesce(cp.block_minutes, 255));
      select coalesce(cb.tee_time, cb.start_time) into clash_t
        from public.caddy_bookings cb
       where cb.booking_date = the_date
         and coalesce(cb.status, '') <> 'cancelled'
         and (cb.caddy_id = cp.id
              or (cb.caddy_id is null
                  and cb.caddie_name = 'Caddy #' || trim(cp.caddy_number)
                  and (cb.course_id = v.course_id or (prefix <> '' and lower(coalesce(cb.course_name, '')) like prefix || '%'))))
         and coalesce(cb.tee_time, cb.start_time) is not null
         and abs(extract(epoch from (coalesce(cb.tee_time, cb.start_time) - tee)) / 60) < block
       limit 1;
      if found then
        return jsonb_build_object('ok', false, 'reason', 'caddy_taken', 'caddy', cp.caddy_number, 'at', to_char(clash_t, 'HH24:MI'));
      end if;
      if exists (select 1 from public.caddy_dayoff_requests r
                  where r.status = 'approved'
                    and trim(coalesce(r.caddy_number, '')) = trim(cp.caddy_number)
                    and r.date_from <= the_date and r.date_to >= the_date
                    and (r.course_name is null or prefix = '' or lower(r.course_name) like prefix || '%')) then
        return jsonb_build_object('ok', false, 'reason', 'caddy_taken', 'caddy', cp.caddy_number);
      end if;
      picks := picks || jsonb_build_array(jsonb_build_object(
        'id', cp.id::text, 'number', trim(cp.caddy_number),
        'name', coalesce(nullif(trim(cp.name), ''), 'Caddy #' || trim(cp.caddy_number))));
      numbers := numbers || trim(cp.caddy_number);
    end loop;
  end if;
  n_pick := jsonb_array_length(picks);
  first_pick := case when n_pick > 0 then picks->0 else null end;

  -- golfers[]: the picked caddies ride the first N entries; the rest wait for the pro shop
  for i in 1..p_spots loop
    golfers := golfers || jsonb_build_array(jsonb_build_object(
      'name', case when i = 1 then gname else gname || ' +' || (i - 1) end,
      'odoo_id', case when i = 1 then p_golfer_id else null end,
      'caddyId',     case when i <= n_pick then picks->(i-1)->>'id' else null end,
      'caddyNumber', case when i <= n_pick then picks->(i-1)->>'number' else '' end,
      'caddyName',   case when i <= n_pick then picks->(i-1)->>'name' else '' end));
  end loop;

  -- the golfer's tee time, in the shape proshop-teesheet.html reads back (dbRowToBooking)
  insert into public.bookings (
    id, date, time, tee_time, name, golfer_name, golfer_id, players, group_id, kind, booking_type,
    tee_sheet_course, tee_number, course_id, course_name, notes, status, source, is_vip, deleted,
    caddie_id, caddy_number, caddie_name, caddie_status, created_at, updated_at, booking_data)
  values (
    bid, the_date, d->>'time', d->>'time', gname, gname, p_golfer_id, p_spots, bid, 'tee', 'hotdeal',
    d->>'tee_sheet_course', nullif(d->>'tee_number', '')::integer, v.course_id, v.course_name,
    'Hot deal ฿' || trim(to_char(price, 'FM999,999,990')) || '/player'
      || case when n_pick > 0 then ', caddy #' || array_to_string(numbers, ', #')
              when want_caddy then ', caddy' else '' end,
    'confirmed', 'hotdeal', false, false,
    first_pick->>'id', coalesce(first_pick->>'number', ''), coalesce(first_pick->>'name', ''),
    case when n_pick > 0 then 'confirmed' when want_caddy then 'pending' else null end,
    now(), now(),
    jsonb_build_object(
      'golfers', golfers, 'groupName', null, 'groupIndex', null, 'groupTotal', null,
      'col', d->'col', 'recurringGroupId', null,
      'caddiesNeeded', case when want_caddy then p_spots - n_pick else 0 end,
      'hotDealId', p_offer_id::text, 'hotDealPrice', price,
      'hotDealCaddy', case when want_caddy then 'yes' else 'no' end));

  if want_caddy then
    -- picked caddies: CONFIRMED jobs with her id and the 'Caddy #N' name the app keys on
    for i in 1..n_pick loop
      insert into public.caddy_bookings (
        caddy_id, caddie_name, booking_date, tee_time, start_time, end_time, course_id, course_name,
        holes, payment_amount, payment_status, status, confirmed_at, confirmed_by,
        golfer_id, user_id, golfer_name, booking_source, teesheet_booking_id, special_requests)
      values (
        (picks->(i-1)->>'id')::uuid, 'Caddy #' || (picks->(i-1)->>'number'), the_date, tee, tee, tee + make_interval(mins => rmin),
        v.course_id, v.course_name, 18, cfee, 'pending', 'confirmed', now(), 'Golfer app',
        p_golfer_id, p_golfer_id, gname, 'hotdeal', bid, 'Hot deal booking');
    end loop;
    -- the rest: pending, no number — the caddy master assigns from the rotation (v1218 model)
    for i in (n_pick + 1)..p_spots loop
      insert into public.caddy_bookings (
        caddy_id, caddie_name, booking_date, tee_time, start_time, end_time, course_id, course_name,
        holes, payment_amount, payment_status, status, golfer_id, user_id, golfer_name,
        booking_source, teesheet_booking_id, special_requests)
      values (
        null, 'Unassigned', the_date, tee, tee, tee + make_interval(mins => rmin),
        v.course_id, v.course_name, 18, cfee, 'pending', 'pending', p_golfer_id, p_golfer_id, gname,
        'hotdeal', bid, 'Hot deal booking');
    end loop;
  end if;

  taken := taken + p_spots;
  left_ := total - taken;
  d := d || jsonb_build_object('spots_taken', taken);

  -- shrink or retire the pro shop's HOLD pill on the sheet
  hold := d->>'hold_booking_id';
  if hold is not null then
    if left_ <= 0 then
      update public.bookings set deleted = true, updated_at = now() where id = hold;
    else
      hold_label := 'HOT DEAL ฿' || trim(to_char(price, 'FM999,999,990')) || ' · ' || left_ || ' left';
      update public.bookings
         set players = left_, name = hold_label, golfer_name = hold_label, updated_at = now(),
             booking_data = jsonb_set(
               jsonb_set(coalesce(booking_data, '{}'::jsonb), '{golfers}', jsonb_build_array(jsonb_build_object('name', hold_label, 'caddyId', null, 'caddyNumber', '', 'caddyName', ''))),
               '{hotDeal,spotsLeft}', to_jsonb(left_), true)
       where id = hold;
    end if;
  end if;

  update public.course_offers
     set deal = d,
         status = case when left_ <= 0 then 'expired' else status end,
         updated_at = now()
   where id = p_offer_id;

  return jsonb_build_object('ok', true, 'booking_id', bid, 'left', left_,
                            'date', d->>'date', 'time', d->>'time', 'course_name', v.course_name,
                            'caddies', to_jsonb(numbers));
end
$function$
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
    block := greatest(255, coalesce(cp.block_minutes, 255));
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
    if end_t is null and tee is not null then end_t := tee + make_interval(mins => 255); end if;

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

CREATE OR REPLACE FUNCTION public.qr_book_caddy(p_token text, p_caddy_id uuid, p_date date, p_time text, p_course_slug text, p_event_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    g public.qr_guests := public._qr_guest_of(p_token);
    c public.caddy_profiles; e public.society_events; v_t time; v_now timestamp := public._qr_bkk_now();
    v_id uuid; v_title text; v_block int;
begin
    select * into c from public.caddy_profiles where id = p_caddy_id and coalesce(is_active, true) and not coalesce(is_mock, false);
    if not found then raise exception 'QR_CADDY: not available'; end if;
    if p_event_id is not null then
        select * into e from public.society_events where id = p_event_id;
        if not found or not exists (select 1 from public.event_registrations where event_id = p_event_id and player_id = g.guest_id) then
            raise exception 'QR_EVENT: register first';
        end if;
        p_date := e.event_date; v_title := e.title;
        v_t := coalesce(e.start_time, p_time::time);
    else
        v_t := p_time::time;
    end if;
    if p_date is null or v_t is null then raise exception 'QR_INPUT: date and time'; end if;
    if p_date < v_now::date or p_date > v_now::date + 60 or (p_date = v_now::date and v_t <= v_now::time) then raise exception 'QR_INPUT: date'; end if;
    if exists (select 1 from public.caddy_dayoff_requests d where d.status = 'approved' and p_date between d.date_from and d.date_to
                and nullif(regexp_replace(coalesce(d.caddy_number, ''), '\D', '', 'g'), '') = nullif(regexp_replace(coalesce(c.caddy_number, ''), '\D', '', 'g'), '')
                and (d.course_name is null or d.course_name = c.course_name)) then
        raise exception 'QR_CADDY: day off';
    end if;
    if (select count(*) from public.caddy_bookings where golfer_id = g.guest_id and booking_date = p_date and status <> 'cancelled') >= 2 then
        raise exception 'QR_LIMIT: two caddy requests per day';
    end if;
    v_block := greatest(255, coalesce(c.block_minutes, 255));

    -- one caddy per golfer per game: a new pick for the same game replaces the old request
    if v_title is not null then
        update public.caddy_bookings set status = 'cancelled', cancelled_at = now(), cancellation_reason = 'QR guest changed caddy', updated_at = now()
         where golfer_id = g.guest_id and booking_date = p_date and booking_source = 'qr_guest' and special_requests = v_title and status <> 'cancelled';
    end if;

    begin
        insert into public.caddy_bookings (caddy_id, caddie_name, booking_date, tee_time, start_time, end_time, holes,
                    course_id, course_name, status, booking_source, golfer_id, user_id, golfer_name, special_requests,
                    payment_status, created_at, updated_at)
        values (c.id, coalesce(nullif(btrim(c.name), ''), 'Caddy #' || c.caddy_number), p_date, v_t, v_t, v_t + make_interval(mins => v_block), 18,
                coalesce(nullif(p_course_slug, ''), c.course_id), c.course_name, 'pending', 'qr_guest', g.guest_id, g.guest_id, g.name, v_title,
                'pending', now(), now())
        returning id into v_id;
    exception when others then
        if sqlstate in ('23P01', '23505') or sqlerrm like 'CADDY_CLASH%' then
            return jsonb_build_object('ok', false, 'taken', true);
        end if;
        raise;
    end;
    if p_event_id is not null then
        update public.event_registrations set caddy_numbers = c.caddy_number, updated_at = now()
         where event_id = p_event_id and player_id = g.guest_id;
    end if;
    return jsonb_build_object('ok', true, 'booking_id', v_id);
end $function$
;

CREATE OR REPLACE FUNCTION public.qr_venue_caddies(p_course_ids text[], p_name_prefix text, p_date date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
    if p_date is null or coalesce(array_length(p_course_ids, 1), 0) = 0 and coalesce(p_name_prefix, '') = '' then return '[]'::jsonb; end if;
    return coalesce((
        select jsonb_agg(jsonb_build_object(
            'id', c.id, 'caddy_number', c.caddy_number, 'name', case when c.name ~* '^caddy\s*#' then null else nullif(btrim(c.name), '') end, 'photo_url', c.photo_url,
            'course_name', c.course_name, 'course_id', c.course_id, 'block', greatest(255, coalesce(c.block_minutes, 255)),
            'busy', coalesce((select jsonb_agg(to_char(coalesce(b.tee_time, b.start_time), 'HH24:MI'))
                                from public.caddy_bookings b
                               where b.caddy_id = c.id and b.booking_date = p_date and b.status <> 'cancelled'
                                 and coalesce(b.tee_time, b.start_time) is not null), '[]'::jsonb),
            'day_off', exists (select 1 from public.caddy_dayoff_requests d
                                where d.status = 'approved' and p_date between d.date_from and d.date_to
                                  and nullif(regexp_replace(coalesce(d.caddy_number, ''), '\D', '', 'g'), '') = nullif(regexp_replace(coalesce(c.caddy_number, ''), '\D', '', 'g'), '')
                                  and (d.course_name is null or d.course_name = c.course_name))
        ) order by (case when c.caddy_number ~ '^\d+$' then lpad(c.caddy_number, 6, '0') else c.caddy_number end))
        from public.caddy_profiles c
        where coalesce(c.is_active, true) and not coalesce(c.is_mock, false)
          -- a real caddy = a real name OR a photo (Pete 2026-09-27: Burapha #21/#187 are real, photo, no name yet);
          -- a nameless AND photoless "Caddy #N" row is a notebook phantom (v1369) and stays hidden
          and ((nullif(btrim(c.name), '') is not null and c.name !~* '^caddy\s*#') or nullif(btrim(c.photo_url), '') is not null)
          and (c.course_id = any(coalesce(p_course_ids, '{}')) or (coalesce(p_name_prefix, '') <> '' and c.course_name ilike p_name_prefix || '%'))
    ), '[]'::jsonb);
end $function$
;

CREATE OR REPLACE FUNCTION public.teetime_book(p_slug text, p_date date, p_time text, p_col integer, p_golfer_id text, p_golfer_name text, p_players jsonb, p_carts integer DEFAULT 0, p_pay text DEFAULT NULL::text, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  c jsonb; v_nines text[]; v_tees int; v_nine text; v_tee int; n int; key_ text; booked int; blocked boolean;
  now_bkk timestamp := (now() at time zone 'Asia/Bangkok'); m int; v_start int; v_step int;
  bid text; ref text; gname text; golfers jsonb := '[]'::jsonb; pl jsonb; i int;
  cp record; prefix text; blk int; clash_t time; picks int := 0; want_any int := 0; nums text[] := '{}';
  first_pick jsonb := null; tee time; rmin int; fee jsonb; green int; caddy_fee int; cart_fee int;
  carts int; total int; rule text; amount int := 0; due timestamptz; state text; app jsonb; cancel_until timestamp;
  cad jsonb; job_rows jsonb := '[]'::jsonb;
begin
  if coalesce(p_golfer_id, '') = '' then return jsonb_build_object('ok', false, 'reason', 'no_golfer'); end if;
  if jsonb_typeof(p_players) <> 'array' or jsonb_array_length(p_players) < 1 or jsonb_array_length(p_players) > 4 then
    return jsonb_build_object('ok', false, 'reason', 'players');
  end if;
  n := jsonb_array_length(p_players);
  c := public.teetime_cfg(p_slug);
  if c is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if not (c->>'enabled')::boolean then return jsonb_build_object('ok', false, 'reason', 'closed'); end if;
  m := public.teetime_min(p_time);
  v_start := public.teetime_min(c->>'start'); v_step := (c->>'interval')::int;
  if m is null or (m - v_start) % v_step <> 0 or m < public.teetime_min(c->>'open_from') or m > public.teetime_min(c->>'open_until') then
    return jsonb_build_object('ok', false, 'reason', 'off_grid');
  end if;
  if p_date > now_bkk::date + (c->>'days')::int then return jsonb_build_object('ok', false, 'reason', 'too_far'); end if;
  if (p_date + make_interval(mins => m)) < now_bkk + make_interval(mins => (c->>'lead_min')::int) then
    return jsonb_build_object('ok', false, 'reason', 'past');
  end if;
  select array_agg(x order by o) into v_nines from jsonb_array_elements_text(c->'nines') with ordinality as a(x, o);
  v_tees := (c->>'tees')::int;
  if p_col is null or p_col < 0 or p_col >= array_length(v_nines, 1) * v_tees then return jsonb_build_object('ok', false, 'reason', 'off_grid'); end if;
  v_nine := v_nines[(p_col / v_tees) + 1]; v_tee := (p_col % v_tees) + 1;
  -- names and notes land in the pro shop sheet's markup: no HTML characters, ever
  gname := coalesce(nullif(left(regexp_replace(trim(coalesce(p_golfer_name, '')), '[<>"''`&]', '', 'g'), 60), ''), 'Golfer');
  p_time := public.teetime_hhmm(m);

  -- the same lock the 4-per-slot trigger takes: two golfers racing for the last spots queue here
  key_ := p_slug || '|' || p_date::text || '|' || p_time || '|' || v_nine || '|' || v_tee::text;
  perform pg_advisory_xact_lock(hashtext('teeslot:' || key_));
  select g.booked, g.blocked into booked, blocked from public.teetime_grid(p_slug, p_date) g where g.t = p_time and g.col = p_col;
  if blocked then return jsonb_build_object('ok', false, 'reason', 'blocked'); end if;
  if coalesce(booked, 0) + n > 4 then return jsonb_build_object('ok', false, 'reason', 'full', 'left', greatest(0, 4 - coalesce(booked, 0))); end if;
  -- a double tap is not a second booking
  if exists (select 1 from public.bookings b where b.golfer_id = p_golfer_id and b.date = p_date and left(b.time, 5) = p_time
               and b.course_id = p_slug and b.booking_type = 'app' and not coalesce(b.deleted, false)) then
    return jsonb_build_object('ok', false, 'reason', 'already');
  end if;

  tee := p_time::time;
  rmin := (c->>'round_min')::int;
  prefix := lower(split_part(coalesce(c->>'name', ''), ' ', 1));
  caddy_fee := coalesce((c->'rates'->>'caddy18')::int, 0);

  -- players + their caddies, every pick validated BEFORE any write
  i := 0;
  for pl in select value from jsonb_array_elements(p_players) loop
    i := i + 1;
    cad := null;
    if coalesce(pl->>'caddy', 'any') ~* '^[0-9a-f]{8}-[0-9a-f-]{27}$' then
      select * into cp from public.caddy_profiles x
       where x.id = (pl->>'caddy')::uuid and coalesce(x.is_active, false) and not coalesce(x.is_mock, false)
         and (x.course_id = p_slug or (prefix <> '' and lower(coalesce(x.course_name, '')) like prefix || '%'));
      if not found then return jsonb_build_object('ok', false, 'reason', 'caddy_taken', 'caddy', '?'); end if;
      if exists (select 1 from jsonb_array_elements(golfers) gx where gx->>'caddyId' = cp.id::text) then
        return jsonb_build_object('ok', false, 'reason', 'caddy_taken', 'caddy', cp.caddy_number);
      end if;
      perform pg_advisory_xact_lock(hashtext('caddy:' || cp.id::text));
      blk := greatest(255, coalesce(cp.block_minutes, 255));
      select coalesce(cb.tee_time, cb.start_time) into clash_t from public.caddy_bookings cb
       where cb.booking_date = p_date and coalesce(cb.status, '') <> 'cancelled'
         and (cb.caddy_id = cp.id or (cb.caddy_id is null and cb.caddie_name = 'Caddy #' || trim(cp.caddy_number)
              and (cb.course_id = p_slug or (prefix <> '' and lower(coalesce(cb.course_name, '')) like prefix || '%'))))
         and coalesce(cb.tee_time, cb.start_time) is not null
         and abs(extract(epoch from (coalesce(cb.tee_time, cb.start_time) - tee)) / 60) < blk
       limit 1;
      if found then return jsonb_build_object('ok', false, 'reason', 'caddy_taken', 'caddy', cp.caddy_number, 'at', to_char(clash_t, 'HH24:MI')); end if;
      if exists (select 1 from public.caddy_dayoff_requests r where r.status = 'approved'
                  and trim(coalesce(r.caddy_number, '')) = trim(cp.caddy_number) and r.date_from <= p_date and r.date_to >= p_date
                  and (r.course_name is null or prefix = '' or lower(r.course_name) like prefix || '%')) then
        return jsonb_build_object('ok', false, 'reason', 'caddy_taken', 'caddy', cp.caddy_number);
      end if;
      cad := jsonb_build_object('id', cp.id::text, 'number', trim(cp.caddy_number), 'name', coalesce(nullif(trim(cp.name), ''), 'Caddy #' || trim(cp.caddy_number)));
      picks := picks + 1; nums := nums || trim(cp.caddy_number);
      if first_pick is null then first_pick := cad; end if;
    elsif coalesce(pl->>'caddy', 'any') = 'any' then
      want_any := want_any + 1;
    end if;
    golfers := golfers || jsonb_build_array(jsonb_build_object(
      'name', coalesce(nullif(left(regexp_replace(trim(coalesce(pl->>'name', '')), '[<>"''`&]', '', 'g'), 60), ''), case when i = 1 then gname else gname || ' +' || (i - 1) end),
      'odoo_id', case when i = 1 then p_golfer_id else nullif(trim(coalesce(pl->>'id', '')), '') end,
      'caddyId', cad->>'id', 'caddyNumber', coalesce(cad->>'number', ''), 'caddyName', coalesce(cad->>'name', ''),
      'caddyWanted', case when cad is not null then 'picked' when coalesce(pl->>'caddy', 'any') = 'any' then 'any' else 'none' end));
  end loop;

  -- the bill, from the course's own rates (null when the course shows none)
  fee := public.teetime_green_fee(c, p_date, p_time);
  green := coalesce((fee->>'price')::int, 0);
  carts := greatest(0, least(n, coalesce(p_carts, 0)));
  cart_fee := coalesce((c->'rates'->>'cart18')::int, 0);
  total := case when fee is null then null else green * n + caddy_fee * (picks + want_any) + cart_fee * carts end;
  rule := c->>'rule';
  if rule = 'deposit' and p_pay = 'full' and (c->>'allow_full')::boolean and total is not null then rule := 'full'; end if;
  amount := case rule when 'deposit' then (c->>'deposit_pp')::int * n when 'full' then coalesce(total, 0) else 0 end;
  if rule in ('deposit', 'full') and amount <= 0 then rule := 'none'; amount := 0; end if;
  state := case when rule = 'none' then 'booked' else 'due' end;
  due := case when state = 'due' then now() + make_interval(mins => (c->>'pay_min')::int) else null end;
  cancel_until := (p_date + make_interval(mins => m)) - make_interval(hours => (c->>'cancel_h')::int);
  bid := gen_random_uuid()::text;
  ref := 'MCP-' || upper(substr(translate(encode(decode(md5(bid), 'hex'), 'base64'), '+/=0O1Il', 'XYZ'), 1, 5));
  app := jsonb_build_object('v', 1, 'ref', ref, 'rule', rule, 'amount', amount, 'deposit_pp', case when rule = 'deposit' then (c->>'deposit_pp')::int else null end,
    'state', state, 'due_at', due, 'cancel_until', to_char(cancel_until, 'YYYY-MM-DD"T"HH24:MI'), 'carts', carts,
    'quote', case when fee is null then null else jsonb_build_object('period', fee->>'label', 'green_pp', green, 'caddy_pp', caddy_fee,
                 'caddies', picks + want_any, 'cart_each', cart_fee, 'total', total) end,
    'pay_to', c->'pay_to', 'allow_full', coalesce((c->>'allow_full')::boolean, false) and fee is not null, 'created_at', now(), 'booker', p_golfer_id);

  insert into public.bookings (
    id, date, time, tee_time, name, golfer_name, golfer_id, players, group_id, kind, booking_type,
    tee_sheet_course, tee_number, course_id, course_name, notes, status, source, is_vip, deleted,
    caddie_id, caddy_number, caddie_name, caddie_status, created_at, updated_at, booking_data)
  values (
    bid, p_date, p_time, p_date::text || 'T' || p_time || ':00', gname, gname, p_golfer_id, n, bid, 'tee', 'app',
    v_nine, v_tee, p_slug, c->>'name',
    left(regexp_replace(coalesce(nullif(trim(p_notes), ''), ''), '[<>"`]', '', 'g'), 300),
    'confirmed', 'teesheet', false, false,
    first_pick->>'id', coalesce(first_pick->>'number', ''), coalesce(first_pick->>'name', ''),
    case when picks > 0 then 'confirmed' when want_any > 0 then 'pending' else null end,
    now(), now(),
    jsonb_build_object('golfers', golfers, 'groupName', null, 'groupIndex', null, 'groupTotal', null, 'col', p_col,
      'recurringGroupId', null, 'caddiesNeeded', want_any, 'app', app));

  -- caddy jobs: picked = confirmed with her id; "pro shop assigns" = Unassigned pending (caddy master assigns)
  for pl in select value from jsonb_array_elements(golfers) loop
    if pl->>'caddyWanted' = 'picked' then
      insert into public.caddy_bookings (caddy_id, caddie_name, booking_date, tee_time, start_time, end_time, course_id, course_name,
        holes, payment_amount, payment_status, status, confirmed_at, confirmed_by, golfer_id, user_id, golfer_name,
        booking_source, teesheet_booking_id, special_requests)
      values ((pl->>'caddyId')::uuid, 'Caddy #' || (pl->>'caddyNumber'), p_date, tee, tee, tee + make_interval(mins => rmin), p_slug, c->>'name',
        18, caddy_fee, 'pending', 'confirmed', now(), 'Golfer app', coalesce(pl->>'odoo_id', p_golfer_id), coalesce(pl->>'odoo_id', p_golfer_id),
        pl->>'name', 'app_teetime', bid, 'Tee time ' || ref);
    elsif pl->>'caddyWanted' = 'any' then
      insert into public.caddy_bookings (caddy_id, caddie_name, booking_date, tee_time, start_time, end_time, course_id, course_name,
        holes, payment_amount, payment_status, status, golfer_id, user_id, golfer_name, booking_source, teesheet_booking_id, special_requests)
      values (null, 'Unassigned', p_date, tee, tee, tee + make_interval(mins => rmin), p_slug, c->>'name',
        18, caddy_fee, 'pending', 'pending', coalesce(pl->>'odoo_id', p_golfer_id), coalesce(pl->>'odoo_id', p_golfer_id), pl->>'name',
        'app_teetime', bid, 'Tee time ' || ref);
    end if;
  end loop;

  return jsonb_build_object('ok', true, 'booking_id', bid, 'ref', ref, 'state', state, 'rule', rule, 'amount', amount,
    'due_at', due, 'date', p_date, 'time', p_time, 'nine', v_nine, 'course', c->>'name', 'caddies', to_jsonb(nums));
end $function$
;
