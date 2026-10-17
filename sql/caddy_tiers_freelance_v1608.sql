-- v1608 (Pete 2026-10-17): caddy tiers the course manages itself + FREELANCE caddies (decline/cancel their own jobs).
-- Also: golfer_set_booking_caddy is caddy-pool aware (v1607 Barcelona gap). Rollback: caddy_tiers_freelance_v1608_ROLLBACK.sql
begin;
-- ---------------------------------------------------------------- freelance caddies
-- Pete 2026-10-17: "some courses such as Barcelona have freelance caddies that wear and work at the 3 courses but are not
-- employees so they don't have to follow all of the booking rules. any freelance caddies for any golf courses have the
-- ability to decline or cancel a caddy assignment and only applies to these set of caddies."
-- The course marks a caddy freelance (caddy_roster_set / staff caddy_profile_write); she can never mark herself.
alter table public.caddy_profiles add column if not exists is_freelance boolean not null default false;

-- every freelance decline/cancel, for the pro shop (and so a dropped job is never a mystery)
create table if not exists public.caddy_job_drops (
  id           uuid primary key default gen_random_uuid(),
  booking_id   uuid not null,
  caddy_id     uuid,
  caddy_number text,
  caddy_name   text,
  action       text not null check (action in ('decline', 'cancel')),
  reason       text,
  course_id    text,
  course_name  text,
  booking_date date,
  tee_time     time,
  golfer_id    text,
  golfer_name  text,
  created_at   timestamptz not null default now()
);
create index if not exists idx_caddy_job_drops_course on public.caddy_job_drops (course_id, created_at desc);
create index if not exists idx_caddy_job_drops_caddy on public.caddy_job_drops (caddy_id, created_at desc);
alter table public.caddy_job_drops enable row level security;
drop policy if exists caddy_job_drops_read on public.caddy_job_drops;
create policy caddy_job_drops_read on public.caddy_job_drops for select using (true);   -- written only by caddy_freelance_drop
grant select on public.caddy_job_drops to anon, authenticated;

-- a course desk token covers a caddy when it covers her course or a sister course of the same caddy pool
create or replace function public._caddy_course_ok(p_token text, p_course_id text, p_course_name text) returns boolean
language sql stable security definer set search_path = public as $$
  select public._offer_course_ok(p_token, p_course_id)
      or (public.caddy_facility_key(coalesce(p_course_name, p_course_id)) <> ''
          and exists (select 1 from unnest(coalesce(public._desk_keys(p_token), '{}'::text[])) k
                        left join public.courses c on c.id = k
                       where public.caddy_facility_key(coalesce(c.name, k)) = public.caddy_facility_key(coalesce(p_course_name, p_course_id))))
$$;
revoke all on function public._caddy_course_ok(text, text, text) from public, anon, authenticated;

