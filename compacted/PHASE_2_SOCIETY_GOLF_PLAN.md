# Phase 2: Society Golf - Calendar & Golfer Events

## 1. SOCIETY ORGANIZER CALENDAR

### Overview
Monthly calendar view in the Calendar tab showing all events created by this organizer.

### Features

#### Calendar Display
- **Month View** - Traditional calendar grid (7 columns x 5-6 rows)
- **Month Navigation** - Previous/Next month arrows, month/year selector
- **Today Indicator** - Highlight current date
- **Event Dots** - Color-coded dots on dates with events
- **Multi-Event Dates** - Show count badge if multiple events on same day

#### Event Indicators
- **Green** - Open events (accepting registrations)
- **Red** - Closed events (full or past cutoff)
- **Blue** - Upcoming events within 7 days
- **Gray** - Past events

#### Interactions
- **Click Date** - Show all events for that date in sidebar
- **Click Event** - Open event details/edit modal
- **Hover Date** - Preview event names in tooltip
- **Drag & Drop** - Future: reschedule events by dragging

#### Sidebar Panel
When clicking a date:
- List all events for that date
- Show quick stats (registered/max players)
- Quick actions: Edit, View Roster, Delete
- "Add Event" button for that date

#### Header Stats
- Total events this month
- Total registered players
- Upcoming events (next 7 days)
- Events needing attention (near capacity, near cutoff)

### Data Structure
```javascript
{
  year: 2025,
  month: 10,
  events: [
    {
      id: 'uuid',
      date: '2025-10-15',
      name: 'Monthly Medal',
      status: 'open',
      registered: 32,
      maxPlayers: 40,
      format: '2man_scramble'
    }
  ]
}
```

### UI Components Needed
1. **CalendarGrid** - Main calendar layout
2. **CalendarDay** - Individual day cell with events
3. **EventDot** - Colored indicator on calendar
4. **EventSidebar** - Panel showing events for selected date
5. **MonthNavigator** - Month/year selector
6. **CalendarHeader** - Stats and controls

### Implementation Steps
1. Create calendar grid layout (7x6 grid)
2. Load organizer's events from database
3. Map events to calendar dates
4. Render event dots/indicators
5. Implement date click handler
6. Build event sidebar panel
7. Add month navigation
8. Style with Tailwind

---

## 2. GOLFER EVENTS BROWSE PAGE

### Overview
Public-facing page where golfers can browse and register for society events from ALL organizers.

### Location
New screen accessible from Golfer Dashboard or main menu.

### Features

#### Header Section
- **Title**: "Society Golf Events"
- **Subtitle**: "Join upcoming society events and tournaments"
- **Active Filters Badge**: Show count of active filters
- **Search Bar**: Search by event name or society name

#### Filter Panel (Collapsible Sidebar)
**Event Format Filter:**
- ☐ All Formats
- ☐ Stroke Play
- ☐ 2-Man Scramble
- ☐ 4-Man Scramble
- ☐ Four Ball
- ☐ Stableford
- ☐ Private Game
- ☐ Other

**Date Range Filter:**
- ○ All Upcoming
- ○ This Week
- ○ This Month
- ○ Next 3 Months
- ○ Custom Range (date pickers)

**Availability Filter:**
- ☐ Only Show Available (has open spots)
- ☐ Include Waitlist Events

**Society Filter:**
- Search box to filter by society name
- List of societies with event counts

**Sort Options:**
- ○ Date (Earliest First)
- ○ Date (Latest First)
- ○ Most Available Spots
- ○ Newest Listed

#### Event Cards Grid
Display events in responsive grid (1-3 columns based on screen size)

