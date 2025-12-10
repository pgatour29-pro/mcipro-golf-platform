-- =====================================================
-- MESSAGING SYSTEM TABLES
-- Run this in Supabase SQL Editor
-- =====================================================

-- STEP 1: Drop existing tables if they exist (clean slate)
DROP TABLE IF EXISTS event_message_reads CASCADE;
DROP TABLE IF EXISTS event_group_messages CASCADE;
DROP TABLE IF EXISTS direct_messages CASCADE;
DROP TABLE IF EXISTS announcement_reads CASCADE;
DROP TABLE IF EXISTS announcements CASCADE;

-- -----------------------------------------------------
-- Table 1: announcements
-- Society-wide broadcasts from organizers (one-way)
-- -----------------------------------------------------
CREATE TABLE announcements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    society_id uuid NOT NULL,
    sender_line_id text NOT NULL,
    title text NOT NULL,
    message_text text NOT NULL,
    priority text DEFAULT 'normal' CHECK (priority IN ('normal', 'important', 'urgent')),
    is_pinned boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_announcements_society ON announcements(society_id, created_at DESC);
CREATE INDEX idx_announcements_sender ON announcements(sender_line_id);

-- -----------------------------------------------------
-- Table 2: announcement_reads
-- Track who has read each announcement
-- -----------------------------------------------------
CREATE TABLE announcement_reads (
    announcement_id uuid NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
    reader_line_id text NOT NULL,
    read_at timestamptz DEFAULT now(),
    PRIMARY KEY (announcement_id, reader_line_id)
);

CREATE INDEX idx_announcement_reads_reader ON announcement_reads(reader_line_id);

-- -----------------------------------------------------
-- Table 3: direct_messages
-- Golfer-to-golfer private messages
-- -----------------------------------------------------
CREATE TABLE direct_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_line_id text NOT NULL,
    recipient_line_id text NOT NULL,
    message_text text NOT NULL,
    created_at timestamptz DEFAULT now(),
    is_read boolean DEFAULT false,
    read_at timestamptz
);

CREATE INDEX idx_dm_sender ON direct_messages(sender_line_id, created_at DESC);
CREATE INDEX idx_dm_recipient ON direct_messages(recipient_line_id, created_at DESC);
CREATE INDEX idx_dm_unread ON direct_messages(recipient_line_id, is_read) WHERE is_read = false;

-- -----------------------------------------------------
-- Table 4: event_group_messages
-- Auto-created group chats for event participants
-- -----------------------------------------------------
CREATE TABLE event_group_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id text NOT NULL,
    sender_line_id text NOT NULL,
    message_text text NOT NULL,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_event_messages_event ON event_group_messages(event_id, created_at DESC);
CREATE INDEX idx_event_messages_sender ON event_group_messages(sender_line_id);

-- -----------------------------------------------------
-- Table 5: event_message_reads
-- Track last read position per user per event
-- -----------------------------------------------------
CREATE TABLE event_message_reads (
    event_id text NOT NULL,
    reader_line_id text NOT NULL,
    last_read_at timestamptz DEFAULT now(),
    PRIMARY KEY (event_id, reader_line_id)
);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_message_reads ENABLE ROW LEVEL SECURITY;

-- Announcements policies
CREATE POLICY "Anyone can read announcements" ON announcements FOR SELECT USING (true);
CREATE POLICY "Anyone can insert announcements" ON announcements FOR INSERT WITH CHECK (true);

-- Announcement reads policies
CREATE POLICY "Anyone can read announcement_reads" ON announcement_reads FOR SELECT USING (true);
CREATE POLICY "Anyone can insert announcement_reads" ON announcement_reads FOR INSERT WITH CHECK (true);

-- Direct messages policies
CREATE POLICY "Anyone can read DMs" ON direct_messages FOR SELECT USING (true);
CREATE POLICY "Anyone can send DMs" ON direct_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update DMs" ON direct_messages FOR UPDATE USING (true);

-- Event messages policies
CREATE POLICY "Anyone can read event messages" ON event_group_messages FOR SELECT USING (true);
CREATE POLICY "Anyone can send event messages" ON event_group_messages FOR INSERT WITH CHECK (true);

-- Event message reads policies
CREATE POLICY "Anyone can manage event reads" ON event_message_reads FOR ALL USING (true);

-- =====================================================
-- VERIFICATION
-- =====================================================
SELECT 'SUCCESS - All 5 messaging tables created!' as status;

SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('announcements', 'announcement_reads', 'direct_messages', 'event_group_messages', 'event_message_reads')
ORDER BY table_name;
