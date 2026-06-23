-- Distinguish player vs organizer messages by ROLE, not by sender id (one person can be both when
-- testing, making ids identical). New nullable column; old rows fall back to name/id heuristics.
alter table public.event_private_messages add column if not exists sender_role text;
