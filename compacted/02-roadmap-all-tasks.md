# MciPro Golf Platform - Complete Roadmap

**Updated:** 2025-10-13
**Status:** Chat System Complete ✅
**Next:** All remaining tasks to be completed ASAP

---

## Task Overview

| # | Task | Est. Time | Status | Priority |
|---|------|-----------|--------|----------|
| 1 | Fine-tune Chat System | 12-18h | ✅ DONE | Complete |
| 2 | Golfer Live Scorecard | 15-20h | 🔴 TODO | HIGH |
| 3 | Society Scorecard & Winners | 12-16h | 🔴 TODO | HIGH |
| 4 | Fine-tune GPS | 13-17h | 🔴 TODO | MEDIUM |
| 5 | Restaurant & Proshop POS | 22-28h | 🔴 TODO | HIGH |
| 6 | Super Admin Roles | 15-20h | 🔴 TODO | MEDIUM |

**Total Remaining:** 77-101 hours

---

## 1. Chat System ✅ COMPLETE

### Delivered Features:
- ✅ Real-time messaging (desktop + mobile)
- ✅ Mobile navigation (back button)
- ✅ Contact search (local + server)
- ✅ Group chat creation
- ✅ Mobile bottom tabs
- ✅ Join requests/approvals (backend)
- ✅ Database schema with RLS

### See Full Details:
`compacted/01-chat-system-completed.md`

---

## 2. Golfer Live Scorecard Modification 🏌️ NEXT

### Requirements:
- Round History tracking
- Automated scorecard submission
- Three submission types:
  1. Private Rounds
  2. Society Events
  3. Tournaments

### Implementation Tasks:

#### **A. Database Schema** (2-3h)
```sql
-- Rounds table
create table rounds (
  id uuid primary key default gen_random_uuid(),
  golfer_id uuid references profiles(id),
  course_id uuid references courses(id),
  type text check (type in ('private','society','tournament')),
  society_id uuid references societies(id),
  tournament_id uuid references tournaments(id),
  started_at timestamptz,
  completed_at timestamptz,
  status text check (status in ('in_progress','completed','abandoned')),
  total_score int,
  total_putts int,
  fairways_hit int,
  greens_in_regulation int,
  handicap_used decimal(4,1),
  net_score int,
  created_at timestamptz default now()
);

-- Round holes (hole-by-hole)
create table round_holes (
  id uuid primary key default gen_random_uuid(),
  round_id uuid references rounds(id) on delete cascade,
  hole_number int check (hole_number between 1 and 18),
  score int not null,
  putts int,
  fairway_hit boolean,
  gir boolean,
  penalty_strokes int default 0,
  created_at timestamptz default now(),
  unique(round_id, hole_number)
);

-- Indexes
create index idx_rounds_golfer on rounds(golfer_id, completed_at desc);
create index idx_rounds_status on rounds(status);
create index idx_rounds_type on rounds(type);
create index idx_round_holes_round on round_holes(round_id, hole_number);
```

#### **B. Live Scorecard UI** (6-8h)

**In-Round Interface:**
- Current hole display (large number)
- Score input:
  - Tap +/- buttons
  - Or numeric keypad
- Stats tracking:
  - Putts counter
  - Fairway hit checkbox
  - GIR checkbox
- Navigation:
  - Next/Previous hole buttons
  - Hole selector (1-18 grid)
- Real-time totals:
  - Score vs Par
  - Total putts
  - Fairways hit (X/14)
  - GIR (X/18)

**GPS Integration:**
- Auto-advance to next hole based on GPS position
- Show distance to green
- Shot tracking with GPS
- Course map overlay

**Round Summary Screen:**
- Front 9 / Back 9 breakdown
- Total score vs par
- Net score (if handicap applied)
- Full stats summary
- Time played

**Files to Create:**
- `scorecard/live-scorecard.html` - Main UI
- `scorecard/scorecard.js` - Logic
- `scorecard/scorecard.css` - Styling
- `scorecard/gps-integration.js` - GPS hooks

#### **C. Automated Submission** (3-4h)

**Auto-Save:**
- Save hole score immediately after input
- Background sync with Supabase
- Offline queue if no connection
- Conflict resolution

**Submission Flow:**
1. Complete all 18 holes
2. Review scorecard screen
3. Choose round type:
   - Private (auto-submit)
   - Society Event (select event)
   - Tournament (select tournament)
