-- =====================================================================
-- SCHEMA: Notifications Table
-- =====================================================================
-- This script creates a table to store in-app and potentially push notifications for users.
-- =====================================================================

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL, -- The LINE user ID of the recipient
    type TEXT NOT NULL,    -- e.g., 'new_message', 'caddy_approved', 'booking_update', 'emergency_alert'
    message TEXT NOT NULL, -- The notification message
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB          -- Additional context like sender_id, conversation_id, link, etc.
);

COMMENT ON TABLE public.notifications IS 'Stores notifications for users within the application.';
COMMENT ON COLUMN public.notifications.user_id IS 'The LINE user ID of the recipient of the notification.';
COMMENT ON COLUMN public.notifications.type IS 'The type of notification (e.g., new chat message, caddy approval).';
COMMENT ON COLUMN public.notifications.message IS 'The display message of the notification.';
COMMENT ON COLUMN public.notifications.is_read IS 'True if the user has read the notification.';
COMMENT ON COLUMN public.notifications.metadata IS 'JSON data for extra context or deep-linking.';

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- RLS Policy: Users can view and manage their own notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can create their own notifications (e.g., system-generated)" ON public.notifications;
CREATE POLICY "Users can create their own notifications (e.g., system-generated)"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid()::text); -- Assuming notifications generated for self or by system

DROP POLICY IF EXISTS "Users can update their own notifications (e.g., mark as read)" ON public.notifications;
CREATE POLICY "Users can update their own notifications (e.g., mark as read)"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

-- Admins can view/manage all notifications (optional, if needed for support)
-- DROP POLICY IF EXISTS "Admins can manage all notifications" ON public.notifications;
-- CREATE POLICY "Admins can manage all notifications"
--   ON public.notifications FOR ALL
--   TO authenticated
--   USING ((SELECT role FROM public.user_profiles WHERE line_user_id = auth.uid()::text) = 'admin');

DO $$
BEGIN
    RAISE NOTICE '✅ Migration successful: notifications table created.';
END $$;
