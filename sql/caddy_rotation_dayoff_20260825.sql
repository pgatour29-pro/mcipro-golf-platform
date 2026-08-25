-- 2026-08-25 (v998): caddy number ROTATION + day-off requests (Pete's caddie ecosystem spec).
-- Rotation: per-course daily window — "starts at #X, first N serve"; numbers outside the
-- window are standby for walk-ins; next day the CM moves the start to where it left off.
-- Day off: caddie requests dates+reason → caddy master approves/declines; approved days
-- drop the caddy out of that day's rotation.

CREATE TABLE IF NOT EXISTS caddy_rotation_config (
    course_name text PRIMARY KEY,
    rotation_date date,
    start_number int NOT NULL DEFAULT 1,
    active_count int NOT NULL DEFAULT 87,
    updated_by text,
    updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE caddy_rotation_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY caddy_rotation_config_all ON caddy_rotation_config FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS caddy_dayoff_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    caddy_user_id text NOT NULL,
    caddy_name text NOT NULL,
    caddy_number text,
    course_name text,
    date_from date NOT NULL,
    date_to date NOT NULL,
    reason text,
    status text NOT NULL DEFAULT 'pending',   -- pending | approved | declined
    decided_by text,
    decided_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cdr_status_dates ON caddy_dayoff_requests (status, date_from, date_to);
ALTER TABLE caddy_dayoff_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY caddy_dayoff_requests_all ON caddy_dayoff_requests FOR ALL USING (true) WITH CHECK (true);

-- realtime or subscriptions silently never fire
ALTER PUBLICATION supabase_realtime ADD TABLE caddy_rotation_config;
ALTER PUBLICATION supabase_realtime ADD TABLE caddy_dayoff_requests;
