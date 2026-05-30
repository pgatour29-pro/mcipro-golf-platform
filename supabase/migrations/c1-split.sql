-- ============================================================================
-- C1 split — strict private user-owned, by identity-column TYPE
-- ============================================================================
-- Replaces the single C1 block in section3-real-policies.sql. The UUID group
-- depends on the canonical-uuid alignment (mint sub = canonical id); apply it
-- only after the mint change is live, same as the chat UUID system.
-- room_members is handled in chat-policies.sql (excluded here).
-- announcement_reads: NOT in the confirmed split — verify its type and add to
-- the matching group before applying.
-- ============================================================================

-- ---- UUID identity -> auth.uid() -------------------------------------------
do $$
declare t text;
  uuid_tables text[] := array[
    'chat_devices','chat_room_members','message_receipts','notifications',
    'push_tokens','read_cursors','support_tickets','typing_events','user_preferences'
  ];
begin
  foreach t in array uuid_tables loop
    execute format('drop policy if exists tmp_select on public.%I', t);
    execute format('drop policy if exists tmp_insert on public.%I', t);
    execute format('drop policy if exists tmp_update on public.%I', t);
    execute format('create policy own_select on public.%I for select to authenticated using (user_id = (select auth.uid()))', t);
    execute format('create policy own_insert on public.%I for insert to authenticated with check (user_id = (select auth.uid()))', t);
    execute format('create policy own_update on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;

-- ---- TEXT (LINE id) identity -> line_id() ----------------------------------
do $$
declare t text;
  text_tables text[] := array[
    'condition_likes','notification_preferences','saved_groups',
    'user_caddy_preferences','webauthn_credentials'
  ];
begin
  foreach t in array text_tables loop
    execute format('drop policy if exists tmp_select on public.%I', t);
    execute format('drop policy if exists tmp_insert on public.%I', t);
    execute format('drop policy if exists tmp_update on public.%I', t);
    execute format('create policy own_select on public.%I for select to authenticated using (user_id = (select public.line_id()))', t);
    execute format('create policy own_insert on public.%I for insert to authenticated with check (user_id = (select public.line_id()))', t);
    execute format('create policy own_update on public.%I for update to authenticated using (user_id = (select public.line_id())) with check (user_id = (select public.line_id()))', t);
  end loop;
end $$;
