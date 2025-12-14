# Session Catalog: 19th Hole Marketplace Implementation
**Date:** December 14, 2025

## Summary
Replaced the Statistics tab with a new "19th Hole" marketplace feature - a classified listings system where golfers can buy, sell, swap items, and advertise services.

---

## Features Implemented

### 1. Marketplace Core Functionality
- **Browse Listings** - View all active listings with category filters and search
- **Create Listings** - Post items for sale, swap, or wanted with up to 5 photos
- **Make Offers** - Price offers, swap proposals, or questions to sellers
- **My Listings** - Manage your posts (edit, mark sold, delete)
- **Offers Tab** - See received/sent offers, accept/decline
- **Saved/Favorites** - Bookmark listings you're interested in
- **Sponsored Ads** - Carousel at top for advertisers

### 2. Categories
- Golf Equipment (clubs, bags, balls, accessories)
- Services (lessons, club repair, fitting, transport)
- General Items (electronics, clothing, sports, home)

### 3. Listing Types
- **Sale** - Fixed price or negotiable
- **Swap** - Exchange for other items
- **Wanted** - Looking for specific items

### 4. Pricing Options
- Fixed price (in Baht)
- Negotiable
- Swap only

---

## Database Schema

### New SQL File: `sql/MARKETPLACE_SCHEMA.sql`

**Tables Created:**

1. **marketplace_listings**
   - id (uuid, PK)
   - seller_line_id (text)
   - seller_name (text)
   - title, description (text)
   - category ('golf_equipment', 'services', 'general')
   - subcategory (text)
   - listing_type ('sale', 'swap', 'wanted')
   - price (integer, in baht)
   - price_type ('fixed', 'negotiable', 'swap_only')
   - images (text[]) - array of URLs
   - condition ('new', 'like_new', 'good', 'fair')
   - location (text)
   - status ('active', 'sold', 'expired', 'deleted')
   - views (integer)
   - created_at, updated_at, expires_at (timestamptz)

2. **marketplace_offers**
   - id (uuid, PK)
   - listing_id (uuid, FK)
   - buyer_line_id, buyer_name (text)
   - offer_type ('price', 'swap', 'question')
   - offer_amount (integer)
   - offer_message (text)
   - status ('pending', 'accepted', 'declined', 'withdrawn')
   - created_at, updated_at (timestamptz)

3. **marketplace_favorites**
   - listing_id (uuid, FK)
   - user_line_id (text)
   - created_at (timestamptz)
   - PRIMARY KEY (listing_id, user_line_id)

4. **sponsored_ads**
   - id (uuid, PK)
   - advertiser_name, title, description (text)
   - image_url, link_url (text)
   - category (text)
   - impressions, clicks (integer)
   - start_date, end_date (date)
   - is_active (boolean)
   - created_at (timestamptz)

**RPC Functions:**
- `increment_ad_impressions(ad_id)`
- `increment_ad_clicks(ad_id)`
- `increment_listing_views(listing_id)`

**Storage Bucket:** `marketplace-images` (public, for listing photos)

---

## Files Modified

### 1. `public/index.html`

**Tab Button (line ~24545)**
Changed Statistics to 19th Hole with red styling:
```html
<button onclick="showGolferTab('marketplace', event)" class="tab-button relative"
        style="background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; border-radius: 8px;">
    <span class="material-symbols-outlined">storefront</span>
    <span>19th Hole</span>
</button>
```

**Dashboard Widget (lines ~24775-24806)**
Replaced "Performance Overview" with 4 quick-access buttons:
- Golf Equipment (browse)
- Services (browse)
- Sell Something (opens create modal)
- My Offers (with pending count badge)

**Marketplace Tab Content (lines ~25433-25613)**
- Sponsored ads carousel
- Sub-tab navigation: Browse | My Listings | Offers | Saved
- Category filters: All | Golf | Services | General
- Search bar with debounce
- Listings grid

**Modals (lines ~28404-28588)**
- createListingModal - Image upload, title, category, type, price, condition, description
- listingDetailModal - Image gallery, details, Make Offer/Message buttons
- makeOfferModal - Price/Swap/Question offer types

**MarketplaceSystem JavaScript (lines ~61729-63004)**
~1300 lines implementing:
- Full CRUD for listings
- Offer management (submit, accept, decline, withdraw)
- Favorites toggle
- Image upload to Supabase Storage
- LINE notification via direct_messages
- Badge/count management

**Tab Initialization**
- `showGolferTab()` (line ~12309-12315) - Initialize marketplace
- `TabManager.loadTabData()` (line ~7547-7558) - Initialize on tab switch
- Dashboard init (line ~7202-7208) - Badge initialization

**Mobile Drawer (line ~71011)**
Added 19th Hole link with red styling, replaced Statistics

---

## User Preferences (from AskUserQuestion)

1. **Categories:** All Three (Golf Equipment, Services, General Items)
2. **Ads Section:** Yes, Separate (dedicated area at top for sponsors)
3. **Contact Method:** In-App Messages (uses existing MessagesSystem with LINE notifications)
4. **Pricing:** Both + Swap (fixed price, make offer, AND swap/exchange options)

---

## UI Design

### Tab Button
- Red gradient background (#dc2626 to #b91c1c)
- White text and storefront icon
- Rounded corners
- Yellow badge for notifications (contrast against red)

### Category Filters
- "All" button with apps icon (green when selected)
- Golf, Services, General with icons
- Rounded pill style

### Empty State
- "No listings found" message
- "Be the first to post!" button

---

## Integration Points

### MessagesSystem
- `messageSeller()` opens DM conversation with seller
- Uses existing direct_messages table for LINE push notifications

### Supabase Storage
- Images uploaded to `marketplace-images` bucket
- Public read access
- Max 5 images per listing

### Badge System
- `refreshOfferCounts()` updates pending offers badge
- Badge shows on tab and dashboard widget

---

## Mistakes Made & Fixes

1. **FAB button hidden** - Floating action button was inside tab-content div with `display: none`
   - Fix: Removed FAB entirely since "Be the first to post!" button exists

2. **"All" button not visible** - Category filter not showing on initial load
   - Fix: Added explicit styling in `init()` function

3. **Mobile drawer missing** - 19th Hole not in mobile navigation
   - Fix: Added link to mobile drawer, replaced Statistics

---

## Testing Checklist

- [x] SQL schema runs without errors
- [x] Tab button shows "19th Hole" with red styling
- [x] Sponsored ads carousel displays (if ads exist)
- [x] Browse tab loads listings
- [x] Category filters work (All, Golf, Services, General)
- [x] Search with debounce
- [x] Create listing modal opens
- [x] Image upload works (requires storage bucket)
- [x] Listing detail modal shows
- [x] Make offer modal works
- [x] My Listings tab shows user's posts
- [x] Offers tab shows received/sent
- [x] Favorites toggle works
- [x] Message seller opens DM
- [x] Dashboard widget quick access works
- [x] Mobile drawer has 19th Hole link
- [x] Badge updates for pending offers

---

## SQL Scripts Created

1. **MARKETPLACE_SCHEMA.sql** - Complete database schema for marketplace

---

## Deployment

All changes deployed to Vercel production at https://mycaddipro.com

To enable marketplace:
1. Run `sql/MARKETPLACE_SCHEMA.sql` in Supabase SQL Editor
2. Create storage bucket `marketplace-images` in Supabase Dashboard
