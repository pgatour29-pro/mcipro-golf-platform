-- PRO SHOP TEE SHEET: no double bookings, no lost updates (2026-09-26, Pete: "complete the tee sheet fix").
-- Before: every change re-wrote the WHOLE day from the device's own copy (proshop-teesheet.html setDay):
-- a stale copy reverted other devices' moves, revived bookings they cancelled (deleted:false), and two
-- devices could fill one tee time twice. Nothing in the DB stopped any of it.
--
-- 1. TEE TIME CAPACITY — at most 4 golfers per tee time (course, date, time, sheet course, tee/col),
--    summed over every live tee-sheet / hot-deal booking in it. A CONSTRAINT trigger, DEFERRED to
--    commit, under a per-slot advisory lock: claim_hot_deal inserts the buyer's row and THEN shrinks the
--    "HOT DEAL · N left" hold in the same transaction — checked at commit the slot is consistent.
-- 2. teesheet_save() — THE tee sheet write path. Writes ONLY the bookings the device changed, each ONLY
--    if its updated_at still equals the version the device loaded (optimistic lock). Stale = conflict,
--    reported back per booking; the device reloads and says so. Per-row outcomes (savepoints).

create or replace function public.teesheet_slot_key(b public.bookings)
returns text language sql immutable as $$
    select coalesce(b.course_id, '') || '|' || b.date::text || '|' || left(coalesce(b.time, ''), 5) || '|'
        || coalesce(b.tee_sheet_course, '') || '|' || coalesce(b.tee_number::text, 'c' || coalesce(b.booking_data->>'col', ''))
$$;

create or replace function public.bookings_teetime_capacity()
returns trigger language plpgsql as $$
declare v_key text; v_n int;
begin
    if new.kind is distinct from 'tee' or coalesce(new.deleted, false) or new.date is null or new.time is null
       or coalesce(new.source, '') not in ('teesheet', 'hotdeal') then return null; end if;
    v_key := public.teesheet_slot_key(new);
    perform pg_advisory_xact_lock(hashtext('teeslot:' || v_key));
    select coalesce(sum(greatest(coalesce(b.players, 1), 1)), 0) into v_n
      from public.bookings b
     where b.kind = 'tee' and not coalesce(b.deleted, false)
       and coalesce(b.source, '') in ('teesheet', 'hotdeal')
       and b.date = new.date and left(coalesce(b.time, ''), 5) = left(new.time, 5)
       and public.teesheet_slot_key(b) = v_key;
    if v_n > 4 then
        raise exception 'TEE_SLOT_FULL: % golfers in the % tee time — max 4', v_n, left(new.time, 5)
            using errcode = '23P01';
    end if;
    return null;
end $$;

drop trigger if exists trg_bookings_teetime_capacity on public.bookings;
create constraint trigger trg_bookings_teetime_capacity
    after insert or update on public.bookings
    deferrable initially deferred
    for each row execute function public.bookings_teetime_capacity();

create index if not exists bookings_teesheet_slot_idx on public.bookings (date, time) where kind = 'tee' and not coalesce(deleted, false);

-- p_upserts: [{ "row": {bookings columns}, "expected": "<updated_at the device loaded>" | null }]
-- p_deletes: [{ "id": "...", "expected": "<updated_at>" }]
-- returns { "versions": {id: updated_at}, "conflicts": [{id, reason}], "errors": [{id, message}] }
create or replace function public.teesheet_save(p_upserts jsonb, p_deletes jsonb)
returns jsonb language plpgsql as $$
declare
    it jsonb; r jsonb; v_id text; v_exp timestamptz; cur record; v_new timestamptz;
    versions jsonb := '{}'::jsonb; conflicts jsonb := '[]'::jsonb; errors jsonb := '[]'::jsonb;
begin
    for it in select * from jsonb_array_elements(coalesce(p_upserts, '[]'::jsonb)) loop
        r := it->'row'; v_id := r->>'id';
        v_exp := nullif(it->>'expected', '')::timestamptz;
        begin
            select id, updated_at, deleted into cur from public.bookings where id = v_id for update;
            if found then
                if v_exp is null or cur.updated_at is distinct from v_exp then
                    conflicts := conflicts || jsonb_build_object('id', v_id, 'reason',
                        case when coalesce(cur.deleted, false) then 'deleted' else 'changed' end);
                    continue;
                end if;
                update public.bookings b set
                    date = (r->>'date')::date, time = r->>'time', tee_time = r->>'tee_time',
                    name = r->>'name', golfer_name = r->>'golfer_name', golfer_id = r->>'golfer_id',
                    players = (r->>'players')::int, group_id = r->>'group_id', kind = r->>'kind',
                    booking_type = r->>'booking_type', tee_sheet_course = r->>'tee_sheet_course',
                    tee_number = (r->>'tee_number')::int, course_id = r->>'course_id', course_name = r->>'course_name',
                    notes = r->>'notes', status = r->>'status', source = r->>'source', is_vip = (r->>'is_vip')::boolean,
                    caddie_id = r->>'caddie_id', caddy_number = r->>'caddy_number', caddie_name = r->>'caddie_name',
                    caddie_status = r->>'caddie_status', deleted = false, booking_data = r->'booking_data',
                    updated_at = now()
                 where b.id = v_id returning b.updated_at into v_new;
            else
                if v_exp is not null then
                    conflicts := conflicts || jsonb_build_object('id', v_id, 'reason', 'deleted');
                    continue;
                end if;
                insert into public.bookings (id, date, time, tee_time, name, golfer_name, golfer_id, players, group_id,
                    kind, booking_type, tee_sheet_course, tee_number, course_id, course_name, notes, status, source,
                    is_vip, caddie_id, caddy_number, caddie_name, caddie_status, deleted, booking_data, created_at, updated_at)
                values (v_id, (r->>'date')::date, r->>'time', r->>'tee_time', r->>'name', r->>'golfer_name',
                    r->>'golfer_id', (r->>'players')::int, r->>'group_id', r->>'kind', r->>'booking_type',
                    r->>'tee_sheet_course', (r->>'tee_number')::int, r->>'course_id', r->>'course_name', r->>'notes',
                    r->>'status', r->>'source', (r->>'is_vip')::boolean, r->>'caddie_id', r->>'caddy_number',
                    r->>'caddie_name', r->>'caddie_status', false, r->'booking_data', now(), now())
                returning updated_at into v_new;
            end if;
            set constraints trg_bookings_teetime_capacity immediate;   -- capacity per booking, inside its savepoint
            set constraints trg_bookings_teetime_capacity deferred;
            versions := versions || jsonb_build_object(v_id, v_new);
        exception when others then
            errors := errors || jsonb_build_object('id', v_id, 'message', sqlerrm);
        end;
    end loop;

    for it in select * from jsonb_array_elements(coalesce(p_deletes, '[]'::jsonb)) loop
        v_id := it->>'id'; v_exp := nullif(it->>'expected', '')::timestamptz;
        select id, updated_at, deleted into cur from public.bookings where id = v_id for update;
        if not found or coalesce(cur.deleted, false) then continue; end if;   -- already gone: nothing to do
        if v_exp is null or cur.updated_at is distinct from v_exp then
            conflicts := conflicts || jsonb_build_object('id', v_id, 'reason', 'changed');
            continue;
        end if;
        update public.bookings set deleted = true, updated_at = now() where id = v_id;
    end loop;

    return jsonb_build_object('versions', versions, 'conflicts', conflicts, 'errors', errors);
end $$;
