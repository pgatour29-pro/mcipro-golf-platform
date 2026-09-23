-- =====================================================================================
-- A NEW TRGG REGISTRATION STARTS ON THE TRGG HANDICAP, WHATEVER THE CLIENT SENT (2026-09-23)
-- =====================================================================================
-- Same incident as trgg_paste_reg_sync_uses_trgg_20260923.sql. The app has several
-- registration writers (golfer form, organizer roster add, waitlist promote, tee-sheet
-- add ...) and each passes its own idea of the handicap -- usually the profile/universal,
-- which since 2026-09-12 is the LOWEST recorded, not the TRGG number. Rule (Pete
-- 2026-08-13): a TRGG event plays off the TRGG handicap, at registration and during the
-- event. Enforced once, here, instead of in every caller.
--
-- BEFORE INSERT only: a registration for a TRGG event (TRGG society id, or a TRGG/
-- Travellers title) whose player has a TRGG society_handicaps row gets that number.
-- No TRGG row (guests) -> the client's value stands. Later edits are untouched here.
-- =====================================================================================

CREATE OR REPLACE FUNCTION public.event_reg_takes_trgg_hcp()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_h numeric;
BEGIN
  IF NEW.player_id IS NULL OR NEW.event_id IS NULL THEN RETURN NEW; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.society_events se
     WHERE se.id::text = NEW.event_id::text
       AND ( se.society_id = '7c0e4b72-d925-44bc-afda-38259a7ba346'::uuid
             OR se.title ~* 'trgg|travellers' )
  ) THEN RETURN NEW; END IF;
  SELECT sh.handicap_index INTO v_h
    FROM public.society_handicaps sh
   WHERE sh.golfer_id = NEW.player_id
     AND sh.society_id = '7c0e4b72-d925-44bc-afda-38259a7ba346'::uuid
     AND sh.handicap_index IS NOT NULL
   LIMIT 1;
  IF v_h IS NOT NULL THEN NEW.handicap := v_h::real; END IF;
  RETURN NEW;
END
$function$;

DROP TRIGGER IF EXISTS trg_event_reg_takes_trgg_hcp ON public.event_registrations;
CREATE TRIGGER trg_event_reg_takes_trgg_hcp
  BEFORE INSERT ON public.event_registrations
  FOR EACH ROW EXECUTE FUNCTION public.event_reg_takes_trgg_hcp();
