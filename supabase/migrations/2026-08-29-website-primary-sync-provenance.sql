-- Website-primary schedule rule (Pete, 2026-08-29): the TRGG website is the
-- source of truth for the schedule; an explicit organizer change outranks it.
--
-- sync_source marks rows the website sync created or adopted ('trgg_website').
-- organizer_override is set by trigger when a CLIENT write (anon/authenticated,
-- i.e. the organizer edit form or the Schedule Creator) changes schedule
-- identity on a sync-owned row. The sync never updates or deletes overridden
-- rows, and never touches rows it didn't stamp (special series, field splits).
-- Fees are deliberately NOT in the override set — the sync already has
-- per-field handling (manual transport fee wins; entry fee follows website).

ALTER TABLE public.society_events
  ADD COLUMN IF NOT EXISTS sync_source text,
  ADD COLUMN IF NOT EXISTS organizer_override boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.society_events_flag_organizer_override()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
BEGIN
  IF NEW.sync_source IS NOT NULL
     AND COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'role','')
         IN ('anon','authenticated')
     AND (OLD.course_name IS DISTINCT FROM NEW.course_name
       OR OLD.event_date IS DISTINCT FROM NEW.event_date
       OR OLD.start_time IS DISTINCT FROM NEW.start_time
       OR OLD.departure_time IS DISTINCT FROM NEW.departure_time
       OR OLD.title IS DISTINCT FROM NEW.title
       OR OLD.status IS DISTINCT FROM NEW.status)
  THEN
    NEW.organizer_override := true;
  END IF;
  RETURN NEW;
END
$fn$;

DROP TRIGGER IF EXISTS trg_society_events_organizer_override ON public.society_events;
CREATE TRIGGER trg_society_events_organizer_override
BEFORE UPDATE ON public.society_events
FOR EACH ROW EXECUTE FUNCTION public.society_events_flag_organizer_override();
