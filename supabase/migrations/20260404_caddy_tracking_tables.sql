-- Caddy live tracking (GPS position, current hole)
CREATE TABLE IF NOT EXISTS caddy_tracking (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    caddy_user_id text UNIQUE NOT NULL,
    current_hole integer DEFAULT 1,
    latitude double precision,
    longitude double precision,
    accuracy double precision,
    is_tracking boolean DEFAULT false,
    round_start_time timestamptz,
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_caddy_tracking_user ON caddy_tracking(caddy_user_id);
ALTER TABLE caddy_tracking ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'caddy_tracking' AND policyname = 'caddy_tracking_select') THEN
        CREATE POLICY caddy_tracking_select ON caddy_tracking FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'caddy_tracking' AND policyname = 'caddy_tracking_insert') THEN
        CREATE POLICY caddy_tracking_insert ON caddy_tracking FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'caddy_tracking' AND policyname = 'caddy_tracking_update') THEN
        CREATE POLICY caddy_tracking_update ON caddy_tracking FOR UPDATE USING (true);
    END IF;
END $$;

-- Caddy completed rounds history
CREATE TABLE IF NOT EXISTS caddy_completed_rounds (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    caddy_id text NOT NULL,
    caddy text,
    date date DEFAULT CURRENT_DATE,
    start_time timestamptz,
    end_time timestamptz,
    total_time text,
    holes_completed integer DEFAULT 18,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_caddy_completed_rounds_caddy ON caddy_completed_rounds(caddy_id);
ALTER TABLE caddy_completed_rounds ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'caddy_completed_rounds' AND policyname = 'caddy_rounds_select') THEN
        CREATE POLICY caddy_rounds_select ON caddy_completed_rounds FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'caddy_completed_rounds' AND policyname = 'caddy_rounds_insert') THEN
        CREATE POLICY caddy_rounds_insert ON caddy_completed_rounds FOR INSERT WITH CHECK (true);
    END IF;
END $$;
