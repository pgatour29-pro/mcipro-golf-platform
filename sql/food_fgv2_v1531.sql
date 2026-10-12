-- v1531 FGV2 — the food module as a real food-ordering app (Pete 2026-10-12).
-- 1. menu_items.photo: one real photo per dish (public/images/food/*.jpg; the client whitelists the path).
-- 2. Starter add-ons on a few dishes of the shared default menu (kitchens edit them in Menu Manager).
-- 3. food_deals: coupons a kitchen posts (percent off the food, or free hole delivery). Claim → applied at checkout.
-- 4. food_orders.deal_code + discount so the kitchen ticket shows what was applied.
-- Same open-table model as menu_items / food_orders (security Phase 2 covers the food tables together).
-- Idempotent.

alter table public.menu_items add column if not exists photo text;

update public.menu_items m set photo = 'images/food/' || v.slug || '.jpg'
from (values
  ('Caesar Salad','caesar-salad'),('Shrimp Cocktail','shrimp-cocktail'),('Tom Yum Soup','tom-yum-soup'),('Spring Rolls','spring-rolls'),
  ('Chicken Satay','chicken-satay'),('Wagyu Steak','wagyu-steak'),('Grilled Salmon','grilled-salmon'),('Club Sandwich','club-sandwich'),
  ('Thai Green Curry','thai-green-curry'),('Pad Thai','pad-thai'),('Fish & Chips','fish-chips'),('Massaman Curry','massaman-curry'),
  ('Fresh Orange Juice','orange-juice'),('Premium Coffee','coffee'),('Sparkling Water','sparkling-water'),('House Wine','house-wine'),
  ('Thai Iced Tea','thai-iced-tea'),('Coconut Water','coconut-water'),('Heineken Small','heineken'),('Heineken Large','heineken'),
  ('Chang Beer Small','chang'),('Chang Beer Large','chang'),('Singha Beer Small','singha'),('Singha Beer Large','singha'),
  ('Smoothie Bowl','smoothie-bowl'),('Mango Sticky Rice','mango-sticky-rice'),('Chocolate Cake','chocolate-cake'),
  ('Ice Cream Selection','ice-cream'),('Fruit Platter','fruit-platter'),('Chicken Wings','chicken-wings'),('Nachos Supreme','nachos'),
  ('Golf Course Mix','golf-course-mix'),('Energy Bar','energy-bar')
) as v(name, slug)
where m.name = v.name and m.course_name is null and m.photo is null;

update public.menu_items m set addons = v.a::jsonb
from (values
  ('Pad Thai',         '[{"name":"Extra shrimp","price":80},{"name":"Fried egg","price":20},{"name":"Extra peanuts","price":0},{"name":"Bean sprouts on the side","price":0}]'),
  ('Thai Green Curry', '[{"name":"Extra jasmine rice","price":30},{"name":"Fried egg","price":20}]'),
  ('Massaman Curry',   '[{"name":"Extra jasmine rice","price":30},{"name":"Roti","price":40}]'),
  ('Caesar Salad',     '[{"name":"Grilled chicken","price":90},{"name":"Bacon","price":50}]'),
  ('Club Sandwich',    '[{"name":"Extra fries","price":50},{"name":"Fried egg","price":20}]'),
  ('Chicken Wings',    '[{"name":"Extra dip","price":0},{"name":"Extra hot sauce","price":0}]'),
  ('Premium Coffee',   '[{"name":"Oat milk","price":20},{"name":"Extra shot","price":30}]')
) as v(name, a)
where m.name = v.name and m.course_name is null and coalesce(jsonb_array_length(m.addons), 0) = 0;

create table if not exists public.food_deals (
  id uuid primary key default gen_random_uuid(),
  course_name text,                       -- null = every kitchen on the shared menu
  title text not null,
  detail text,
  code text not null,
  kind text not null default 'percent' check (kind in ('percent', 'free_delivery')),
  value numeric not null default 0 check (value >= 0 and value <= 90),
  ends_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.food_deals enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'food_deals' and policyname = 'food_deals_select') then
    create policy food_deals_select on public.food_deals for select using (true);
    create policy food_deals_insert on public.food_deals for insert with check (true);
    create policy food_deals_update on public.food_deals for update using (true);
    create policy food_deals_delete on public.food_deals for delete using (true);
  end if;
end $$;
grant select, insert, update, delete on public.food_deals to anon, authenticated;

alter table public.food_orders add column if not exists deal_code text;
alter table public.food_orders add column if not exists discount numeric not null default 0;

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'food_deals') then
    alter publication supabase_realtime add table public.food_deals;
  end if;
end $$;
