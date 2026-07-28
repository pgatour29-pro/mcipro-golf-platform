-- v750: partner links must die with the registration (GLOBAL fix).
-- Bug (2026-07-28, Greenwood/Bonner): unregistering deleted the player's row but left OTHER
-- rows' partner_prefs entries and special_requests.hostId anchors pointing at the leaver.
-- The client's name-fallback matching then resurrected the pairing the moment the player
-- re-registered. This trigger purges every reference to a leaving registration, on every
-- delete path (golfer unregister, organizer removal, SQL) and on soft-cancel.
--
-- partner_prefs is text[] whose entries are JSON strings {"playerId":<reg row id>,"playerName":..},
-- bare names (legacy modal), or raw ids. Ryder Cup overloads it with 'usa'/'europe' side flags —
-- those only match if a leaver were literally named "usa", so they are safe.

CREATE OR REPLACE FUNCTION public.try_jsonb(t text) RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE AS $fn$
BEGIN
    RETURN t::jsonb;
EXCEPTION WHEN others THEN
    RETURN NULL;
END $fn$;

CREATE OR REPLACE FUNCTION public.purge_partner_links_on_unregister() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
    -- 1) Strip partner_prefs entries on same-event rows that reference the leaver:
    --    JSON shape by playerId (reg row id OR player id) or by exact playerName;
    --    bare-string shape by id or exact name. Only rows that actually reference the
    --    leaver are touched (updated_at churn feeds realtime watchers — keep it quiet).
    UPDATE event_registrations er
    SET partner_prefs = COALESCE((
            SELECT array_agg(p.j)
            FROM unnest(er.partner_prefs) AS p(j)
            WHERE NOT (
                CASE WHEN try_jsonb(p.j) IS NOT NULL AND jsonb_typeof(try_jsonb(p.j)) = 'object' THEN
                        COALESCE(try_jsonb(p.j)->>'playerId','') IN (OLD.id::text, COALESCE(OLD.player_id,'~'))
                        OR (COALESCE(try_jsonb(p.j)->>'playerName','') <> ''
                            AND lower(try_jsonb(p.j)->>'playerName') = lower(COALESCE(OLD.player_name,'~')))
                     ELSE
                        btrim(p.j) IN (OLD.id::text, COALESCE(OLD.player_id,'~'), COALESCE(OLD.player_name,'~'))
                END)
        ), '{}'::text[])
    WHERE er.event_id = OLD.event_id
      AND er.id <> OLD.id
      AND er.partner_prefs IS NOT NULL
      AND array_length(er.partner_prefs, 1) > 0
      AND EXISTS (
          SELECT 1 FROM unnest(er.partner_prefs) AS q(j)
          WHERE CASE WHEN try_jsonb(q.j) IS NOT NULL AND jsonb_typeof(try_jsonb(q.j)) = 'object' THEN
                        COALESCE(try_jsonb(q.j)->>'playerId','') IN (OLD.id::text, COALESCE(OLD.player_id,'~'))
                        OR (COALESCE(try_jsonb(q.j)->>'playerName','') <> ''
                            AND lower(try_jsonb(q.j)->>'playerName') = lower(COALESCE(OLD.player_name,'~')))
                     ELSE
                        btrim(q.j) IN (OLD.id::text, COALESCE(OLD.player_id,'~'), COALESCE(OLD.player_name,'~'))
                END
      );

    -- 2) Kill hostId anchors pointing at the leaver. hostId is a stable LINE player_id, so it
    --    survives re-registration and would re-union instantly — it must not outlive the row.
    UPDATE event_registrations er
    SET special_requests = (COALESCE(er.special_requests, '{}'::jsonb) - 'hostId') - 'host_id'
    WHERE er.event_id = OLD.event_id
      AND er.id <> OLD.id
      AND OLD.player_id IS NOT NULL
      AND COALESCE(er.special_requests->>'hostId', er.special_requests->>'host_id') = OLD.player_id;

    RETURN OLD;
END $fn$;

DROP TRIGGER IF EXISTS trg_purge_partner_links_del ON event_registrations;
CREATE TRIGGER trg_purge_partner_links_del
    AFTER DELETE ON event_registrations
    FOR EACH ROW EXECUTE FUNCTION public.purge_partner_links_on_unregister();

DROP TRIGGER IF EXISTS trg_purge_partner_links_cancel ON event_registrations;
CREATE TRIGGER trg_purge_partner_links_cancel
    AFTER UPDATE OF status ON event_registrations
    FOR EACH ROW
    WHEN (NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION public.purge_partner_links_on_unregister();
