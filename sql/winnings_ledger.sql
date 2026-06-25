-- Winnings ledger + per-society payout template
-- Player prize money (placings + 2's pot) that carries across events until collected/applied.

create table if not exists public.event_winnings (
    id uuid primary key default gen_random_uuid(),
    society_id text,
    event_id uuid,                 -- the event the winning was earned at (no FK: event sources vary)
    player_id text not null,
    player_name text,
    category text not null,        -- '1st','2nd','3rd',... ,'2s_pot','other'
    label text,                    -- display label, e.g. '1st Place', "2's Pot"
    amount numeric(10,2) not null default 0,   -- THB owed TO the player
    status text not null default 'owed',        -- owed | collected | applied | void
    settled_event_id uuid,         -- event where it was collected/applied
    settled_at timestamptz,
    settled_by text,
    settle_method text,            -- 'cash' | 'fees'
    notes text,
    created_at timestamptz not null default now(),
    created_by text
);
create index if not exists idx_event_winnings_player  on public.event_winnings(player_id);
create index if not exists idx_event_winnings_event   on public.event_winnings(event_id);
create index if not exists idx_event_winnings_status  on public.event_winnings(status);
create index if not exists idx_event_winnings_society on public.event_winnings(society_id);

-- Per-society default payout table so organizers don't retype every week.
create table if not exists public.society_payout_templates (
    society_id text primary key,
    places jsonb not null default '[]'::jsonb,   -- [{"label":"1st","amount":1200}, ...]
    twos_pot jsonb not null default '{}'::jsonb, -- {"enabled":true,"buyIn":50}
    updated_at timestamptz not null default now(),
    updated_by text
);

-- RLS: match the app's existing permissive tmp_* posture (browser uses the anon key).
-- Security hardening is tracked separately; keep consistent with current app tables.
alter table public.event_winnings enable row level security;
alter table public.society_payout_templates enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename='event_winnings' and policyname='tmp_select') then
    create policy tmp_select on public.event_winnings for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='event_winnings' and policyname='tmp_insert') then
    create policy tmp_insert on public.event_winnings for insert to anon, authenticated with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='event_winnings' and policyname='tmp_update') then
    create policy tmp_update on public.event_winnings for update to anon, authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='event_winnings' and policyname='tmp_delete') then
    create policy tmp_delete on public.event_winnings for delete to anon, authenticated using (true);
  end if;

  if not exists (select 1 from pg_policies where tablename='society_payout_templates' and policyname='tmp_select') then
    create policy tmp_select on public.society_payout_templates for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='society_payout_templates' and policyname='tmp_insert') then
    create policy tmp_insert on public.society_payout_templates for insert to anon, authenticated with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='society_payout_templates' and policyname='tmp_update') then
    create policy tmp_update on public.society_payout_templates for update to anon, authenticated using (true) with check (true);
  end if;
end $$;
