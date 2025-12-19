-- Check actual scorecards table columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'scorecards'
ORDER BY ordinal_position;

-- Show sample data
SELECT * FROM scorecards LIMIT 1;
