CREATE TABLE IF NOT EXISTS proshop_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id text NOT NULL,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'accessories',
  price numeric NOT NULL DEFAULT 0,
  cost numeric,
  sku text,
  stock integer NOT NULL DEFAULT 0,
  reorder_level integer NOT NULL DEFAULT 5,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (course_id, name)
);
CREATE INDEX IF NOT EXISTS idx_proshop_products_course ON proshop_products(course_id);

CREATE TABLE IF NOT EXISTS proshop_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id text NOT NULL,
  items jsonb NOT NULL,
  subtotal numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cash',
  staff_id text,
  staff_name text,
  customer_name text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_proshop_sales_course_date ON proshop_sales(course_id, created_at);

ALTER TABLE proshop_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE proshop_sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tmp_select ON proshop_products;
DROP POLICY IF EXISTS tmp_insert ON proshop_products;
DROP POLICY IF EXISTS tmp_update ON proshop_products;
DROP POLICY IF EXISTS tmp_delete ON proshop_products;
CREATE POLICY tmp_select ON proshop_products FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY tmp_insert ON proshop_products FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY tmp_update ON proshop_products FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY tmp_delete ON proshop_products FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS tmp_select ON proshop_sales;
DROP POLICY IF EXISTS tmp_insert ON proshop_sales;
DROP POLICY IF EXISTS tmp_update ON proshop_sales;
DROP POLICY IF EXISTS tmp_delete ON proshop_sales;
CREATE POLICY tmp_select ON proshop_sales FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY tmp_insert ON proshop_sales FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY tmp_update ON proshop_sales FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY tmp_delete ON proshop_sales FOR DELETE TO anon, authenticated USING (true);

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE proshop_products;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE proshop_sales;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

INSERT INTO proshop_products (course_id, name, category, price, stock, reorder_level, sku) VALUES
  ('pattaya_county', 'Callaway Paradym Driver', 'clubs', 18900, 3, 1, 'CLB-001'),
  ('pattaya_county', 'Titleist Pro V1 (dozen)', 'balls', 1950, 24, 6, 'BAL-001'),
  ('pattaya_county', 'Srixon AD333 (dozen)', 'balls', 1100, 30, 8, 'BAL-002'),
  ('pattaya_county', 'Club Polo Shirt', 'apparel', 1290, 18, 5, 'APP-001'),
  ('pattaya_county', 'Club Cap', 'apparel', 450, 25, 5, 'APP-002'),
  ('pattaya_county', 'Leather Golf Glove', 'accessories', 590, 20, 5, 'ACC-001'),
  ('pattaya_county', 'Wooden Tees (25 pack)', 'accessories', 120, 40, 10, 'ACC-002'),
  ('pattaya_county', 'Drinking Water 600ml', 'drinks', 20, 120, 24, 'DRK-001'),
  ('pattaya_county', 'Sports Drink', 'drinks', 45, 60, 12, 'DRK-002'),
  ('pattaya_county', 'Energy Bar', 'snacks', 60, 40, 10, 'SNK-001')
ON CONFLICT (course_id, name) DO NOTHING;
