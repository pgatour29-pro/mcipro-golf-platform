-- 1on1 (v1099): DEACTIVATE a member — Pete 2026-09-04: "members can be suspended, i want a deactivation button
-- to remove the member(s) so that when they log back in or reload the 1on1 cube is gone".
--
-- Suspended keeps the row visible (cube stays, "Suspended" pill). Removed = soft-delete: the row stays (oo_bookings
-- FK + history), but EVERY gate treats it as "no member": oo_me() returns member NULL → the golfer cube's .oo-on is
-- off on the next init (reload / login); oo_cube_visible() (the anon no-JWT fallback) is false; oo_is_member() was
-- already 'active'-only. Sticky like 'suspended': an old invite link never re-admits a removed member — only an
-- admin Restore / Grant access does (CUBE VISIBILITY = ADMIN-GRANTED ONLY). Open bookings are cancelled so no
-- partner keeps dates blocked by a ghost member. Functions below were pulled from live prosrc (2026-09-04), not
-- from the repo files.

alter table public.oo_members drop constraint if exists oo_members_status_check;
alter table public.oo_members add constraint oo_members_status_check
  check (status in ('pending','active','suspended','expired','removed'));

-- admin write path: allow 'removed'; on removal cancel the member's open bookings (mirrors oo_cancel, by = admin)
create or replace function public.oo_admin_set_member(p_user text, p_status text, p_expires date default null, p_notes text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_row jsonb; v_b record;
begin
  if not public.oo_is_admin() then raise exception 'not_admin' using errcode = '42501'; end if;
  if p_status not in ('pending','active','suspended','expired','removed') then raise exception 'bad_status'; end if;
  insert into public.oo_members (user_id, status, expires_at, notes, approved_by, approved_at,
                                 display_name)
  values (p_user, p_status, p_expires, p_notes,
          case when p_status = 'active' then public.oo_uid() end, case when p_status = 'active' then now() end,
          (select coalesce(display_name, name) from public.user_profiles where line_user_id = p_user))
  on conflict (user_id) do update set
    status = excluded.status, expires_at = excluded.expires_at, notes = coalesce(excluded.notes, oo_members.notes),
    approved_by = case when excluded.status = 'active' then public.oo_uid() else oo_members.approved_by end,
    approved_at = case when excluded.status = 'active' then now() else oo_members.approved_at end
  returning to_jsonb(oo_members.*) into v_row;
  if p_status = 'removed' then
    for v_b in select id, dayoff_request_id from public.oo_bookings
               where member_id = p_user and status in ('requested','accepted') and date_to >= public.oo_today() for update
    loop
      if v_b.dayoff_request_id is not null then
        delete from public.caddy_dayoff_requests where id = v_b.dayoff_request_id and status = 'pending';
      end if;
      update public.oo_bookings set status = 'cancelled', cancelled_by = 'admin', cancel_reason = 'member_removed', cancelled_at = now()
      where id = v_b.id;
    end loop;
  end if;
  return v_row;
end $$;

-- identity: a removed member reads as NO member (cube off, no PIN prompt, gate says not a member)
create or replace function public.oo_me() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_uid text := public.oo_uid(); v_member jsonb; v_partner jsonb; v_admin boolean;
begin
  if v_uid is null then return jsonb_build_object('signed_in', false); end if;
  v_admin := public.oo_is_admin();
  select to_jsonb(m) into v_member from public.oo_members m where m.user_id = v_uid and m.status <> 'removed';
  select to_jsonb(p) into v_partner from public.oo_partners p where p.user_id = v_uid;
  return jsonb_build_object(
    'signed_in', true, 'uid', v_uid, 'admin', v_admin,
    'member', v_member, 'partner', v_partner,
    'member_active', public.oo_is_member(),
    'pin_required', (v_member is not null and not v_admin),
    'pin_ok', public.oo_pin_ok(),
    'pin_set', public.oo_pin_set(),
    'is_caddie', exists (select 1 from public.caddy_profiles c where c.user_id = v_uid),
    'today', public.oo_today()
  );
end $$;

-- anon no-JWT fallback (v1096): a removed member never gets the cube back through this path
create or replace function public.oo_cube_visible(p_uid text) returns boolean
language sql stable security definer set search_path = public as $$
  select p_uid is not null and (
    exists (select 1 from public.oo_admins a where a.user_id = p_uid)
    or exists (select 1 from public.oo_members m where m.user_id = p_uid and m.status <> 'removed')
  )
$$;

-- invite redemption: 'removed' is sticky like 'suspended' — an old ?oo=CODE link cannot re-admit
create or replace function public.oo_redeem_invite(p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_uid text := public.oo_uid(); v_inv public.oo_invites; v_name text; v_row jsonb;
begin
  if v_uid is null then raise exception 'not_signed_in' using errcode = '28000'; end if;
  select * into v_inv from public.oo_invites where code = upper(trim(p_code)) for update;
  if v_inv.code is null then raise exception 'invite_invalid'; end if;
  if v_inv.expires_at is not null and v_inv.expires_at < now() then raise exception 'invite_expired'; end if;
  if v_inv.used >= v_inv.max_uses then raise exception 'invite_used_up'; end if;
  select coalesce(display_name, name) into v_name from public.user_profiles where line_user_id = v_uid;

  if v_inv.kind = 'member' then
    insert into public.oo_members (user_id, society_id, status, invite_code, display_name, approved_by, approved_at)
    values (v_uid, v_inv.society_id, case when v_inv.auto_approve then 'active' else 'pending' end,
            v_inv.code, v_name, case when v_inv.auto_approve then 'invite:'||v_inv.code end,
            case when v_inv.auto_approve then now() end)
    on conflict (user_id) do update
      set status = case when oo_members.status in ('suspended','removed') then oo_members.status
                        when v_inv.auto_approve then 'active' else oo_members.status end,
          invite_code = excluded.invite_code
    returning to_jsonb(oo_members.*) into v_row;
  else
    v_row := public.oo_partner_optin(jsonb_build_object('invite_code', v_inv.code));
    if v_inv.auto_approve then
      update public.oo_partners set status = 'approved', approved_by = 'invite:'||v_inv.code, approved_at = now()
      where user_id = v_uid and status = 'pending' returning to_jsonb(oo_partners.*) into v_row;
    end if;
  end if;
  update public.oo_invites set used = used + 1 where code = v_inv.code;
  return v_row;
end $$;