4. Confirm submission
5. Success feedback + redirect

**Validation:**
- All 18 holes scored
- Max score per hole (e.g., 10)
- Reasonable putt counts
- Date/time validation

**Files to Create:**
- `scorecard/submission.js` - Submission logic
- `scorecard/validation.js` - Validation rules

#### **D. Round History** (4-5h)

**History List:**
- Filter by type (all/private/society/tournament)
- Sort by date (newest first)
- Display:
  - Date & time
  - Course name
  - Score (gross/net)
  - Type badge
  - Tap to view details

**Round Detail View:**
- Full scorecard (hole-by-hole)
- Stats breakdown
- Course info
- Weather conditions (if tracked)
- Playing partners
- Share/export:
  - PDF scorecard
  - Share to social media
  - Email scorecard

**Statistics Dashboard:**
- Average score (last 20 rounds)
- Best round
- Handicap trends (chart)
- Stats over time:
  - Scoring average by hole
  - Fairways hit %
  - GIR %
  - Putts per round

**Files to Create:**
- `scorecard/history.html` - History list
- `scorecard/detail.html` - Round detail
- `scorecard/stats.html` - Statistics dashboard
- `scorecard/export.js` - PDF generation

**Estimated Total:** 15-20h

---

## 3. Society Scorecard & Winner Categories 🏆

### Requirements:
- Score input for society events
- Place rankings: 1st, 2nd, 3rd, etc.
- Multiple winner categories
- Automated leaderboard

### Implementation Tasks:

#### **A. Society Event Schema** (2-3h)

```sql
-- Society events
create table society_events (
  id uuid primary key default gen_random_uuid(),
  society_id uuid references societies(id),
  title text not null,
  description text,
  event_date date not null,
  start_time time,
  course_id uuid references courses(id),
  format text check (format in ('stroke_play','match_play','stableford','best_ball')),
  scoring_type text check (scoring_type in ('gross','net','both')),
  status text check (status in ('upcoming','in_progress','completed','cancelled')),
  max_participants int,
  entry_fee decimal(10,2),
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- Winner categories
create table event_categories (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references society_events(id) on delete cascade,
  name text not null,
  type text check (type in ('overall','gross','net','special')),
  description text,
  places_awarded int default 3, -- How many places (1st, 2nd, 3rd, etc.)
  display_order int,
  created_at timestamptz default now()
);

-- Event participants
create table event_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references society_events(id) on delete cascade,
  golfer_id uuid references profiles(id),
  round_id uuid references rounds(id), -- Links to their round
  status text check (status in ('registered','checked_in','completed','no_show')),
  handicap decimal(4,1), -- Handicap at time of event
  registered_at timestamptz default now()
);

-- Event results
create table event_results (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references society_events(id) on delete cascade,
  category_id uuid references event_categories(id),
  participant_id uuid references event_participants(id),
  place int,
  score int,
  is_tie boolean default false,
  prize text,
  created_at timestamptz default now(),
  unique(event_id, category_id, place, participant_id)
);

-- Indexes
create index idx_events_society on society_events(society_id, event_date desc);
create index idx_events_status on society_events(status);
create index idx_participants_event on event_participants(event_id);
create index idx_results_event on event_results(event_id, category_id);
```

#### **B. Event Management Interface** (3-4h)

**Create Event:**
- Event details form:
  - Title, description
  - Date, time
  - Course selection
  - Format (stroke play, stableford, etc.)
  - Scoring (gross, net, both)
  - Max participants
  - Entry fee
- Winner categories setup:
  - Add categories (Overall, Gross, Net, etc.)
  - Special categories (Longest Drive, Closest to Pin)
  - Places per category (1st, 2nd, 3rd, etc.)
- Save and publish

**Event Dashboard:**
- List all events (upcoming/past)
- Filter by status
- Quick actions:
  - Edit event
  - View participants
  - Start event
  - View results

**Files to Create:**
- `society/event-create.html` - Event creation form
- `society/event-dashboard.html` - Event list
- `society/event.js` - Event logic

#### **C. Score Input & Leaderboard** (5-6h)

**Score Entry (Organizer):**
- Participant list with score input
- Bulk entry mode (table view)
- Individual score entry
- Link to round (if scorecard submitted)
- Or manual entry
- Real-time leaderboard update

