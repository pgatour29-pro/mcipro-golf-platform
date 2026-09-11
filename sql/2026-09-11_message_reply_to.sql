-- =====================================================================
-- Quote-reply on messages (v1159)
-- One reply pointer + a SNAPSHOT of what was quoted, on all three
-- message tables the golfer Messages tab renders.
-- The snapshot is deliberate: the thread only loads the newest ~200
-- rows, and the original can be deleted (unread-delete, below) — the
-- quote must still read correctly in both cases, so it never depends on
-- the original row being present.
-- No FK: deleting the quoted message must NOT cascade away the replies.
-- Additive + idempotent; safe to re-run.
-- =====================================================================

ALTER TABLE public.direct_messages
    ADD COLUMN IF NOT EXISTS reply_to_id   uuid,
    ADD COLUMN IF NOT EXISTS reply_to_text text,
    ADD COLUMN IF NOT EXISTS reply_to_name text;

ALTER TABLE public.group_chat_messages
    ADD COLUMN IF NOT EXISTS reply_to_id   uuid,
    ADD COLUMN IF NOT EXISTS reply_to_text text,
    ADD COLUMN IF NOT EXISTS reply_to_name text;

ALTER TABLE public.event_group_messages
    ADD COLUMN IF NOT EXISTS reply_to_id   uuid,
    ADD COLUMN IF NOT EXISTS reply_to_text text,
    ADD COLUMN IF NOT EXISTS reply_to_name text;
