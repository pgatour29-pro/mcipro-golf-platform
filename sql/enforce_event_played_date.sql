-- Event rounds are PLAYED on the event's date, no matter when the card is entered.
-- Applied to prod 2026-08-23 (v975). Community/history surfaces date and group rounds
-- by played_at; before this, a paper card entered after midnight Bangkok carried a
-- next-day completed_at and (pre-v974) split onto its own community-leaderboard board
-- (TRGG St Andrews 2026-08-22: Lau Sam + Rapalo Pedro).
--
-- The trigger pins played_at to society_events.event_date on EVERY insert/update of an
-- event-linked round, so no client write path (including fallback/retry inserts that
-- stamp now()) can drift it. started_at is only overridden when missing or on the wrong
-- Bangkok day — live-scored rounds keep their real tee time (a 06:00 Bangkok tee is
-- 23:00 UTC the previous day, hence the Asia/Bangkok comparison).

CREATE OR REPLACE FUNCTION enforce_event_played_date()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE ev_date date;
BEGIN
  IF NEW.society_event_id IS NOT NULL THEN
    SELECT event_date INTO ev_date FROM society_events WHERE id = NEW.society_event_id;
    IF ev_date IS NOT NULL THEN
      NEW.played_at := ev_date::timestamptz;
      IF NEW.started_at IS NULL
         OR (NEW.started_at AT TIME ZONE 'Asia/Bangkok')::date <> ev_date THEN
        NEW.started_at := ev_date::timestamptz;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $fn$;

DROP TRIGGER IF EXISTS trg_enforce_event_played_date ON rounds;
CREATE TRIGGER trg_enforce_event_played_date
BEFORE INSERT OR UPDATE ON rounds
FOR EACH ROW EXECUTE FUNCTION enforce_event_played_date();

-- One-time repair for existing drift (1 row when applied; safe to re-run — the
-- column-scoped AFTER triggers on rounds don't fire on timestamp-only updates):
UPDATE rounds r SET played_at = e.event_date::timestamptz
FROM society_events e
WHERE r.society_event_id = e.id
  AND (r.played_at IS NULL OR (r.played_at AT TIME ZONE 'Asia/Bangkok')::date <> e.event_date);
