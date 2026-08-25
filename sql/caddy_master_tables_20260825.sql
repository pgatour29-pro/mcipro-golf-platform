-- 2026-08-25 (v995): Caddy Master dashboard backend.
-- Two tables make the caddie-side stubs REAL: the Caddy Room group chat and the
-- Request Help flow (backup/relief/emergency/question + on-course quick requests).
-- RLS open (true/true) matches the existing caddy_score_links posture — browser runs
-- on the anon key until Auth Phase 2 (LINE→JWT) tightens everything at once.

CREATE TABLE IF NOT EXISTS caddy_room_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id text,                               -- courses.id when known; NULL = unscoped (demo)
    sender_user_id text NOT NULL,                 -- line_user_id (or PIN demo device id)
    sender_name text NOT NULL,
    sender_role text NOT NULL DEFAULT 'caddie',   -- 'caddie' | 'caddymaster'
    caddy_number text,
    message text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crm_course_created ON caddy_room_messages (course_id, created_at DESC);
ALTER TABLE caddy_room_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY caddy_room_messages_all ON caddy_room_messages FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS caddy_assistance_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id text,
    caddy_user_id text NOT NULL,
    caddy_name text NOT NULL,
    caddy_number text,
    request_type text NOT NULL,                   -- backup|relief|emergency|question|water|towels|medical|cart|hazard|slow-play|condition
    detail text,
    hole_number int,
    status text NOT NULL DEFAULT 'pending',       -- pending | acknowledged | resolved
    created_at timestamptz NOT NULL DEFAULT now(),
    acknowledged_at timestamptz,
    resolved_at timestamptz,
    resolved_by text
);
CREATE INDEX IF NOT EXISTS idx_car_status_created ON caddy_assistance_requests (status, created_at DESC);
ALTER TABLE caddy_assistance_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY caddy_assistance_requests_all ON caddy_assistance_requests FOR ALL USING (true) WITH CHECK (true);

-- realtime: both tables must be in the publication or subscriptions silently never fire
-- (5th instance of that trap: event_registrations, chats, food, caddy_bookings, now these)
ALTER PUBLICATION supabase_realtime ADD TABLE caddy_room_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE caddy_assistance_requests;
