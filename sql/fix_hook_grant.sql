-- Let Supabase Auth's hook role read profiles so custom_access_token_hook can resolve profile_id/line_id.
grant usage on schema public to supabase_auth_admin;
grant select on table public.profiles to supabase_auth_admin;
drop policy if exists "auth_admin_read_profiles" on public.profiles;
create policy "auth_admin_read_profiles" on public.profiles
  as permissive for select to supabase_auth_admin using (true);
