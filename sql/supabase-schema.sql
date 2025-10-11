-- MciPro Golf Platform - Supabase Database Schema
-- Run this in Supabase SQL Editor

-- =====================================================
-- 1. BOOKINGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  time TEXT,
  tee_time TEXT,
  status TEXT DEFAULT 'pending',
  players INTEGER DEFAULT 1,
  caddy_number TEXT,
  current_hole INTEGER,
  last_hole_update BIGINT,
  notes TEXT,
  phone TEXT,
  email TEXT,

  -- CRITICAL: Fields needed for tee sheet display
  group_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  golfer_id TEXT,
  golfer_name TEXT,
  event_name TEXT,
  course_id TEXT,
  course_name TEXT,
  course TEXT,
  tee_sheet_course TEXT,
  tee_number INTEGER,
  booking_type TEXT,
  duration_min INTEGER,

  -- Caddie-specific fields
  caddie_id TEXT,
  caddie_name TEXT,
  caddie_status TEXT,
  caddy_confirmation_required BOOLEAN DEFAULT FALSE,

  -- Service-specific fields
  service_name TEXT,
  service TEXT,

  -- Metadata
  source TEXT,
  is_private BOOLEAN DEFAULT FALSE,
  is_vip BOOLEAN DEFAULT FALSE,
  deleted BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast queries
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_caddy ON bookings(caddy_number);
CREATE INDEX IF NOT EXISTS idx_bookings_group_id ON bookings(group_id);
CREATE INDEX IF NOT EXISTS idx_bookings_kind ON bookings(kind);
CREATE INDEX IF NOT EXISTS idx_bookings_golfer_id ON bookings(golfer_id);

-- =====================================================
-- 2. USER PROFILES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  line_user_id TEXT PRIMARY KEY,
  name TEXT,
  role TEXT,
  caddy_number TEXT,
  phone TEXT,
  email TEXT,
  home_club TEXT,
  language TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for caddy lookups
CREATE INDEX IF NOT EXISTS idx_profiles_caddy ON user_profiles(caddy_number);

-- =====================================================
-- 3. GPS POSITIONS TABLE (Real-time tracking)
-- =====================================================
CREATE TABLE IF NOT EXISTS gps_positions (
  caddy_number TEXT PRIMARY KEY,
  current_hole INTEGER,
  latitude REAL,
  longitude REAL,
  accuracy REAL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable real-time for GPS positions
ALTER TABLE gps_positions REPLICA IDENTITY FULL;

-- =====================================================
-- 4. CHAT MESSAGES TABLE (Real-time chat)
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'text',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for room queries
CREATE INDEX IF NOT EXISTS idx_chat_room ON chat_messages(room_id, created_at DESC);

-- Enable real-time for chat
ALTER TABLE chat_messages REPLICA IDENTITY FULL;

-- =====================================================
-- 5. EMERGENCY ALERTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS emergency_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for active alerts
CREATE INDEX IF NOT EXISTS idx_alerts_active ON emergency_alerts(active, created_at DESC);

-- =====================================================
-- 6. PACE NOTIFICATIONS TABLE (Traffic Monitor)
-- =====================================================
CREATE TABLE IF NOT EXISTS pace_notifications (
  id TEXT PRIMARY KEY,
  type TEXT,
  level INTEGER,
  hole INTEGER,
  message TEXT,
  group_info TEXT,
  requires_ack BOOLEAN DEFAULT FALSE,
  acknowledged BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 7. HOLE ESCALATION TABLE (Traffic Monitor)
-- =====================================================
CREATE TABLE IF NOT EXISTS hole_escalation (
  hole_number INTEGER PRIMARY KEY,
  level INTEGER DEFAULT 0,
  last_contact BIGINT,
  group_id TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 8. HOLE HISTORY TABLE (Traffic Monitor)
-- =====================================================
CREATE TABLE IF NOT EXISTS hole_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hole_number INTEGER NOT NULL,
  type TEXT,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for hole history queries
CREATE INDEX IF NOT EXISTS idx_hole_history ON hole_history(hole_number, created_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE gps_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pace_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE hole_escalation ENABLE ROW LEVEL SECURITY;
ALTER TABLE hole_history ENABLE ROW LEVEL SECURITY;

-- Public read access for bookings (with anon key)
CREATE POLICY "Bookings are viewable by everyone" ON bookings
  FOR SELECT USING (true);

CREATE POLICY "Bookings are insertable by everyone" ON bookings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Bookings are updatable by everyone" ON bookings
  FOR UPDATE USING (true);

CREATE POLICY "Bookings are deletable by everyone" ON bookings
  FOR DELETE USING (true);

-- Public access for user profiles
CREATE POLICY "User profiles are viewable by everyone" ON user_profiles
  FOR SELECT USING (true);

CREATE POLICY "User profiles are insertable by everyone" ON user_profiles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "User profiles are updatable by everyone" ON user_profiles
  FOR UPDATE USING (true);

-- Public access for GPS positions (real-time tracking)
CREATE POLICY "GPS positions are viewable by everyone" ON gps_positions
  FOR SELECT USING (true);

CREATE POLICY "GPS positions are insertable by everyone" ON gps_positions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "GPS positions are updatable by everyone" ON gps_positions
  FOR UPDATE USING (true);

-- Public access for chat messages
CREATE POLICY "Chat messages are viewable by everyone" ON chat_messages
  FOR SELECT USING (true);

CREATE POLICY "Chat messages are insertable by everyone" ON chat_messages
  FOR INSERT WITH CHECK (true);

-- Public access for emergency alerts
CREATE POLICY "Emergency alerts are viewable by everyone" ON emergency_alerts
  FOR SELECT USING (true);

CREATE POLICY "Emergency alerts are insertable by everyone" ON emergency_alerts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Emergency alerts are updatable by everyone" ON emergency_alerts
  FOR UPDATE USING (true);

-- Public access for pace notifications
CREATE POLICY "Pace notifications are viewable by everyone" ON pace_notifications
  FOR SELECT USING (true);

CREATE POLICY "Pace notifications are insertable by everyone" ON pace_notifications
  FOR INSERT WITH CHECK (true);

-- Public access for hole escalation
CREATE POLICY "Hole escalation is viewable by everyone" ON hole_escalation
  FOR SELECT USING (true);

CREATE POLICY "Hole escalation is insertable by everyone" ON hole_escalation
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Hole escalation is updatable by everyone" ON hole_escalation
  FOR UPDATE USING (true);

-- Public access for hole history
CREATE POLICY "Hole history is viewable by everyone" ON hole_history
  FOR SELECT USING (true);

CREATE POLICY "Hole history is insertable by everyone" ON hole_history
  FOR INSERT WITH CHECK (true);

-- =====================================================
-- REALTIME PUBLICATION (Enable real-time subscriptions)
-- =====================================================

-- Enable realtime for tables that need it
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE gps_positions;
ALTER PUBLICATION supabase_realtime ADD TABLE emergency_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to tables
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_emergency_alerts_updated_at BEFORE UPDATE ON emergency_alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- DONE!
-- =====================================================
-- Database schema created successfully
-- Next: Enable Realtime in Supabase Dashboard → Database → Replication
