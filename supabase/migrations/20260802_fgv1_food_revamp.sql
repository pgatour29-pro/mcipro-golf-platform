-- FGV1 food revamp: menu catalogue, item media, favorites, kitchen settings.
-- Fully idempotent. Seed block runs ONLY when menu_items is empty.
-- RLS style copied from existing food_orders policies: PUBLIC role, USING/WITH CHECK (true).

-- ============================================================
-- 1) TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_name text,                              -- NULL = default menu shared by all kitchens
  name text NOT NULL,
  description text DEFAULT '',
  price numeric NOT NULL,
  category text NOT NULL,                        -- appetizers|mains|beverages|desserts|snacks (free text)
  station text NOT NULL DEFAULT 'kitchen',       -- wok|grill|bar|dessert|kitchen
  prep_min int NOT NULL DEFAULT 10,
  art text NOT NULL DEFAULT 'fgCurry',           -- FGV1 sprite symbol id
  wash1 text NOT NULL DEFAULT '#f6e7d4',
  wash2 text NOT NULL DEFAULT '#fdf7ef',
  available boolean NOT NULL DEFAULT true,
  popular boolean NOT NULL DEFAULT false,
  spice_levels jsonb,                            -- e.g. ["No spice","Mild","Thai hot"] or null
  addons jsonb NOT NULL DEFAULT '[]'::jsonb,     -- [{name, price}]
  sort int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  eightysix_at timestamptz,
  eightysix_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS menu_items_course_idx ON menu_items(course_name);

CREATE TABLE IF NOT EXISTS food_item_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  url text NOT NULL,
  sort int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS food_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  line_user_id text NOT NULL,
  item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (line_user_id, item_id)
);

CREATE TABLE IF NOT EXISTS kitchen_settings (
  course_name text PRIMARY KEY,
  phone text,
  chime boolean NOT NULL DEFAULT true,
  push_staff boolean NOT NULL DEFAULT true,
  push_runner boolean NOT NULL DEFAULT true,
  push_golfer boolean NOT NULL DEFAULT true,
  aging_min int NOT NULL DEFAULT 12,
  auto_close boolean NOT NULL DEFAULT false,
  close_time text DEFAULT '17:30',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 2) food_orders additions (status stays free text: no CHECK constraint exists)
-- ============================================================

ALTER TABLE food_orders ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE food_orders ADD COLUMN IF NOT EXISTS runner_name text;
ALTER TABLE food_orders ADD COLUMN IF NOT EXISTS runner_cart text;

-- ============================================================
-- 3) RLS
-- ============================================================

ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_item_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE kitchen_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS menu_items_select ON menu_items;
DROP POLICY IF EXISTS menu_items_insert ON menu_items;
DROP POLICY IF EXISTS menu_items_update ON menu_items;
DROP POLICY IF EXISTS menu_items_delete ON menu_items;
CREATE POLICY menu_items_select ON menu_items FOR SELECT USING (true);
CREATE POLICY menu_items_insert ON menu_items FOR INSERT WITH CHECK (true);
CREATE POLICY menu_items_update ON menu_items FOR UPDATE USING (true);
CREATE POLICY menu_items_delete ON menu_items FOR DELETE USING (true);

DROP POLICY IF EXISTS food_item_media_select ON food_item_media;
DROP POLICY IF EXISTS food_item_media_insert ON food_item_media;
DROP POLICY IF EXISTS food_item_media_update ON food_item_media;
DROP POLICY IF EXISTS food_item_media_delete ON food_item_media;
CREATE POLICY food_item_media_select ON food_item_media FOR SELECT USING (true);
CREATE POLICY food_item_media_insert ON food_item_media FOR INSERT WITH CHECK (true);
CREATE POLICY food_item_media_update ON food_item_media FOR UPDATE USING (true);
CREATE POLICY food_item_media_delete ON food_item_media FOR DELETE USING (true);

