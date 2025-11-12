#!/usr/bin/env node

/**
 * Fix Golf Buddies System Deployment
 * Checks what exists and drops/recreates as needed
 */

const fs = require('fs');
const path = require('path');

// Read the SQL file
const sqlPath = path.join(__dirname, '..', 'sql', 'create_buddy_system.sql');
const fullSQL = fs.readFileSync(sqlPath, 'utf8');

console.log('='.repeat(70));
console.log('GOLF BUDDIES SYSTEM - DEPLOYMENT FIX');
console.log('='.repeat(70));
console.log('');
console.log('The SQL was partially deployed. To fix:');
console.log('');
console.log('1. Go to: https://supabase.com/dashboard/project/pyeeplwsnupmhgbguwqs/sql/new');
console.log('');
console.log('2. Run this SQL to DROP existing objects:');
console.log('');
console.log('-'.repeat(70));
console.log(`
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own buddies" ON public.golf_buddies;
DROP POLICY IF EXISTS "Users can manage their own buddies" ON public.golf_buddies;
DROP POLICY IF EXISTS "Service role has full access to buddies" ON public.golf_buddies;
DROP POLICY IF EXISTS "Users can view their own groups" ON public.saved_groups;
DROP POLICY IF EXISTS "Users can manage their own groups" ON public.saved_groups;
DROP POLICY IF EXISTS "Service role has full access to groups" ON public.saved_groups;

-- Drop existing triggers
DROP TRIGGER IF EXISTS trigger_update_buddy_stats ON public.rounds;

-- Drop existing functions
DROP FUNCTION IF EXISTS public.update_buddy_play_stats();
DROP FUNCTION IF EXISTS public.get_recent_partners(TEXT, INTEGER);
DROP FUNCTION IF EXISTS public.get_buddy_suggestions(TEXT);

-- Drop existing tables
DROP TABLE IF EXISTS public.saved_groups CASCADE;
DROP TABLE IF EXISTS public.golf_buddies CASCADE;
`);
console.log('-'.repeat(70));
console.log('');
console.log('3. After running the DROP commands above, run the full SQL:');
console.log('');
console.log('   File: sql/create_buddy_system.sql');
console.log('');
console.log('4. Copy the ENTIRE contents of that file and paste into SQL Editor');
console.log('');
console.log('5. Click "Run"');
console.log('');
console.log('='.repeat(70));
console.log('');
