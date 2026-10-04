-- v1455c: WHERE GOLFERS PAY is money — lock it down.
-- 1) golf_course_settings.online_booking can no longer be written directly by the browser key (column
--    privileges): every other column keeps exactly the grants it had, so the pro shop's settings push
--    (course_id, course_name, teesheet_config) and every older writer keep working.
-- 2) teetime_save_online changes the payment target (PromptPay number, account name, QR image) ONLY with
--    that course's own pro shop PIN, checked here against proshop_pins (never sent to the browser).
--    A course without its own PIN can set hours / rules / photo, and its golfers pay at the course until
--    MyCaddiPro issues its PIN. Every payment-target change is written to teetime_pay_audit.
update public.course_venues set course_ref = v.ref
  from (values ('eastern-star', 'eastern_star'), ('phoenix', 'phoenix_gold'), ('royal-lakeside', 'royal_lakeside'), ('hermes', 'hermes')) v(slug, ref)
 where course_venues.slug = v.slug and course_venues.course_ref is null;

revoke insert, update on public.golf_course_settings from anon, authenticated;
grant insert (id, course_id, course_name, super_admin_pin, super_admin_user_id, caddy_pin, manager_pin, proshop_pin, maintenance_pin,
              restaurant_pin, caddymaster_pin, pin_last_changed_at, pin_last_changed_by, created_at, updated_at, pricing_config,
              manager_settings, teesheet_config)
   on public.golf_course_settings to anon, authenticated;
grant update (id, course_id, course_name, super_admin_pin, super_admin_user_id, caddy_pin, manager_pin, proshop_pin, maintenance_pin,
              restaurant_pin, caddymaster_pin, pin_last_changed_at, pin_last_changed_by, created_at, updated_at, pricing_config,
              manager_settings, teesheet_config)
   on public.golf_course_settings to anon, authenticated;

create table if not exists public.teetime_pay_audit (
  id bigserial primary key, slug text not null, before jsonb, after jsonb, by text, at timestamptz not null default now());
alter table public.teetime_pay_audit enable row level security;   -- no policies: server-side only
revoke all on public.teetime_pay_audit from anon, authenticated;

