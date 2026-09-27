-- QR GUEST VENUE PAGE (2026-09-27) — /q/<venue>: golfers who never install the app scan a venue's
-- permanent QR, type name + handicap + phone once, then register for society events at that venue
-- and request caddies there. Pete: registration goes straight in (no approval); one permanent QR per
-- venue that always lists what's coming up.
--
-- Identity: a QR guest is a normal guest player (user_profiles row, id 'QR-GUEST-…' — matches the
-- first-login claim matcher's '%-GUEST-%'), remembered on the phone by a random secret. The DB keeps
-- only its sha256. Every write below goes through a SECURITY DEFINER function that checks that
-- secret, so one QR guest can never touch another's registrations or caddy requests.
-- Capacity (trg_event_reg_capacity_gate) and caddy clashes (trg_caddy_bookings_no_clash) are the
-- same DB gates the app hits — nothing is re-implemented here.


create table if not exists public.qr_guests (
    guest_id    text primary key,
    name        text not null,
    phone       text not null,          -- digits only, country code first (66812345678)
    handicap    numeric,
    created_at  timestamptz not null default now(),
    last_seen_at timestamptz not null default now()
);
create index if not exists qr_guests_phone_idx on public.qr_guests (phone);

create table if not exists public.qr_guest_tokens (
    token_hash  text primary key,
    guest_id    text not null references public.qr_guests(guest_id) on delete cascade,
    created_at  timestamptz not null default now()
);
create index if not exists qr_guest_tokens_guest_idx on public.qr_guest_tokens (guest_id);

-- RLS on + NO policies = only the definer functions below can read/write these tables.
alter table public.qr_guests enable row level security;
alter table public.qr_guest_tokens enable row level security;

-- ---------------------------------------------------------------- helpers
create or replace function public._qr_guest_of(p_token text) returns public.qr_guests
language plpgsql security definer set search_path = public as $$
declare g public.qr_guests;
begin
    if p_token is null or length(p_token) < 32 then raise exception 'QR_AUTH: sign in again'; end if;
    select q.* into g from public.qr_guest_tokens t join public.qr_guests q on q.guest_id = t.guest_id
     where t.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');
    if not found then raise exception 'QR_AUTH: sign in again'; end if;
    update public.qr_guests set last_seen_at = now() where guest_id = g.guest_id;
    return g;
end $$;

create or replace function public._qr_bkk_now() returns timestamp
language sql stable as $$ select (now() at time zone 'Asia/Bangkok') $$;

create or replace function public._qr_is_trgg(e public.society_events) returns boolean
language sql stable as $$
    select e.society_id in ('7c0e4b72-d925-44bc-afda-38259a7ba346'::uuid)
        or e.society_id::text like '17451cf3-%'
        or lower(coalesce(e.title, '') || ' ' || coalesce(e.organizer_name, '')) ~ '(trgg|travellers rest)'
$$;

-- ---------------------------------------------------------------- 1. start / resume
-- Same name + same phone = the same guest (one row on the organizer's list, not one per phone).
create or replace function public.qr_guest_start(p_name text, p_handicap numeric, p_phone text, p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
    v_name text := regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g');
    v_phone text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
    v_hcp numeric := p_handicap;
    v_id text;
begin
    if length(v_name) < 2 or length(v_name) > 60 then raise exception 'QR_INPUT: name'; end if;
    if v_phone ~ '^0\d{8,9}$' then v_phone := '66' || substr(v_phone, 2); end if;   -- Thai local → +66
    if length(v_phone) < 8 or length(v_phone) > 15 then raise exception 'QR_INPUT: phone'; end if;
    if v_hcp is not null and (v_hcp < -10 or v_hcp > 54) then raise exception 'QR_INPUT: handicap'; end if;
    if p_token is null or length(p_token) < 32 or length(p_token) > 200 then raise exception 'QR_INPUT: token'; end if;

    select guest_id into v_id from public.qr_guests
     where phone = v_phone and lower(name) = lower(v_name) limit 1;
    if v_id is null then
        v_id := 'QR-GUEST-' || (extract(epoch from clock_timestamp()) * 1000)::bigint || '-' || substr(md5(random()::text), 1, 4);
        insert into public.qr_guests (guest_id, name, phone, handicap) values (v_id, v_name, v_phone, v_hcp);
    else
        update public.qr_guests set handicap = coalesce(v_hcp, handicap), last_seen_at = now() where guest_id = v_id;
    end if;

    -- findable guest profile (insert-or-skip, same shape as every other guest add)
    insert into public.user_profiles (line_user_id, name, role, handicap_index, phone, profile_data)
    values (v_id, v_name, 'golfer', v_hcp, '+' || v_phone,
            jsonb_build_object('name', v_name, 'handicap', v_hcp, 'golfInfo', jsonb_build_object('handicap', v_hcp),
                               'isGuest', true, 'addedVia', 'qr-guest', 'phone', '+' || v_phone))
    on conflict (line_user_id) do update
        set handicap_index = coalesce(excluded.handicap_index, public.user_profiles.handicap_index);

    insert into public.qr_guest_tokens (token_hash, guest_id)
    values (encode(extensions.digest(p_token, 'sha256'), 'hex'), v_id)
    on conflict (token_hash) do nothing;

    return jsonb_build_object('guest_id', v_id, 'name', v_name, 'handicap', v_hcp, 'phone', '+' || v_phone);
end $$;

-- ---------------------------------------------------------------- 2. upcoming events (all venues)
-- The page matches venue by course-name TOKENS client-side with the same CourseLink table the pro shop
-- tee sheet uses (course_id is never written by TRGG). Private events never leave the DB.
create or replace function public.qr_upcoming_events(p_token text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_gid text; v_now timestamp := public._qr_bkk_now();
begin
    if p_token is not null then
        begin v_gid := (public._qr_guest_of(p_token)).guest_id; exception when others then v_gid := null; end;
    end if;
    return coalesce((
        select jsonb_agg(s.x order by s.x->>'event_date', s.x->>'start_time') from (
            select jsonb_build_object(
                'id', e.id, 'title', e.title, 'event_date', e.event_date, 'start_time', e.start_time,
                'departure_time', e.departure_time, 'course_name', e.course_name, 'format', e.format,
                'society_id', e.society_id, 'society_name', coalesce(sp.society_name, e.organizer_name),
                'society_logo', sp.society_logo,
                'entry_fee', coalesce(nullif(e.member_fee, 0), e.entry_fee, 0), 'non_member_fee', coalesce(e.non_member_fee, 0),
                'transport_fee', coalesce(e.transport_fee, 0), 'competition_fee', coalesce(e.competition_fee, 0),
                'is_trgg', public._qr_is_trgg(e),
                'cutoff', coalesce(e.registration_cutoff, e.registration_close_date),
                'capacity', public.event_capacity(e.id::text),
                'regs', (select count(*) from public.event_registrations r where r.event_id = e.id and coalesce(r.status, 'registered') <> 'cancelled'),
                'mine', case when v_gid is null then null else (
                    select jsonb_build_object('reg_id', r.id, 'total_fee', r.total_fee, 'want_transport', r.want_transport,
                                              'want_competition', r.want_competition, 'caddy_numbers', r.caddy_numbers)
                      from public.event_registrations r where r.event_id = e.id and r.player_id = v_gid limit 1) end
            ) x
            from public.society_events e
            left join public.society_profiles sp on sp.id = e.society_id
            where e.event_date between v_now::date and v_now::date + 60
              and coalesce(e.status, '') <> 'cancelled'
              and coalesce(e.is_private, false) = false
              and (e.event_date > v_now::date or e.start_time is null or e.start_time > v_now::time)
            limit 400
        ) s
    ), '[]'::jsonb);
end $$;

-- ---------------------------------------------------------------- 3. register (straight in)
create or replace function public.qr_register(p_token text, p_event_id uuid, p_transport boolean, p_competition boolean, p_want_caddy boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
    g public.qr_guests := public._qr_guest_of(p_token);
    e public.society_events; v_now timestamp := public._qr_bkk_now();
    v_base numeric; v_tf numeric; v_cf numeric; v_trgg boolean; v_comp boolean; v_fee numeric;
    v_sr jsonb; v_row public.event_registrations;
begin
    select * into e from public.society_events where id = p_event_id;
    if not found or coalesce(e.status, '') = 'cancelled' or coalesce(e.is_private, false) then raise exception 'QR_EVENT: not open'; end if;
    if e.event_date < v_now::date or (e.event_date = v_now::date and e.start_time is not null and e.start_time <= v_now::time) then
        raise exception 'QR_EVENT: already played';
    end if;
    if coalesce(e.registration_cutoff, e.registration_close_date) is not null
       and coalesce(e.registration_cutoff, e.registration_close_date) < now() then
        raise exception 'QR_CUTOFF: registration closed';
    end if;

    -- window.eventAddOnFees + SocietyGolfSupabase.registerPlayer, guest (non-member) branch
    v_base := coalesce(nullif(e.member_fee, 0), e.entry_fee, 0);
    v_tf := coalesce(e.transport_fee, 0); v_cf := coalesce(e.competition_fee, 0);
    if v_base > 0 then v_tf := coalesce(nullif(v_tf, 0), 300); v_cf := coalesce(nullif(v_cf, 0), 250); end if;
    v_trgg := public._qr_is_trgg(e);
    v_comp := v_trgg or coalesce(p_competition, false);          -- TRGG: competition is mandatory
    v_fee := v_base + coalesce(e.non_member_fee, 0)
           + case when coalesce(p_transport, false) then v_tf else 0 end
           + case when v_comp then v_cf else 0 end
           + case when v_trgg then 100 else 0 end;               -- TRGG flat guest surcharge
    v_sr := jsonb_build_object('qr', true, 'phone', '+' || g.phone, 'wantCaddy', coalesce(p_want_caddy, false))
            || case when v_trgg then jsonb_build_object('nonMember', true) else '{}'::jsonb end;

    begin
        insert into public.event_registrations (id, event_id, player_name, player_id, handicap, partner_prefs,
                    want_transport, want_competition, total_fee, caddy_numbers, special_requests)
        values (gen_random_uuid(), e.id, g.name, g.guest_id, g.handicap, '{}',
                coalesce(p_transport, false), v_comp, v_fee, '', v_sr)
        on conflict (event_id, player_id) do update
            set want_transport = excluded.want_transport, want_competition = excluded.want_competition,
                total_fee = excluded.total_fee,
                special_requests = coalesce(public.event_registrations.special_requests, '{}'::jsonb) || excluded.special_requests,
                updated_at = now()
        returning * into v_row;
    exception when others then
        if sqlerrm like 'EVENT_FULL%' then return jsonb_build_object('ok', false, 'full', true); end if;
        raise;
    end;

    -- TRGG directory: every name that enters a TRGG event is findable afterwards (Pete 2026-08-07)
    if v_trgg and not exists (select 1 from public.society_members
                               where society_id = '7c0e4b72-d925-44bc-afda-38259a7ba346'::uuid and golfer_id = g.guest_id) then
        insert into public.society_members (id, society_id, golfer_id, role, status, notes)
        values (gen_random_uuid(), '7c0e4b72-d925-44bc-afda-38259a7ba346'::uuid, g.guest_id, 'member', 'active', 'Auto-added from QR guest registration');
    end if;

    return jsonb_build_object('ok', true, 'reg_id', v_row.id, 'total_fee', v_row.total_fee);
end $$;

-- ---------------------------------------------------------------- 4. cancel registration
create or replace function public.qr_cancel_registration(p_token text, p_event_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.qr_guests := public._qr_guest_of(p_token); e public.society_events; v_n int;
begin
    select * into e from public.society_events where id = p_event_id;
    if not found then raise exception 'QR_EVENT: not found'; end if;
    if coalesce(e.registration_cutoff, e.registration_close_date) is not null
       and coalesce(e.registration_cutoff, e.registration_close_date) < now() then
        raise exception 'QR_CUTOFF: too late to cancel here, contact the organizer';
    end if;
    delete from public.event_registrations where event_id = e.id and player_id = g.guest_id
       and coalesce(payment_status, '') not in ('paid') and not coalesce(checked_in, false);
    get diagnostics v_n = row_count;
    if v_n = 0 then raise exception 'QR_EVENT: nothing to cancel'; end if;

    -- a deleted player must never linger in event_pairings.groups (prunePlayersFromPairings, both shapes)
    update public.event_pairings p set groups = (
        select coalesce(jsonb_agg(case
            when jsonb_typeof(grp) = 'array' then coalesce((select jsonb_agg(pl) from jsonb_array_elements(grp) pl
                                                             where coalesce(pl->>'playerId', pl->>'id', '') <> g.guest_id), '[]'::jsonb)
            else jsonb_set(grp, '{players}', coalesce((select jsonb_agg(pl) from jsonb_array_elements(coalesce(grp->'players', '[]'::jsonb)) pl
                                                        where coalesce(pl->>'playerId', pl->>'id', '') <> g.guest_id), '[]'::jsonb))
            end), '[]'::jsonb)
        from jsonb_array_elements(p.groups) grp)
     where p.event_id::text = e.id::text and jsonb_typeof(p.groups) = 'array' and p.groups::text like '%' || g.guest_id || '%';

    -- the caddy they asked for with this game goes too
    update public.caddy_bookings set status = 'cancelled', cancelled_at = now(), cancellation_reason = 'QR guest cancelled registration', updated_at = now()
     where golfer_id = g.guest_id and booking_date = e.event_date and status <> 'cancelled' and booking_source = 'qr_guest'
       and special_requests = e.title;
    return jsonb_build_object('ok', true);
end $$;

-- ---------------------------------------------------------------- 5. caddy roster + busy windows
-- v1247 privacy: WHO booked a caddy never leaves the DB — only blocked windows.
create or replace function public.qr_venue_caddies(p_course_ids text[], p_name_prefix text, p_date date)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
    if p_date is null or coalesce(array_length(p_course_ids, 1), 0) = 0 and coalesce(p_name_prefix, '') = '' then return '[]'::jsonb; end if;
    return coalesce((
        select jsonb_agg(jsonb_build_object(
            'id', c.id, 'caddy_number', c.caddy_number, 'name', c.name, 'photo_url', c.photo_url,
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
          and nullif(btrim(c.name), '') is not null and c.name !~* '^caddy\s*#'       -- number + name + course, always (v1369)
          and (c.course_id = any(coalesce(p_course_ids, '{}')) or (coalesce(p_name_prefix, '') <> '' and c.course_name ilike p_name_prefix || '%'))
    ), '[]'::jsonb);
end $$;

-- ---------------------------------------------------------------- 6. request a caddy (pending → pro shop confirms)
create or replace function public.qr_book_caddy(p_token text, p_caddy_id uuid, p_date date, p_time text, p_course_slug text, p_event_id uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
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
end $$;

-- ---------------------------------------------------------------- 7. cancel a caddy request (golfer CAN — v1236)
create or replace function public.qr_cancel_caddy(p_token text, p_booking_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.qr_guests := public._qr_guest_of(p_token); b public.caddy_bookings;
begin
    update public.caddy_bookings set status = 'cancelled', cancelled_at = now(), cancellation_reason = 'QR guest cancelled', updated_at = now()
     where id = p_booking_id and golfer_id = g.guest_id and status <> 'cancelled'
    returning * into b;
    if not found then raise exception 'QR_CADDY: nothing to cancel'; end if;
    if b.special_requests is not null then
        update public.event_registrations r set caddy_numbers = '', updated_at = now()
          from public.society_events e
         where e.id = r.event_id and e.event_date = b.booking_date and e.title = b.special_requests and r.player_id = g.guest_id;
    end if;
    return jsonb_build_object('ok', true);
end $$;

-- ---------------------------------------------------------------- 8. my bookings
create or replace function public.qr_guest_me(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.qr_guests := public._qr_guest_of(p_token); v_now timestamp := public._qr_bkk_now();
begin
    return jsonb_build_object(
        'guest', jsonb_build_object('guest_id', g.guest_id, 'name', g.name, 'handicap', g.handicap, 'phone', '+' || g.phone),
        'caddies', coalesce((
            select jsonb_agg(jsonb_build_object('id', b.id, 'booking_date', b.booking_date, 'tee_time', to_char(coalesce(b.tee_time, b.start_time), 'HH24:MI'),
                    'status', b.status, 'course_name', b.course_name, 'event_title', b.special_requests,
                    'caddy_number', c.caddy_number, 'caddy_name', c.name, 'photo_url', c.photo_url) order by b.booking_date, b.tee_time)
              from public.caddy_bookings b left join public.caddy_profiles c on c.id = b.caddy_id
             where b.golfer_id = g.guest_id and b.status <> 'cancelled' and b.booking_date >= v_now::date), '[]'::jsonb)
    );
end $$;

revoke all on function public._qr_guest_of(text) from public, anon, authenticated;
grant execute on function public.qr_guest_start(text, numeric, text, text) to anon, authenticated;
grant execute on function public.qr_upcoming_events(text) to anon, authenticated;
grant execute on function public.qr_register(text, uuid, boolean, boolean, boolean) to anon, authenticated;
grant execute on function public.qr_cancel_registration(text, uuid) to anon, authenticated;
grant execute on function public.qr_venue_caddies(text[], text, date) to anon, authenticated;
grant execute on function public.qr_book_caddy(text, uuid, date, text, text, uuid) to anon, authenticated;
grant execute on function public.qr_cancel_caddy(text, uuid) to anon, authenticated;
grant execute on function public.qr_guest_me(text) to anon, authenticated;
