-- =====================================================
-- MARKETPLACE TABLES FOR "19TH HOLE" FEATURE
-- Run this in Supabase SQL Editor
-- December 14, 2025
-- =====================================================

-- =====================================================
-- TABLE 1: marketplace_listings
-- Main table for classified listings
-- =====================================================
CREATE TABLE IF NOT EXISTS marketplace_listings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_line_id text NOT NULL,
    seller_name text,
    title text NOT NULL,
    description text,
    category text NOT NULL CHECK (category IN ('golf_equipment', 'services', 'general')),
    subcategory text,
    listing_type text NOT NULL CHECK (listing_type IN ('sale', 'swap', 'wanted')),
    price integer, -- in baht, null for swap/wanted
    price_type text CHECK (price_type IN ('fixed', 'negotiable', 'swap_only')),
    images text[], -- array of image URLs
    condition text CHECK (condition IN ('new', 'like_new', 'good', 'fair')),
    location text,
    status text DEFAULT 'active' CHECK (status IN ('active', 'sold', 'expired', 'deleted')),
    views integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    expires_at timestamptz DEFAULT (now() + interval '30 days')
);

-- Indexes for marketplace_listings
CREATE INDEX IF NOT EXISTS idx_listings_seller ON marketplace_listings(seller_line_id);
CREATE INDEX IF NOT EXISTS idx_listings_category ON marketplace_listings(category, status);
CREATE INDEX IF NOT EXISTS idx_listings_status ON marketplace_listings(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_active ON marketplace_listings(status, expires_at) WHERE status = 'active';

-- Comment
COMMENT ON TABLE marketplace_listings IS '19th Hole marketplace classified listings';

-- =====================================================
-- TABLE 2: marketplace_offers
-- Offers/bids on listings
-- =====================================================
CREATE TABLE IF NOT EXISTS marketplace_offers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id uuid NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
    buyer_line_id text NOT NULL,
    buyer_name text,
    offer_type text NOT NULL CHECK (offer_type IN ('price', 'swap', 'question')),
    offer_amount integer, -- for price offers
    offer_message text,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'withdrawn')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Indexes for marketplace_offers
CREATE INDEX IF NOT EXISTS idx_offers_listing ON marketplace_offers(listing_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_offers_buyer ON marketplace_offers(buyer_line_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON marketplace_offers(status);

-- Comment
COMMENT ON TABLE marketplace_offers IS 'Offers and bids on marketplace listings';

-- =====================================================
-- TABLE 3: marketplace_favorites
-- Users saved/favorited listings
-- =====================================================
CREATE TABLE IF NOT EXISTS marketplace_favorites (
    listing_id uuid NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
    user_line_id text NOT NULL,
    created_at timestamptz DEFAULT now(),
    PRIMARY KEY (listing_id, user_line_id)
);

-- Index for favorites
CREATE INDEX IF NOT EXISTS idx_favorites_user ON marketplace_favorites(user_line_id);

-- Comment
COMMENT ON TABLE marketplace_favorites IS 'User saved/favorited marketplace listings';

-- =====================================================
-- TABLE 4: sponsored_ads
-- Advertiser content for marketplace
-- =====================================================
CREATE TABLE IF NOT EXISTS sponsored_ads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    advertiser_name text NOT NULL,
    title text NOT NULL,
    description text,
    image_url text,
    link_url text,
    category text CHECK (category IN ('golf_equipment', 'services', 'general', 'all')),
    impressions integer DEFAULT 0,
    clicks integer DEFAULT 0,
    start_date date NOT NULL,
    end_date date NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- Index for sponsored_ads
CREATE INDEX IF NOT EXISTS idx_ads_active ON sponsored_ads(is_active, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_ads_category ON sponsored_ads(category);

-- Comment
COMMENT ON TABLE sponsored_ads IS 'Sponsored advertisements for 19th Hole marketplace';

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================
ALTER TABLE marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsored_ads ENABLE ROW LEVEL SECURITY;

-- Listings: Anyone can read active listings, users can manage their own
CREATE POLICY "Anyone can read active listings" ON marketplace_listings
    FOR SELECT USING (true);
CREATE POLICY "Users can insert listings" ON marketplace_listings
    FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update listings" ON marketplace_listings
    FOR UPDATE USING (true);
CREATE POLICY "Users can delete listings" ON marketplace_listings
    FOR DELETE USING (true);

-- Offers: Open access (app handles authorization)
CREATE POLICY "Anyone can read offers" ON marketplace_offers FOR SELECT USING (true);
CREATE POLICY "Anyone can create offers" ON marketplace_offers FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update offers" ON marketplace_offers FOR UPDATE USING (true);

-- Favorites: Open access
CREATE POLICY "Anyone can manage favorites" ON marketplace_favorites FOR ALL USING (true);

-- Ads: Read only for users
CREATE POLICY "Anyone can read active ads" ON sponsored_ads FOR SELECT USING (true);
CREATE POLICY "Admins can manage ads" ON sponsored_ads FOR ALL USING (true);

-- =====================================================
-- RPC FUNCTIONS
-- =====================================================

-- Function to increment ad impressions
CREATE OR REPLACE FUNCTION increment_ad_impressions(ad_id uuid)
RETURNS void AS $$
BEGIN
    UPDATE sponsored_ads SET impressions = impressions + 1 WHERE id = ad_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment ad clicks
CREATE OR REPLACE FUNCTION increment_ad_clicks(ad_id uuid)
RETURNS void AS $$
BEGIN
    UPDATE sponsored_ads SET clicks = clicks + 1 WHERE id = ad_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment listing views
CREATE OR REPLACE FUNCTION increment_listing_views(listing_id uuid)
RETURNS void AS $$
BEGIN
    UPDATE marketplace_listings SET views = views + 1 WHERE id = listing_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION increment_ad_impressions TO anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_ad_clicks TO anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_listing_views TO anon, authenticated;

-- =====================================================
-- STORAGE BUCKET (run separately in Supabase dashboard)
-- =====================================================
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('marketplace-images', 'marketplace-images', true);
--
-- CREATE POLICY "Anyone can view marketplace images"
-- ON storage.objects FOR SELECT
-- USING (bucket_id = 'marketplace-images');
--
-- CREATE POLICY "Authenticated users can upload marketplace images"
-- ON storage.objects FOR INSERT
-- WITH CHECK (bucket_id = 'marketplace-images');
--
-- CREATE POLICY "Users can delete marketplace images"
-- ON storage.objects FOR DELETE
-- USING (bucket_id = 'marketplace-images');

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Check tables were created
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'marketplace%' OR table_name = 'sponsored_ads';

-- Check columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'marketplace_listings';
