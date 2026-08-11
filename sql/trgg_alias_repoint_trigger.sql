-- Re-point trgg_handicap_alias when a profile's id changes in place (2026-08-11).
-- Guest claiming can UPDATE user_profiles.line_user_id (TRGG-GUEST-xxxx -> real LINE id)
-- instead of merging — merge_golfer_profiles' column sweep then never runs, so alias rows
-- keep pointing at the dead guest id and the handicap pull re-creates the player as new
-- (Andersson Patrik -> Ub115b73… claim left "andersson patrik" -> TRGG-GUEST-0024 dangling).
CREATE OR REPLACE FUNCTION public.repoint_trgg_alias_on_id_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE trgg_handicap_alias SET golfer_id = NEW.line_user_id
  WHERE golfer_id = OLD.line_user_id;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_repoint_trgg_alias ON user_profiles;
CREATE TRIGGER trg_repoint_trgg_alias
AFTER UPDATE OF line_user_id ON user_profiles
FOR EACH ROW
WHEN (OLD.line_user_id IS DISTINCT FROM NEW.line_user_id)
EXECUTE FUNCTION public.repoint_trgg_alias_on_id_change();
