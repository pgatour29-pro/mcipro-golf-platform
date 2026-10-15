-- COURSE DATA IMPORT (on-boarding) — v1581, 2026-10-15
-- Pete: "Data Migration: On-boarding golf courses data into our system: tee sheet, caddies, members and
-- customers, along with pro shop inventories."
--
-- A course brings the records it already keeps (Excel / CSV / its legacy tee sheet export) into MyCaddiPro
-- from the Pro Shop dashboard → Import data tab (public/course-import.js). The browser parses, maps and
-- validates; THIS file is the write path. Everything lands through the same rules the app already enforces:
--   tee sheet   → public.bookings via teesheet_save() (4 golfers per tee time, optimistic lock) + caddy jobs
--                 in caddy_bookings shaped like proshop-teesheet.html syncCaddyJobs (4:30 block, suspensions,
--                 LINE alert trigger — silenced per batch when the course asks)
--   caddies     → caddy_profiles (a real row retires one mock — existing trigger); a row the caddie has
--                 CLAIMED (user_id) is never touched; off days → caddy_work_week_set()
--   members     → course_memberships (+ a course_customers record so the player book has the contact)
--   customers   → course_customers (NEW table, read by the CRM player book) + VIP/note → course_golfer_notes
--   products    → proshop_products (unique course_id + name)
-- Every batch is recorded (course_import_batches / course_import_rows: what was inserted, what was updated
-- and its BEFORE image) so course_import_undo() puts it all back. The Change log gets one summary row per
-- run and per undo; proshop_products and course_customers now carry the row trigger too.
--
-- Gate: a course that has its own pro shop PIN (or a facility PIN) must present that session's desk token
-- (proshop_pin_login → ps_desk_token_v1); a shared-PIN course imports as it already writes everything else.
-- Rollback: sql/course_import_v1581_ROLLBACK.sql

begin;

-- ---------------------------------------------------------------------------------------------------------
-- 1. tables
-- ---------------------------------------------------------------------------------------------------------
create table if not exists public.course_import_batches (
    id          uuid primary key default gen_random_uuid(),
    course_id   text not null,                       -- courses.id
    course_slug text,                                -- tee sheet slug
    course_name text,
    kind        text not null check (kind in ('teesheet', 'caddies', 'members', 'customers', 'products')),
    status      text not null default 'open' check (status in ('open', 'done', 'undone')),
    file_name   text,
    rows_in     int  not null default 0,
    inserted    int  not null default 0,
    updated     int  not null default 0,
    skipped     int  not null default 0,
    notes       jsonb not null default '[]'::jsonb,  -- [{i, msg}] per-row messages (capped)
    opts        jsonb not null default '{}'::jsonb,
    actor       text,
    created_at  timestamptz not null default now(),
    done_at     timestamptz,
    undone_at   timestamptz
);
create index if not exists course_import_batches_course_idx on public.course_import_batches (course_id, created_at desc);
alter table public.course_import_batches enable row level security;
revoke all on public.course_import_batches from public, anon, authenticated;

create table if not exists public.course_import_rows (
    batch_id uuid not null references public.course_import_batches (id) on delete cascade,
    tbl      text not null,
    row_id   text not null,
    op       text not null check (op in ('insert', 'update')),
    before   jsonb,
    primary key (batch_id, tbl, row_id)
);
alter table public.course_import_rows enable row level security;
revoke all on public.course_import_rows from public, anon, authenticated;

-- the course's own customer records (legacy CRM, member list contacts). The player book (course-crm.js)
-- joins them to the people it already knows by account id, else by name.
create table if not exists public.course_customers (
    id          uuid primary key default gen_random_uuid(),
    venue       text not null,                       -- CourseCRM.venueKey() — same key as course_golfer_notes.venue
    golfer_key  text not null,                       -- 'id:<account id>' | 'n:<normalised name>'
    golfer_id   text,
    name        text not null,
    phone       text,
    email       text,
    country     text,
    member_no   text,
    visits      int,
    first_visit date,
    last_visit  date,
    vip         boolean not null default false,
    tags        text[],
    note        text,
    source      text,
    batch_id    uuid,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now(),
    unique (venue, golfer_key)
);
create index if not exists course_customers_venue_idx on public.course_customers (venue);
alter table public.course_customers enable row level security;
drop policy if exists course_customers_select on public.course_customers;
create policy course_customers_select on public.course_customers for select to anon, authenticated using (true);
grant select on public.course_customers to anon, authenticated;
revoke insert, update, delete on public.course_customers from anon, authenticated;

-- memberships were facility-only (facility_id → facilities.id). A plain course keeps its members under its own
-- courses.id in the same column; readers look up both the facility id and the course id.
alter table public.course_memberships drop constraint if exists course_memberships_facility_id_fkey;
comment on column public.course_memberships.facility_id is 'facilities.id for a facility venue, else courses.id (v1581 course imports)';

-- change log coverage: shop stock and customer records are course-facing data too
drop trigger if exists course_change_log_trg on public.course_customers;
create trigger course_change_log_trg after insert or update or delete on public.course_customers
    for each row execute function public.course_change_log_fn();
drop trigger if exists course_change_log_trg on public.proshop_products;
create trigger course_change_log_trg after insert or update or delete on public.proshop_products
    for each row execute function public.course_change_log_fn();

-- ---------------------------------------------------------------------------------------------------------
-- 2. caddy_job_alert: a quiet switch for bulk writes (set per transaction by the import; nothing else sets it)
--    Authored from the LIVE definition (pg_get_functiondef, 2026-10-15) + ONE line.
-- ---------------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.caddy_job_alert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    v_url   text := 'https://pyeeplwsnupmhgbguwqs.supabase.co/functions/v1/notify-caddy-booking';
    v_hdr   jsonb := '{"Content-Type": "application/json"}'::jsonb;
    v_today date := (now() at time zone 'Asia/Bangkok')::date;
    v_tnew  time;
    v_told  time;
begin
    if coalesce(current_setting('mcp.quiet', true), '') = '1' then return null; end if;   -- v1581 bulk import, alerts off
    if coalesce(new.golfer_id, '') like 'TESTQA%' or coalesce(new.special_requests, '') like 'CLAUDE-TEST%' then return null; end if;
    if new.booking_date is null or new.booking_date < v_today then return null; end if;
    v_tnew := coalesce(new.tee_time, new.start_time);

    if tg_op = 'INSERT' then
        if new.status not in ('cancelled', 'completed') and new.caddy_id is not null then
            perform net.http_post(url := v_url, headers := v_hdr, body := jsonb_build_object('action', 'new_job', 'booking_id', new.id));
        end if;
        return null;
    end if;

    v_told := coalesce(old.tee_time, old.start_time);
    if new.status = 'cancelled' then
        if old.status <> 'cancelled' and old.caddy_id is not null then
            perform net.http_post(url := v_url, headers := v_hdr,
                body := jsonb_build_object('action', 'job_cancelled', 'booking_id', new.id, 'caddy_id', old.caddy_id));
        end if;
        return null;
    end if;
    if new.status = 'completed' then return null; end if;

    if new.caddy_id is distinct from old.caddy_id then               -- reassigned: the old caddy loses it, the new one gets it
        if old.caddy_id is not null and old.status <> 'cancelled' then
            perform net.http_post(url := v_url, headers := v_hdr,
                body := jsonb_build_object('action', 'job_cancelled', 'booking_id', new.id, 'caddy_id', old.caddy_id));
        end if;
        if new.caddy_id is not null then
            perform net.http_post(url := v_url, headers := v_hdr, body := jsonb_build_object('action', 'new_job', 'booking_id', new.id));
        end if;
        return null;
    end if;

    if old.status = 'cancelled' and new.caddy_id is not null then    -- re-opened
        perform net.http_post(url := v_url, headers := v_hdr, body := jsonb_build_object('action', 'new_job', 'booking_id', new.id));
        return null;
    end if;

    if new.caddy_id is not null and (v_tnew is distinct from v_told or new.booking_date is distinct from old.booking_date) then
        perform net.http_post(url := v_url, headers := v_hdr,
            body := jsonb_build_object('action', 'job_moved', 'booking_id', new.id, 'old_time', to_char(v_told, 'HH24:MI')));
    end if;
    return null;
