-- ============================================================================
-- MyCaddiPro — round deletion cascade migration
-- ============================================================================
-- Goal: deleting a round (rounds / trgg_rounds) should cleanly remove its
-- dependent rows (hole-by-hole scores, results, etc.) and NEVER fail on a
-- foreign-key constraint or leave orphaned child rows.
--
-- Run the sections IN ORDER. Sections 1–2 are read-only discovery/checks.
-- Section 3 (CASCADE) is the recommended fix. Section 4 (RPC) is an
-- alternative for when you want explicit control instead of DB cascade.
--
-- DO NOT run blindly — fill in the real child table/column names that
-- Section 1 reveals.
-- ============================================================================


-- ============================================================================
-- SECTION 1 — DISCOVER (read-only)
-- ============================================================================

-- 1a. All tables whose name mentions "round" — find every round-ish table.
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name ilike '%round%'
order by table_name;

-- 1b. Existing FOREIGN KEYS that point AT rounds / trgg_rounds, and their
--     current ON DELETE behavior. delete_rule of NO ACTION or RESTRICT means
--     deleting a parent round will FAIL while children exist. CASCADE is the fix.
select
  tc.table_name        as child_table,
  kcu.column_name      as child_column,
  ccu.table_name       as parent_table,
  ccu.column_name      as parent_column,
  rc.delete_rule       as current_on_delete,
  tc.constraint_name   as fk_name          -- use this EXACT name in Section 3
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
join information_schema.constraint_column_usage ccu
  on tc.constraint_name = ccu.constraint_name and tc.table_schema = ccu.table_schema
join information_schema.referential_constraints rc
  on tc.constraint_name = rc.constraint_name and tc.table_schema = rc.constraint_schema
where tc.constraint_type = 'FOREIGN KEY'
  and tc.table_schema = 'public'
  and ccu.table_name in ('rounds', 'trgg_rounds')
order by parent_table, child_table;

-- 1c. Columns that LOOK like a round reference but have NO foreign key behind
--     them. These are the silent-orphan risk: deleting a round leaves these
--     rows pointing at a round that no longer exists. Each of these should
--     become a real FK (Section 3, "no FK yet" case).
select c.table_name, c.column_name
from information_schema.columns c
where c.table_schema = 'public'
  and (c.column_name ilike '%round_id%' or c.column_name ilike 'round%id')
  and not exists (
    select 1
    from information_schema.key_column_usage kcu
    join information_schema.table_constraints tc
      on tc.constraint_name = kcu.constraint_name
     and tc.constraint_type = 'FOREIGN KEY'
     and tc.table_schema = kcu.table_schema
    where kcu.table_schema = 'public'
      and kcu.table_name = c.table_name
      and kcu.column_name = c.column_name
  )
order by c.table_name, c.column_name;


-- ============================================================================
-- SECTION 2 — ORPHAN CHECK (read-only; run before adding any NEW FK)
-- ============================================================================
-- You cannot add a foreign key if orphaned children already exist — Postgres
-- will reject the constraint. Run this for EACH child/parent pair from 1c.
-- Replace round_holes / rounds / round_id with the real names.

select count(*) as orphans
from public.round_holes ch
left join public.rounds p on p.id = ch.round_id
where ch.round_id is not null and p.id is null;

-- If orphans > 0, decide: delete them, or repoint them, before Section 3.
-- e.g. to delete orphans:
-- delete from public.round_holes ch
-- where ch.round_id is not null
--   and not exists (select 1 from public.rounds p where p.id = ch.round_id);


-- ============================================================================
-- SECTION 3 — RECOMMENDED FIX: ON DELETE CASCADE
-- ============================================================================
-- This makes the database delete a round's children automatically and
-- transactionally whenever the round is deleted. No code change to the
-- admin-delete-trgg-round function is needed once this is in place — its
-- existing .delete() on the parent will cascade.
--
-- DIRECTION MATTERS. CASCADE is defined on the CHILD's FK and fires when the
-- PARENT is deleted. You ONLY want it on round -> round-children relationships
-- (scores, hole rows, results — rows that are meaningless without the round).
-- NEVER put CASCADE on FKs where a round references an independent entity:
--   rounds.course_id -> courses   (deleting a round must NOT delete the course)
--   rounds.user_id   -> users     (deleting a round must NOT delete the user)
--   trgg_rounds -> trgg_user_map  (a round is not the owner of the mapping)
-- Cascade flows DOWN to dependent detail rows, never UP to parents.

-- ---- Case A: an FK already exists but is NO ACTION / RESTRICT --------------
-- You must drop and recreate it (Postgres can't alter the delete rule in place).
-- Use the EXACT fk_name from query 1b.

alter table public.round_holes drop constraint round_holes_round_id_fkey;
alter table public.round_holes
  add constraint round_holes_round_id_fkey
  foreign key (round_id) references public.rounds(id) on delete cascade;

-- ---- Case B: no FK exists yet (a column from query 1c) ---------------------
-- Run the Section 2 orphan check first, clean any orphans, then add the FK.

-- alter table public.<child_table>
--   add constraint <child_table>_round_id_fkey
--   foreign key (round_id) references public.rounds(id) on delete cascade;

-- Repeat Case A or B for EVERY child of rounds AND trgg_rounds found in 1b/1c,
-- e.g. trgg score/results tables -> trgg_rounds(id) on delete cascade.


-- ============================================================================
-- SECTION 4 — ALTERNATIVE: transactional delete via RPC
-- ============================================================================
-- Use this INSTEAD of Section 3 only if you want explicit control — e.g. you
-- want to soft-delete some children, keep an audit copy, or not rely on DB
-- cascade. The whole function body runs in ONE transaction: if any step fails,
-- everything rolls back (no half-deleted round).
--
-- Replace the child deletes with the real child tables from Section 1, and
-- make the parameter type match rounds.id (uuid? bigint? text?).

create or replace function public.admin_delete_trgg_round(p_round_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  -- delete children FIRST (fill in your real child tables) ...
  -- delete from public.trgg_scores       where round_id = p_round_id;
  -- delete from public.trgg_round_holes  where round_id = p_round_id;

  -- ... then the round itself
  delete from public.trgg_rounds where id = p_round_id;
  get diagnostics v_deleted = row_count;   -- 1 if a round was deleted, else 0
  return v_deleted;
end;
$$;

-- Lock it down: only the Edge Function (service_role) may call it.
revoke all on function public.admin_delete_trgg_round(uuid) from public, anon, authenticated;
grant execute on function public.admin_delete_trgg_round(uuid) to service_role;

-- If you take Section 4, change admin-delete-trgg-round/index.ts to call:
--   const { data, error } = await supabase
--     .rpc('admin_delete_trgg_round', { p_round_id: body.round_id });
--   // data is the integer row count; 0 => not_found
-- instead of the .from(TABLE).delete()... block.
