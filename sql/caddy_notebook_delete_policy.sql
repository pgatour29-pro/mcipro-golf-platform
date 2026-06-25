DROP POLICY IF EXISTS tmp_delete ON public.caddy_notebook;
CREATE POLICY tmp_delete ON public.caddy_notebook FOR DELETE TO anon, authenticated USING (true);
SELECT polname, polcmd::text AS cmd FROM pg_policy WHERE polrelid='public.caddy_notebook'::regclass ORDER BY polcmd;
