-- 2026-09-17 compliance check ("unsubscribe"): the LINE push function honours
-- notification_preferences (notify_new_events / notify_event_updates / notify_messages /
-- notify_announcements / notify_reminders / notify_offers + quiet hours) but the app exposed only
-- the Offers toggle, and the table is SELECT-only for anon since the 2026-09-06 lockdown. This RPC
-- lets a user set their OWN preferences (mirrors set_offer_consent). Only the keys present in
-- p_prefs change; the rest keep their value (or the column default on first insert).
create or replace function public.set_notification_prefs(p_user_id text, p_prefs jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $fn$
declare
  cur record;
  b boolean;
begin
  if p_user_id is null or p_user_id = '' or p_prefs is null or jsonb_typeof(p_prefs) <> 'object' then
    return jsonb_build_object('ok', false);
  end if;
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
$fn$;
grant execute on function public.set_notification_prefs(text, jsonb) to anon, authenticated;
