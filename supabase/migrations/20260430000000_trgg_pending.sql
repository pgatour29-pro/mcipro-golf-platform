-- Store unmatched TRGG Masterscoreboard names for future matching
create table if not exists public.trgg_pending (
  id            uuid primary key default gen_random_uuid(),
  trgg_name     text not null unique,
  trgg_handicap numeric(4,1),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.trgg_pending enable row level security;

create policy "allow all trgg_pending"
  on public.trgg_pending for all
  using (true) with check (true);
