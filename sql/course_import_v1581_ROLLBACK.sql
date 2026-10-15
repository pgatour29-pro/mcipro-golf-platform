-- ROLLBACK for sql/course_import_v1581.sql (course data import). Drops the import RPCs, helpers, the batch tables,
-- the change-log triggers added to proshop_products / course_customers and the course_customers table itself
-- (its rows came only from imports), and restores caddy_job_alert WITHOUT the mcp.quiet switch (the live
-- definition as dumped 2026-10-15 before the change). The course_memberships FK to facilities is NOT re-added
-- here: plain-course memberships (facility_id = courses.id) would violate it — re-add by hand once those rows
-- are gone:  alter table public.course_memberships add constraint course_memberships_facility_id_fkey
--            foreign key (facility_id) references public.facilities(id) on delete cascade;
begin;

drop function if exists public.course_import_run(text, text, text, text, text, jsonb, jsonb, uuid, boolean, text);
drop function if exists public.course_import_undo(text, text, uuid);
drop function if exists public.course_import_list(text, text, text);
drop function if exists public._import_log(text, public.course_import_batches, text);
drop function if exists public._import_products(uuid, text, text, text, jsonb, jsonb);
drop function if exists public._import_customers(uuid, text, text, text, jsonb, jsonb);
drop function if exists public._import_members(uuid, text, text, text, jsonb, jsonb);
drop function if exists public._import_golfer_note(uuid, text, text, text, boolean, text);
drop function if exists public._import_customer_row(uuid, text, text, text, text, text, text, text, int, date, date, boolean, text[], text, text);
drop function if exists public._import_caddies(uuid, text, text, text, jsonb, jsonb);
drop function if exists public._import_teesheet(uuid, text, text, text, jsonb, jsonb);
drop function if exists public._import_caddy_by_number(text, text, text, text);
drop function if exists public._import_restore(text, text, text, jsonb);
drop function if exists public._import_record(uuid, text, text, text, jsonb);
drop function if exists public._import_norm_name(text);
drop function if exists public._import_match_profile(text, text);
drop function if exists public._import_actor();
drop function if exists public._import_gate(text, text, text);
drop function if exists public._import_course_locked(text, text);

drop trigger if exists course_change_log_trg on public.proshop_products;
drop trigger if exists course_change_log_trg on public.course_customers;
drop table if exists public.course_import_rows;
drop table if exists public.course_import_batches;
drop table if exists public.course_customers;

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

commit;
