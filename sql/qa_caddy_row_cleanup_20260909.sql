-- v1148/v1149 QA cleanup — one throwaway caddy_profiles row.
--
-- The claim flow was verified end-to-end on prod with a throwaway caddy row
-- (#9991 "Caddy #9991" at Bangpra) + a throwaway user (TESTQA-CAD-1149).
-- The user row is gone (rpc delete_user_account). The caddy row could NOT be
-- deleted from the browser: caddy_profiles has no DELETE policy for anon, so
-- the DELETE returned 204 with zero rows removed (the silent-delete family).
--
-- It has been neutralised instead — is_active=false, is_mock=true, number,
-- user_id and photo cleared — so it is invisible to every surface (they all
-- filter is_active=true and/or is_mock=false). This just finishes the job.

DELETE FROM public.caddy_profiles
WHERE id = '7e934ff3-beea-47a0-ba01-39147800ac3e'
  AND name = '(QA test row v1148 — delete me)';
