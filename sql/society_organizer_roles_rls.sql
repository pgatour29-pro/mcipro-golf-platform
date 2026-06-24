-- Inspect: columns + any CHECK on role (avoid value-rejection surprises)
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name='society_organizer_roles' ORDER BY ordinal_position;
SELECT con.conname, pg_get_constraintdef(con.oid) AS def
FROM pg_constraint con JOIN pg_class rel ON rel.oid=con.conrelid
WHERE rel.relname='society_organizer_roles' AND con.contype='c';

-- Add permissive anon/authenticated CRUD policies (RLS was on with ZERO policies = fully locked).
-- Matches the app's current permissive model (browser uses anon key); tighten in the JWT/RLS pass.
DROP POLICY IF EXISTS tmp_sor_select ON public.society_organizer_roles;
DROP POLICY IF EXISTS tmp_sor_insert ON public.society_organizer_roles;
DROP POLICY IF EXISTS tmp_sor_update ON public.society_organizer_roles;
DROP POLICY IF EXISTS tmp_sor_delete ON public.society_organizer_roles;
CREATE POLICY tmp_sor_select ON public.society_organizer_roles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY tmp_sor_insert ON public.society_organizer_roles FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY tmp_sor_update ON public.society_organizer_roles FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY tmp_sor_delete ON public.society_organizer_roles FOR DELETE TO anon, authenticated USING (true);

SELECT count(*) AS policy_count FROM pg_policy WHERE polrelid='public.society_organizer_roles'::regclass;
