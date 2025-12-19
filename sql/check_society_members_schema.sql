-- Check the actual structure of society_members table
SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'society_members' AND table_schema = 'public' ORDER BY ordinal_position;
