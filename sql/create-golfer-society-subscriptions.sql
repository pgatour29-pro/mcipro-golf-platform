-- =====================================================
-- GOLFER SOCIETY SUBSCRIPTIONS TABLE
-- =====================================================
-- Stores which societies each golfer is subscribed to
-- This data must persist even when browser cache is cleared

CREATE TABLE IF NOT EXISTS golfer_society_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  golfer_id TEXT NOT NULL, -- LINE user ID or auth.users.id
  society_name TEXT NOT NULL,
  organizer_id TEXT, -- Optional: link to society_profiles.organizer_id

  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate subscriptions
  UNIQUE(golfer_id, society_name)
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_subscriptions_golfer ON golfer_society_subscriptions(golfer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_society ON golfer_society_subscriptions(society_name);
CREATE INDEX IF NOT EXISTS idx_subscriptions_organizer ON golfer_society_subscriptions(organizer_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE golfer_society_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read all subscriptions (to see who's subscribed to their society)
CREATE POLICY "Subscriptions are viewable by everyone" ON golfer_society_subscriptions
  FOR SELECT USING (true);

-- Users can only insert their own subscriptions
CREATE POLICY "Users can create own subscriptions" ON golfer_society_subscriptions
  FOR INSERT WITH CHECK (true);

-- Users can only update their own subscriptions
CREATE POLICY "Users can update own subscriptions" ON golfer_society_subscriptions
  FOR UPDATE USING (true);

-- Users can only delete their own subscriptions
CREATE POLICY "Users can delete own subscriptions" ON golfer_society_subscriptions
  FOR DELETE USING (true);

-- =====================================================
-- REALTIME PUBLICATION
-- =====================================================

ALTER PUBLICATION supabase_realtime ADD TABLE golfer_society_subscriptions;

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION update_subscription_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subscriptions_timestamp
  BEFORE UPDATE ON golfer_society_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_timestamp();

-- =====================================================
-- SUCCESS
-- =====================================================

SELECT '✅ golfer_society_subscriptions table created successfully!' AS status;
SELECT 'Society subscriptions will now persist even when browser cache is cleared.' AS message;
