-- v1396 (2026-09-28): caddy roster / availability live on every dashboard (golfer caddy list,
-- pro shop tee sheet, caddy master). Writes to caddy_profiles are rare (is_active toggle, photo,
-- claim), so publishing it costs nothing at scale.
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='caddy_profiles') then
    alter publication supabase_realtime add table public.caddy_profiles;
  end if;
end $$;