**Live Leaderboard:**
- Display all categories
- Sort by score per category
- Show:
  - Place (1st, 2nd, 3rd, etc.)
  - Golfer name
  - Score (gross/net/both)
  - Thru (holes completed)
  - Status
- Auto-refresh during event
- Tie indicators

**Participant View:**
- Register for event
- View event details
- See leaderboard
- Submit scorecard (links to live scorecard)

**Files to Create:**
- `society/score-entry.html` - Organizer score input
- `society/leaderboard.html` - Live leaderboard
- `society/participant-view.html` - Participant interface
- `society/leaderboard.js` - Real-time updates

#### **D. Winner Determination** (3-4h)

**Auto-Calculate Places:**
- Overall: Best gross score
- Gross: Best gross score
- Net: Best net score (handicap applied)
- Special: Manual entry or rule-based

**Tie-Breaking:**
- Countback method:
  - Last 9 holes
  - Last 6 holes
  - Last 3 holes
  - Last hole
- Mark as tie if still equal
- Sudden death indicator

**Prize Allocation:**
- Assign prizes to places
- Track prize distribution
- Generate prize list

**Files to Create:**
- `society/winner-calculation.js` - Auto-calculate
- `society/tie-breaker.js` - Tie-breaking logic

#### **E. Results Display & Export** (2-3h)

**Results Screen:**
- Winners per category with photos
- Full leaderboard
- Stats summary:
  - Lowest score
  - Most birdies
  - Highest GIR %
- Awards ceremony mode (full screen)

**Share/Export:**
- PDF results sheet
- Excel export
- Email to all participants
- Social media post template
- Print-friendly version

**Historical Results:**
- Past event results
- Winner history per golfer
- Society records tracking

**Files to Create:**
- `society/results.html` - Results display
- `society/export.js` - PDF/Excel export
- `society/history.html` - Historical results

**Estimated Total:** 12-16h

---

## 4. Fine-tune GPS 📍

### Current Status:
Need to review existing GPS implementation to determine specific tasks.

### Common GPS Tasks:

#### **A. Accuracy Improvements** (3-4h)
- Implement Kalman filter for position smoothing
- Reduce battery drain (optimize update frequency)
- Handle GPS signal loss gracefully
- Cache last known position
- Show GPS accuracy indicator
- Fallback to network location if GPS unavailable

#### **B. Feature Enhancements** (4-5h)
- Shot distance tracking with auto-detection
- Club recommendation based on distance
- Layup distances display
- Hazard warnings (bunkers, water)
- Wind direction/speed integration
- Elevation change calculation
- Shot history per hole

#### **C. Offline Maps** (6-8h)
- Download course maps for offline use
- Cache hole layouts in IndexedDB
- Service worker strategy for maps
- Progressive image loading
- Update mechanism for new courses
- Storage management (delete old courses)

**Files to Review:**
- Existing GPS implementation files
- Current map rendering code
- Shot tracking logic

**Estimated Total:** 13-17h

---

## 5. Restaurant & Proshop POS + Tee Times 🛒

### Requirements:
- Point of Sale system
- Restaurant menu/ordering
- Pro shop product catalog
- Tee time ticketing
- Payment processing
- Inventory tracking

### Implementation Tasks:

#### **A. Product Management** (4-5h)

```sql
-- Products
create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  category text check (category in ('restaurant','proshop','tee_time','lesson','rental')),
  subcategory text,
  price decimal(10,2) not null,
  cost decimal(10,2),
  sku text unique,
  barcode text,
  image_url text,
  stock_quantity int default 0,
  track_inventory boolean default true,
  low_stock_alert int default 5,
  tax_rate decimal(5,2) default 0,
  active boolean default true,
  sort_order int,
  created_at timestamptz default now()
);

-- Product variants (sizes, colors)
create table product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  name text not null, -- "Small", "Large", "Red", etc.
  sku text unique,
  price_modifier decimal(10,2) default 0,
  stock_quantity int,
  active boolean default true
);

-- Inventory transactions
create table inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id),
  variant_id uuid references product_variants(id),
  type text check (type in ('purchase','sale','adjustment','return','damage')),
  quantity int not null,
  cost_per_unit decimal(10,2),
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- Indexes
create index idx_products_category on products(category, active);
create index idx_products_sku on products(sku);
create index idx_inventory_product on inventory_transactions(product_id, created_at desc);
```