exception when others then
    raise warning '[caddy_job_alert] %', sqlerrm;
    return null;
end
$function$;

-- ---------------------------------------------------------------------------------------------------------
-- 3. helpers (not callable from the browser)
-- ---------------------------------------------------------------------------------------------------------
create or replace function public._import_course_locked(p_course text, p_slug text)
returns boolean language sql stable as $$
    select exists (select 1 from public.proshop_pins pp
                    where pp.course_id = p_course
                       or pp.course_id = (select v.course_ref from public.course_venues v where v.slug = p_slug))
        or exists (select 1 from public.proshop_facility_pins fp
                     join public.facility_courses fc on fc.facility_id = fp.facility_id
                    where fc.slug = p_slug or fc.course_ref = p_course)
$$;
revoke all on function public._import_course_locked(text, text) from public, anon, authenticated;

create or replace function public._import_gate(p_token text, p_course text, p_slug text)
returns void language plpgsql as $$
declare keys text[];
begin
    if coalesce(p_course, '') = '' then raise exception 'IMPORT_NO_COURSE' using errcode = '22023'; end if;
    if public._import_course_locked(p_course, p_slug) then
        keys := public._desk_keys(p_token);
        if keys is null or not (p_course = any(keys) or coalesce(p_slug, '') = any(keys)) then
            raise exception 'IMPORT_TOKEN: this course imports with its own pro shop PIN' using errcode = '42501';
        end if;
    end if;
end $$;
revoke all on function public._import_gate(text, text, text) from public, anon, authenticated;

create or replace function public._import_actor()
returns text language sql stable as $$
    select coalesce(nullif((coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb)->>'x-mcp-actor', ''), 'pin')
$$;
revoke all on function public._import_actor() from public, anon, authenticated;

-- one account for a phone or an email — the member/customer gave the course that contact, so an exact,
-- unambiguous match links the record to the account. Never by name.
create or replace function public._import_match_profile(p_phone text, p_email text)
returns text language plpgsql stable as $$
declare v_ph text; v_em text; v_id text; v_n int;
begin
    v_ph := right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 9);
    v_em := lower(btrim(coalesce(p_email, '')));
    if v_em <> '' and v_em like '%@%' then
        select count(*), min(line_user_id) into v_n, v_id from public.user_profiles where lower(btrim(email)) = v_em;
        if v_n = 1 then return v_id; end if;
    end if;
    if length(v_ph) = 9 then
        select count(*), min(line_user_id) into v_n, v_id from public.user_profiles
         where right(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), 9) = v_ph;
        if v_n = 1 then return v_id; end if;
    end if;
    return null;
end $$;
revoke all on function public._import_match_profile(text, text) from public, anon, authenticated;

create or replace function public._import_norm_name(p text)
returns text language sql immutable as $$
    select btrim(regexp_replace(lower(
        case when position(',' in coalesce(p, '')) > 1
             then btrim(split_part(p, ',', 2)) || ' ' || btrim(split_part(p, ',', 1)) else coalesce(p, '') end),
        '[^a-z0-9฀-๿가-힯぀-ヿ一-鿿]+', ' ', 'g'))
$$;
revoke all on function public._import_norm_name(text) from public, anon, authenticated;

create or replace function public._import_record(p_batch uuid, p_tbl text, p_id text, p_op text, p_before jsonb)
returns void language sql as $$
    insert into public.course_import_rows (batch_id, tbl, row_id, op, before)
    values (p_batch, p_tbl, p_id, p_op, p_before)
    on conflict (batch_id, tbl, row_id) do nothing
$$;
revoke all on function public._import_record(uuid, text, text, text, jsonb) from public, anon, authenticated;

-- restore a row's columns from its BEFORE image (only the keys present, only real columns)
create or replace function public._import_restore(p_tbl text, p_key_col text, p_key text, p_before jsonb)
returns void language plpgsql as $$
declare cols text; keytype text;
begin
    select string_agg(quote_ident(c.column_name), ', ' order by c.ordinal_position) into cols
      from information_schema.columns c
     where c.table_schema = 'public' and c.table_name = p_tbl and c.column_name <> p_key_col and p_before ? c.column_name;
    if cols is null then return; end if;
    select c.data_type into keytype from information_schema.columns c
     where c.table_schema = 'public' and c.table_name = p_tbl and c.column_name = p_key_col;
    execute format('update public.%I t set (%s) = (select %s from jsonb_populate_record(null::public.%I, $1)) where t.%I = $2::%s',
                   p_tbl, cols, cols, p_tbl, p_key_col, coalesce(keytype, 'text'))
      using p_before, p_key;
end $$;
revoke all on function public._import_restore(text, text, text, jsonb) from public, anon, authenticated;

-- the course's real roster row for a number (by courses id, tee sheet slug or facility name key)
create or replace function public._import_caddy_by_number(p_course text, p_slug text, p_course_name text, p_num text)
returns public.caddy_profiles language plpgsql stable as $$
declare r public.caddy_profiles; v_num text;
begin
    v_num := coalesce(nullif(ltrim(regexp_replace(coalesce(p_num, ''), '\D', '', 'g'), '0'), ''), '0');
    if v_num = '0' then return null; end if;
    select cp.* into r from public.caddy_profiles cp
     where not coalesce(cp.is_mock, false) and cp.left_at is null
       and coalesce(nullif(ltrim(coalesce(cp.caddy_number, ''), '0'), ''), '0') = v_num
       and (cp.course_id = p_course or cp.course_id = p_slug
            or (p_course_name is not null and public.caddy_facility_key(cp.course_name) = public.caddy_facility_key(p_course_name)))
     order by (cp.course_id = p_course) desc, (cp.course_id = p_slug) desc, cp.created_at
     limit 1;
    return r;
