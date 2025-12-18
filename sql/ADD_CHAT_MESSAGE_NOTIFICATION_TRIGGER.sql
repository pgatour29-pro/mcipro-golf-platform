-- ============================================================================
-- ADD CHAT MESSAGE NOTIFICATION TRIGGER
-- ============================================================================
-- This adds a trigger to send LINE push notifications for chat_messages
-- (both direct and group messages)
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Update the trigger function to handle chat_messages table
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
    ELSIF TG_TABLE_NAME = 'chat_messages' THEN
        -- Handle chat_messages (both direct and group chats)
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
    ELSIF TG_TABLE_NAME = 'platform_announcements' THEN
        notification_type := 'platform_announcement';
        payload := jsonb_build_object(
            'type', notification_type,
            'record', row_to_json(NEW)
        );
    END IF;

    -- Only call if we have a payload
    IF payload IS NOT NULL THEN
        -- Call Edge Function asynchronously using pg_net
        PERFORM net.http_post(
            url := edge_function_url,
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || service_role_key
            ),
            body := payload
        );
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE WARNING 'LINE notification trigger error: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- CREATE TRIGGER FOR CHAT_MESSAGES
-- ============================================================================

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS trigger_chat_message_notification ON chat_messages;

-- Create trigger for chat_messages table
CREATE TRIGGER trigger_chat_message_notification
    AFTER INSERT ON chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION trigger_line_notification();

-- ============================================================================
-- VERIFY SETUP
-- ============================================================================
SELECT
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    tgfoid::regproc as function_name
FROM pg_trigger
WHERE tgname LIKE '%notification%';

SELECT 'Chat message notification trigger installed!' as status;