**Product Management UI:**
- Product list (grid/table view)
- Add/edit products
- Upload product images
- Set pricing and cost
- Manage variants
- Stock level alerts
- Bulk import (CSV)

**Files to Create:**
- `pos/products.html` - Product management
- `pos/product-form.html` - Add/edit form
- `pos/inventory.html` - Stock management
- `pos/products.js` - Product logic

#### **B. POS Interface** (8-10h)

```sql
-- Orders/transactions
create table orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null,
  location text check (location in ('restaurant','proshop','online')),
  customer_id uuid references profiles(id),
  customer_name text,
  status text check (status in ('pending','paid','cancelled','refunded')),
  subtotal decimal(10,2) not null,
  tax decimal(10,2) default 0,
  discount decimal(10,2) default 0,
  tip decimal(10,2) default 0,
  total decimal(10,2) not null,
  payment_method text check (payment_method in ('cash','card','member_account','split')),
  payment_status text check (payment_status in ('pending','completed','failed','refunded')),
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- Order items
create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  product_id uuid references products(id),
  variant_id uuid references product_variants(id),
  quantity int not null,
  unit_price decimal(10,2) not null,
  subtotal decimal(10,2) not null,
  notes text, -- Special instructions
  created_at timestamptz default now()
);

-- Payments
create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id),
  payment_method text not null,
  amount decimal(10,2) not null,
  status text check (status in ('pending','completed','failed','refunded')),
  transaction_id text, -- Stripe/Square ID
  card_last4 text,
  created_at timestamptz default now()
);

-- Indexes
create index idx_orders_created on orders(created_at desc);
create index idx_orders_status on orders(status);
create index idx_orders_customer on orders(customer_id);
create index idx_order_items_order on order_items(order_id);
```

**POS Screen:**
- Left: Product catalog
  - Category tabs (Food/Drink/Equipment/etc.)
  - Grid layout with images
  - Quick add to cart
  - Search bar
- Right: Cart
  - Line items with quantity
  - Subtotal, tax, total
  - Apply discount
  - Add tip (restaurant)
  - Payment button

**Cart Management:**
- Add/remove items
- Adjust quantity
- Item notes (special requests)
- Apply coupon/promo code
- Calculate tax automatically

**Payment Processing:**
- Cash:
  - Enter amount tendered
  - Calculate change
- Card:
  - Stripe/Square integration
  - Swipe/tap/chip reader
  - Contactless payment
- Member Account:
  - Charge to account
  - Signature capture
- Split Payment:
  - Multiple payment methods
  - Specify amounts per method

**Receipt:**
- Print receipt (thermal printer)
- Email receipt
- SMS receipt (optional)
- Store copy

**Files to Create:**
- `pos/pos-screen.html` - Main POS interface
- `pos/cart.js` - Cart logic
- `pos/payment.js` - Payment processing
- `pos/receipt.js` - Receipt generation
- `pos/stripe-integration.js` - Stripe SDK
- `pos/pos.css` - POS styling

#### **C. Tee Time Ticketing** (6-8h)

```sql
-- Tee times
create table tee_times (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references courses(id),
  tee_date date not null,
  tee_time time not null,
  max_players int default 4,
  booked_players int default 0,
  status text check (status in ('available','partial','full','blocked')),
  price_member decimal(10,2),
  price_public decimal(10,2),
  notes text,
  created_at timestamptz default now(),
  unique(course_id, tee_date, tee_time)
);

-- Tee time bookings
create table tee_time_bookings (
  id uuid primary key default gen_random_uuid(),
  tee_time_id uuid references tee_times(id),
  golfer_id uuid references profiles(id),
  order_id uuid references orders(id), -- Links to payment
  player_name text not null,
  player_email text,
  player_phone text,
  is_member boolean default false,
  status text check (status in ('confirmed','checked_in','no_show','cancelled')),
  price_paid decimal(10,2),
  payment_status text check (payment_status in ('pending','paid','refunded')),
  notes text,
  booked_by uuid references profiles(id),
  booked_at timestamptz default now()
);

-- Indexes
create index idx_tee_times_date on tee_times(course_id, tee_date, tee_time);
create index idx_tee_times_status on tee_times(status);
create index idx_bookings_tee_time on tee_time_bookings(tee_time_id);
create index idx_bookings_golfer on tee_time_bookings(golfer_id);
```