end $$;
revoke all on function public._import_caddy_by_number(text, text, text, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------------------
-- 4. per-kind writers. Each returns {inserted, updated, skipped, notes:[{i,msg}]}
-- ---------------------------------------------------------------------------------------------------------

-- TEE SHEET. rows: [{i, date, time, course('A'..'D'), tee(int), col(int), group, golfers:[{name, caddyNumber}],
--                    caddiesNeeded, notes, bookingType}]
-- opts: jobs (default true) — write caddy jobs; alerts (default true) — LINE alerts for upcoming jobs
create or replace function public._import_teesheet(p_batch uuid, p_course text, p_slug text, p_course_name text, p_rows jsonb, p_opts jsonb)
returns jsonb language plpgsql as $$
declare
    it jsonb; i int; v_ins int := 0; v_upd int := 0; v_skip int := 0; notes jsonb := '[]'::jsonb;
    v_today date := (now() at time zone 'Asia/Bangkok')::date;
    v_fee numeric; v_round int;
    v_date date; v_time text; v_mins int; v_id text; v_row jsonb; v_res jsonb; v_golfers jsonb; g jsonb; v_g jsonb;
    v_lead text; v_pax int; v_need int; v_cad public.caddy_profiles; v_jobs boolean; v_nj int;
    v_tee time; v_end time; v_status text; v_pay text; v_job_id uuid; v_k int; v_hit text;
begin
    v_jobs := coalesce((p_opts->>'jobs')::boolean, true);
    if not coalesce((p_opts->>'alerts')::boolean, true) then perform set_config('mcp.quiet', '1', true); end if;
    select coalesce((s.teesheet_config->'full'->>'caddyFee18')::numeric, 400), coalesce((s.teesheet_config->'full'->>'roundDuration')::int, 270)
      into v_fee, v_round
      from public.golf_course_settings s where s.course_id = p_course or s.course_id = p_slug
     order by (s.course_id = p_course) desc limit 1;
    v_fee := coalesce(v_fee, 400); v_round := greatest(coalesce(v_round, 270), 270);

    for it in select * from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) loop
        i := coalesce((it->>'i')::int, 0);
        begin
            v_date := (it->>'date')::date; v_time := left(it->>'time', 5);
            if v_date is null or v_time !~ '^\d{2}:\d{2}$' then raise exception 'date or time missing'; end if;
            v_mins := split_part(v_time, ':', 1)::int * 60 + split_part(v_time, ':', 2)::int;
            v_golfers := '[]'::jsonb; v_k := 0;
            for g in select * from jsonb_array_elements(coalesce(it->'golfers', '[]'::jsonb)) loop
                exit when v_k >= 4;
                v_g := jsonb_build_object('name', left(coalesce(nullif(btrim(g->>'name'), ''), 'Player ' || (v_k + 1)), 80), 'caddyNumber', '', 'caddyId', null, 'caddyName', '');
                if coalesce(g->>'caddyNumber', '') <> '' then
                    v_cad := public._import_caddy_by_number(p_course, p_slug, p_course_name, g->>'caddyNumber');
                    if v_cad.id is not null then
                        v_g := v_g || jsonb_build_object('caddyNumber', v_cad.caddy_number, 'caddyId', v_cad.id, 'caddyName', coalesce(v_cad.name, 'Caddy #' || v_cad.caddy_number));
                    else
                        v_g := v_g || jsonb_build_object('caddyNumber', regexp_replace(g->>'caddyNumber', '\D', '', 'g'), 'caddyName', 'Caddy #' || regexp_replace(g->>'caddyNumber', '\D', '', 'g'));
                        notes := notes || jsonb_build_object('i', i, 'msg', 'caddy #' || regexp_replace(g->>'caddyNumber', '\D', '', 'g') || ' is not on the roster — number kept, no job');
                    end if;
                end if;
                v_golfers := v_golfers || v_g; v_k := v_k + 1;
            end loop;
            if v_k = 0 then
                v_golfers := jsonb_build_array(jsonb_build_object('name', left(coalesce(nullif(btrim(it->>'group'), ''), 'Walk-in'), 80), 'caddyNumber', '', 'caddyId', null, 'caddyName', ''));
                v_k := 1;
            end if;
            v_pax := v_k;
            v_lead := v_golfers->0->>'name';
            v_need := least(4, greatest(0, coalesce((it->>'caddiesNeeded')::int, 0)));

            -- already on the sheet (same day, time, column and lead name) → skip, never a double
            select b.id into v_hit from public.bookings b
             where b.course_id = p_slug and b.date = v_date and left(coalesce(b.time, ''), 5) = v_time
               and not coalesce(b.deleted, false) and b.kind = 'tee'
               and coalesce((b.booking_data->>'col')::int, coalesce(b.tee_number, 1) - 1) = coalesce((it->>'col')::int, 0)
               and public._import_norm_name(coalesce(b.name, b.golfer_name)) = public._import_norm_name(v_lead)
             limit 1;
            if v_hit is not null then
                v_skip := v_skip + 1; notes := notes || jsonb_build_object('i', i, 'msg', 'already on the tee sheet');
                continue;
            end if;

            v_id := gen_random_uuid()::text;
            v_row := jsonb_build_object(
                'id', v_id, 'date', v_date::text, 'time', v_time, 'tee_time', v_date::text || 'T' || v_time || ':00',
                'name', v_lead, 'golfer_name', v_lead, 'golfer_id', null, 'players', v_pax, 'group_id', v_id,
                'kind', 'tee', 'booking_type', coalesce(nullif(it->>'bookingType', ''), 'regular'),
                'tee_sheet_course', coalesce(nullif(it->>'course', ''), 'A'), 'tee_number', coalesce((it->>'tee')::int, 1),
                'course_id', p_slug, 'course_name', p_course_name, 'notes', left(coalesce(it->>'notes', ''), 500),
                'status', 'confirmed', 'source', 'teesheet', 'is_vip', (coalesce(it->>'bookingType', '') = 'vip'),
                'caddie_id', v_golfers->0->>'caddyId', 'caddy_number', nullif(v_golfers->0->>'caddyNumber', ''), 'caddie_name', nullif(v_golfers->0->>'caddyName', ''),
                'caddie_status', case when exists (select 1 from jsonb_array_elements(v_golfers) x where x->>'caddyId' is not null) then 'confirmed' when v_need > 0 then 'pending' else null end,
                'deleted', false,
                'booking_data', jsonb_build_object('golfers', v_golfers, 'groupName', nullif(btrim(coalesce(it->>'group', '')), ''),
                                                   'col', coalesce((it->>'col')::int, 0), 'caddiesNeeded', v_need,
                                                   'src', 'import', 'import_batch', p_batch::text));
            v_res := public.teesheet_save(jsonb_build_array(jsonb_build_object('row', v_row, 'expected', null)), '[]'::jsonb);
            if jsonb_array_length(coalesce(v_res->'errors', '[]'::jsonb)) > 0 then
                raise exception '%', coalesce(v_res->'errors'->0->>'message', 'refused');
            end if;
            perform public._import_record(p_batch, 'bookings', v_id, 'insert', null);
            v_ins := v_ins + 1;

            -- caddy jobs, the way the sheet writes them (one per golfer with a caddy; open seats for today/future)
            if v_jobs then
                v_tee := (v_time || ':00')::time;
                v_end := (lpad(((least(v_mins + v_round, 23 * 60 + 59)) / 60)::text, 2, '0') || ':' || lpad(((least(v_mins + v_round, 23 * 60 + 59)) % 60)::text, 2, '0') || ':00')::time;
                v_status := case when v_date < v_today then 'completed' else 'confirmed' end;
                v_pay := case when v_date < v_today then 'paid' else 'pending' end;
                v_nj := 0;
                for g in select * from jsonb_array_elements(v_golfers) loop
                    continue when g->>'caddyId' is null;
                    begin
                        insert into public.caddy_bookings (booking_date, tee_time, start_time, end_time, course_id, course_name, holes, payment_amount,
                                booking_source, teesheet_booking_id, special_requests, caddy_id, caddie_name, golfer_name, status, confirmed_at, confirmed_by,
                                payment_status, completed_at, created_at, updated_at)
                        values (v_date, v_tee, v_tee, v_end, p_slug, p_course_name, 18, v_fee,
                                'proshop_teesheet', v_id, nullif(left(coalesce(it->>'notes', ''), 500), ''), (g->>'caddyId')::uuid, 'Caddy #' || (g->>'caddyNumber'), g->>'name', v_status, now(), 'Import',
                                v_pay, case when v_date < v_today then ((v_date::text || ' ' || v_end::text)::timestamp at time zone 'Asia/Bangkok') else null end, now(), now())
                        returning id into v_job_id;
                        perform public._import_record(p_batch, 'caddy_bookings', v_job_id::text, 'insert', null);
                        v_nj := v_nj + 1;
                    exception when others then
                        -- the 4:30 block / a suspension refused this caddy: the seat stays open on the tee time
                        notes := notes || jsonb_build_object('i', i, 'msg', 'caddy #' || (g->>'caddyNumber') || ' not booked: ' || left(sqlerrm, 120));
                        if v_date >= v_today then
                            insert into public.caddy_bookings (booking_date, tee_time, start_time, end_time, course_id, course_name, holes, payment_amount,
                                    booking_source, teesheet_booking_id, caddy_id, caddie_name, golfer_name, status, payment_status, created_at, updated_at)
                            values (v_date, v_tee, v_tee, v_end, p_slug, p_course_name, 18, v_fee, 'proshop_teesheet', v_id, null, 'Unassigned', v_lead, 'pending', 'pending', now(), now())
                            returning id into v_job_id;
                            perform public._import_record(p_batch, 'caddy_bookings', v_job_id::text, 'insert', null);
                        end if;
                    end;
                end loop;
                if v_date >= v_today then
                    for v_k in 1..v_need loop
                        insert into public.caddy_bookings (booking_date, tee_time, start_time, end_time, course_id, course_name, holes, payment_amount,
                                booking_source, teesheet_booking_id, caddy_id, caddie_name, golfer_name, status, payment_status, created_at, updated_at)
                        values (v_date, v_tee, v_tee, v_end, p_slug, p_course_name, 18, v_fee, 'proshop_teesheet', v_id, null, 'Unassigned', v_lead, 'pending', 'pending', now(), now())
                        returning id into v_job_id;
                        perform public._import_record(p_batch, 'caddy_bookings', v_job_id::text, 'insert', null);
                    end loop;
                end if;
            end if;
        exception when others then
            v_skip := v_skip + 1;
            notes := notes || jsonb_build_object('i', i, 'msg', left(sqlerrm, 160));
        end;
    end loop;
    return jsonb_build_object('inserted', v_ins, 'updated', v_upd, 'skipped', v_skip, 'notes', notes);
