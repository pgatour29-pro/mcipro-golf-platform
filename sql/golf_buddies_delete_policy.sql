-- Fix: buddy removals silently deleted 0 rows because golf_buddies had RLS on
-- with tmp_insert/tmp_select/tmp_update policies but NO DELETE policy. The browser
-- (anon key) .delete() returned success but removed nothing -> buddy reappeared on
-- reopen. Add a DELETE policy matching the existing permissive tmp_ pattern.
DROP POLICY IF EXISTS tmp_delete ON public.golf_buddies;
CREATE POLICY tmp_delete ON public.golf_buddies
  FOR DELETE TO anon, authenticated
  USING (true);