**Tee Time Booking:**
- Calendar view (day/week)
- Available slots displayed
- Color coding (available/partial/full)
- Click slot to book
- Booking form:
  - Date & time (pre-filled)
  - Number of players (1-4)
  - Player names/emails
  - Member vs public pricing
  - Payment method
- Confirmation screen

**Booking Management:**
- View all bookings (today/upcoming)
- Filter by date/time/golfer
- Edit booking
- Cancel/refund
- Check-in system:
  - Scan QR code or enter booking #
  - Mark as checked in
  - Track no-shows
- Walk-in booking

**Payment:**
- Pay now (online booking)
- Pay at check-in (phone/in-person)
- Member account charge
- Refund handling

**Notifications:**
- Email confirmation
- SMS reminder (day before)
- Calendar invite (.ics file)
- Cancellation notice

**Files to Create:**
- `tee-times/calendar.html` - Tee time calendar
- `tee-times/booking-form.html` - Booking interface
- `tee-times/management.html` - Manage bookings
- `tee-times/check-in.html` - Check-in system
- `tee-times/tee-times.js` - Booking logic
- `tee-times/notifications.js` - Email/SMS

#### **D. Reporting & Analytics** (4-5h)

**Sales Reports:**
- Daily sales summary
  - Total revenue
  - Transaction count
  - Average ticket
  - By category
  - By payment method
- Product performance
  - Top selling items
  - Low performers
  - Revenue by product
- Time-based analysis
  - Peak hours
  - Day of week trends
  - Monthly comparisons

**Inventory Reports:**
- Current stock levels
- Low stock alerts
- Reorder recommendations
- Cost of goods sold (COGS)
- Inventory value
- Shrinkage tracking

**Tee Time Analytics:**
- Utilization rate (% booked)
- Revenue per slot
- Peak times
  - Most popular days
  - Most popular times
- Cancellation rates
- No-show rates
- Member vs public ratio

**Dashboard:**
- Real-time sales counter
- Today's revenue
- Week/month comparison
- Quick stats cards
- Charts and graphs

**Files to Create:**
- `reports/sales.html` - Sales reports
- `reports/inventory.html` - Inventory reports
- `reports/tee-times.html` - Tee time analytics
- `reports/dashboard.html` - Main dashboard
- `reports/reports.js` - Report generation
- `reports/charts.js` - Chart visualization

**Estimated Total:** 22-28h

---

## 6. Super Admin Role System 👑

### Requirements:
- Super admin for all lead roles
- Role-based access control (RBAC)
- Permission management
- Audit logging

### Implementation Tasks:

#### **A. Role & Permission Schema** (2-3h)

```sql
-- Roles
create table roles (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  description text,
  level int not null, -- 1=super_admin, 2=admin, 3=manager, 4=staff, 5=member
  is_system boolean default false, -- Cannot be deleted
  created_at timestamptz default now()
);

-- User roles (many-to-many)
create table user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  role_id uuid references roles(id) on delete cascade,
  scope text default 'global', -- "global", "society:uuid", "course:uuid"
  granted_by uuid references profiles(id),
  granted_at timestamptz default now(),
  expires_at timestamptz, -- Optional expiration
  unique(user_id, role_id, scope)
);

-- Permissions
create table permissions (
  id uuid primary key default gen_random_uuid(),
  role_id uuid references roles(id) on delete cascade,
  resource text not null, -- "users", "societies", "tournaments", "pos", "chat", "courses"
  action text not null, -- "create", "read", "update", "delete", "manage"
  scope text default 'all', -- "all", "own", "society"
  unique(role_id, resource, action, scope)
);

-- Audit log
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  action text not null,
  resource text not null,
  resource_id uuid,
  changes jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz default now()
);

-- Indexes
create index idx_user_roles_user on user_roles(user_id);
create index idx_user_roles_role on user_roles(role_id);
create index idx_permissions_role on permissions(role_id);
create index idx_audit_log_user on audit_log(user_id, created_at desc);
create index idx_audit_log_resource on audit_log(resource, resource_id);

-- Seed system roles
insert into roles (name, description, level, is_system) values
  ('super_admin', 'Full system access - all permissions', 1, true),
  ('course_admin', 'Manage specific golf course', 2, true),
  ('society_admin', 'Manage specific society', 2, true),
  ('tournament_director', 'Manage tournaments', 2, true),
  ('pos_manager', 'Manage POS system and inventory', 3, true),
  ('starter', 'Manage tee times and check-ins', 4, true),
  ('marshal', 'Monitor course and pace of play', 4, true),
  ('member', 'Basic golfer access', 5, true);

-- Seed super admin permissions (all resources, all actions)
insert into permissions (role_id, resource, action, scope)
select
  r.id,
  resource,
  action,
  'all'
from roles r
cross join (values
  ('users', 'create'), ('users', 'read'), ('users', 'update'), ('users', 'delete'),
  ('societies', 'create'), ('societies', 'read'), ('societies', 'update'), ('societies', 'delete'),
  ('tournaments', 'create'), ('tournaments', 'read'), ('tournaments', 'update'), ('tournaments', 'delete'),
  ('courses', 'create'), ('courses', 'read'), ('courses', 'update'), ('courses', 'delete'),
  ('pos', 'manage'), ('inventory', 'manage'),
  ('tee_times', 'manage'), ('bookings', 'manage'),
  ('chat', 'moderate'), ('reports', 'view')
) as p(resource, action)
where r.name = 'super_admin';
```