**Each Event Card Shows:**
```
┌─────────────────────────────────────┐
│ [Society Logo] Society Name         │
│ Event Format Badge                  │
├─────────────────────────────────────┤
│ EVENT NAME (large, bold)            │
│                                     │
│ 📅 Saturday, October 15, 2025       │
│ 🚐 Departure: 8:00 AM              │
│ 📍 Phuket Country Club              │
│ 👥 32/40 Players                    │
│ ⏰ Registration closes: Oct 12, 5PM │
│                                     │
│ Fees:                               │
│ • Green Fee: ฿1,800                 │
│ • Cart: ฿500                        │
│ • Caddy: ฿400                       │
│ • Transport: ฿200                   │
│ • Competition: ฿100                 │
│ TOTAL: ฿3,000                       │
│                                     │
│ [Register Now Button - Green]       │
│ or [Join Waitlist - Yellow]         │
└─────────────────────────────────────┘
```

**Status Badges:**
- 🟢 OPEN - Green badge
- 🟡 ALMOST FULL - Yellow badge (90%+ capacity)
- 🔴 FULL - Red badge
- ⏰ CLOSING SOON - Orange badge (< 48 hours to cutoff)
- ⚫ CLOSED - Gray badge

#### Empty States
- **No Events**: "No upcoming events found. Check back soon!"
- **No Matches**: "No events match your filters. Try adjusting your search."
- **Loading**: Skeleton cards with loading animation

#### Pagination
- Show 12 events per page
- "Load More" button or infinite scroll
- Page indicator (showing X-Y of Z events)

### Data Queries

**Load All Public Events:**
```sql
SELECT e.*, p.society_name, p.society_logo
FROM society_events e
LEFT JOIN society_profiles p ON e.organizer_id = p.organizer_id
WHERE e.date >= CURRENT_DATE
AND e.status = 'open'
ORDER BY e.date ASC
```

**Count Registered Players:**
```sql
SELECT event_id, COUNT(*) as registered_count
FROM society_registrations
WHERE status = 'confirmed'
GROUP BY event_id
```

### Registration Flow

**When Golfer Clicks "Register":**

1. **Check Authentication**
   - If not logged in → prompt LINE login
   - If logged in → proceed

2. **Check Availability**
   - If spots available → show registration form
   - If full but waitlist enabled → offer waitlist
   - If full and no waitlist → show "Event Full" message

3. **Registration Form Modal**
   ```
   ┌──────────────────────────────────────┐
   │ Register for [Event Name]            │
   ├──────────────────────────────────────┤
   │ Player Name: [Auto-filled from profile] │
   │ Handicap: [____]                     │
   │ Contact Number: [____________]       │
   │                                      │
   │ Add-ons:                             │
   │ ☐ Transport (฿200)                   │
   │ ☐ Competition Fee (฿100)             │
   │                                      │
   │ Partner Preferences (optional):      │
   │ [Search for players...]              │
   │ Selected: [Player badges]            │
   │                                      │
   │ Special Requests:                    │
   │ [Text area]                          │
   │                                      │
   │ Total Fee: ฿3,000                    │
   │                                      │
   │ [Cancel] [Confirm Registration]      │
   └──────────────────────────────────────┘
   ```

4. **Confirmation**
   - Save to `society_registrations` table
   - Send confirmation notification
   - Show success message with booking reference
   - Option to add to calendar
   - Option to share on LINE

5. **Post-Registration**
   - Email/LINE confirmation
   - Show in golfer's "My Events" section
   - Organizer notified of new registration

### Database Schema

**society_registrations table:**
```sql
CREATE TABLE society_registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES society_events(id) ON DELETE CASCADE,
    player_id TEXT NOT NULL,  -- LINE user ID
    player_name TEXT NOT NULL,
    handicap NUMERIC(4,1),
    contact_number TEXT,
    want_transport BOOLEAN DEFAULT false,
    want_competition BOOLEAN DEFAULT false,
    partner_prefs TEXT[],  -- Array of player IDs
    special_requests TEXT,
    status TEXT DEFAULT 'confirmed',  -- confirmed, waitlist, cancelled
    total_fee INTEGER NOT NULL,
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_registrations_event ON society_registrations(event_id);
CREATE INDEX idx_registrations_player ON society_registrations(player_id);
CREATE INDEX idx_registrations_status ON society_registrations(event_id, status);
```

