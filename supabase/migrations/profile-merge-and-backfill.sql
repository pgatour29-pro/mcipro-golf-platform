-- ============================================================================
-- Profiles: merge duplicates, backfill the 5, assess the anonymous legacy
-- Run in order. Sections 1-2 are read-only.
-- ============================================================================

-- 1. Identify the duplicate -> canonical pairs. A "duplicate" is an unlinked row
--    whose display_name reconstructs to a LINE id ALREADY held by a real profile.
select
  dup.id           as dup_id,
  dup.display_name as dup_name,
  canon.id         as canon_id,
  canon.line_user_id
from public.profiles dup
join public.profiles canon
  on canon.line_user_id = 'U' || substring(dup.display_name from 2)
where dup.line_user_id is null
  and dup.display_name like 'u%'
  and length(dup.display_name) = 33
  and canon.line_user_id is not null;
-- Expect 2 rows (Pete, Donald). These are MERGED, not backfilled.


-- 2. Every table that references profiles(id) — so the merge repoints them ALL.
select tc.table_name, kcu.column_name
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
join information_schema.constraint_column_usage ccu
  on tc.constraint_name = ccu.constraint_name and tc.table_schema = ccu.table_schema
where tc.constraint_type = 'FOREIGN KEY'
  and tc.table_schema = 'public'
  and ccu.table_name = 'profiles' and ccu.column_name = 'id'
order by tc.table_name;


-- 3. MERGE — run PER PAIR (only 2; do them deliberately). For each referencing
--    table from step 2, repoint dup_id -> canon_id, guarding against unique
--    collisions (where canon already has the equivalent row), then delete dup.
--    Example for room_members (membership unique on room_id,user_id):
--
-- begin;
--   -- repoint where it won't collide with an existing canon membership
--   update public.room_members rm
--   set user_id = '<CANON_ID>'
--   where rm.user_id = '<DUP_ID>'
--     and not exists (select 1 from public.room_members x
--                     where x.room_id = rm.room_id and x.user_id = '<CANON_ID>');
--   -- drop dup rows that would have collided (canon already in that room)
--   delete from public.room_members where user_id = '<DUP_ID>';
--   -- repoint the non-membership tables (no unique conflict): chat_messages.sender, etc.
--   update public.chat_messages set sender = '<CANON_ID>' where sender = '<DUP_ID>';
--   -- ... repeat for every table/column from step 2 ...
--   delete from public.profiles where id = '<DUP_ID>';
-- commit;


-- 4. BACKFILL the 5 — DUPE-SAFE: only reconstruct ids that DON'T already belong
--    to a linked profile (so duplicates never slip in even if merge is pending).
-- Dry run:
select p.id, p.display_name, 'U' || substring(p.display_name from 2) as line_id
from public.profiles p
where p.line_user_id is null
  and p.display_name like 'u%'
  and length(p.display_name) = 33
  and not exists (
    select 1 from public.profiles q
    where q.line_user_id = 'U' || substring(p.display_name from 2)
  );
-- Apply (same WHERE):
update public.profiles p
set line_user_id = 'U' || substring(p.display_name from 2)
where p.line_user_id is null
  and p.display_name like 'u%'
  and length(p.display_name) = 33
  and not exists (
    select 1 from public.profiles q
    where q.line_user_id = 'U' || substring(p.display_name from 2)
  );
-- Verify no shared line ids:
select line_user_id, count(*) from public.profiles
where line_user_id is not null group by 1 having count(*) > 1;


-- 5. ANONYMOUS LEGACY (the 38) — disposability check before deciding cleanup.
--    How much chat history is tied to them, and how recent?
select
  count(*) filter (where p.line_user_id is null
                     and p.display_name like 'user\_%') as anon_profiles,
  count(distinct rm.room_id)                            as rooms_touched,
  count(cm.*)                                           as messages,
  max(cm.created_at)                                    as latest_message
from public.profiles p
left join public.room_members rm on rm.user_id = p.id
left join public.chat_messages cm on cm.room_id = rm.room_id
where p.line_user_id is null and p.display_name like 'user\_%';

-- OPTIONAL cleanup (only if the above confirms it's disposable; run later, not
-- required for the migration). Deletes anonymous profiles; cascade handles their
-- orphaned chat rows IF FKs are ON DELETE CASCADE — otherwise delete children first.
-- delete from public.profiles
-- where line_user_id is null and display_name like 'user\_%';