end $$;
revoke all on function public._import_teesheet(uuid, text, text, text, jsonb, jsonb) from public, anon, authenticated;

-- CADDIES. rows: [{i, number, name, phone, languages:[], experience_years, tier_code, notes, bio, offDays:[1..7], active}]
-- opts: update (default true) — an existing UNCLAIMED roster row takes the file's values
create or replace function public._import_caddies(p_batch uuid, p_course text, p_slug text, p_course_name text, p_rows jsonb, p_opts jsonb)
returns jsonb language plpgsql as $$
declare
    it jsonb; i int; v_ins int := 0; v_upd int := 0; v_skip int := 0; notes jsonb := '[]'::jsonb;
    v_num text; v_name text; v_cad public.caddy_profiles; v_id uuid; v_update boolean; v_days smallint[]; v_ww public.caddy_work_week; v_langs text[];
begin
    v_update := coalesce((p_opts->>'update')::boolean, true);
    for it in select * from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) loop
        i := coalesce((it->>'i')::int, 0);
        begin
            v_num := nullif(ltrim(regexp_replace(coalesce(it->>'number', ''), '\D', '', 'g'), '0'), '');
            v_name := left(btrim(regexp_replace(coalesce(it->>'name', ''), '\s+', ' ', 'g')), 80);
            if v_num is null then raise exception 'no caddy number'; end if;
            if v_name = '' then raise exception 'no name'; end if;
            v_langs := null;
            if jsonb_typeof(it->'languages') = 'array' then
                select array_agg(x) into v_langs from jsonb_array_elements_text(it->'languages') x where btrim(x) <> '';
            end if;
            v_days := null;
            if jsonb_typeof(it->'offDays') = 'array' then
                select array_agg(x::smallint) into v_days from jsonb_array_elements_text(it->'offDays') x where x ~ '^[1-7]$';
            end if;
            v_cad := public._import_caddy_by_number(p_course, p_slug, p_course_name, v_num);
            if v_cad.id is not null then
                if v_cad.user_id is not null and v_cad.user_id not like 'CADDY-%' then   -- her own LINE account, not the roster's auto account
                    v_skip := v_skip + 1; notes := notes || jsonb_build_object('i', i, 'msg', '#' || v_num || ' has claimed her profile — kept as she set it');
                    continue;
                end if;
                if not v_update then
                    v_skip := v_skip + 1; notes := notes || jsonb_build_object('i', i, 'msg', '#' || v_num || ' already on the roster');
                    continue;
                end if;
                perform public._import_record(p_batch, 'caddy_profiles', v_cad.id::text, 'update', to_jsonb(v_cad));
                update public.caddy_profiles cp set
                    name = v_name,
                    phone = coalesce(nullif(btrim(it->>'phone'), ''), cp.phone),
                    languages = coalesce(v_langs, cp.languages),
                    experience_years = coalesce((it->>'experience_years')::int, cp.experience_years),
                    tier_code = coalesce(nullif(it->>'tier_code', ''), cp.tier_code),
                    notes = coalesce(nullif(it->>'notes', ''), cp.notes),
                    bio = coalesce(nullif(it->>'bio', ''), cp.bio),
                    is_active = coalesce((it->>'active')::boolean, cp.is_active),
                    created_by = coalesce(cp.created_by, 'import:' || p_batch::text),
                    updated_at = now()
                 where cp.id = v_cad.id;
                v_id := v_cad.id; v_upd := v_upd + 1;
            else
                insert into public.caddy_profiles (caddy_number, name, phone, languages, experience_years, tier_code, notes, bio,
                        course_id, course_name, is_mock, is_active, availability_status, created_by, created_at, updated_at)
                values (v_num, v_name, nullif(btrim(it->>'phone'), ''), v_langs, (it->>'experience_years')::int, nullif(it->>'tier_code', ''),
                        nullif(it->>'notes', ''), nullif(it->>'bio', ''), p_course, p_course_name, false, coalesce((it->>'active')::boolean, true),
                        'available', 'import:' || p_batch::text, now(), now())
                returning id into v_id;
                perform public._import_record(p_batch, 'caddy_profiles', v_id::text, 'insert', null);
                v_ins := v_ins + 1;
            end if;
            if v_days is not null then
                select w.* into v_ww from public.caddy_work_week w where w.caddy_id = v_id;
                if found then perform public._import_record(p_batch, 'caddy_work_week', v_id::text, 'update', to_jsonb(v_ww));
                else perform public._import_record(p_batch, 'caddy_work_week', v_id::text, 'insert', null); end if;
                perform public.caddy_work_week_set(v_id, v_days, 'Import');
            end if;
        exception when others then
            v_skip := v_skip + 1;
            notes := notes || jsonb_build_object('i', i, 'msg', left(sqlerrm, 160));
        end;
    end loop;
    return jsonb_build_object('inserted', v_ins, 'updated', v_upd, 'skipped', v_skip, 'notes', notes);
end $$;
revoke all on function public._import_caddies(uuid, text, text, text, jsonb, jsonb) from public, anon, authenticated;

-- customer record upsert shared by members + customers. Returns 'insert' | 'update'
create or replace function public._import_customer_row(p_batch uuid, p_venue text, p_name text, p_golfer_id text, p_phone text, p_email text,
                                                       p_country text, p_member_no text, p_visits int, p_first date, p_last date,
                                                       p_vip boolean, p_tags text[], p_note text, p_source text)
returns text language plpgsql as $$
declare v_key text; v_old public.course_customers; v_id uuid;
begin
    v_key := case when p_golfer_id is not null then 'id:' || p_golfer_id else 'n:' || public._import_norm_name(p_name) end;
    select c.* into v_old from public.course_customers c where c.venue = p_venue and c.golfer_key = v_key;
    if found then
        perform public._import_record(p_batch, 'course_customers', v_old.id::text, 'update', to_jsonb(v_old));
        update public.course_customers c set
            name = p_name, golfer_id = coalesce(p_golfer_id, c.golfer_id),
            phone = coalesce(nullif(p_phone, ''), c.phone), email = coalesce(nullif(p_email, ''), c.email),
            country = coalesce(nullif(p_country, ''), c.country), member_no = coalesce(nullif(p_member_no, ''), c.member_no),
            visits = coalesce(p_visits, c.visits), first_visit = least(coalesce(p_first, c.first_visit), coalesce(c.first_visit, p_first)),
            last_visit = greatest(coalesce(p_last, c.last_visit), coalesce(c.last_visit, p_last)),
            vip = coalesce(p_vip, c.vip), tags = coalesce(p_tags, c.tags), note = coalesce(nullif(p_note, ''), c.note),
            source = p_source, batch_id = p_batch, updated_at = now()
         where c.id = v_old.id;
        return 'update';
    end if;
    insert into public.course_customers (venue, golfer_key, golfer_id, name, phone, email, country, member_no, visits, first_visit, last_visit, vip, tags, note, source, batch_id)
    values (p_venue, v_key, p_golfer_id, p_name, nullif(p_phone, ''), nullif(p_email, ''), nullif(p_country, ''), nullif(p_member_no, ''), p_visits, p_first, p_last,
            coalesce(p_vip, false), p_tags, nullif(p_note, ''), p_source, p_batch)
    returning id into v_id;
    perform public._import_record(p_batch, 'course_customers', v_id::text, 'insert', null);
    return 'insert';
