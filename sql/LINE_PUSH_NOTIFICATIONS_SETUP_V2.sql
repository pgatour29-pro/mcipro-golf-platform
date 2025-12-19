-- ============================================================================
-- LINE PUSH NOTIFICATIONS SETUP V2
-- ============================================================================
-- Simplified version using pg_net for async HTTP calls
-- Run this in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. ENABLE PG_NET EXTENSION (for async HTTP calls)
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ============================================================================
-- 2. NOTIFICATION PREFERENCES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL UNIQUE,
    notify_new_events BOOLEAN DEFAULT true,
    notify_event_updates BOOLEAN DEFAULT true,
    notify_messages BOOLEAN DEFAULT true,
    notify_announcements BOOLEAN DEFAULT true,
    notify_reminders BOOLEAN DEFAULT true,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON notification_preferences(user_id);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read notification_preferences" ON notification_preferences;
CREATE POLICY "Anyone can read notification_preferences" ON notification_preferences FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can manage notification_preferences" ON notification_preferences;
CREATE POLICY "Anyone can manage notification_preferences" ON notification_preferences FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- 3. NOTIFICATION LOG TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS notification_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_type TEXT NOT NULL,
    recipient_count INTEGER DEFAULT 0,
    successful_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    source_table TEXT,
    source_id UUID,
    payload JSONB,
    response JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_log_type ON notification_log(notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_log_created ON notification_log(created_at);

ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read notification_log" ON notification_log;
CREATE POLICY "Anyone can read notification_log" ON notification_log FOR SELECT USING (true);

DROP POLICY IF EXISTS "System can insert notification_log" ON notification_log;
CREATE POLICY "System can insert notification_log" ON notification_log FOR INSERT WITH CHECK (true);

-- ============================================================================
-- 4. TRIGGER FUNCTION (Using pg_net for async calls)
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_line_notification()
RETURNS TRIGGER AS $$
DECLARE
    edge_function_url TEXT := 'https://pyeeplwsnupmhgbguwqs.supabase.co/functions/v1/line-push-notification';
    payload JSONB;
    notification_type TEXT;
    service_role_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTg0MzY2OSwiZXhwIjoyMDc1NDE5NjY5fQ.Gin1bCpBR_xCgDPzYsOPbNqIN-fBsd68lW1OBbi_wcA';
BEGIN
    -- Determine notification type based on table and operation
    IF TG_TABLE_NAME = 'society_events' THEN
        IF TG_OP = 'INSERT' THEN
            notification_type := 'new_event';
            payload := jsonb_build_object(
                'type', notification_type,
                'record', row_to_json(NEW)
            );
        ELSIF TG_OP = 'UPDATE' THEN
            notification_type := 'event_update';
            payload := jsonb_build_object(
                'type', notification_type,
                'record', row_to_json(NEW),
                'old_record', row_to_json(OLD)
            );
        END IF;
    ELSIF TG_TABLE_NAME = 'direct_messages' THEN
        notification_type := 'new_message';
        payload := jsonb_build_object(
            'type', notification_type,
            'record', row_to_json(NEW)
        );
    ELSIF TG_TABLE_NAME = 'announcements' THEN
        notification_type := 'announcement';
        payload := jsonb_build_object(
            'type', notification_type,
            'record', row_to_json(NEW)
        );
    END IF;

    -- Call Edge Function asynchronously using pg_net
    PERFORM net.http_post(
        url := edge_function_url,
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || service_role_key
        ),
        body := payload
    );

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE WARNING 'LINE notification trigger error: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. CREATE TRIGGERS
-- ============================================================================

-- Trigger for new events (only published/open events)
DROP TRIGGER IF EXISTS trigger_new_event_notification ON society_events;
CREATE TRIGGER trigger_new_event_notification
    AFTER INSERT ON society_events
    FOR EACH ROW
    WHEN (NEW.status = 'published' OR NEW.status = 'open' OR NEW.status IS NULL)
    EXECUTE FUNCTION trigger_line_notification();

-- Trigger for event updates (date, time, venue, or cancellation)
DROP TRIGGER IF EXISTS trigger_event_update_notification ON society_events;
CREATE TRIGGER trigger_event_update_notification
    AFTER UPDATE ON society_events
    FOR EACH ROW
    WHEN (
        OLD.event_date IS DISTINCT FROM NEW.event_date OR
        OLD.start_time IS DISTINCT FROM NEW.start_time OR
        OLD.course_name IS DISTINCT FROM NEW.course_name OR
        (OLD.status IS DISTINCT FROM 'cancelled' AND NEW.status = 'cancelled')
    )
    EXECUTE FUNCTION trigger_line_notification();

-- Trigger for direct messages
DROP TRIGGER IF EXISTS trigger_new_message_notification ON direct_messages;
CREATE TRIGGER trigger_new_message_notification
    AFTER INSERT ON direct_messages
    FOR EACH ROW
    EXECUTE FUNCTION trigger_line_notification();

-- Trigger for announcements
DROP TRIGGER IF EXISTS trigger_new_announcement_notification ON announcements;
CREATE TRIGGER trigger_new_announcement_notification
    AFTER INSERT ON announcements
    FOR EACH ROW
    EXECUTE FUNCTION trigger_line_notification();

-- ============================================================================
-- 6. INSERT DEFAULT PREFERENCES FOR EXISTING USERS
-- ============================================================================
INSERT INTO notification_preferences (user_id)
SELECT DISTINCT line_user_id
FROM user_profiles
WHERE line_user_id LIKE 'U%'
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- 7. MANUAL TEST FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION test_line_notification(p_user_id TEXT DEFAULT 'U2b6d976f19bca4b2f4374ae0e10ed873')
RETURNS TEXT AS $$
DECLARE
    edge_function_url TEXT := 'https://pyeeplwsnupmhgbguwqs.supabase.co/functions/v1/line-push-notification';
    service_role_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTg0MzY2OSwiZXhwIjoyMDc1NDE5NjY5fQ.Gin1bCpBR_xCgDPzYsOPbNqIN-fBsd68lW1OBbi_wcA';
    payload JSONB;
BEGIN
    payload := jsonb_build_object(
        'type', 'new_event',
        'record', jsonb_build_object(
            'id', gen_random_uuid(),
            'title', 'Test Event Notification',
            'date', CURRENT_DATE + 7,
            'venue', 'Test Golf Club',
            'description', 'This is a test notification from MyCaddiPro',
            'society_id', '7c0e4b72-d925-44bc-afda-38259a7ba346',
            'status', 'published'
        )
    );

    PERFORM net.http_post(
        url := edge_function_url,
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || service_role_key
        ),
        body := payload
    );

    RETURN 'Test notification sent! Check your LINE app.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- DONE!
-- ============================================================================
SELECT 'LINE Push Notifications Setup Complete!' as status;
SELECT 'Run: SELECT test_line_notification(); to test' as next_step;
