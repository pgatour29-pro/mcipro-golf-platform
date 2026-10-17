-- v1606 SECURITY (Pete 2026-10-17: "fix the security risks now")
-- The v1604/v1605 RPCs trusted the id the browser sends. Until every login carries a verified Supabase
-- session (Auth Phase 2 — today only a minority do), they now:
--   1) use the VERIFIED login whenever the request has one (jwt line_id) and ignore the claimed id;
--   2) the sign-up log / "new since your last visit" / GOT IT answer ONLY to that event's organizers
--      (society organizer, its organizer-role admins, society members with role organizer, the event's
--      creator, platform admin). Golfers and strangers get nothing — withdrawals stay organizer-only.

create or replace function public._viewer(p_claimed text) returns text
language sql stable set search_path = public as $$
    select coalesce(nullif(public.line_id(), ''), p_claimed)
$$;

create or replace function public._is_event_organizer(p_event uuid, p_viewer text) returns boolean
language sql stable security definer set search_path = public as $$
    select coalesce(p_viewer, '') <> '' and (
        p_viewer = 'U2b6d976f19bca4b2f4374ae0e10ed873'                                   -- platform admin
        or exists (select 1 from society_events se where se.id = p_event and se.creator_id = p_viewer)
        or exists (select 1 from society_events se join society_profiles sp on sp.id = se.society_id
                    where se.id = p_event and (sp.organizer_id = p_viewer
                          or exists (select 1 from society_organizer_roles r where r.organizer_id = sp.organizer_id and r.user_id = p_viewer)
                          or exists (select 1 from society_members m where m.society_id = sp.id and m.golfer_id = p_viewer and m.role = 'organizer')))
        -- TRGG schedule rows can carry society_id NULL: match the TRGG society by title
        or exists (select 1 from society_events se join society_profiles sp on sp.society_name ilike 'Travellers Rest%'
                    where se.id = p_event and se.society_id is null and se.title ilike 'TRGG%'
                      and (sp.organizer_id = p_viewer
                           or exists (select 1 from society_organizer_roles r where r.organizer_id = sp.organizer_id and r.user_id = p_viewer)
                           or exists (select 1 from society_members m where m.society_id = sp.id and m.golfer_id = p_viewer and m.role = 'organizer')))
    )
$$;
revoke all on function public._is_event_organizer(uuid, text) from public, anon, authenticated;

create or replace function public.signup_log_for_event(p_event uuid, p_viewer text default null)
returns jsonb language sql stable security definer set search_path = public as $$
    select case when not public._is_event_organizer(p_event, public._viewer(p_viewer))
                then jsonb_build_object('ok', false, 'reason', 'organizer_only', 'rows', '[]'::jsonb) else jsonb_build_object('ok', true,
        'seen_at', (select seen_at from tee_sheet_seen where event_id = p_event and viewer_id = coalesce(public._viewer(p_viewer), '')),
        'rows', coalesce((select jsonb_agg(jsonb_build_object(
                    'id', l.id, 'reg_id', l.reg_id, 'player_id', l.player_id, 'player_name', l.player_name,
                    'handicap', l.handicap, 'total_fee', l.total_fee, 'want_transport', l.want_transport,
                    'host_id', l.host_id, 'kind', l.kind, 'at', l.happened_at, 'signup_no', l.signup_no, 'seat', l.seat,
                    'backfill', l.backfill, 'walk_on', l.walk_on,
                    'by_player', case when l.kind = 'withdraw' and l.actor_role is not null then l.actor = l.player_id end) order by l.happened_at desc, l.id desc)
                  from event_signup_log l where l.event_id = p_event), '[]'::jsonb)) end
$$;

create or replace function public.signup_news(p_events uuid[], p_viewer text)
returns jsonb language sql stable security definer set search_path = public as $$
    select coalesce(jsonb_agg(jsonb_build_object('event_id', e.eid, 'seen_at', s.seen_at, 'rows', x.rows)), '[]'::jsonb)
      from unnest(p_events) as e(eid)
      left join tee_sheet_seen s on s.event_id = e.eid and s.viewer_id = public._viewer(p_viewer)
      cross join lateral (
          select jsonb_agg(jsonb_build_object(
                    'id', l.id, 'reg_id', l.reg_id, 'player_id', l.player_id, 'player_name', l.player_name,
                    'handicap', l.handicap, 'total_fee', l.total_fee, 'want_transport', l.want_transport,
                    'host_id', l.host_id, 'kind', l.kind, 'at', l.happened_at, 'signup_no', l.signup_no, 'seat', l.seat,
                    'by_player', case when l.kind = 'withdraw' and l.actor_role is not null then l.actor = l.player_id end,
                    'seat_now', case when l.kind = 'signup' then public._ts_seat_label(l.event_id, l.player_id) end) order by l.happened_at desc, l.id desc) as rows
            from event_signup_log l
           where l.event_id = e.eid and not l.backfill and not l.walk_on
             and l.happened_at > coalesce(s.seen_at, '-infinity'::timestamptz)
      ) x
     where x.rows is not null and public._is_event_organizer(e.eid, public._viewer(p_viewer))