end $$;
revoke all on function public._import_customer_row(uuid, text, text, text, text, text, text, text, int, date, date, boolean, text[], text, text) from public, anon, authenticated;

-- the VIP flag / note the player book already shows (course_golfer_notes)
create or replace function public._import_golfer_note(p_batch uuid, p_venue text, p_golfer_id text, p_name text, p_vip boolean, p_note text)
returns void language plpgsql as $$
declare v_key text; v_old public.course_golfer_notes;
begin
    if not coalesce(p_vip, false) and coalesce(btrim(p_note), '') = '' then return; end if;
    v_key := case when p_golfer_id is not null then 'id:' || p_golfer_id else 'n:' || public._import_norm_name(p_name) end;
    select n.* into v_old from public.course_golfer_notes n where n.venue = p_venue and n.golfer_key = v_key;
    if found then
        perform public._import_record(p_batch, 'course_golfer_notes', p_venue || '|' || v_key, 'update', to_jsonb(v_old));
        update public.course_golfer_notes n set
            vip = n.vip or coalesce(p_vip, false),
            note = case when coalesce(btrim(p_note), '') = '' then n.note
                        when coalesce(btrim(n.note), '') = '' then left(p_note, 2000)
                        when position(p_note in n.note) > 0 then n.note
                        else left(n.note || E'\n' || p_note, 2000) end,
            golfer_name = coalesce(nullif(n.golfer_name, ''), p_name), updated_at = now()
         where n.venue = p_venue and n.golfer_key = v_key;
    else
        insert into public.course_golfer_notes (venue, golfer_key, golfer_name, note, vip, updated_at)
        values (p_venue, v_key, p_name, left(coalesce(p_note, ''), 2000), coalesce(p_vip, false), now());
        perform public._import_record(p_batch, 'course_golfer_notes', p_venue || '|' || v_key, 'insert', null);
    end if;
end $$;
revoke all on function public._import_golfer_note(uuid, text, text, text, boolean, text) from public, anon, authenticated;

-- MEMBERS. rows: [{i, name, member_no, tier, phone, email, valid_from, valid_to, status, notes}]
-- opts: facility_id (default the course id), venue (CRM venue key)
create or replace function public._import_members(p_batch uuid, p_course text, p_slug text, p_course_name text, p_rows jsonb, p_opts jsonb)
returns jsonb language plpgsql as $$
declare
    it jsonb; i int; v_ins int := 0; v_upd int := 0; v_skip int := 0; notes jsonb := '[]'::jsonb;
    v_fac text; v_venue text; v_name text; v_no text; v_tier text; v_gid text; v_from date; v_to date; v_status text; v_old public.course_memberships; v_id uuid;
    v_today date := (now() at time zone 'Asia/Bangkok')::date;
begin
    v_fac := coalesce(nullif(p_opts->>'facility_id', ''), p_course);
    v_venue := coalesce(nullif(p_opts->>'venue', ''), p_slug);
    for it in select * from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) loop
        i := coalesce((it->>'i')::int, 0);
        begin
            v_name := left(btrim(regexp_replace(coalesce(it->>'name', ''), '\s+', ' ', 'g')), 120);
            if v_name = '' then raise exception 'no name'; end if;
            v_no := nullif(btrim(coalesce(it->>'member_no', '')), '');
            v_tier := lower(coalesce(it->>'tier', ''));
            v_tier := case when v_tier in ('facility', 'single', 'corporate', 'family') then v_tier
                           when v_tier ~ '(corp|company|business)' then 'corporate'
                           when v_tier ~ '(family|spouse|couple)' then 'family'
                           when v_tier ~ '(facility|all|group|multi)' then 'facility'
                           else 'single' end;
            v_from := coalesce((nullif(it->>'valid_from', ''))::date, v_today);
            v_to := (nullif(it->>'valid_to', ''))::date;
            v_status := lower(coalesce(it->>'status', ''));
            v_status := case when v_status in ('active', 'expired', 'suspended') then v_status
                             when v_status ~ '(suspend|hold|frozen)' then 'suspended'
                             when v_status ~ '(expire|lapsed|ended|inactive)' then 'expired'
                             when v_to is not null and v_to < v_today then 'expired'
                             else 'active' end;
            v_gid := public._import_match_profile(it->>'phone', it->>'email');
            select m.* into v_old from public.course_memberships m
             where m.facility_id = v_fac
               and ((v_no is not null and m.member_no = v_no) or (v_gid is not null and m.golfer_id = v_gid)
                    or public._import_norm_name(m.golfer_name) = public._import_norm_name(v_name))
             order by (m.member_no = v_no) desc nulls last, m.created_at limit 1;
            if found then
                perform public._import_record(p_batch, 'course_memberships', v_old.id::text, 'update', to_jsonb(v_old));
                update public.course_memberships m set
                    golfer_name = v_name, golfer_id = coalesce(v_gid, m.golfer_id), member_no = coalesce(v_no, m.member_no),
                    tier = v_tier, home_slug = coalesce(m.home_slug, p_slug), valid_from = least(v_from, m.valid_from), valid_to = v_to,
                    status = v_status, notes = coalesce(nullif(it->>'notes', ''), m.notes), updated_at = now()
                 where m.id = v_old.id;
                v_upd := v_upd + 1;
            else
                insert into public.course_memberships (facility_id, golfer_id, golfer_name, member_no, tier, home_slug, valid_from, valid_to, status, notes)
                values (v_fac, v_gid, v_name, v_no, v_tier, p_slug, v_from, v_to, v_status, nullif(it->>'notes', ''))
                returning id into v_id;
                perform public._import_record(p_batch, 'course_memberships', v_id::text, 'insert', null);
                v_ins := v_ins + 1;
            end if;
            -- the member is a customer of the course too: contact + number into the player book's records
            perform public._import_customer_row(p_batch, v_venue, v_name, v_gid, it->>'phone', it->>'email', it->>'country', v_no, null, null, null,
                                                null, array['member'], null, 'members');
        exception when others then
            v_skip := v_skip + 1;
            notes := notes || jsonb_build_object('i', i, 'msg', left(sqlerrm, 160));
        end;
    end loop;
    return jsonb_build_object('inserted', v_ins, 'updated', v_upd, 'skipped', v_skip, 'notes', notes);
end $$;
revoke all on function public._import_members(uuid, text, text, text, jsonb, jsonb) from public, anon, authenticated;

-- CUSTOMERS. rows: [{i, name, phone, email, country, member_no, visits, first_visit, last_visit, vip, tags:[], note}]
-- opts: venue (CRM venue key)
create or replace function public._import_customers(p_batch uuid, p_course text, p_slug text, p_course_name text, p_rows jsonb, p_opts jsonb)
returns jsonb language plpgsql as $$
declare
    it jsonb; i int; v_ins int := 0; v_upd int := 0; v_skip int := 0; notes jsonb := '[]'::jsonb;
    v_venue text; v_name text; v_gid text; v_tags text[]; v_op text;
begin
    v_venue := coalesce(nullif(p_opts->>'venue', ''), p_slug);
    for it in select * from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) loop
        i := coalesce((it->>'i')::int, 0);
        begin
            v_name := left(btrim(regexp_replace(coalesce(it->>'name', ''), '\s+', ' ', 'g')), 120);
            if v_name = '' then raise exception 'no name'; end if;
            v_gid := public._import_match_profile(it->>'phone', it->>'email');
            v_tags := null;
            if jsonb_typeof(it->'tags') = 'array' then
                select array_agg(left(btrim(x), 40)) into v_tags from jsonb_array_elements_text(it->'tags') x where btrim(x) <> '';
            end if;
            v_op := public._import_customer_row(p_batch, v_venue, v_name, v_gid, it->>'phone', it->>'email', it->>'country', it->>'member_no',
                        (nullif(it->>'visits', ''))::int, (nullif(it->>'first_visit', ''))::date, (nullif(it->>'last_visit', ''))::date,
                        (it->>'vip')::boolean, v_tags, it->>'note', 'customers');
            perform public._import_golfer_note(p_batch, v_venue, v_gid, v_name, (it->>'vip')::boolean, it->>'note');
            if v_op = 'insert' then v_ins := v_ins + 1; else v_upd := v_upd + 1; end if;
        exception when others then
            v_skip := v_skip + 1;
            notes := notes || jsonb_build_object('i', i, 'msg', left(sqlerrm, 160));
        end;
    end loop;
    return jsonb_build_object('inserted', v_ins, 'updated', v_upd, 'skipped', v_skip, 'notes', notes);
