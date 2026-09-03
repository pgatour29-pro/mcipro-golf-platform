-- 1on1 (v1096): the golfer cube must appear for admins/members even when the Auth v2 session is missing
-- (session minting is fail-safe — a login can complete without a JWT). Anon-callable, returns ONE boolean
-- per line_user_id (admin or any oo_members row); everything behind the cube still needs the JWT + PIN.
create or replace function public.oo_cube_visible(p_uid text) returns boolean
language sql stable security definer set search_path = public as $$
  select p_uid is not null and (
    exists (select 1 from public.oo_admins a where a.user_id = p_uid)
    or exists (select 1 from public.oo_members m where m.user_id = p_uid)
  )
$$;
revoke all on function public.oo_cube_visible(text) from public;
grant execute on function public.oo_cube_visible(text) to anon, authenticated;
