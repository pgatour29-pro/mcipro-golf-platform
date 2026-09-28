-- v1399 (2026-09-28): an event is OPEN until the organizer sets a limit.
-- Course tee-slot allocation (course_event_slots.slots_given) no longer caps registration.
-- Used by: event_reg_capacity_gate, auto_promote_waitlist, qr_upcoming_events.
CREATE OR REPLACE FUNCTION public.event_capacity(p_event_id text)
 RETURNS integer
 LANGUAGE sql
 STABLE
AS $function$
    select nullif(e.max_participants, 0)
      from public.society_events e
     where e.id::text = p_event_id
$function$;