create or replace function public.teetime_pin_ok(p_slug text, p_pin text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(p_pin, '') ~ '^\d{6}$' and exists (
    select 1 from public.proshop_pins pp
     where pp.pin = p_pin
       and (pp.course_id = p_slug or pp.course_id = (select v.course_ref from public.course_venues v where v.slug = p_slug)))
$$;
revoke execute on function public.teetime_pin_ok(text, text) from public, anon, authenticated;

drop function if exists public.teetime_save_online(text, jsonb);
create or replace function public.teetime_save_online(p_slug text, p_cfg jsonb, p_pin text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare o jsonb; cur jsonb; clean jsonb; pay_new jsonb; pay_old jsonb; pay_changed boolean;
begin
  if not exists (select 1 from public.course_venues where slug = p_slug) then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if jsonb_typeof(p_cfg) <> 'object' then return jsonb_build_object('ok', false, 'reason', 'cfg'); end if;
  select coalesce(online_booking, '{}'::jsonb) into cur from public.golf_course_settings where course_id = p_slug;
  cur := coalesce(cur, '{}'::jsonb);
  clean := jsonb_strip_nulls(jsonb_build_object(
    'enabled',    case when p_cfg ? 'enabled' then to_jsonb((p_cfg->>'enabled')::boolean) end,
    'from',       case when p_cfg->>'from' ~ '^\d{2}:\d{2}$' then p_cfg->'from' end,
    'until',      case when p_cfg->>'until' ~ '^\d{2}:\d{2}$' then p_cfg->'until' end,
    'days',       case when p_cfg->>'days' ~ '^\d{1,2}$' then to_jsonb((p_cfg->>'days')::int) end,
    'lead_min',   case when p_cfg->>'lead_min' ~ '^\d{1,3}$' then to_jsonb((p_cfg->>'lead_min')::int) end,
    'show_rates', case when p_cfg ? 'show_rates' then to_jsonb((p_cfg->>'show_rates')::boolean) end,
    'rule',       case when p_cfg->>'rule' in ('none', 'deposit', 'full') then p_cfg->'rule' end,
    'deposit_pp', case when p_cfg->>'deposit_pp' ~ '^\d{1,6}$' then to_jsonb((p_cfg->>'deposit_pp')::int) end,
    'pay_min',    case when p_cfg->>'pay_min' ~ '^\d{1,3}$' then to_jsonb((p_cfg->>'pay_min')::int) end,
    'allow_full', case when p_cfg ? 'allow_full' then to_jsonb((p_cfg->>'allow_full')::boolean) end,
    'cancel_h',   case when p_cfg->>'cancel_h' ~ '^\d{1,3}$' then to_jsonb((p_cfg->>'cancel_h')::int) end,
    'photo_url',  case when p_cfg ? 'photo_url' then to_jsonb(case when coalesce(p_cfg->>'photo_url', '') ~ '^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/course-media/[A-Za-z0-9._/-]+$' then p_cfg->>'photo_url' else '' end) end,
    'updated_by', case when p_cfg ? 'by' then to_jsonb(left(coalesce(p_cfg->>'by', ''), 80)) end,
    'updated_at', to_jsonb(now())));
  -- the payment target: only what was sent, only when it actually changes, only with the course's own PIN
  pay_new := jsonb_strip_nulls(jsonb_build_object(
    'promptpay', case when p_cfg ? 'promptpay' then to_jsonb(left(regexp_replace(coalesce(p_cfg->>'promptpay', ''), '[^0-9]', '', 'g'), 15)) end,
    'payee',     case when p_cfg ? 'payee' then to_jsonb(left(regexp_replace(trim(coalesce(p_cfg->>'payee', '')), '[<>"`]', '', 'g'), 120)) end,
    'qr_url',    case when p_cfg ? 'qr_url' then to_jsonb(case when coalesce(p_cfg->>'qr_url', '') ~ '^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/course-media/[A-Za-z0-9._/-]+$' then p_cfg->>'qr_url' else '' end) end));
  pay_old := jsonb_build_object('promptpay', coalesce(cur->>'promptpay', ''), 'payee', coalesce(cur->>'payee', ''), 'qr_url', coalesce(cur->>'qr_url', ''));
  pay_changed := exists (select 1 from jsonb_each_text(pay_new) e where coalesce(pay_old->>e.key, '') is distinct from e.value);
  if pay_changed then
    if not public.teetime_pin_ok(p_slug, p_pin) then
      -- everything else still saves; the payment target stays as it was
      insert into public.golf_course_settings (course_id, course_name, online_booking)
      values (p_slug, (select name from public.course_venues where slug = p_slug), clean)
      on conflict (course_id) do update set online_booking = coalesce(public.golf_course_settings.online_booking, '{}'::jsonb) || clean, updated_at = now()
      returning online_booking into o;
      return jsonb_build_object('ok', false, 'reason', 'pin', 'online', o, 'cfg', public.teetime_cfg(p_slug));
    end if;
    clean := clean || pay_new;
    insert into public.teetime_pay_audit (slug, before, after, by) values (p_slug, pay_old, pay_new, left(coalesce(p_cfg->>'by', ''), 80));
  end if;
  insert into public.golf_course_settings (course_id, course_name, online_booking)
  values (p_slug, (select name from public.course_venues where slug = p_slug), clean)
  on conflict (course_id) do update set online_booking = coalesce(public.golf_course_settings.online_booking, '{}'::jsonb) || clean, updated_at = now()
  returning online_booking into o;
  return jsonb_build_object('ok', true, 'online', o, 'cfg', public.teetime_cfg(p_slug), 'pay_changed', pay_changed);
end $$;
grant execute on function public.teetime_save_online(text, jsonb, text) to anon, authenticated;