**RLS Helper Functions:**
```sql
-- Check if user has role
create or replace function has_role(user_id uuid, role_name text, scope_filter text default 'global')
returns boolean
language plpgsql
security definer
as $$
begin
  return exists (
    select 1
    from user_roles ur
    join roles r on r.id = ur.role_id
    where ur.user_id = has_role.user_id
      and r.name = has_role.role_name
      and (ur.scope = has_role.scope_filter or ur.scope = 'global')
      and (ur.expires_at is null or ur.expires_at > now())
  );
end;
$$;

-- Check if user has permission
create or replace function has_permission(user_id uuid, resource_name text, action_name text)
returns boolean
language plpgsql
security definer
as $$
begin
  return exists (
    select 1
    from user_roles ur
    join permissions p on p.role_id = ur.role_id
    where ur.user_id = has_permission.user_id
      and p.resource = has_permission.resource_name
      and p.action = has_permission.action_name
      and (ur.expires_at is null or ur.expires_at > now())
  );
end;
$$;
```

#### **B. Authorization System** (3-4h)

**JavaScript Helper Functions:**
```javascript
// Check if current user has role
async function hasRole(roleName, scope = 'global') {
  const supabase = await getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase.rpc('has_role', {
    user_id: user.id,
    role_name: roleName,
    scope_filter: scope
  });

  return data === true;
}

// Check if current user has permission
async function hasPermission(resource, action) {
  const supabase = await getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase.rpc('has_permission', {
    user_id: user.id,
    resource_name: resource,
    action_name: action
  });

  return data === true;
}

// Get all roles for current user
async function getUserRoles() {
  const supabase = await getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('user_roles')
    .select('*, role:roles(*)')
    .eq('user_id', user.id)
    .is('expires_at', null)
    .or('expires_at.gt.now()');

  return data || [];
}

// UI guard - hide element if no permission
function requirePermission(elementId, resource, action) {
  hasPermission(resource, action).then(allowed => {
    if (!allowed) {
      document.getElementById(elementId)?.remove();
    }
  });
}

// Middleware - block route if no permission
async function requireRole(roleName, scope = 'global') {
  const allowed = await hasRole(roleName, scope);
  if (!allowed) {
    alert('Access denied. Insufficient permissions.');
    window.location.href = '/';
    throw new Error('Access denied');
  }
}
```

**RLS Policy Updates:**
Add permission checks to existing tables:
```sql
-- Example: Only super_admin and course_admin can create courses
alter table courses enable row level security;

drop policy if exists "Users can create courses" on courses;
create policy "Admins can create courses"
  on courses for insert
  with check (
    has_permission(auth.uid(), 'courses', 'create')
  );

drop policy if exists "Users can view courses" on courses;
create policy "Anyone can view courses"
  on courses for select
  using (true);

drop policy if exists "Users can update courses" on courses;
create policy "Admins can update courses"
  on courses for update
  using (
    has_permission(auth.uid(), 'courses', 'update')
  );
```

**Files to Create:**
- `admin/auth.js` - Authorization helpers
- `admin/permissions.js` - Permission checking
- `admin/middleware.js` - Route guards

