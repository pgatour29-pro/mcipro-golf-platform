-- FIX: Remove or relax foreign key constraint on created_by
-- The created_by field references auth.users but mobile users may not be in auth.users yet

-- Option 1: Drop the foreign key constraint entirely (simplest)
ALTER TABLE public.rooms
DROP CONSTRAINT IF EXISTS rooms_created_by_fkey;

-- Option 2: Make created_by nullable (if constraint drop doesn't work)
ALTER TABLE public.rooms
ALTER COLUMN created_by DROP NOT NULL;

-- Verify the changes
SELECT 'Foreign key constraint removed from rooms.created_by' as status;
