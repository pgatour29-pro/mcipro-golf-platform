-- SECURITY (2026-09-06): take anon WRITES off every table the browser never writes.
-- Pete: "Fix the ones you have access to."
--
-- Context: leftover migration policies (`tmp_insert` / `tmp_update` / `tmp_delete`, all `WITH CHECK true`) gave the
-- anon role — i.e. anyone holding the publishable key that ships in the page — INSERT/UPDATE/DELETE on 140 tables.
-- The app CANNOT simply move to authenticated-only: 1,304 profiles were active in the last 30 days but only 40
-- accounts have signed into Supabase Auth, so ~95% of real traffic runs as anon. That migration is Auth v2 Phase 2.
--
-- What this file does instead: revoke anon writes on the tables NO client code writes — derived by grepping every
-- shipped .js/.html for `.from('<table>')` and `/rest/v1/<table>` and subtracting. Deliberate exclusions:
--   • conversation_participants, push_tokens — the chat-media / chat-notify edge functions use the ANON key
--   • trgg_pending, trgg_players, trgg_rounds — Pete's tools/ bookmarklets and scripts/*.ps1 write these
--   • direct_messages — writes revoked, SELECT KEPT: the DM unread badge and the open-thread live updates are
--     realtime subscriptions on this table, and realtime honours RLS. Reads stay open until sessions land.
-- SELECTs are otherwise left alone on purpose — a read path missed by the grep would break silently.
-- Run: npx supabase db query --linked -f sql/security_anon_lockdown_20260906.sql

do $$
declare t text; n int := 0;
  tables text[] := array[
    '_room_map_migration','_user_map_migration','activity_logs','attachments','caddies','caddy_reviews',
    'caddy_waitlists','debug_log','direct_messages','event_leaderboard','friendships','golf_courses','hole_history',
    'leaderboard_periods','live_progress','notification_log','notification_preferences','notifications',
    'pace_notifications','pending_member_links','pending_messaging_ids','performance_logs','period_standings',
    'pin_change_audit','points_config','pool_leaderboards','room_members','round_scores','round_societies',
    'scorecard_holes','series_event_results','support_tickets','user_handicaps','user_preferences'];
begin
  foreach t in array tables loop
    if to_regclass('public.' || t) is null then continue; end if;
    execute format('revoke insert, update, delete on public.%I from anon', t);
    execute format('drop policy if exists tmp_insert on public.%I', t);
    execute format('drop policy if exists tmp_update on public.%I', t);
    execute format('drop policy if exists tmp_delete on public.%I', t);
    n := n + 1;
  end loop;
  raise notice 'locked % tables', n;
end $$;

-- these are internal logs / migration leftovers: anon has no business reading them either
do $$
declare t text;
  tables text[] := array['_room_map_migration','_user_map_migration','debug_log','performance_logs',
                         'pin_change_audit','notification_log','pending_member_links','pending_messaging_ids',
                         'support_tickets','activity_logs'];
begin
  foreach t in array tables loop
    if to_regclass('public.' || t) is null then continue; end if;
    execute format('revoke select on public.%I from anon', t);
    execute format('drop policy if exists tmp_select on public.%I', t);
  end loop;
end $$;

select (select count(distinct tablename) from pg_policies
         where schemaname='public' and roles::text like '%anon%' and cmd <> 'SELECT'
           and coalesce(with_check,'true')='true') as tables_with_open_anon_writes_left,
       (select count(*) from information_schema.role_table_grants
         where grantee='anon' and table_schema='public' and privilege_type='INSERT') as anon_insert_grants_left,
       (select count(*) from information_schema.role_table_grants
         where grantee='anon' and table_schema='public' and privilege_type='DELETE') as anon_delete_grants_left;
