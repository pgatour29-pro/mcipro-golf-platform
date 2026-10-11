-- v1526 YOUR DEALS SAVE FOR THE GOLFER THE APP HAS SIGNED IN (Pete 2026-10-12: "if i or anyone who is already at this
-- section we are already logged in" / "its no difference than setting up the profile settings or any other settings").
-- v1511-v1525 let deal choices, follows and offer alerts be written only with a server-verified Supabase session, and asked
-- everyone without one (fingerprint logins and others) to confirm with LINE. Nobody saved a single choice (golfer_deal_prefs
-- had 0 rows). These are the golfer's own settings, the same as profile settings: they are now saved against the signed-in
-- golfer the app hands over, like every other setting. A verified session, when there is one, still wins (a session for a
-- different golfer is never overridden by the id the app sends). Re-runnable as a whole.

-- THE golfer for these settings: the verified login if any, else the app's signed-in golfer (a real account only)
create or replace function public._app_golfer(p_golfer text) returns text
language sql stable security definer set search_path = public as $$
  select coalesce(nullif(public.line_id(), ''),
                  (select up.line_user_id from public.user_profiles up where up.line_user_id = nullif(p_golfer, '') limit 1));
$$;
revoke execute on function public._app_golfer(text) from public, anon, authenticated;

-- Your deals: read
drop function if exists public.promo_prefs_get(boolean);
create or replace function public.promo_prefs_get(p_test boolean default false, p_golfer text default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me text := public._app_golfer(p_golfer); g public.golfer_deal_prefs; ven jsonb; fol jsonb; ids jsonb;
begin
  select coalesce(jsonb_agg(jsonb_build_object('slug', v.slug, 'name', v.name, 'short', coalesce(v.short_name, v.name), 'region', v.region)
                            order by v.region = 'Pattaya' desc, v.region, v.name), '[]'::jsonb)
    into ven from public.course_venues v where v.active is not false and (v.slug <> 'cheechan' or p_test);
  if me is null then return jsonb_build_object('signed_in', false, 'venues', ven); end if;
  select coalesce(jsonb_agg(distinct x.s), '[]'::jsonb) into fol
    from (select public._follow_venue(cf.course_id) s from public.course_follows cf where cf.golfer_line_id = me) x where x.s is not null;
  select coalesce(jsonb_agg(cf.course_id), '[]'::jsonb) into ids from public.course_follows cf where cf.golfer_line_id = me;
  select * into g from public.golfer_deal_prefs where golfer_id = me;
  return jsonb_build_object('signed_in', true, 'venues', ven, 'follows', fol, 'follow_ids', ids,
    'prefs', case when found then jsonb_build_object('types', to_jsonb(g.types), 'regions', to_jsonb(g.regions), 'days', g.days,
                                                     'tod', to_jsonb(g.tod), 'max_price', g.max_price, 'scope', g.scope, 'alerts', g.alerts)
             end);
end $$;
grant execute on function public.promo_prefs_get(boolean, text) to anon, authenticated;

-- Your deals: save. p.follows, when present, is the complete list of venue slugs the golfer follows.
drop function if exists public.promo_prefs_set(jsonb);
create or replace function public.promo_prefs_set(p jsonb, p_golfer text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me text := public._app_golfer(p_golfer);
  v_types text[]; v_regions text[]; v_tod text[]; v_days text; v_max int; v_scope text; v_alerts boolean; want text[];
begin
  if me is null then return jsonb_build_object('ok', false, 'reason', 'no_account'); end if;
  if p is null or jsonb_typeof(p) <> 'object' then return jsonb_build_object('ok', false, 'reason', 'bad'); end if;
  select array_agg(distinct x) into v_types from jsonb_array_elements_text(case when jsonb_typeof(p->'types') = 'array' then p->'types' else '[]' end) x
    where x in ('tee_time', 'society_package', 'caddy', 'food_beverage', 'accommodation', 'transport', 'promotion');
  select array_agg(distinct x) into v_regions from jsonb_array_elements_text(case when jsonb_typeof(p->'regions') = 'array' then p->'regions' else '[]' end) x
    where x in (select distinct region from public.course_venues where region is not null);
  select array_agg(distinct x) into v_tod from jsonb_array_elements_text(case when jsonb_typeof(p->'tod') = 'array' then p->'tod' else '[]' end) x
    where x in ('early', 'morning', 'midday', 'afternoon');
  v_days := case when p->>'days' in ('weekday', 'weekend') then p->>'days' else 'any' end;
  v_max := case when coalesce(p->>'max_price', '') ~ '^\d{3,6}$' and (p->>'max_price')::int between 100 and 100000 then (p->>'max_price')::int end;
  v_scope := case when p->>'scope' = 'following' then 'following' else 'any' end;
  v_alerts := coalesce((p->>'alerts')::boolean, true);
  insert into public.golfer_deal_prefs (golfer_id, types, regions, days, tod, max_price, scope, alerts, updated_at)
  values (me, v_types, v_regions, v_days, v_tod, v_max, v_scope, v_alerts, now())
  on conflict (golfer_id) do update set types = excluded.types, regions = excluded.regions, days = excluded.days, tod = excluded.tod,
    max_price = excluded.max_price, scope = excluded.scope, alerts = excluded.alerts, updated_at = now();
  if jsonb_typeof(p->'follows') = 'array' then
    select coalesce(array_agg(distinct x), '{}') into want from (select x from jsonb_array_elements_text(p->'follows') x
      where x in (select slug from public.course_venues) limit 80) z;
    -- unfollow the venues taken off the list (rows that point at no venue are left alone)
    delete from public.course_follows cf where cf.golfer_line_id = me
      and public._follow_venue(cf.course_id) is not null and not (public._follow_venue(cf.course_id) = any(want));
    insert into public.course_follows (golfer_line_id, course_id, source)
    select me, public._promo_course_id(s), 'deal_prefs' from unnest(want) s
    where not exists (select 1 from public.course_follows cf where cf.golfer_line_id = me and public._follow_venue(cf.course_id) = s)
    on conflict (golfer_line_id, course_id) do nothing;
  end if;
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.promo_prefs_set(jsonb, text) to anon, authenticated;

-- follow / unfollow one course (the wall's heart, the offers inbox). p_course_id = courses.id, or p_slug = a venue slug.
create or replace function public.golfer_follow(p_golfer text, p_on boolean, p_course_id text default null, p_slug text default null, p_source text default 'app')
returns boolean language plpgsql security definer set search_path = public as $$
declare me text := public._app_golfer(p_golfer); cid text;
begin
  if me is null then return false; end if;
  cid := coalesce((select c.id from public.courses c where c.id = nullif(p_course_id, '')),
                  case when nullif(p_slug, '') is not null then public._promo_course_id(p_slug) end);
  if p_on then
    if cid is null or not exists (select 1 from public.courses where id = cid) then return false; end if;
    insert into public.course_follows (golfer_line_id, course_id, source)
    values (me, cid, left(coalesce(nullif(p_source, ''), 'app'), 40))
    on conflict (golfer_line_id, course_id) do nothing;
  else
    delete from public.course_follows cf where cf.golfer_line_id = me
      and (cf.course_id = cid or (nullif(p_slug, '') is not null and public._follow_venue(cf.course_id) = p_slug));
  end if;
  return true;
end $$;
revoke execute on function public.golfer_follow(text, boolean, text, text, text) from public;
grant execute on function public.golfer_follow(text, boolean, text, text, text) to anon, authenticated;

-- offer alerts on / off: the golfer's own setting
create or replace function public.set_offer_consent(p_user_id text, p_enabled boolean)
returns boolean language plpgsql security definer set search_path = public as $function$
begin
  if p_user_id is null or p_user_id = '' then return false; end if;
  if public._app_golfer(p_user_id) is distinct from p_user_id then return false; end if;   -- v1526: the signed-in golfer
  insert into public.notification_preferences (user_id, notify_offers)
  values (p_user_id, coalesce(p_enabled, false))
  on conflict (user_id) do update
    set notify_offers = coalesce(p_enabled, false),
        updated_at    = now();
  return true;
end; $function$;

-- the notification settings sheet (live definition from v1511, one line changed)
create or replace function public.set_notification_prefs(p_user_id text, p_prefs jsonb)
returns jsonb language plpgsql security definer set search_path = public as $function$
declare
  cur record;
  b boolean;
begin
  if p_user_id is null or p_user_id = '' or p_prefs is null or jsonb_typeof(p_prefs) <> 'object' then
    return jsonb_build_object('ok', false);
  end if;
  if public._app_golfer(p_user_id) is distinct from p_user_id then p_prefs := p_prefs - 'notify_offers'; end if;   -- v1526: the signed-in golfer
  insert into public.notification_preferences (user_id) values (p_user_id) on conflict (user_id) do nothing;
  update public.notification_preferences n set
    notify_new_events     = case when p_prefs ? 'notify_new_events'     then (p_prefs->>'notify_new_events')::boolean     else n.notify_new_events end,
    notify_event_updates  = case when p_prefs ? 'notify_event_updates'  then (p_prefs->>'notify_event_updates')::boolean  else n.notify_event_updates end,
    notify_messages       = case when p_prefs ? 'notify_messages'       then (p_prefs->>'notify_messages')::boolean       else n.notify_messages end,
    notify_announcements  = case when p_prefs ? 'notify_announcements'  then (p_prefs->>'notify_announcements')::boolean  else n.notify_announcements end,
    notify_reminders      = case when p_prefs ? 'notify_reminders'      then (p_prefs->>'notify_reminders')::boolean      else n.notify_reminders end,
    notify_offers         = case when p_prefs ? 'notify_offers'         then (p_prefs->>'notify_offers')::boolean         else n.notify_offers end,
    quiet_hours_start     = case when p_prefs ? 'quiet_hours_start'     then nullif(p_prefs->>'quiet_hours_start', '')::time else n.quiet_hours_start end,
    quiet_hours_end       = case when p_prefs ? 'quiet_hours_end'       then nullif(p_prefs->>'quiet_hours_end', '')::time   else n.quiet_hours_end end,
    updated_at = now()
  where n.user_id = p_user_id
  returning n.* into cur;
  return jsonb_build_object('ok', true,
    'notify_new_events', cur.notify_new_events, 'notify_event_updates', cur.notify_event_updates,
    'notify_messages', cur.notify_messages, 'notify_announcements', cur.notify_announcements,
    'notify_reminders', cur.notify_reminders, 'notify_offers', cur.notify_offers,
    'quiet_hours_start', cur.quiet_hours_start, 'quiet_hours_end', cur.quiet_hours_end);
end
$function$;

-- the after-round "follow this course?" question
create or replace function public.follow_prompt_next(p_user text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v text; cid text; nm text;
begin
  if coalesce(p_user, '') = '' or public._app_golfer(p_user) is distinct from p_user then return null; end if;   -- v1526
  for v in
    select public.venue_of(x.course_name) from public.rounds x
    where x.golfer_id = p_user and x.played_at >= now() - interval '14 days' and x.course_name is not null
    group by 1 order by max(x.played_at) desc
  loop
    continue when v is null;
    select coalesce(cv.course_ref, (select c.id from public.courses c where public.course_venue(c.id) = v order by length(c.id), c.id limit 1)), cv.name
      into cid, nm from public.course_venues cv where cv.slug = v;
    continue when cid is null;
    continue when exists (select 1 from public.course_follows f where f.golfer_line_id = p_user and (f.course_id = cid or public.course_venue(f.course_id) = v));
    continue when exists (select 1 from public.course_follow_prompts q where q.golfer_line_id = p_user and (q.course_id = cid or public.course_venue(q.course_id) = v));
    return jsonb_build_object('course_id', cid, 'course_name', nm);
  end loop;
  return null;
end $$;

create or replace function public.follow_prompt_answer(p_user text, p_course_id text, p_yes boolean) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(p_user, '') = '' or coalesce(p_course_id, '') = '' then return false; end if;
  if public._app_golfer(p_user) is distinct from p_user then return false; end if;   -- v1526: the signed-in golfer
  if not exists (select 1 from public.courses where id = p_course_id) then return false; end if;
  -- only the course this golfer was actually asked about: a round at that venue in the last 14 days
  if not exists (select 1 from public.rounds x where x.golfer_id = p_user and x.played_at >= now() - interval '14 days'
                 and public.venue_of(x.course_name) = public.course_venue(p_course_id)) then return false; end if;
  insert into public.course_follow_prompts (golfer_line_id, course_id, answer) values (p_user, p_course_id, case when p_yes then 'yes' else 'no' end)
  on conflict (golfer_line_id, course_id) do update set answer = excluded.answer, asked_at = now();
  if p_yes then
    insert into public.course_follows (golfer_line_id, course_id, source) values (p_user, p_course_id, 'round_prompt')
    on conflict (golfer_line_id, course_id) do nothing;
    perform public.set_offer_consent(p_user, true);
  end if;
  return true;
end $$;

-- the offers inbox reads its follows + alert switch through here (course_follows rows stay own-session-only for direct reads)
create or replace function public.golfer_offer_state(p_golfer text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me text := public._app_golfer(p_golfer);
begin
  if me is null then return jsonb_build_object('follow_ids', '[]'::jsonb, 'consent', false); end if;
  return jsonb_build_object(
    'follow_ids', coalesce((select jsonb_agg(cf.course_id) from public.course_follows cf where cf.golfer_line_id = me), '[]'::jsonb),
    'consent', coalesce((select np.notify_offers from public.notification_preferences np where np.user_id = me), false));
end $$;
grant execute on function public.golfer_offer_state(text) to anon, authenticated;

notify pgrst, 'reload schema';