end $$;
revoke all on function public._import_customers(uuid, text, text, text, jsonb, jsonb) from public, anon, authenticated;

-- PRODUCTS. rows: [{i, name, category, price, cost, sku, stock, reorder_level, active}]
create or replace function public._import_products(p_batch uuid, p_course text, p_slug text, p_course_name text, p_rows jsonb, p_opts jsonb)
returns jsonb language plpgsql as $$
declare
    it jsonb; i int; v_ins int := 0; v_upd int := 0; v_skip int := 0; notes jsonb := '[]'::jsonb;
    v_name text; v_cat text; v_old public.proshop_products; v_id uuid;
begin
    for it in select * from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) loop
        i := coalesce((it->>'i')::int, 0);
        begin
            v_name := left(btrim(regexp_replace(coalesce(it->>'name', ''), '\s+', ' ', 'g')), 120);
            if v_name = '' then raise exception 'no product name'; end if;
            v_cat := lower(coalesce(it->>'category', ''));
            if v_cat not in ('clubs', 'balls', 'apparel', 'accessories', 'drinks', 'snacks') then v_cat := 'accessories'; end if;
            select p.* into v_old from public.proshop_products p where p.course_id = p_course and p.name = v_name;
            if found then
                perform public._import_record(p_batch, 'proshop_products', v_old.id::text, 'update', to_jsonb(v_old));
                update public.proshop_products p set
                    category = v_cat,
                    price = coalesce((nullif(it->>'price', ''))::numeric, p.price),
                    cost = coalesce((nullif(it->>'cost', ''))::numeric, p.cost),
                    sku = coalesce(nullif(btrim(it->>'sku'), ''), p.sku),
                    stock = coalesce((nullif(it->>'stock', ''))::int, p.stock),
                    reorder_level = coalesce((nullif(it->>'reorder_level', ''))::int, p.reorder_level),
                    active = coalesce((it->>'active')::boolean, p.active),
                    updated_at = now()
                 where p.id = v_old.id;
                v_upd := v_upd + 1;
            else
                insert into public.proshop_products (course_id, name, category, price, cost, sku, stock, reorder_level, active)
                values (p_course, v_name, v_cat, coalesce((nullif(it->>'price', ''))::numeric, 0), (nullif(it->>'cost', ''))::numeric,
                        nullif(btrim(it->>'sku'), ''), greatest(0, coalesce((nullif(it->>'stock', ''))::int, 0)),
                        greatest(0, coalesce((nullif(it->>'reorder_level', ''))::int, 5)), coalesce((it->>'active')::boolean, true))
                returning id into v_id;
                perform public._import_record(p_batch, 'proshop_products', v_id::text, 'insert', null);
                v_ins := v_ins + 1;
            end if;
        exception when others then
            v_skip := v_skip + 1;
            notes := notes || jsonb_build_object('i', i, 'msg', left(sqlerrm, 160));
        end;
    end loop;
    return jsonb_build_object('inserted', v_ins, 'updated', v_upd, 'skipped', v_skip, 'notes', notes);
end $$;
revoke all on function public._import_products(uuid, text, text, text, jsonb, jsonb) from public, anon, authenticated;