### UI Components Needed

1. **EventsGrid** - Responsive grid layout
2. **EventCard** - Individual event display
3. **FilterPanel** - Sidebar with all filters
4. **SearchBar** - Event/society search
5. **RegistrationModal** - Registration form
6. **StatusBadge** - Visual status indicators
7. **FeeBreakdown** - Fee display component
8. **PartnerSelector** - Search and select partners
9. **ConfirmationModal** - Success message after registration

### Implementation Steps

#### Phase 2A: Events Browse Page
1. Create new screen `golferEventsPage`
2. Add route/navigation from Golfer Dashboard
3. Build EventCard component
4. Implement event loading from Supabase
5. Build filter panel (format, date, society)
6. Implement search functionality
7. Add sorting options
8. Style with responsive grid

#### Phase 2B: Registration Flow
1. Create registration modal component
2. Build registration form with validation
3. Create `society_registrations` table
4. Implement registration save logic
5. Add capacity checking
6. Build waitlist logic
7. Add confirmation screen
8. Send notifications (LINE/email)

#### Phase 2C: Calendar View
1. Create calendar grid component
2. Load organizer's events by month
3. Map events to calendar dates
4. Render event indicators
5. Build date click handler
6. Create event sidebar panel
7. Add month navigation
8. Integrate with existing events

### Success Metrics

- Golfers can find and register for events easily
- Organizers can see events at a glance in calendar
- Registration process is smooth (< 1 minute)
- All event data displays correctly
- Filters and search work accurately

---

## Implementation Priority

### Week 1:
1. ✅ Society Organizer Calendar UI
2. ✅ Calendar data loading and display
3. ✅ Event indicators and interactions

### Week 2:
1. ✅ Golfer Events Browse page UI
2. ✅ Event cards and grid layout
3. ✅ Filter panel implementation
4. ✅ Search functionality

### Week 3:
1. ✅ Registration modal and form
2. ✅ Database schema for registrations
3. ✅ Registration save logic
4. ✅ Confirmation flow

### Week 4:
1. ✅ Waitlist functionality
2. ✅ Notifications
3. ✅ Testing and bug fixes
4. ✅ Polish and optimization

---

## Files to Create/Modify

### New Files:
- `society-events-browse.html` - Golfer events page section
- `society-calendar.html` - Calendar component section
- `sql/society-registrations.sql` - Registration table migration

### Modified Files:
- `index.html` - Add new screens and components
- Integration of calendar in Society Organizer Dashboard
- Integration of events browse in Golfer Dashboard

---

## API Endpoints Needed

### Supabase Functions:

1. **get_public_events(filters)**
   - Returns all public events with filters
   - Includes registration counts
   - Joins with society profiles

2. **register_for_event(event_id, player_data)**
   - Checks capacity
   - Creates registration
   - Updates event counts
   - Returns confirmation

3. **cancel_registration(registration_id)**
   - Cancels registration
   - Promotes from waitlist if applicable
   - Updates counts

4. **get_my_registrations(player_id)**
   - Returns all registrations for player
   - Upcoming and past
   - With event details

---

## Mobile Optimization

- Filters collapse to bottom sheet on mobile
- Event cards stack in single column
- Calendar switches to list view on small screens
- Registration form optimized for mobile input
- Touch-friendly controls

---

## Future Enhancements

- **Payment Integration** - Collect fees online
- **QR Code Check-in** - Generate QR codes for event check-in
- **Event Chat** - Group chat for registered players
- **Photo Gallery** - Upload event photos
- **Leaderboards** - Show competition results
- **Recurring Registration** - Auto-register for recurring events
- **Reminders** - Automated reminders before events
- **Weather Integration** - Show forecast for event date

---

This plan provides a complete, production-ready implementation for Phase 2 of the Society Golf platform!
