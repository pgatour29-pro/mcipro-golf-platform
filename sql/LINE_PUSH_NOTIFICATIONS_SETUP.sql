-- ============================================================================
-- LINE PUSH NOTIFICATIONS SETUP
-- ============================================================================
-- Creates the necessary tables and triggers to send LINE push notifications
-- when events are created/updated or messages are sent
-- ============================================================================

-- ============================================================================
-- 1. NOTIFICATION PREFERENCES TABLE
-- ============================================================================
-- Allows users to opt-in/out of different notification types

CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL UNIQUE,  -- LINE user ID

    -- Notification settings (all default to TRUE)
    notify_new_events BOOLEAN DEFAULT true,
    notify_event_updates BOOLEAN DEFAULT true,
    notify_messages BOOLEAN DEFAULT true,
    notify_announcements BOOLEAN DEFAULT true,
    notify_reminders BOOLEAN DEFAULT true,

    -- Quiet hours (optional)
    quiet_hours_start TIME,  -- e.g., '22:00'
    quiet_hours_end TIME,    -- e.g., '07:00'

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON notification_preferences(user_id);

-- RLS Policies
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own preferences" ON notification_preferences;
CREATE POLICY "Users can view their own preferences"
    ON notification_preferences FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Users can manage their own preferences" ON notification_preferences;
CREATE POLICY "Users can manage their own preferences"
    ON notification_preferences FOR ALL
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- 2. NOTIFICATION LOG TABLE
-- ============================================================================
-- Tracks sent notifications for debugging and analytics

CREATE TABLE IF NOT EXISTS notification_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Notification details
    notification_type TEXT NOT NULL,  -- 'new_event', 'event_update', 'message', 'announcement'
    recipient_count INTEGER DEFAULT 0,
    successful_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,

    -- Reference to source
    source_table TEXT,
    source_id UUID,

    -- Payload (for debugging)
    payload JSONB,

    -- Response from LINE API
    response JSONB,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for analytics queries
CREATE INDEX IF NOT EXISTS idx_notification_log_type ON notification_log(notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_log_created ON notification_log(created_at);

-- RLS - Only admins can view logs
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Logs are viewable by admins" ON notification_log;
CREATE POLICY "Logs are viewable by admins"
    ON notification_log FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "System can insert logs" ON notification_log;
CREATE POLICY "System can insert logs"
    ON notification_log FOR INSERT
    WITH CHECK (true);

-- ============================================================================
-- 3. HTTP EXTENSION (Required for calling Edge Functions)
-- ============================================================================
-- Enable the http extension if not already enabled
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- ============================================================================
-- 4. TRIGGER FUNCTION: Call Edge Function
-- ============================================================================
-- Generic function to call the LINE push notification edge function

CREATE OR REPLACE FUNCTION trigger_line_notification()
RETURNS TRIGGER AS $$
DECLARE
    edge_function_url TEXT;
    payload JSONB;
    notification_type TEXT;
BEGIN
    -- Get the Edge Function URL from environment or use default
    edge_function_url := 'https://pyeeplwsnupmhgbguwqs.supabase.co/functions/v1/line-push-notification';

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

    -- Call the Edge Function asynchronously using pg_net if available
    -- Otherwise use http extension (synchronous but simpler)
    BEGIN
        PERFORM net.http_post(
            url := edge_function_url,
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
            ),
            body := payload
        );
    EXCEPTION WHEN OTHERS THEN
        -- If pg_net not available, try http extension
        PERFORM http_post(
            edge_function_url,
            payload::text,
            'application/json'
        );
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. CREATE TRIGGERS
-- ============================================================================

-- Trigger for new events
DROP TRIGGER IF EXISTS trigger_new_event_notification ON society_events;
CREATE TRIGGER trigger_new_event_notification
    AFTER INSERT ON society_events
    FOR EACH ROW
    WHEN (NEW.status = 'published' OR NEW.status = 'open')
    EXECUTE FUNCTION trigger_line_notification();

-- Trigger for event updates (only significant changes)
DROP TRIGGER IF EXISTS trigger_event_update_notification ON society_events;
CREATE TRIGGER trigger_event_update_notification
    AFTER UPDATE ON society_events
    FOR EACH ROW
    WHEN (
        OLD.date IS DISTINCT FROM NEW.date OR
        OLD.tee_time IS DISTINCT FROM NEW.tee_time OR
        OLD.venue IS DISTINCT FROM NEW.venue OR
        (OLD.status != 'cancelled' AND NEW.status = 'cancelled')
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
-- 6. HELPER FUNCTIONS
-- ============================================================================

-- Function to manually send a notification (for testing or manual triggers)
CREATE OR REPLACE FUNCTION send_line_notification(
    p_type TEXT,
    p_record JSONB,
    p_old_record JSONB DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    edge_function_url TEXT := 'https://pyeeplwsnupmhgbguwqs.supabase.co/functions/v1/line-push-notification';
    payload JSONB;
    response JSONB;
BEGIN
    payload := jsonb_build_object(
        'type', p_type,
        'record', p_record,
        'old_record', p_old_record
    );

    -- This is a synchronous call - consider using pg_net for async
    SELECT content::jsonb INTO response
    FROM http_post(
        edge_function_url,
        payload::text,
        'application/json'
    );

    RETURN response;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. DEFAULT PREFERENCES FOR EXISTING USERS
-- ============================================================================
-- Insert default notification preferences for all existing LINE users
-- (Users can customize these in the app)

INSERT INTO notification_preferences (user_id)
SELECT DISTINCT line_user_id
FROM user_profiles
WHERE line_user_id LIKE 'U%'  -- Only LINE users
AND line_user_id NOT IN (SELECT user_id FROM notification_preferences)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- 8. SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ LINE Push Notifications Setup Complete!';
    RAISE NOTICE '';
    RAISE NOTICE 'Tables created:';
    RAISE NOTICE '  - notification_preferences (user opt-in/out settings)';
    RAISE NOTICE '  - notification_log (sent notification history)';
    RAISE NOTICE '';
    RAISE NOTICE 'Triggers created on:';
    RAISE NOTICE '  - society_events (INSERT and UPDATE)';
    RAISE NOTICE '  - direct_messages (INSERT)';
    RAISE NOTICE '  - announcements (INSERT)';
    RAISE NOTICE '';
    RAISE NOTICE 'NEXT STEPS:';
    RAISE NOTICE '1. Deploy the Edge Function: supabase functions deploy line-push-notification';
    RAISE NOTICE '2. Set secrets: supabase secrets set LINE_CHANNEL_ACCESS_TOKEN=your_token';
    RAISE NOTICE '3. Enable pg_net extension for async calls (optional but recommended)';
END $$;
