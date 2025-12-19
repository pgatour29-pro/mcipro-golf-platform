# MciPro Platform: Data Cleanup & User Input Strategy

## Executive Summary
This document outlines:
1. All hardcoded data that needs to be zeroed out before go-live
2. What data should remain (golf courses, demo caddies)
3. How users will input their own data moving forward

---

## 1. DATA TO ZERO OUT

### A. GOLFER DASHBOARD

#### Performance Overview (Overview Tab)
- ✅ **ALREADY ZEROED**: Best Score, Average Score, Total Rounds, Eagles
- Status: Complete

#### Statistics Tab
**Current Hardcoded Values:**
- Current Handicap: 18 → Should be 0 or prompt user to enter
- Total Rounds: Shows from profile
- Average Score: Calculated from rounds
- Best Score: Calculated from rounds
- Putts per Round: Needs zeroing
- Fairways Hit %: Needs zeroing
- Greens in Regulation %: Needs zeroing

**Action Required:**
- Set default handicap to 0 or "Not Set"
- Ensure all calculated stats show "No data yet" when no rounds exist
- Remove any placeholder/demo round data

#### Live Course Status (Overview Tab)
**Current Values:**
- Current Hole: 7 → Should be "-" or "Not Playing"
- Distance to Pin: 145 → Should be "-"
- Temperature: 24°C → Keep (real-time weather)
- Wind: 8 km/h NE → Keep (real-time weather)
- Conditions: Sunny → Keep (real-time weather)

**Action Required:**
- Zero out Current Hole and Distance to Pin
- Keep weather data (this is environmental, not user-specific)

#### Round History Tab
**Current State:**
- Should be empty on new accounts

**Action Required:**
- Verify no demo rounds exist in default profile

---

### B. CADDY DASHBOARD

#### Caddy Profile Stats
**Current Hardcoded Values in Caddy Database (lines 15566-16xxx):**
- totalRounds: 3456, 1847, 2734, etc. → Keep for DEMO caddies
- reviews: 421, 198, 312, etc. → Keep for DEMO caddies
- rating: 4.8, 4.7, 4.6, etc. → Keep for DEMO caddies
- experience: 12, 6, 9, etc. years → Keep for DEMO caddies

**Note:** Per user request, keep all caddy data as demo/placeholder until real caddies are added

#### New Caddy Profile (When Real Caddies Sign Up)
- Total Rounds: 0
- Reviews: 0
- Rating: 0.0 or "Not Rated Yet"
- Earnings: ฿0
- Active Bookings: 0

**Action Required:**
- When new caddy profiles are created, ensure all stats start at 0
- Demo caddies remain unchanged

---

### C. MANAGER/PRO SHOP DASHBOARD

#### Revenue & Analytics
**Current Hardcoded Values:**
- Today's Revenue: Should be ฿0
- This Month: Should be ฿0
- Total Bookings: Should be 0
- Active Golfers: Should be 0 (or actual count from real users)
- Food Orders: Should be 0
- Equipment Rentals: Should be 0

**Action Required:**
- Zero out all revenue metrics
- Zero out all booking counts
- Zero out all transaction stats
- Keep only real, live data

#### Staff Management
**Current State:**
- Should show actual staff that have been added
- No placeholder staff

**Action Required:**
- Remove any demo/placeholder staff members
- Start with empty staff roster

---

### D. RESTAURANT/FOOD SERVICE

#### Order History
**Current State:**
- Should be empty

**Action Required:**
- Verify no demo orders exist
- All order stats should be 0

#### Menu Items Stats
**Current State:**
- Items sold: Should be 0 for all items
- Revenue per item: Should be ฿0

**Action Required:**
- Keep menu items (these are offerings, not data)
- Zero out all sales counts and revenue

---

## 2. DATA TO KEEP (As Demo/Reference)

