-- 1on1 admin (v1092, 2026-09-03): admins (oo_admins = Jason/JOA + Pete) can move a report through its states.
-- oo_reports has SELECT (reporter or admin) + INSERT policies only — no UPDATE path existed, so the admin
-- "Reports" section could read but never close anything. One SECURITY DEFINER RPC, admin-gated like the others.
create or replace function public.oo_admin_set_report(p_report uuid, p_status text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_row jsonb;
begin
  if not public.oo_is_admin() then raise exception 'not_admin' using errcode = '42501'; end if;
  if p_status not in ('open','reviewed','actioned','dismissed') then raise exception 'bad_status'; end if;
  update public.oo_reports set status = p_status where id = p_report returning to_jsonb(oo_reports.*) into v_row;
  if v_row is null then raise exception 'not_found'; end if;
  return v_row;
end $$;
revoke all on function public.oo_admin_set_report(uuid, text) from public;
grant execute on function public.oo_admin_set_report(uuid, text) to authenticated;
