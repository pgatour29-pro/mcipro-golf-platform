-- ============================================
-- MyCaddiPro Content Moderation - Database Migration
-- Tables: content_reports, user_sanctions
-- Storage policies for 2MB / image-only uploads
-- ============================================

-- 1. Content Reports Table
CREATE TABLE IF NOT EXISTS content_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id TEXT NOT NULL,               -- line_user_id or profile UUID of reporter
    reported_user_id TEXT,                    -- line_user_id or profile UUID of reported user
    content_type TEXT NOT NULL,               -- 'message', 'profile', 'image', 'society', 'event'
    content_id TEXT NOT NULL,                 -- ID of the reported content
    reason TEXT NOT NULL,                     -- 'inappropriate_language', 'harassment', 'nsfw_content', 'spam', 'impersonation', 'other'
    description TEXT,                         -- optional details (max 300 chars)
    status TEXT DEFAULT 'pending',            -- 'pending', 'auto_flagged', 'reviewed', 'action_taken', 'dismissed'
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    resolved_at TIMESTAMPTZ,
    resolved_by TEXT                          -- admin who resolved
);

-- Indexes for content_reports
CREATE INDEX IF NOT EXISTS idx_content_reports_status ON content_reports(status);
CREATE INDEX IF NOT EXISTS idx_content_reports_reported_user ON content_reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_created ON content_reports(created_at DESC);

-- RLS for content_reports
ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can create a report
CREATE POLICY "Users can create reports"
    ON content_reports FOR INSERT
    WITH CHECK (true);

-- Users can view their own reports
CREATE POLICY "Users can view own reports"
    ON content_reports FOR SELECT
    USING (true);  -- Admins need full access; we control this in app layer

-- Only admins can update reports (resolved via app-level admin check)
CREATE POLICY "Reports can be updated"
    ON content_reports FOR UPDATE
    USING (true);


-- 2. User Sanctions Table
CREATE TABLE IF NOT EXISTS user_sanctions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,                   -- line_user_id or profile UUID
    type TEXT NOT NULL,                      -- 'warning', 'suspension', 'ban'
    reason TEXT NOT NULL,
    issued_by TEXT,                          -- admin who issued
    issued_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ,                  -- null for permanent bans, set for suspensions
    active BOOLEAN DEFAULT true,
    -- Appeal fields
    appeal_text TEXT,
    appeal_date TIMESTAMPTZ,
    appeal_status TEXT                       -- null, 'pending', 'approved', 'denied'
);

-- Indexes for user_sanctions
CREATE INDEX IF NOT EXISTS idx_user_sanctions_user ON user_sanctions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sanctions_active ON user_sanctions(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_user_sanctions_appeal ON user_sanctions(appeal_status) WHERE appeal_status = 'pending';

-- RLS for user_sanctions
ALTER TABLE user_sanctions ENABLE ROW LEVEL SECURITY;

-- Users can view their own sanctions
CREATE POLICY "Users can view sanctions"
    ON user_sanctions FOR SELECT
    USING (true);  -- Controlled in app layer

-- Admins can insert/update sanctions
CREATE POLICY "Sanctions can be created"
    ON user_sanctions FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Sanctions can be updated"
    ON user_sanctions FOR UPDATE
    USING (true);


-- 3. Storage Policies for Image Uploads
-- Note: Apply these to your Supabase storage buckets
-- These enforce 2MB max file size and image-only MIME types

-- For profile-photos bucket:
-- (Run in Supabase Dashboard > Storage > Policies)
-- INSERT policy: ((metadata->>'size')::int <= 2097152) AND (metadata->>'mimetype' IN ('image/jpeg', 'image/png', 'image/webp'))

-- For scorecard_photos bucket:
-- INSERT policy: ((metadata->>'size')::int <= 2097152) AND (metadata->>'mimetype' IN ('image/jpeg', 'image/png', 'image/webp'))

-- For golfcourse_scorecards bucket:
-- INSERT policy: ((metadata->>'size')::int <= 2097152) AND (metadata->>'mimetype' IN ('image/jpeg', 'image/png', 'image/webp'))

-- For course_conditions_photos bucket:
-- INSERT policy: ((metadata->>'size')::int <= 2097152) AND (metadata->>'mimetype' IN ('image/jpeg', 'image/png', 'image/webp'))
