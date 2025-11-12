#!/usr/bin/env node

/**
 * Diagnose Golf Buddies System Issues
 * Checks database tables and RLS policies
 */

console.log('='.repeat(70));
console.log('GOLF BUDDIES SYSTEM - DIAGNOSTIC TOOL');
console.log('='.repeat(70));
console.log('');
console.log('Copy and paste this SQL into Supabase SQL Editor:');
console.log('https://supabase.com/dashboard/project/pyeeplwsnupmhgbguwqs/sql/new');
console.log('');
console.log('-'.repeat(70));
console.log(`
-- Check if tables exist
SELECT
    tablename,
    schemaname
FROM pg_tables
WHERE tablename IN ('golf_buddies', 'saved_groups')
ORDER BY tablename;

-- Check RLS status
SELECT
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename IN ('golf_buddies', 'saved_groups');

-- Check policies
SELECT
    schemaname,
    tablename,
    policyname,
    cmd as operation,
    qual as using_expression
FROM pg_policies
WHERE tablename IN ('golf_buddies', 'saved_groups')
ORDER BY tablename, policyname;

-- Check functions exist
SELECT
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('get_buddy_suggestions', 'get_recent_partners', 'update_buddy_play_stats')
ORDER BY routine_name;
`);
console.log('-'.repeat(70));
console.log('');
console.log('Run this and send me the results.');
console.log('');
console.log('='.repeat(70));
