-- =====================================================
-- ADD MEMBER/NON-MEMBER FEE STRUCTURE TO SOCIETY EVENTS
-- =====================================================

-- Add new fee columns to society_events table
ALTER TABLE society_events
    ADD COLUMN IF NOT EXISTS member_fee DECIMAL(10,2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS non_member_fee DECIMAL(10,2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS other_fee DECIMAL(10,2) DEFAULT 0.00;

-- Migrate existing base_fee to member_fee for events that don't have it set
UPDATE society_events
SET member_fee = COALESCE(base_fee, 0)
WHERE member_fee = 0 AND base_fee > 0;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Member/Non-Member fee structure added to society_events!';
    RAISE NOTICE 'New columns: member_fee, non_member_fee, other_fee';
    RAISE NOTICE 'Migrated existing base_fee values to member_fee';
END $$;