$$;

create or replace function public.tee_sheet_mark_seen(p_events uuid[], p_viewer text)
returns integer language plpgsql security definer set search_path = public as $$
declare n int; v text := public._viewer(p_viewer);
begin
    if coalesce(v, '') = '' then return 0; end if;
    insert into tee_sheet_seen (event_id, viewer_id, seen_at)
    select e, v, clock_timestamp() from unnest(p_events) e where public._is_event_organizer(e, v)
    on conflict (event_id, viewer_id) do update set seen_at = excluded.seen_at;
    get diagnostics n = row_count;
    return n;
end $$;

create or replace function public.signup_receipt(p_event uuid, p_player text)
returns jsonb language sql stable security definer set search_path = public as $$
    select jsonb_build_object('reg_id', er.id, 'player_name', er.player_name, 'handicap', er.handicap,
                              'total_fee', er.total_fee, 'want_transport', er.want_transport,
                              'payment_status', er.payment_status,
                              'signed_up_at', coalesce(l.happened_at, er.created_at), 'signup_no', l.signup_no,
                              'seat', public._ts_seat_label(er.event_id, er.player_id))
      from event_registrations er
      left join lateral (select happened_at, signup_no from event_signup_log
                          where event_id = er.event_id and player_id = er.player_id and kind = 'signup'
                          order by happened_at desc limit 1) l on true
     where er.event_id = p_event and er.player_id = public._viewer(p_player) and coalesce(er.status, 'registered') <> 'cancelled'
     limit 1
$$;

create or replace function public.im_clear(p_user text, p_keys text[]) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me text := public._app_golfer(public._viewer(p_user)); k text; n int := 0;
begin
    if me is null then return jsonb_build_object('ok', false, 'reason', 'who'); end if;
    foreach k in array coalesce(p_keys, '{}'::text[]) loop
        if k !~ '^[uges]:.+' then continue; end if;
        begin perform public.im_read(p_user, k); exception when others then null; end;
        insert into public.im_cleared (user_id, thread_key, cleared_at) values (me, k, clock_timestamp())
        on conflict (user_id, thread_key) do update set cleared_at = excluded.cleared_at;
        n := n + 1;
    end loop;
    return jsonb_build_object('ok', true, 'n', n);
end $$;

create or replace function public.im_hide(p_user text, p_key text, p_ids text[]) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me text := public._app_golfer(public._viewer(p_user)); kind text := split_part(p_key, ':', 1); n int;
begin
    if me is null then return jsonb_build_object('ok', false, 'reason', 'who'); end if;
    if kind not in ('u', 'g', 'e', 's') then return jsonb_build_object('ok', false, 'reason', 'kind'); end if;
    insert into public.im_hidden (user_id, msg_key)
    select me, kind || ':' || x from unnest(coalesce(p_ids, '{}'::text[])) x where coalesce(x, '') <> ''
    on conflict do nothing;
    get diagnostics n = row_count;
    return jsonb_build_object('ok', true, 'n', n);
end $$;

create or replace function public.im_leave_group(p_user text, p_group text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me text := public._app_golfer(public._viewer(p_user)); n int;
begin
    if me is null then return jsonb_build_object('ok', false, 'reason', 'who'); end if;
    delete from public.group_chat_members where group_id::text = p_group and member_line_id = me;
    get diagnostics n = row_count;
    -- no "left" message: every group insert LINE-pushes the members (notify_group_chat_message)
    return jsonb_build_object('ok', n > 0);
end $$;

grant execute on function public.signup_log_for_event(uuid, text) to anon, authenticated;
grant execute on function public.signup_news(uuid[], text) to anon, authenticated;
grant execute on function public.tee_sheet_mark_seen(uuid[], text) to anon, authenticated;
grant execute on function public.signup_receipt(uuid, text) to anon, authenticated;
