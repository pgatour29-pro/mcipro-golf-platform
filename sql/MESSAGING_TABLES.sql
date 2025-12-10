-- =====================================================
-- MESSAGING SYSTEM TABLES
-- Run this in Supabase SQL Editor
-- =====================================================

-- STEP 1: Drop existing tables if they exist (clean slate)
DROP TABLE IF EXISTS group_chat_reads CASCADE;
DROP TABLE IF EXISTS group_chat_messages CASCADE;
DROP TABLE IF EXISTS group_chat_members CASCADE;
DROP TABLE IF EXISTS group_chats CASCADE;
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

-- -----------------------------------------------------
-- Table 6: group_chats
-- Custom group chats created by users
-- -----------------------------------------------------
CREATE TABLE group_chats (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    creator_line_id text NOT NULL,
    avatar_url text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_group_chats_creator ON group_chats(creator_line_id);

-- -----------------------------------------------------
-- Table 7: group_chat_members
-- Members of each group chat
-- -----------------------------------------------------
CREATE TABLE group_chat_members (
    group_id uuid NOT NULL REFERENCES group_chats(id) ON DELETE CASCADE,
    member_line_id text NOT NULL,
    joined_at timestamptz DEFAULT now(),
    role text DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    PRIMARY KEY (group_id, member_line_id)
);

CREATE INDEX idx_group_members_member ON group_chat_members(member_line_id);

-- -----------------------------------------------------
-- Table 8: group_chat_messages
-- Messages in custom group chats
-- -----------------------------------------------------
CREATE TABLE group_chat_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id uuid NOT NULL REFERENCES group_chats(id) ON DELETE CASCADE,
    sender_line_id text NOT NULL,
    message_text text NOT NULL,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_group_messages_group ON group_chat_messages(group_id, created_at DESC);
CREATE INDEX idx_group_messages_sender ON group_chat_messages(sender_line_id);

-- -----------------------------------------------------
-- Table 9: group_chat_reads
-- Track last read position per user per group
-- -----------------------------------------------------
CREATE TABLE group_chat_reads (
    group_id uuid NOT NULL REFERENCES group_chats(id) ON DELETE CASCADE,
    reader_line_id text NOT NULL,
    last_read_at timestamptz DEFAULT now(),
    PRIMARY KEY (group_id, reader_line_id)
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

-- Group chats policies
ALTER TABLE group_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_chat_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read group_chats" ON group_chats FOR SELECT USING (true);
CREATE POLICY "Anyone can create group_chats" ON group_chats FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update group_chats" ON group_chats FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete group_chats" ON group_chats FOR DELETE USING (true);

CREATE POLICY "Anyone can read group_chat_members" ON group_chat_members FOR SELECT USING (true);
CREATE POLICY "Anyone can manage group_chat_members" ON group_chat_members FOR ALL USING (true);

CREATE POLICY "Anyone can read group_chat_messages" ON group_chat_messages FOR SELECT USING (true);
CREATE POLICY "Anyone can send group_chat_messages" ON group_chat_messages FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can manage group_chat_reads" ON group_chat_reads FOR ALL USING (true);

-- =====================================================
-- VERIFICATION
-- =====================================================
SELECT 'SUCCESS - All 9 messaging tables created!' as status;

SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('announcements', 'announcement_reads', 'direct_messages', 'event_group_messages', 'event_message_reads', 'group_chats', 'group_chat_members', 'group_chat_messages', 'group_chat_reads')
ORDER BY table_name;
