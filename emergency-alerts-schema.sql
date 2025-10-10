-- Emergency Alerts Table for Cross-Device Sync
-- Run this in Supabase SQL Editor

-- =====================================================
-- EMERGENCY ALERTS TABLE
-- =====================================================

-- Drop old table if it exists (to start fresh with correct schema)
DROP TABLE IF EXISTS emergency_alerts CASCADE;

-- Create new table with complete schema
CREATE TABLE emergency_alerts (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  message TEXT NOT NULL,

  -- User info
  user_name TEXT NOT NULL,
  user_role TEXT NOT NULL,

  -- Timing
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),

  -- Location data (optional)
  location_lat REAL,
  location_lng REAL,
  location_hole INTEGER,

  -- Status
  status TEXT DEFAULT 'active',
  priority TEXT DEFAULT 'high',

  -- Metadata
  acknowledged_by TEXT[],
  resolved_by TEXT,
  resolved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_alerts_status ON emergency_alerts(status);
CREATE INDEX idx_alerts_expires ON emergency_alerts(expires_at);
CREATE INDEX idx_alerts_timestamp ON emergency_alerts(timestamp DESC);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE emergency_alerts ENABLE ROW LEVEL SECURITY;

-- Public read access (everyone can see alerts)
CREATE POLICY "Alerts are viewable by everyone" ON emergency_alerts
  FOR SELECT USING (true);

-- Public insert access (anyone can send alerts)
CREATE POLICY "Alerts are insertable by everyone" ON emergency_alerts
  FOR INSERT WITH CHECK (true);

-- Public update access (for acknowledgments and resolutions)
CREATE POLICY "Alerts are updatable by everyone" ON emergency_alerts
  FOR UPDATE USING (true);

-- Public delete access (for cleanup)
CREATE POLICY "Alerts are deletable by everyone" ON emergency_alerts
  FOR DELETE USING (true);

-- =====================================================
-- REALTIME PUBLICATION
-- =====================================================

-- Enable realtime for emergency alerts (instant delivery)
ALTER PUBLICATION supabase_realtime ADD TABLE emergency_alerts;

-- =====================================================
-- AUTO-CLEANUP FUNCTION
-- =====================================================

-- Function to delete expired alerts
CREATE OR REPLACE FUNCTION cleanup_expired_alerts()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM emergency_alerts
  WHERE expires_at < NOW()
    AND status != 'active'; -- Keep active alerts even if expired

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_emergency_alerts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_alerts_updated_at
  BEFORE UPDATE ON emergency_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_emergency_alerts_updated_at();

-- =====================================================
-- DONE!
-- =====================================================
-- Emergency alerts table created successfully
-- Run cleanup_expired_alerts() periodically to remove old alerts