#### **C. Admin Dashboard** (6-8h)

**User Management:**
- List all users
  - Search/filter
  - Sort by name/date/role
  - Show assigned roles
- View user details:
  - Profile info
  - Current roles
  - Permission summary
  - Activity history
- Assign/revoke roles:
  - Select user
  - Choose role
  - Set scope (global/society/course)
  - Optional expiration date
  - Reason for assignment
- Bulk operations:
  - Assign role to multiple users
  - Export user list

**Role Management:**
- List all roles
  - System roles (locked)
  - Custom roles
- Create custom role:
  - Name, description
  - Level (1-5)
  - Select permissions (checkboxes)
- Edit role:
  - Modify permissions
  - Cannot edit system roles
- Delete role:
  - Check if in use
  - Reassign users if needed
- Role hierarchy view:
  - Tree/flowchart visualization

**Permission Management:**
- Matrix view:
  - Rows: Roles
  - Columns: Resources
  - Cells: Actions (CRUD)
- Bulk permission assignment
- Permission templates

**Files to Create:**
- `admin/users.html` - User management
- `admin/roles.html` - Role management
- `admin/permissions.html` - Permission matrix
- `admin/user-form.html` - Assign roles form
- `admin/role-form.html` - Create/edit role
- `admin/admin.js` - Admin logic
- `admin/admin.css` - Admin styling

#### **D. Audit Logging** (2-3h)

**Log All Admin Actions:**
```javascript
async function logAction(action, resource, resourceId, changes) {
  const supabase = await getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  await supabase.from('audit_log').insert({
    user_id: user.id,
    action: action,
    resource: resource,
    resource_id: resourceId,
    changes: changes,
    ip_address: await getClientIP(), // Implement this
    user_agent: navigator.userAgent
  });
}

// Usage example
await logAction('role_assigned', 'users', userId, {
  role: 'course_admin',
  scope: 'course:123',
  assigned_by: currentUserId
});
```

**Audit Log Viewer:**
- List all actions
  - Filter by user
  - Filter by resource
  - Filter by date range
  - Filter by action type
- View action details:
  - Who did it
  - What changed (JSON diff)
  - When
  - IP address
  - User agent
- Export audit log (CSV)

**Files to Create:**
- `admin/audit-log.html` - Audit viewer
- `admin/audit.js` - Logging functions

#### **E. Super Admin Dashboard** (4-5h)

**System Overview:**
- Platform statistics:
  - Total users
  - Active users (last 30 days)
  - Total rounds played
  - Total revenue
- Recent activity feed
- System health indicators
- Quick actions

**Settings:**
- Global configuration:
  - Site name, logo
  - Contact info
  - Business hours
  - Time zone
- Feature toggles:
  - Enable/disable modules
  - Maintenance mode
- Email settings:
  - SMTP configuration
  - Email templates
- Payment settings:
  - Stripe keys
  - Tax rates
- Notification settings:
  - SMS provider
  - Push notifications

**Data Management:**
- Backup/restore
- Import data (CSV)
- Export data (CSV/JSON)
- Database migrations
- Clear cache

**Analytics:**
- User growth chart
- Revenue trends
- Most active features
- System performance

**Files to Create:**
- `admin/dashboard.html` - Super admin home
- `admin/settings.html` - System settings
- `admin/data.html` - Data management
- `admin/analytics.html` - Platform analytics

**Estimated Total:** 15-20h

---

## Technical Stack

### Frontend:
- Vanilla JavaScript (ES6+)
- HTML5 + CSS3
- Tailwind CSS
- Service Workers (PWA)

### Backend:
- Supabase (PostgreSQL + Realtime)
- Row Level Security (RLS)
- Edge Functions (optional)

### APIs:
- Stripe/Square (payments)
- SMS provider (notifications)
- Weather API (existing)
- GPS/Maps (existing)

### Tools:
- Git for version control
- Netlify for deployment

---

## Next Session Start Instructions

1. **Read this file first** to understand all remaining tasks
2. **Ask user which task to start** (suggest Golfer Scorecard #2)
3. **Refer to `01-chat-system-completed.md`** for chat context
4. **Start implementing immediately** - no planning phase
5. **Track progress** with TodoWrite tool
6. **Commit frequently** with clear messages

**No blockers. All tasks are well-defined. Ready to build.**
