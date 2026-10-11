-- v1511 FOLLOWS + OFFER CONSENT BELONG TO THE GOLFER (Pete 2026-10-11: "Fix the follow" — "anyone with an account and
-- new accounts apply"). Following a course and turning on offer pushes is consent; until now any caller with the public
-- key could set it for any golfer (course_follows had open anon policies; set_offer_consent / set_notification_prefs
-- trusted the id they were given). Now the verified login decides: public.line_id() = the line_id claim of the
-- caller's Supabase session (every LINE / LIFF / Kakao / Google sign-in mints one). No session, no follow.

-- 1. course_follows: own rows only, signed-in golfers only (server functions — market_insights, deliver_course_offer,
--    marketing_audience_report — are SECURITY DEFINER and still count every follow)
drop policy if exists cf_select on public.course_follows;
drop policy if exists cf_insert on public.course_follows;
drop policy if exists cf_update on public.course_follows;
drop policy if exists cf_delete on public.course_follows;
drop policy if exists cf_own_select on public.course_follows;
drop policy if exists cf_own_insert on public.course_follows;
drop policy if exists cf_own_update on public.course_follows;
drop policy if exists cf_own_delete on public.course_follows;
create policy cf_own_select on public.course_follows for select to authenticated using (golfer_line_id = public.line_id());
create policy cf_own_insert on public.course_follows for insert to authenticated with check (golfer_line_id = public.line_id());
create policy cf_own_update on public.course_follows for update to authenticated using (golfer_line_id = public.line_id()) with check (golfer_line_id = public.line_id());
create policy cf_own_delete on public.course_follows for delete to authenticated using (golfer_line_id = public.line_id());
revoke insert, update, delete on public.course_follows from anon;

-- 2. offer consent: only for yourself
create or replace function public.set_offer_consent(p_user_id text, p_enabled boolean)
returns boolean language plpgsql security definer set search_path = public as $function$
begin
  if p_user_id is null or p_user_id = '' then
    return false;
  end if;
  if public.line_id() is distinct from p_user_id then return false; end if;   -- v1511: the verified login only
  insert into public.notification_preferences (user_id, notify_offers)
  values (p_user_id, coalesce(p_enabled, false))
  on conflict (user_id) do update
    set notify_offers = coalesce(p_enabled, false),
        updated_at    = now();
  return true;
end; $function$;

-- 3. the notification settings sheet: live definition (pulled 2026-10-11) — the offers switch moves only for the verified golfer
create or replace function public.set_notification_prefs(p_user_id text, p_prefs jsonb)
returns jsonb language plpgsql security definer set search_path = public as $function$
declare
  cur record;
  b boolean;
begin
  if p_user_id is null or p_user_id = '' or p_prefs is null or jsonb_typeof(p_prefs) <> 'object' then
    return jsonb_build_object('ok', false);
  end if;
  if public.line_id() is distinct from p_user_id then p_prefs := p_prefs - 'notify_offers'; end if;   -- v1511
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

-- 4. the after-round question: asked of and answered by the verified golfer only
create or replace function public.follow_prompt_next(p_user text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v text; cid text; nm text;
begin
  if coalesce(p_user, '') = '' or public.line_id() is distinct from p_user then return null; end if;   -- v1511
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
  if public.line_id() is distinct from p_user then return false; end if;   -- v1511: the verified login only
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