### A. Golf Courses Database
**Keep All:**
- Pattana Golf Resort & Spa
- Pattaya Golf Club
- Thai Country Club
- Laem Chabang International Country Club
- Siam Country Club (Old/Plantation/Waterside)
- Phoenix Gold Golf & Country Club
- St. Andrews 2000
- Burapha Golf Club
- Greenwood Golf & Resort
- Bangpra International Golf Club

**Reason:** These serve as demo courses and real course database for bookings

### B. Caddy Database
**Keep All Demo Caddies:**
- All 100+ caddies with their stats, ratings, reviews, experience
- Ning Prasert (pat001) and all others
- All caddy photos, specialties, languages, etc.

**Reason:** Per user request - keep as demo until real caddies input

---

## 3. USER DATA INPUT STRATEGY

### A. GOLFER DATA INPUT

#### Method 1: Profile Creation (CURRENT)
**Already Implemented:**
- Name, email, phone
- Handicap (user inputs during signup)
- Home club selection
- Profile photo (LINE photo or upload)

**Status:** ✅ Working

#### Method 2: Round Entry System (NEEDS IMPLEMENTATION)
**Purpose:** Allow golfers to log their rounds

**Proposed UI Location:** Statistics Tab → "Add Round" button

**Data to Collect:**
- Date played
- Course name
- Score (total strokes)
- Holes played (9 or 18)
- Tee used (Championship, Regular, Ladies)
- Optional detailed stats:
  - Fairways hit
  - Greens in regulation
  - Total putts
  - Penalties
  - Best hole
  - Worst hole

**Technical Implementation:**
```javascript
// Add to golfer-stats tab
RoundManager = {
    rounds: [],  // Store in localStorage + cloud

    addRound(roundData) {
        // Validate and save round
        // Update handicap calculation
        // Refresh stats display
    },

    editRound(roundId) {
        // Allow editing past rounds
    },

    deleteRound(roundId) {
        // Remove round from history
    }
}
```

**Storage:**
- localStorage: `mcipro_rounds_[userId]`
- Cloud sync via existing bookings endpoint (add rounds field)

---

#### Method 3: Handicap Updates (NEEDS IMPLEMENTATION)
**Purpose:** Allow manual handicap entry/updates

**Proposed UI Location:**
- Profile settings
- Statistics tab → "Update Handicap" button

**Auto-calculation Option:**
- Calculate from last 20 rounds (WHS system)
- User can override if they have official handicap

---

### B. CADDY DATA INPUT

#### Method 1: Caddy Profile Creation (NEEDS IMPLEMENTATION)
**When:** Real caddy signs up

**Data to Collect:**
- Personal info (name, photo, languages)
- Experience (years)
- Home club
- Specialty areas
- Certifications
- Availability schedule

**Initial Stats:**
- Total Rounds: 0
- Rating: "Not Rated Yet"
- Reviews: 0
- Earnings: ฿0

#### Method 2: Booking Completion Updates (NEEDS IMPLEMENTATION)
**When:** Golfer completes round with caddy

**Auto-increments:**
- Caddy totalRounds +1
- If golfer leaves review → add to reviews count
- If golfer leaves rating → update average rating
- Earnings updated based on fee

---

### C. MANAGER/PRO SHOP DATA INPUT

#### Method 1: Transaction Recording (NEEDS IMPLEMENTATION)
**When:** Sales occur

**Sources:**
- Tee time bookings → Auto-recorded
- Food orders → Auto-recorded when placed
- Equipment rentals → Needs manual entry UI
- Pro shop sales → Needs manual entry UI

#### Method 2: Manual Entry Form (NEEDS IMPLEMENTATION)
**Proposed UI Location:** Manager Dashboard → "Record Transaction"

**Data to Collect:**
- Transaction type (tee time, food, equipment, merchandise)
- Amount (฿)
- Customer name (optional)
- Date/time
- Payment method
- Notes

---

### D. RESTAURANT DATA INPUT

#### Method 1: Menu Management (NEEDS IMPLEMENTATION)
**Proposed UI Location:** Manager/Restaurant Dashboard → "Manage Menu"