create or replace function public._import_log(p_course text, p_batch public.course_import_batches, p_op text)
returns void language plpgsql as $$
declare h jsonb := coalesce(nullif(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
begin
    insert into public.course_change_log (course_key, course_raw, tbl, op, row_id, actor, actor_name, actor_role, ip, ip_country, ua, ident, after)
    values (public.course_key_of(p_course), p_course, 'course_import_batches', p_op, p_batch.id::text,
            public._import_actor(), left(h->>'x-mcp-actor-name', 120), coalesce(nullif(h->>'x-mcp-role', ''), 'proshop'),
            coalesce(h->>'cf-connecting-ip', split_part(h->>'x-forwarded-for', ',', 1)), h->>'cf-ipcountry', left(h->>'user-agent', 200),
            jsonb_build_object('name', p_batch.kind || ' import', 'status', p_batch.status),
            jsonb_build_object('kind', p_batch.kind, 'file', p_batch.file_name, 'rows', p_batch.rows_in, 'inserted', p_batch.inserted,
                               'updated', p_batch.updated, 'skipped', p_batch.skipped, 'status', p_batch.status));
exception when others then null;
end $$;
revoke all on function public._import_log(text, public.course_import_batches, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------------------
-- 5. the browser's three calls
-- ---------------------------------------------------------------------------------------------------------
-- run: one call per chunk (≤ 500 rows); the first call opens the batch, later calls pass p_batch; the last
-- one passes p_final = true. Returns {batch, inserted, updated, skipped, notes, status, totals:{...}}
create or replace function public.course_import_run(p_token text, p_course text, p_slug text, p_course_name text, p_kind text,
                                                    p_rows jsonb, p_opts jsonb default '{}'::jsonb, p_batch uuid default null,
                                                    p_final boolean default true, p_file text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare b public.course_import_batches; r jsonb; v_n int;
begin
    perform public._import_gate(p_token, p_course, p_slug);
    if p_kind not in ('teesheet', 'caddies', 'members', 'customers', 'products') then raise exception 'IMPORT_KIND' using errcode = '22023'; end if;
    v_n := jsonb_array_length(coalesce(p_rows, '[]'::jsonb));
    if v_n > 500 then raise exception 'IMPORT_CHUNK: at most 500 rows per call' using errcode = '22023'; end if;
    if p_batch is null then
        insert into public.course_import_batches (course_id, course_slug, course_name, kind, status, file_name, opts, actor)
        values (p_course, p_slug, p_course_name, p_kind, 'open', left(p_file, 160), coalesce(p_opts, '{}'::jsonb), public._import_actor())
        returning * into b;
    else
        select * into b from public.course_import_batches where id = p_batch and course_id = p_course and kind = p_kind and status = 'open' for update;
        if not found then raise exception 'IMPORT_BATCH: unknown or closed batch' using errcode = '22023'; end if;
    end if;
    r := case p_kind
            when 'teesheet'  then public._import_teesheet(b.id, p_course, p_slug, p_course_name, p_rows, coalesce(p_opts, '{}'::jsonb))
            when 'caddies'   then public._import_caddies(b.id, p_course, p_slug, p_course_name, p_rows, coalesce(p_opts, '{}'::jsonb))
            when 'members'   then public._import_members(b.id, p_course, p_slug, p_course_name, p_rows, coalesce(p_opts, '{}'::jsonb))
            when 'customers' then public._import_customers(b.id, p_course, p_slug, p_course_name, p_rows, coalesce(p_opts, '{}'::jsonb))
            else                  public._import_products(b.id, p_course, p_slug, p_course_name, p_rows, coalesce(p_opts, '{}'::jsonb))
         end;
    update public.course_import_batches x set
        rows_in = x.rows_in + v_n, inserted = x.inserted + (r->>'inserted')::int, updated = x.updated + (r->>'updated')::int,
        skipped = x.skipped + (r->>'skipped')::int,
        notes = case when jsonb_array_length(x.notes) >= 400 then x.notes else x.notes || coalesce(r->'notes', '[]'::jsonb) end,
        status = case when p_final then 'done' else x.status end, done_at = case when p_final then now() else x.done_at end
     where x.id = b.id returning * into b;
    if p_final then perform public._import_log(p_course, b, 'IMPORT'); end if;
    return jsonb_build_object('batch', b.id, 'status', b.status, 'inserted', r->'inserted', 'updated', r->'updated', 'skipped', r->'skipped', 'notes', r->'notes',
                              'totals', jsonb_build_object('rows', b.rows_in, 'inserted', b.inserted, 'updated', b.updated, 'skipped', b.skipped));
end $$;
revoke all on function public.course_import_run(text, text, text, text, text, jsonb, jsonb, uuid, boolean, text) from public;
grant execute on function public.course_import_run(text, text, text, text, text, jsonb, jsonb, uuid, boolean, text) to anon, authenticated;

-- undo: inserted rows go (tee times soft-deleted + their upcoming jobs cancelled so caddies hear it; past jobs removed;
-- a caddie who has CLAIMED an imported roster row keeps it), updated rows take their BEFORE image back.
create or replace function public.course_import_undo(p_token text, p_course text, p_batch uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare b public.course_import_batches; x record; v_done int := 0; v_kept int := 0; v_slug text;
        v_today date := (now() at time zone 'Asia/Bangkok')::date;
begin
    select * into b from public.course_import_batches where id = p_batch and course_id = p_course for update;
    if not found then raise exception 'IMPORT_BATCH: unknown batch' using errcode = '22023'; end if;
    perform public._import_gate(p_token, p_course, b.course_slug);
    if b.status <> 'done' then raise exception 'IMPORT_BATCH: not an imported batch' using errcode = '22023'; end if;
    if not coalesce((b.opts->>'alerts')::boolean, true) then perform set_config('mcp.quiet', '1', true); end if;
    v_slug := b.course_slug;

    -- jobs first (they hang off the tee times), then everything else
    for x in select * from public.course_import_rows r where r.batch_id = b.id
              order by (case r.tbl when 'caddy_bookings' then 0 when 'caddy_work_week' then 1 when 'course_golfer_notes' then 2 else 3 end), r.row_id loop
        begin
            if x.op = 'insert' then
                case x.tbl
                    when 'caddy_bookings' then
                        update public.caddy_bookings set status = 'cancelled', cancelled_at = now(), cancellation_reason = 'Import undone', updated_at = now()
                         where id = x.row_id::uuid and booking_date >= v_today and status <> 'cancelled';
                        delete from public.caddy_bookings where id = x.row_id::uuid and (booking_date < v_today or status = 'cancelled');
                    when 'bookings' then
                        update public.bookings set deleted = true, updated_at = now() where id = x.row_id and not coalesce(deleted, false);
                    when 'caddy_profiles' then
                        -- every real roster row gets an auto account (_caddy_account: user_profiles CADDY-… + a login PIN);
                        -- that goes with the row. A caddie who signed in with LINE since (user_id U…) keeps everything.
                        if exists (select 1 from public.caddy_profiles where id = x.row_id::uuid and user_id is not null and user_id not like 'CADDY-%') then
                            v_kept := v_kept + 1; continue;
                        end if;
                        delete from public.caddy_pin_logins l where l.user_id in (select user_id from public.caddy_profiles where id = x.row_id::uuid and user_id like 'CADDY-%');
                        delete from public.user_profiles u where u.line_user_id in (select user_id from public.caddy_profiles where id = x.row_id::uuid and user_id like 'CADDY-%');
                        delete from public.caddy_work_week where caddy_id = x.row_id::uuid;
                        delete from public.caddy_profiles where id = x.row_id::uuid and (user_id is null or user_id like 'CADDY-%');
                    when 'caddy_work_week' then delete from public.caddy_work_week where caddy_id = x.row_id::uuid;
                    when 'course_memberships' then delete from public.course_memberships where id = x.row_id::uuid;
                    when 'course_customers' then delete from public.course_customers where id = x.row_id::uuid;
                    when 'proshop_products' then delete from public.proshop_products where id = x.row_id::uuid;
                    when 'course_golfer_notes' then
                        delete from public.course_golfer_notes where venue = split_part(x.row_id, '|', 1) and golfer_key = substr(x.row_id, length(split_part(x.row_id, '|', 1)) + 2);
                    else null;
                end case;
            else
                case x.tbl
                    when 'caddy_work_week' then perform public._import_restore('caddy_work_week', 'caddy_id', x.row_id, x.before);
                    when 'course_golfer_notes' then
                        update public.course_golfer_notes n set note = coalesce(x.before->>'note', ''), vip = coalesce((x.before->>'vip')::boolean, false),
                               golfer_name = x.before->>'golfer_name', updated_at = now()
                         where n.venue = split_part(x.row_id, '|', 1) and n.golfer_key = substr(x.row_id, length(split_part(x.row_id, '|', 1)) + 2);
                    when 'caddy_profiles' then
                        if exists (select 1 from public.caddy_profiles where id = x.row_id::uuid and user_id is not null and user_id not like 'CADDY-%') then v_kept := v_kept + 1; continue; end if;
                        perform public._import_restore('caddy_profiles', 'id', x.row_id, x.before - 'id' - 'user_id');
                    else perform public._import_restore(x.tbl, 'id', x.row_id, x.before - 'id');
                end case;
            end if;
            v_done := v_done + 1;
        exception when others then
            v_kept := v_kept + 1;
        end;
    end loop;
    update public.course_import_batches set status = 'undone', undone_at = now() where id = b.id returning * into b;
    perform public._import_log(p_course, b, 'IMPORT_UNDO');
    return jsonb_build_object('batch', b.id, 'status', b.status, 'reverted', v_done, 'kept', v_kept);
end $$;
revoke all on function public.course_import_undo(text, text, uuid) from public;
grant execute on function public.course_import_undo(text, text, uuid) to anon, authenticated;

create or replace function public.course_import_list(p_token text, p_course text, p_slug text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
    perform public._import_gate(p_token, p_course, p_slug);
    return coalesce((select jsonb_agg(jsonb_build_object('id', b.id, 'kind', b.kind, 'status', b.status, 'file', b.file_name, 'rows', b.rows_in,
                                                         'inserted', b.inserted, 'updated', b.updated, 'skipped', b.skipped, 'notes', b.notes,
                                                         'opts', b.opts, 'at', b.created_at, 'undone_at', b.undone_at, 'actor', b.actor) order by b.created_at desc)
                       from (select * from public.course_import_batches where course_id = p_course order by created_at desc limit 60) b), '[]'::jsonb);
end $$;
revoke all on function public.course_import_list(text, text, text) from public;
grant execute on function public.course_import_list(text, text, text) to anon, authenticated;

commit;

-- ---------------------------------------------------------------------------------------------------------
-- 6. v1583 hardening (commit security review, 2026-10-15): bind every write to the course the token (or the
--    open course itself) allows — the slug, the venue key, the facility and the course name are checked or
--    derived server-side, never trusted from the client; customer records are read through a gated RPC.
-- ---------------------------------------------------------------------------------------------------------
begin;

-- the ids this caller may write for p_course: a locked course = its desk token's keys (which must include the
-- course); an open (shared-PIN) course = its own id, its tee sheet slug(s) and their course refs
create or replace function public._import_keys(p_token text, p_course text)
returns text[] language plpgsql stable as $$
declare keys text[]; v_locked boolean;
begin
    if coalesce(p_course, '') = '' then raise exception 'IMPORT_NO_COURSE' using errcode = '22023'; end if;
    v_locked := public._import_course_locked(p_course, null)
             or exists (select 1 from public.course_venues v where v.course_ref = p_course and public._import_course_locked(p_course, v.slug))
             or exists (select 1 from public.course_venues v where v.slug = p_course and public._import_course_locked(coalesce(v.course_ref, p_course), v.slug));
    if v_locked then
        keys := public._desk_keys(p_token);
        if keys is null or not (p_course = any(keys)) then
            raise exception 'IMPORT_TOKEN: this course imports with its own pro shop PIN' using errcode = '42501';
        end if;
        return keys;
    end if;
    select array_remove(array_agg(distinct k), null) into keys from (
        select p_course k
        union select v.slug from public.course_venues v where v.course_ref = p_course
        union select v.course_ref from public.course_venues v where v.slug = p_course
    ) x;
    return keys;
end $$;
revoke all on function public._import_keys(text, text) from public, anon, authenticated;

-- a slug / venue key belongs to the allowed keys: same normalised id, or one is a prefix of the other
-- (burapha ~ burapha-ac, pattaya-golf ~ pattayagolf), never shorter than 5 characters
create or replace function public._import_key_match(p_key text, p_keys text[])
returns boolean language sql immutable as $$
    select coalesce(p_key, '') <> '' and exists (
        select 1 from unnest(coalesce(p_keys, '{}'::text[])) k
         where public.course_key_of(k) = public.course_key_of(p_key)
            or (length(public.course_key_of(p_key)) >= 5 and public.course_key_of(k) like public.course_key_of(p_key) || '%')
            or (length(public.course_key_of(k)) >= 5 and public.course_key_of(p_key) like public.course_key_of(k) || '%'))
$$;
revoke all on function public._import_key_match(text, text[]) from public, anon, authenticated;

create or replace function public._import_gate(p_token text, p_course text, p_slug text)
returns void language plpgsql as $$
declare keys text[];
begin
    keys := public._import_keys(p_token, p_course);
    if coalesce(p_slug, '') <> '' and not (p_slug = any(keys) or public._import_key_match(p_slug, keys)) then
        raise exception 'IMPORT_SCOPE: that tee sheet is not this course' using errcode = '42501';
    end if;
end $$;

-- roster lookup bound to the allowed keys: the course's own rows, or an unplaced row at the same facility name
create or replace function public._import_caddy_by_number(p_course text, p_slug text, p_course_name text, p_num text)
returns public.caddy_profiles language plpgsql stable as $$
declare r public.caddy_profiles; v_num text; keys text[];
begin
    v_num := coalesce(nullif(ltrim(regexp_replace(coalesce(p_num, ''), '\D', '', 'g'), '0'), ''), '0');
    if v_num = '0' then return null; end if;
    keys := coalesce(nullif(current_setting('mcp.import_keys', true), ''), p_course)::text[];
    select cp.* into r from public.caddy_profiles cp
     where not coalesce(cp.is_mock, false) and cp.left_at is null
       and coalesce(nullif(ltrim(coalesce(cp.caddy_number, ''), '0'), ''), '0') = v_num
       and (cp.course_id = any(keys)
            or (coalesce(cp.course_id, '') = '' and p_course_name is not null
                and public.caddy_facility_key(cp.course_name) = public.caddy_facility_key(p_course_name)))
     order by (cp.course_id = p_course) desc, (cp.course_id = p_slug) desc, cp.created_at
     limit 1;
    return r;
end $$;

create or replace function public.course_import_run(p_token text, p_course text, p_slug text, p_course_name text, p_kind text,
                                                    p_rows jsonb, p_opts jsonb default '{}'::jsonb, p_batch uuid default null,
                                                    p_final boolean default true, p_file text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare b public.course_import_batches; r jsonb; v_n int; keys text[]; opts jsonb; v_name text; v_fac text;
begin
    keys := public._import_keys(p_token, p_course);
    perform public._import_gate(p_token, p_course, p_slug);
    perform set_config('mcp.import_keys', keys::text, true);
    if p_kind not in ('teesheet', 'caddies', 'members', 'customers', 'products') then raise exception 'IMPORT_KIND' using errcode = '22023'; end if;
    v_n := jsonb_array_length(coalesce(p_rows, '[]'::jsonb));
    if v_n > 500 then raise exception 'IMPORT_CHUNK: at most 500 rows per call' using errcode = '22023'; end if;
    -- the course name and facility come from the database, the venue key must belong to the course
    select c.name into v_name from public.courses c where c.id = p_course;
    if v_name is null then select v.name into v_name from public.course_venues v where v.slug = coalesce(p_slug, p_course) or v.course_ref = p_course limit 1; end if;
    v_name := coalesce(v_name, left(p_course_name, 120), p_course);
    select fc.facility_id into v_fac from public.facility_courses fc where fc.course_ref = p_course or fc.slug = coalesce(p_slug, p_course) limit 1;
    opts := coalesce(p_opts, '{}'::jsonb) - 'facility_id' - 'venue';
    if v_fac is not null then opts := opts || jsonb_build_object('facility_id', v_fac); end if;
    if coalesce(p_opts->>'venue', '') <> '' then
        if not public._import_key_match(p_opts->>'venue', keys) then raise exception 'IMPORT_SCOPE: that venue is not this course' using errcode = '42501'; end if;
        opts := opts || jsonb_build_object('venue', left(p_opts->>'venue', 80));
    end if;
    if p_batch is null then
        insert into public.course_import_batches (course_id, course_slug, course_name, kind, status, file_name, opts, actor)
        values (p_course, p_slug, v_name, p_kind, 'open', left(p_file, 160), opts, public._import_actor())
        returning * into b;
    else
        select * into b from public.course_import_batches where id = p_batch and course_id = p_course and kind = p_kind and status = 'open' for update;
        if not found then raise exception 'IMPORT_BATCH: unknown or closed batch' using errcode = '22023'; end if;
    end if;
    r := case p_kind
            when 'teesheet'  then public._import_teesheet(b.id, p_course, p_slug, v_name, p_rows, opts)
            when 'caddies'   then public._import_caddies(b.id, p_course, p_slug, v_name, p_rows, opts)
            when 'members'   then public._import_members(b.id, p_course, p_slug, v_name, p_rows, opts)
            when 'customers' then public._import_customers(b.id, p_course, p_slug, v_name, p_rows, opts)
            else                  public._import_products(b.id, p_course, p_slug, v_name, p_rows, opts)
         end;
    update public.course_import_batches x set
        rows_in = x.rows_in + v_n, inserted = x.inserted + (r->>'inserted')::int, updated = x.updated + (r->>'updated')::int,
        skipped = x.skipped + (r->>'skipped')::int,
        notes = case when jsonb_array_length(x.notes) >= 400 then x.notes else x.notes || coalesce(r->'notes', '[]'::jsonb) end,
        status = case when p_final then 'done' else x.status end, done_at = case when p_final then now() else x.done_at end
     where x.id = b.id returning * into b;
    if p_final then perform public._import_log(p_course, b, 'IMPORT'); end if;
    return jsonb_build_object('batch', b.id, 'status', b.status, 'inserted', r->'inserted', 'updated', r->'updated', 'skipped', r->'skipped', 'notes', r->'notes',
                              'totals', jsonb_build_object('rows', b.rows_in, 'inserted', b.inserted, 'updated', b.updated, 'skipped', b.skipped));
end $$;

-- customer records: no browser SELECT; the player book reads them through this gate
drop policy if exists course_customers_select on public.course_customers;
revoke select on public.course_customers from anon, authenticated;
revoke all on public.course_customers from public, anon, authenticated;   -- also the default TRUNCATE / REFERENCES / TRIGGER grants
create or replace function public.course_customers_list(p_token text, p_course text, p_slug text, p_venue text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare keys text[]; v_course text;
begin
    v_course := coalesce(nullif(p_course, ''), (select v.course_ref from public.course_venues v where v.slug = p_slug), p_slug);
    keys := public._import_keys(p_token, v_course);
    if coalesce(p_slug, '') <> '' and not (p_slug = any(keys) or public._import_key_match(p_slug, keys)) then
        raise exception 'IMPORT_SCOPE' using errcode = '42501';
    end if;
    if not public._import_key_match(p_venue, keys) then raise exception 'IMPORT_SCOPE' using errcode = '42501'; end if;
    return coalesce((select jsonb_agg(to_jsonb(c) - 'batch_id' - 'created_at' - 'updated_at' - 'source' order by c.name)
                       from (select * from public.course_customers where venue = p_venue limit 20000) c), '[]'::jsonb);
end $$;
revoke all on function public.course_customers_list(text, text, text, text) from public;
grant execute on function public.course_customers_list(text, text, text, text) to anon, authenticated;

commit;
