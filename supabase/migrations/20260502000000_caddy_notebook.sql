-- Caddy notebook: personal caddy tracking for golfers
create table if not exists public.caddy_notebook (
  id uuid primary key default gen_random_uuid(),
  golfer_id text not null,
  caddy_number text,
  caddy_name text,
  course_name text,
  notes text,
  rating integer check (rating >= 1 and rating <= 5),
  tip_amount numeric(8,0),
  language text,
  recommended_by text,
  caddy_system_id uuid,
  times_used integer default 1,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists caddy_notebook_golfer_idx on public.caddy_notebook (golfer_id);

alter table public.caddy_notebook enable row level security;

create policy "allow all caddy_notebook"
  on public.caddy_notebook for all
  using (true) with check (true);