**Functions:**
- Add new menu items
- Edit existing items (price, description, photo)
- Mark items as available/unavailable
- Set daily specials

#### Method 2: Order Stats (AUTO-CALCULATED)
**Already Implemented (Partially):**
- Orders placed via Food & Dining tab
- Auto-increment item sold count
- Auto-calculate revenue

**Needs:**
- Clear separation between test orders and real orders
- Admin ability to clear test data

---

## 4. IMPLEMENTATION PRIORITY

### Phase 1: IMMEDIATE (Before Go-Live)
1. ✅ Zero out Performance Overview (DONE)
2. Zero out Live Course Status (Current Hole, Distance)
3. Zero out default handicap (or prompt entry)
4. Zero out Manager revenue/analytics
5. Verify no demo rounds/orders in new profiles

### Phase 2: SHORT-TERM (First 2 Weeks After Launch)
1. Implement Round Entry System for golfers
2. Implement Handicap update UI
3. Implement Transaction recording for Manager
4. Add "Clear Test Data" admin function

### Phase 3: MID-TERM (First Month)
1. Implement Caddy profile creation for real caddies
2. Implement post-round review system (golfer rates caddy)
3. Implement menu management for restaurant
4. Add detailed statistics breakdowns

### Phase 4: LONG-TERM (2-3 Months)
1. Advanced analytics dashboards
2. Export data features (CSV, PDF reports)
3. Historical trending graphs
4. Leaderboards and competitions

---

## 5. DATA PERSISTENCE ARCHITECTURE

### Current Storage:
```
localStorage:
- mcipro_user_profiles (array of all users)
- mcipro_bookings (tee times)
- mcipro_orders (food orders)
- mcipro_baseVersion (sync version)

Cloud (Netlify Blobs):
- bookings (tee times + user profiles)
- emergency_alerts
```

### Proposed Additions:
```
localStorage:
- mcipro_rounds_[userId] (golf rounds)
- mcipro_transactions (manager sales data)
- mcipro_caddy_reviews (ratings/reviews)
- mcipro_menu_stats (items sold counts)

Cloud:
- Add "rounds" field to user profiles
- Add "transactions" collection
- Add "caddy_reviews" collection
- Add "menu_stats" collection
```

---

## 6. OPEN QUESTIONS FOR USER

1. **Handicap Entry:**
   - Should we require handicap during signup, or allow "Not Set"?
   - Auto-calculate from rounds, or allow manual override?

2. **Round Entry:**
   - Should this be in Statistics tab or separate "Add Round" in navigation?
   - Require detailed stats or allow quick entry (just date + score)?

3. **Caddy Onboarding:**
   - How will real caddies sign up? (LINE login like golfers?)
   - Will club manager add them, or self-signup?

4. **Manager Transactions:**
   - Should all sales go through the app, or allow manual entry?
   - How to handle cash vs. card vs. account billing?

5. **Demo Data Removal:**
   - When removing demo caddies, do we delete or mark as "demo"?
   - Should demo caddies be visible to all users or only in testing?

---

## 7. SUMMARY CHECKLIST

### Data Cleanup (Before Go-Live):
- [ ] Zero out Live Course Status (current hole, distance)
- [ ] Zero out Manager revenue metrics
- [ ] Verify new profiles start with 0 stats
- [ ] Remove any demo orders/bookings
- [ ] Set default handicap to 0 or "Not Set"

### Data Input Implementation:
- [ ] Build Round Entry UI for golfers
- [ ] Build Handicap update UI
- [ ] Build Transaction entry for Manager
- [ ] Build Caddy profile creation
- [ ] Build Review system (golfer → caddy)
- [ ] Build Menu management for Restaurant

### Keep As-Is:
- ✅ Golf courses database (all courses)
- ✅ Demo caddy database (all caddies with stats)
- ✅ Menu items (food/beverage offerings)
- ✅ Weather data (environmental)