DROP POLICY IF EXISTS food_favorites_select ON food_favorites;
DROP POLICY IF EXISTS food_favorites_insert ON food_favorites;
DROP POLICY IF EXISTS food_favorites_delete ON food_favorites;
CREATE POLICY food_favorites_select ON food_favorites FOR SELECT USING (true);
CREATE POLICY food_favorites_insert ON food_favorites FOR INSERT WITH CHECK (true);
CREATE POLICY food_favorites_delete ON food_favorites FOR DELETE USING (true);

DROP POLICY IF EXISTS kitchen_settings_select ON kitchen_settings;
DROP POLICY IF EXISTS kitchen_settings_insert ON kitchen_settings;
DROP POLICY IF EXISTS kitchen_settings_update ON kitchen_settings;
CREATE POLICY kitchen_settings_select ON kitchen_settings FOR SELECT USING (true);
CREATE POLICY kitchen_settings_insert ON kitchen_settings FOR INSERT WITH CHECK (true);
CREATE POLICY kitchen_settings_update ON kitchen_settings FOR UPDATE USING (true);

-- ============================================================
-- 4) SEED (default menu, course_name = NULL) - only when menu_items is empty
--    Source: public/index.html FoodOrderingSystem.menuItems (33 items)
-- ============================================================

DO $seed$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM menu_items) THEN

    INSERT INTO menu_items
      (course_name, name, description, price, category, station, prep_min, art, wash1, wash2, available, popular, spice_levels, addons, sort)
    VALUES
      -- Appetizers & Starters
      (NULL, 'Caesar Salad',         'Fresh romaine lettuce with parmesan and croutons', 280,  'appetizers', 'grill',   10, 'fgSalad',   '#d9efe1', '#f2faf5', true, true,  NULL,                                        '[]'::jsonb, 1),
      (NULL, 'Shrimp Cocktail',      'Premium shrimp with cocktail sauce',               420,  'appetizers', 'grill',    5, 'fgSpring',  '#f6e7d4', '#fdf7ef', true, false, NULL,                                        '[]'::jsonb, 2),
      (NULL, 'Tom Yum Soup',         'Authentic Thai hot and sour soup',                 240,  'appetizers', 'grill',   15, 'fgSpring',  '#f6e7d4', '#fdf7ef', true, true,  '["No spice","Mild","Thai hot"]'::jsonb,     '[]'::jsonb, 3),
      (NULL, 'Spring Rolls',         'Fresh vegetables wrapped in rice paper',           180,  'appetizers', 'grill',    8, 'fgSpring',  '#f6e7d4', '#fdf7ef', true, false, NULL,                                        '[]'::jsonb, 4),
      (NULL, 'Chicken Satay',        'Grilled chicken skewers with peanut sauce',        320,  'appetizers', 'grill',   12, 'fgSpring',  '#f6e7d4', '#fdf7ef', true, true,  NULL,                                        '[]'::jsonb, 5),

      -- Main Courses
      (NULL, 'Wagyu Steak',          'Premium A5 Wagyu beef with vegetables',           1680,  'mains',      'grill',   25, 'fgCurry',   '#d9efe1', '#f2faf5', true, true,  NULL,                                        '[]'::jsonb, 6),
      (NULL, 'Grilled Salmon',       'Norwegian salmon with lemon butter sauce',         680,  'mains',      'grill',   18, 'fgCurry',   '#d9efe1', '#f2faf5', true, true,  NULL,                                        '[]'::jsonb, 7),
      (NULL, 'Club Sandwich',        'Triple-deck sandwich with fries',                  380,  'mains',      'grill',   12, 'fgClub',    '#f6e7d4', '#fdf7ef', true, false, NULL,                                        '[]'::jsonb, 8),
      (NULL, 'Thai Green Curry',     'Authentic green curry with jasmine rice',          320,  'mains',      'wok',     20, 'fgCurry',   '#d9efe1', '#f2faf5', true, true,  '["No spice","Mild","Thai hot"]'::jsonb,     '[]'::jsonb, 9),
      (NULL, 'Pad Thai',             'Classic stir-fried rice noodles',                  280,  'mains',      'wok',     15, 'fgNoodles', '#d9efe1', '#f2faf5', true, true,  '["No spice","Mild","Thai hot"]'::jsonb,     '[]'::jsonb, 10),
      (NULL, 'Fish & Chips',         'Beer-battered fish with crispy fries',             420,  'mains',      'grill',   16, 'fgFish',    '#f6e7d4', '#fdf7ef', true, false, NULL,                                        '[]'::jsonb, 11),
      (NULL, 'Massaman Curry',       'Rich Thai curry with potatoes',                    340,  'mains',      'wok',     22, 'fgCurry',   '#d9efe1', '#f2faf5', true, false, '["No spice","Mild","Thai hot"]'::jsonb,     '[]'::jsonb, 12),

      -- Beverages
      (NULL, 'Fresh Orange Juice',   'Freshly squeezed orange juice',                    120,  'beverages',  'bar',      3, 'fgBottle',  '#d9e6f8', '#f1f6fd', true, true,  NULL,                                        '[]'::jsonb, 13),
      (NULL, 'Premium Coffee',       'Arabica coffee beans',                             150,  'beverages',  'bar',      5, 'fgCoffee',  '#d9e6f8', '#f1f6fd', true, true,  NULL,                                        '[]'::jsonb, 14),
      (NULL, 'Sparkling Water',      'San Pellegrino sparkling water',                    80,  'beverages',  'bar',      1, 'fgBottle',  '#d9e6f8', '#f1f6fd', true, false, NULL,                                        '[]'::jsonb, 15),
      (NULL, 'House Wine',           'Selection of red or white wine',                   280,  'beverages',  'bar',      2, 'fgBottle',  '#d9e6f8', '#f1f6fd', true, false, NULL,                                        '[]'::jsonb, 16),
      (NULL, 'Thai Iced Tea',        'Traditional Thai tea with condensed milk',         100,  'beverages',  'bar',      4, 'fgCoffee',  '#d9e6f8', '#f1f6fd', true, true,  NULL,                                        '[]'::jsonb, 17),
      (NULL, 'Coconut Water',        'Fresh young coconut water',                         90,  'beverages',  'bar',      2, 'fgBottle',  '#d9e6f8', '#f1f6fd', true, true,  NULL,                                        '[]'::jsonb, 18),
      (NULL, 'Heineken Small',       'Premium Dutch beer (330ml)',                       120,  'beverages',  'bar',      1, 'fgBottle',  '#d9e6f8', '#f1f6fd', true, true,  NULL,                                        '[]'::jsonb, 19),
      (NULL, 'Heineken Large',       'Premium Dutch beer (640ml)',                       180,  'beverages',  'bar',      1, 'fgBottle',  '#d9e6f8', '#f1f6fd', true, true,  NULL,                                        '[]'::jsonb, 20),
      (NULL, 'Chang Beer Small',     'Local Thai beer (330ml)',                          100,  'beverages',  'bar',      1, 'fgBeer',    '#f4e6c8', '#fcf6e9', true, false, NULL,                                        '[]'::jsonb, 21),
      (NULL, 'Chang Beer Large',     'Local Thai beer (640ml)',                          150,  'beverages',  'bar',      1, 'fgBeer',    '#f4e6c8', '#fcf6e9', true, false, NULL,                                        '[]'::jsonb, 22),
      (NULL, 'Singha Beer Small',    'Classic Thai beer (330ml)',                        110,  'beverages',  'bar',      1, 'fgBeer',    '#f4e6c8', '#fcf6e9', true, false, NULL,                                        '[]'::jsonb, 23),
      (NULL, 'Singha Beer Large',    'Classic Thai beer (640ml)',                        160,  'beverages',  'bar',      1, 'fgBeer',    '#f4e6c8', '#fcf6e9', true, false, NULL,                                        '[]'::jsonb, 24),
      (NULL, 'Smoothie Bowl',        'Tropical fruit smoothie',                          220,  'beverages',  'bar',      6, 'fgCoffee',  '#d9e6f8', '#f1f6fd', true, false, NULL,                                        '[]'::jsonb, 25),

      -- Desserts
      (NULL, 'Mango Sticky Rice',    'Traditional Thai dessert',                         180,  'desserts',   'dessert',  8, 'fgMango',   '#fadde0', '#fdf2f3', true, true,  NULL,                                        '[]'::jsonb, 26),
      (NULL, 'Chocolate Cake',       'Rich dark chocolate cake',                         240,  'desserts',   'dessert',  5, 'fgSundae',  '#fadde0', '#fdf2f3', true, true,  NULL,                                        '[]'::jsonb, 27),
      (NULL, 'Ice Cream Selection',  'Vanilla, chocolate, or strawberry',                120,  'desserts',   'dessert',  3, 'fgSundae',  '#fadde0', '#fdf2f3', true, false, NULL,                                        '[]'::jsonb, 28),
      (NULL, 'Fruit Platter',        'Seasonal fresh fruits',                            200,  'desserts',   'dessert',  6, 'fgSundae',  '#fadde0', '#fdf2f3', true, false, NULL,                                        '[]'::jsonb, 29),

      -- Snacks & Light Bites
      (NULL, 'Chicken Wings',        'Buffalo or BBQ style wings',                       280,  'snacks',     'grill',   15, 'fgSpring',  '#f6e7d4', '#fdf7ef', true, true,  NULL,                                        '[]'::jsonb, 30),
      (NULL, 'Nachos Supreme',       'Loaded nachos with cheese and jalapeños',          320,  'snacks',     'grill',   10, 'fgFries',   '#f6dcd8', '#fdf3f1', true, false, NULL,                                        '[]'::jsonb, 31),
      (NULL, 'Golf Course Mix',      'Premium nuts and dried fruits',                    150,  'snacks',     'grill',    1, 'fgFries',   '#f6dcd8', '#fdf3f1', true, false, NULL,                                        '[]'::jsonb, 32),
      (NULL, 'Energy Bar',           'Protein and energy bar',                            80,  'snacks',     'grill',    1, 'fgBottle',  '#d9e6f8', '#f1f6fd', true, false, NULL,                                        '[]'::jsonb, 33);

    -- Local (repo-hosted) images only. Unsplash/http images are intentionally skipped.
    INSERT INTO food_item_media (item_id, url, sort)
    SELECT mi.id, v.url, 0
    FROM (VALUES
      ('Spring Rolls',      'images/appetizers/springrolls.jpg'),
      ('Chicken Satay',     'images/appetizers/chickensatay.jpg'),
      ('Fish & Chips',      'images/main courses/fish&chips.jpg'),
      ('Coconut Water',     'images/beverages/coconutwater.jpg'),
      ('Heineken Small',    'images/beverages/heinekenbeer.jpg'),
      ('Heineken Large',    'images/beverages/heinekenbeer.jpg'),
      ('Chang Beer Small',  'images/beverages/changbeer.jpg'),
      ('Chang Beer Large',  'images/beverages/changbeer.jpg'),
      ('Singha Beer Small', 'images/beverages/singhabeer.jpg'),
      ('Singha Beer Large', 'images/beverages/singhabeer.jpg'),
      ('Smoothie Bowl',     'images/beverages/smoothiebowl.jpg'),
      ('Mango Sticky Rice', 'images/Desserts/mangostickyrice.jpg'),
      ('Chicken Wings',     'images/snacks/chickenwings.jpg'),
      ('Energy Bar',        'images/snacks/energybar.jpg')
    ) AS v(name, url)
    JOIN menu_items mi ON mi.name = v.name AND mi.course_name IS NULL;

  END IF;
END
$seed$;

-- Post-apply fixes (2026-08-02, applied directly):
-- art corrections: Heineken->fgBeer, Grilled Salmon->fgFish, Wagyu Steak->fgBurger, Tom Yum->fgCurry/wok
-- realtime: menu_items added to supabase_realtime publication for live 86/price updates
-- (ALTER PUBLICATION supabase_realtime ADD TABLE menu_items;)
