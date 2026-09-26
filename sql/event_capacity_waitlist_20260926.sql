-- EVENT FULL -> WAITLIST, enforced by the DATABASE (Pete 2026-09-26: "once the event is full with
-- the limit set by the golf course or organizer and then the waitlist kicks in").
-- Capacity = the LOWER of the organizer's max_participants (0/NULL = no limit) and the course's
-- held tee times (course_event_slots.slots_given x 4; 0/NULL = not set).
-- * A registration past capacity is refused (EVENT_FULL); the app puts the golfer on the waitlist.
-- * Walk-ons recorded while SCORING (special_requests.walkOn) are exempt — a round being played is
--   never blocked by a sign-up limit.
-- * Every capacity decision and every promotion runs under ONE per-event lock, so two last-spot
--   sign-ups can't both get in and two simultaneous cancellations can't promote the same golfer.
-- * Raising the organizer limit or the course's slots promotes from the waitlist at once
--   (when the event's auto_waitlist is on — default for every upcoming event today).
-- auto_promote_waitlist body pulled from LIVE prosrc 2026-09-26; changes: lock, capacity fn,
-- ON CONFLICT DO NOTHING on the promotion insert.

create or replace function public.event_capacity(p_event_id text)
returns integer language sql stable as $$
    select least(nullif(e.max_participants, 0), nullif(s.slots_given, 0) * 4)
      from public.society_events e
      left join public.course_event_slots s on s.event_id = e.id
     where e.id::text = p_event_id
$$;

create or replace function public.event_reg_capacity_gate()
returns trigger language plpgsql as $$
declare v_cap int; v_n int;
begin
    if coalesce(new.status, 'registered') = 'cancelled' then return new; end if;
    if coalesce(new.special_requests->>'walkOn', '') = 'true' then return new; end if;
    perform pg_advisory_xact_lock(hashtext('event_cap:' || new.event_id::text));
    v_cap := public.event_capacity(new.event_id::text);
    if v_cap is null then return new; end if;
    select count(*) into v_n from public.event_registrations
     where event_id = new.event_id and coalesce(status, 'registered') <> 'cancelled';
    if v_n >= v_cap then
        raise exception 'EVENT_FULL: this event is full (% of % places taken)', v_n, v_cap;
    end if;
    return new;
end $$;

drop trigger if exists trg_event_reg_capacity_gate on public.event_registrations;
create trigger trg_event_reg_capacity_gate before insert on public.event_registrations
    for each row execute function public.event_reg_capacity_gate();

CREATE OR REPLACE FUNCTION public.auto_promote_waitlist()
RETURNS trigger LANGUAGE plpgsql AS $function$
DECLARE
  target_event_id TEXT;
  event_max INTEGER;
  event_auto BOOLEAN;
  current_count INTEGER;
  spots_available INTEGER;
  next_waitlist RECORD;
BEGIN
  IF TG_TABLE_NAME = 'society_events' THEN
    target_event_id := COALESCE(NEW.id, OLD.id)::text;
  ELSE
    target_event_id := COALESCE(NEW.event_id, OLD.event_id)::text;
  END IF;

  SELECT COALESCE(auto_waitlist, false) INTO event_auto
  FROM society_events WHERE id::text = target_event_id;
  IF event_auto IS NOT TRUE THEN RETURN COALESCE(NEW, OLD); END IF;

  -- same lock as the capacity gate: one decision at a time per event
  PERFORM pg_advisory_xact_lock(hashtext('event_cap:' || target_event_id));

  event_max := public.event_capacity(target_event_id);
  -- Only auto-promote when capacity is known
  IF event_max IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  SELECT COUNT(*) INTO current_count
  FROM event_registrations
  WHERE event_id::text = target_event_id
    AND COALESCE(status, 'registered') <> 'cancelled';

  spots_available := event_max - current_count;

  WHILE spots_available > 0 LOOP
    SELECT * INTO next_waitlist
    FROM event_waitlist
    WHERE event_id::text = target_event_id
    ORDER BY position ASC, created_at ASC
    LIMIT 1;

    EXIT WHEN next_waitlist IS NULL;

    INSERT INTO event_registrations (
      event_id, player_name, player_id, handicap, want_transport, want_competition
    ) VALUES (
      next_waitlist.event_id::uuid,
      next_waitlist.player_name,
      next_waitlist.player_id,
      next_waitlist.handicap,
      COALESCE(next_waitlist.want_transport, false),
      COALESCE(next_waitlist.want_competition, false)
    ) ON CONFLICT (event_id, player_id) DO NOTHING;

    DELETE FROM event_waitlist WHERE id = next_waitlist.id;
    spots_available := spots_available - 1;
  END LOOP;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

drop trigger if exists trg_auto_promote_on_capacity_change on public.society_events;
create trigger trg_auto_promote_on_capacity_change
    after update of max_participants, auto_waitlist on public.society_events
    for each row when (new.max_participants is distinct from old.max_participants
                       or new.auto_waitlist is distinct from old.auto_waitlist)
    execute function public.auto_promote_waitlist();

drop trigger if exists trg_auto_promote_on_slots_change on public.course_event_slots;
create trigger trg_auto_promote_on_slots_change
    after insert or update of slots_given on public.course_event_slots
    for each row execute function public.auto_promote_waitlist();