-- the course puts a caddy in a tier / marks her freelance (pro shop PIN; same refusal text OfferGate already handles)
create or replace function public.caddy_roster_set(p_token text, p_caddy_id uuid, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare cp public.caddy_profiles%rowtype; v_tier text;
begin
  select * into cp from public.caddy_profiles where id = p_caddy_id for update;
  if not found or coalesce(cp.is_mock, false) then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if not public._caddy_course_ok(p_token, cp.course_id, cp.course_name) then
    raise exception 'OFFER_COURSE: only her own course can change a caddy''s tier or freelance status — sign in with its pro shop PIN' using errcode = '42501';
  end if;
  if jsonb_typeof(p) <> 'object' then raise exception 'caddy_roster_set: bad request' using errcode = '22023'; end if;
  if p ? 'tier_code' then
    v_tier := nullif(btrim(coalesce(p->>'tier_code', '')), '');
    if v_tier is not null and not exists (
        select 1 from public.caddy_tiers t where t.code = v_tier and t.is_active
           and (t.course_id = cp.course_id or t.course_name = cp.course_name
                or public.caddy_facility_key(t.course_name) = public.caddy_facility_key(cp.course_name))) then
      raise exception 'TIER_UNKNOWN: that tier is not one of this course''s tiers' using errcode = '22023';
    end if;
    update public.caddy_profiles set tier_code = v_tier, updated_at = now() where id = cp.id;
  end if;
  if p ? 'is_freelance' then
    update public.caddy_profiles set is_freelance = coalesce((p->>'is_freelance')::boolean, false), updated_at = now() where id = cp.id;
  end if;
  return jsonb_build_object('ok', true, 'id', cp.id);
end $$;
revoke all on function public.caddy_roster_set(text, uuid, jsonb) from public;
grant execute on function public.caddy_roster_set(text, uuid, jsonb) to anon, authenticated;

-- the course's own tier levels (caddy_tiers stays read-only to the app; this is the only write path)
create or replace function public.caddy_tier_save(p_token text, p jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_course text := nullif(btrim(coalesce(p->>'course_id', '')), '');
        v_cname text; v_id uuid; v_code text; v_label text := left(nullif(btrim(coalesce(p->>'label', '')), ''), 40);
        v_accent text := coalesce(nullif(p->>'accent', ''), 'amber'); v_old public.caddy_tiers%rowtype; v_active boolean;
        v_perks text[];
begin
  if nullif(p->>'id', '') is not null then   -- an existing tier carries its own course
    select course_id into v_course from public.caddy_tiers where id = (p->>'id')::uuid;
  end if;
  if v_course is null then raise exception 'TIER_COURSE' using errcode = '22023'; end if;
  select name into v_cname from public.courses where id = v_course;
  v_cname := coalesce(nullif(btrim(coalesce(p->>'course_name', '')), ''), v_cname, v_course);
  if not public._caddy_course_ok(p_token, v_course, v_cname) then
    raise exception 'OFFER_COURSE: only the course can change its caddy tiers — sign in with its pro shop PIN' using errcode = '42501';
  end if;
  if v_accent not in ('amber', 'sky', 'emerald') then v_accent := 'amber'; end if;
  v_perks := case when jsonb_typeof(p->'perks') = 'array'
                  then (select array_agg(left(btrim(x), 80)) from jsonb_array_elements_text(p->'perks') x where btrim(x) <> '') end;
  v_active := coalesce((p->>'is_active')::boolean, true);
  if nullif(p->>'id', '') is not null then
    select * into v_old from public.caddy_tiers where id = (p->>'id')::uuid for update;
    if not found then raise exception 'TIER_NOT_FOUND' using errcode = '22023'; end if;
    if not public._caddy_course_ok(p_token, v_old.course_id, v_old.course_name) then
      raise exception 'OFFER_COURSE: only the course can change its caddy tiers — sign in with its pro shop PIN' using errcode = '42501';
    end if;
    update public.caddy_tiers set
      label = coalesce(v_label, label),
      tagline = case when p ? 'tagline' then left(nullif(btrim(p->>'tagline'), ''), 120) else tagline end,
      description = case when p ? 'description' then left(nullif(btrim(p->>'description'), ''), 600) else description end,
      fee_amount = case when p ? 'fee_amount' then nullif(p->>'fee_amount', '')::numeric else fee_amount end,
      fee_unit = case when p ? 'fee_unit' then coalesce(nullif(p->>'fee_unit', ''), 'round') else fee_unit end,
      tips_note = case when p ? 'tips_note' then left(nullif(btrim(p->>'tips_note'), ''), 120) else tips_note end,
      perks = case when p ? 'perks' then v_perks else perks end,
      plays_golf = case when p ? 'plays_golf' then coalesce((p->>'plays_golf')::boolean, false) else plays_golf end,
      accent = case when p ? 'accent' then v_accent else accent end,
      icon = case when p ? 'icon' then coalesce(nullif(p->>'icon', ''), 'workspace_premium') else icon end,
      sort = case when p ? 'sort' then coalesce((p->>'sort')::int, sort) else sort end,
      is_active = v_active, updated_at = now()
    where id = v_old.id returning id, code into v_id, v_code;
    if not v_active then   -- a retired tier leaves no caddy wearing it
      update public.caddy_profiles set tier_code = null, updated_at = now()
       where tier_code = v_old.code and (course_id = v_old.course_id or course_name = v_old.course_name
             or public.caddy_facility_key(course_name) = public.caddy_facility_key(v_old.course_name));
    end if;
    return v_id;
  end if;
  if v_label is null then raise exception 'TIER_LABEL: a tier needs a name' using errcode = '22023'; end if;
  v_code := coalesce(nullif(regexp_replace(lower(coalesce(nullif(p->>'code', ''), v_label)), '[^a-z0-9]+', '_', 'g'), '_'), 'tier');
  v_code := left(trim(both '_' from v_code), 24);
  if v_code = '' then v_code := 'tier'; end if;
  insert into public.caddy_tiers (course_id, course_name, code, label, tagline, description, plays_golf, fee_amount, fee_unit,
                                  tips_note, covered_items, perks, accent, icon, sort, is_active)
  values (v_course, v_cname, v_code, v_label, left(nullif(btrim(coalesce(p->>'tagline', '')), ''), 120),
          left(nullif(btrim(coalesce(p->>'description', '')), ''), 600), coalesce((p->>'plays_golf')::boolean, false),
          nullif(p->>'fee_amount', '')::numeric, coalesce(nullif(p->>'fee_unit', ''), 'round'),
          left(nullif(btrim(coalesce(p->>'tips_note', '')), ''), 120), '[]'::jsonb, v_perks, v_accent,
          coalesce(nullif(p->>'icon', ''), 'workspace_premium'),
          coalesce((p->>'sort')::int, (select coalesce(max(sort), 0) + 1 from public.caddy_tiers where course_name = v_cname)), true)
  on conflict (course_name, code) do update set label = excluded.label, tagline = excluded.tagline, description = excluded.description,
          plays_golf = excluded.plays_golf, fee_amount = excluded.fee_amount, fee_unit = excluded.fee_unit, tips_note = excluded.tips_note,
          perks = excluded.perks, accent = excluded.accent, icon = excluded.icon, is_active = true, updated_at = now()
  returning id into v_id;
  return v_id;
end $$;
revoke all on function public.caddy_tier_save(text, jsonb) from public;
grant execute on function public.caddy_tier_save(text, jsonb) to anon, authenticated;

-- a FREELANCE caddy declines (not yet confirmed) or cancels (confirmed) one of her own upcoming jobs.
-- Employees still have no such path (feedback: the caddy can never decline/cancel) — this function refuses them.
-- The seat she leaves is handed back to the pro shop as "needs a caddy", the caddy master gets a request card, the golfer a message.
create or replace function public.caddy_freelance_drop(p_actor text, p_booking_id uuid, p_reason text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_claim  text := nullif(coalesce(auth.jwt() ->> 'line_id', ''), '');
  v_actor  text;
  cp       public.caddy_profiles%rowtype;
  b        public.caddy_bookings%rowtype;
  tb       public.bookings%rowtype;
  v_action text;
  v_now_t  time := (now() at time zone 'Asia/Bangkok')::time;
  v_today  date := (now() at time zone 'Asia/Bangkok')::date;
  v_num    text;
  v_tee    time;
  v_reason text := left(nullif(btrim(coalesce(p_reason, '')), ''), 300);
  golfers  jsonb; guests jsonb; k int; j int; v_slot_hit boolean := false; v_guest_hit boolean := false;
  v_need   int; v_first jsonb; v_any boolean;
  v_ev     record; v_reg record; v_nums text;
  v_slug   text; v_from text; v_cname text; v_text text; v_label text; v_cnm text;
  v_why    text;
begin
  if v_claim is not null and p_actor is not null and p_actor <> v_claim then
    raise exception 'caddy_freelance_drop: actor does not match the signed-in account' using errcode = '42501';
  end if;
  v_actor := coalesce(v_claim, nullif(p_actor, ''));
  if v_actor is null then raise exception 'caddy_freelance_drop: sign in first' using errcode = '42501'; end if;

  select * into cp from public.caddy_profiles
   where user_id = v_actor and left_at is null and coalesce(is_active, true) and not coalesce(is_mock, false)
   order by (course_id is not null) desc, created_at desc limit 1;
  if not found then return jsonb_build_object('ok', false, 'reason', 'no_caddy'); end if;
  if not cp.is_freelance then return jsonb_build_object('ok', false, 'reason', 'not_freelance'); end if;

  select * into b from public.caddy_bookings where id = p_booking_id for update;
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  v_num := nullif(ltrim(regexp_replace(coalesce(cp.caddy_number, ''), '\D', '', 'g'), '0'), '');
  if not (b.caddy_id = cp.id
          or (b.caddy_id is null and v_num is not null and substring(b.caddie_name from '#\s*0*(\d+)') = v_num
              and public.caddy_facility_key(b.course_name) = public.caddy_facility_key(cp.course_name))) then
    return jsonb_build_object('ok', false, 'reason', 'not_yours');
  end if;
  v_tee := coalesce(b.tee_time, b.start_time);
  if b.status in ('cancelled', 'completed', 'no_show') or b.started_at is not null or b.completed_at is not null
     or b.booking_date < v_today or (b.booking_date = v_today and v_tee is not null and v_tee <= v_now_t) then
    return jsonb_build_object('ok', false, 'reason', 'too_late');
  end if;
  v_action := case when b.status = 'confirmed' then 'cancel' else 'decline' end;
  v_why := case when v_action = 'cancel' then 'Cancelled by the caddy (freelance)' else 'Declined by the caddy (freelance)' end
           || coalesce(': ' || v_reason, '');

  perform set_config('mcp.quiet', '1', true);   -- her own drop: no "job cancelled" LINE back to her

  if b.teesheet_booking_id is not null then
    -- pro shop tee time: her seat empties and the booking needs a caddy again; the job row becomes that open job
    select * into tb from public.bookings where id = b.teesheet_booking_id for update;
    if found then
      golfers := coalesce(tb.booking_data->'golfers', '[]'::jsonb);
      if jsonb_typeof(golfers) <> 'array' then golfers := '[]'::jsonb; end if;
      for k in 0 .. jsonb_array_length(golfers) - 1 loop
        if not v_slot_hit and not v_guest_hit
           and (golfers->k->>'caddyId' = cp.id::text
                or (v_num is not null and nullif(ltrim(regexp_replace(coalesce(golfers->k->>'caddyNumber', ''), '\D', '', 'g'), '0'), '') = v_num)) then
          golfers := jsonb_set(golfers, array[k::text], (golfers->k) || jsonb_build_object('caddyId', null, 'caddyNumber', '', 'caddyName', '', 'caddyLocalName', ''));
          v_slot_hit := true;
        end if;
        guests := golfers->k->'guests';
        if not v_slot_hit and not v_guest_hit and jsonb_typeof(guests) = 'array' then
          for j in 0 .. jsonb_array_length(guests) - 1 loop
            if guests->j->>'caddyId' = cp.id::text
               or (v_num is not null and nullif(ltrim(regexp_replace(coalesce(guests->j->>'caddyNumber', ''), '\D', '', 'g'), '0'), '') = v_num) then
              guests := jsonb_set(guests, array[j::text], (guests->j) || jsonb_build_object('caddyId', null, 'caddyNumber', '', 'caddyName', ''));
              golfers := jsonb_set(golfers, array[k::text, 'guests'], guests);
              v_guest_hit := true; exit;   -- a guest without a caddy is already an open job to the sheet
            end if;
          end loop;
        end if;
      end loop;
      v_need := coalesce((tb.booking_data->>'caddiesNeeded')::int, 0) + case when v_slot_hit then 1 else 0 end;
      v_first := golfers->0;
      v_any := exists (select 1 from jsonb_array_elements(golfers) g where nullif(g->>'caddyId', '') is not null or nullif(g->>'caddyNumber', '') is not null);
      update public.bookings
         set booking_data = jsonb_set(jsonb_set(coalesce(booking_data, '{}'::jsonb), '{golfers}', golfers, true), '{caddiesNeeded}', to_jsonb(v_need), true),
             caddie_id = nullif(v_first->>'caddyId', ''), caddy_number = nullif(v_first->>'caddyNumber', ''), caddie_name = nullif(v_first->>'caddyName', ''),
             caddie_status = case when v_any then 'confirmed' when v_need > 0 then 'pending' else null end,
             updated_at = now()
       where id = tb.id;
    end if;
    update public.caddy_bookings
       set caddy_id = null, caddie_name = 'Unassigned', status = 'pending', confirmed_at = null, confirmed_by = null,
           cancellation_reason = v_why, updated_at = now()
     where id = b.id;
  else
    update public.caddy_bookings set status = 'cancelled', cancelled_at = now(), cancellation_reason = v_why, updated_at = now() where id = b.id;
    if b.booking_source in ('event_registration', 'proshop_event') then
      -- society round: her number leaves the golfer's registration (else the reg re-creates her job), the desk re-assigns
      select e.id, e.title into v_ev from public.society_events e
       where e.event_date = b.booking_date and (e.title = b.special_requests
             or public.caddy_facility_key(e.course_name) = public.caddy_facility_key(b.course_name))
         and exists (select 1 from public.event_registrations r where r.event_id = e.id and r.player_id = coalesce(b.golfer_id, b.user_id))
       order by (e.title = b.special_requests) desc limit 1;
      if v_ev.id is not null and v_num is not null then
        select * into v_reg from public.event_registrations r where r.event_id = v_ev.id and r.player_id = coalesce(b.golfer_id, b.user_id) limit 1 for update;
        if v_reg.id is not null then
          select string_agg(n, ',') into v_nums from (
            select n from regexp_split_to_table(coalesce(v_reg.caddy_numbers, ''), '[^0-9A-Za-z]+') n
             where n <> '' and nullif(ltrim(regexp_replace(n, '\D', '', 'g'), '0'), '') is distinct from v_num) q;
          update public.event_registrations set caddy_numbers = nullif(v_nums, '') where id = v_reg.id;
          update public.caddy_bookings set cancellation_reason = v_why where id = b.id;   -- the reg trigger wrote its own reason
        end if;
      end if;
    end if;
  end if;

  insert into public.caddy_job_drops (booking_id, caddy_id, caddy_number, caddy_name, action, reason, course_id, course_name,
                                      booking_date, tee_time, golfer_id, golfer_name)
  values (b.id, cp.id, cp.caddy_number, cp.name, v_action, v_reason, b.course_id, b.course_name, b.booking_date, v_tee,
          coalesce(b.golfer_id, b.user_id), b.golfer_name);

  -- the caddy master's request list (the one she already watches)
  begin
    insert into public.caddy_assistance_requests (course_id, caddy_user_id, caddy_name, caddy_number, request_type, detail)
    values (coalesce(b.course_id, cp.course_id), v_actor, coalesce(nullif(btrim(cp.name), ''), 'Caddy'), cp.caddy_number,
            case when v_action = 'cancel' then 'job_cancelled' else 'declined' end,
            left(to_char(b.booking_date, 'Dy DD Mon') || coalesce(' ' || to_char(v_tee, 'HH24:MI'), '')
                 || coalesce(' · ' || nullif(b.golfer_name, ''), '') || coalesce(' · ' || b.course_name, '')
                 || ' · needs a caddy' || coalesce(' · "' || v_reason || '"', ''), 300));
  exception when others then
    raise warning '[caddy_freelance_drop] request card: %', sqlerrm;
  end;

  -- the golfer hears it from the course (in-app thread + LINE), only for a real account
  begin
    if coalesce(b.golfer_id, b.user_id) ~ '^U[0-9a-f]{32}$' then
      v_slug := coalesce(public.course_venue(b.course_id), b.course_id, 'course');
      v_from := 'COURSE-' || v_slug;
      v_cname := coalesce((select name from public.course_venues where slug = v_slug), b.course_name, 'Pro shop');
      insert into public.user_profiles (line_user_id, name, role) values (v_from, v_cname, 'proshop') on conflict (line_user_id) do nothing;
      v_cnm := coalesce(nullif(btrim(cp.name), ''), '') || case when cp.caddy_number is not null then ' #' || cp.caddy_number else '' end;
      v_text := 'Caddy update · ' || to_char(b.booking_date, 'Dy DD Mon') || coalesce(' ' || to_char(v_tee, 'HH24:MI'), '')
                || E'\nYour caddy ' || btrim(v_cnm) || ' can''t make this round. The pro shop is assigning another caddy — you don''t need to do anything.';
      insert into public.direct_messages (sender_line_id, recipient_line_id, message_text) values (v_from, coalesce(b.golfer_id, b.user_id), v_text);
      perform net.http_post(url := 'https://pyeeplwsnupmhgbguwqs.supabase.co/functions/v1/line-push-notification',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := jsonb_build_object('type', 'new_message', 'record',
                  jsonb_build_object('recipient_id', coalesce(b.golfer_id, b.user_id), 'sender_id', v_from, 'sender_name', v_cname, 'content', v_text)));
    end if;
  exception when others then
    raise warning '[caddy_freelance_drop] golfer notice: %', sqlerrm;
  end;

  return jsonb_build_object('ok', true, 'action', v_action);
end $$;
revoke all on function public.caddy_freelance_drop(text, uuid, text) from public;
grant execute on function public.caddy_freelance_drop(text, uuid, text) to anon, authenticated;

-- freelance caddies set their own days: a day-off request from one is approved on the spot (employees still wait for the caddy master)
create or replace function public.trg_caddy_dayoff_freelance() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(new.status, 'pending') = 'pending' and exists (
      select 1 from public.caddy_profiles c where c.user_id = new.caddy_user_id and c.is_freelance and c.left_at is null) then
    new.status := 'approved'; new.decided_by := 'freelance (own days)'; new.decided_at := now();
  end if;
  return new;
end $$;
drop trigger if exists caddy_dayoff_freelance on public.caddy_dayoff_requests;
create trigger caddy_dayoff_freelance before insert on public.caddy_dayoff_requests for each row execute function public.trg_caddy_dayoff_freelance();

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
        'gallery_urls','emergency_contact','sheet_start','sheet_end','block_minutes','tier_code','golf_handicap',
        'is_freelance'];   -- v1607: freelance is the course's call, never in v_self_cols
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
                    gallery_urls, emergency_contact, sheet_start, sheet_end, block_minutes, tier_code, golf_handicap, is_freelance)
                values (v_new.name, v_new.phone, v_new.email, v_new.photo_url, v_new.course_id, v_new.course_name,
                    coalesce(v_new.experience_years, 0), v_new.languages, v_new.specialties, v_new.certifications,
                    coalesce(v_new.is_active, true), v_new.availability_days, v_new.created_by, v_new.bio, v_new.notes,
                    coalesce(v_new.availability_status, 'available'), v_new.caddy_number, v_new.personality,
                    v_new.strengths, v_new.specialty, v_new.user_id, coalesce(v_new.is_mock, false), v_new.gallery_urls,
                    v_new.emergency_contact, coalesce(v_new.sheet_start, '06:00'::time), coalesce(v_new.sheet_end, '16:00'::time),
                    coalesce(v_new.block_minutes, 270), v_new.tier_code, v_new.golf_handicap, coalesce(v_new.is_freelance, false))
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
        is_freelance = coalesce(v_new.is_freelance, false),
        left_at = v_new.left_at, former_user_id = v_new.former_user_id,
        updated_at = now()
    where id = p_id;
    if p_op = 'claim' and v_row.user_id ~ '^CADDY-[0-9a-f]{32}$' and v_row.user_id <> v_actor then perform public._caddy_handover(v_row.user_id, v_actor); end if;
    return jsonb_build_array(jsonb_build_object('id', p_id));
end $function$;

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
       and (c.course_id = b.course_id or (prefix <> '' and lower(coalesce(c.course_name, '')) like prefix || '%')
            or caddy_facility_key(c.course_name) = caddy_facility_key(b.course_name));   -- v1607 caddy pool
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
                  and (cb.course_id = b.course_id or (prefix <> '' and lower(coalesce(cb.course_name, '')) like prefix || '%')
                       or caddy_facility_key(cb.course_name) = caddy_facility_key(b.course_name))))
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
                  and (r.course_name is null or prefix = '' or lower(r.course_name) like prefix || '%'
                       or caddy_facility_key(r.course_name) = caddy_facility_key(b.course_name))) then
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
$function$;
commit;
