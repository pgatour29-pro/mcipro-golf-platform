# Session Catalog: December 6, 2025
## Translations, PIN Access Fix, Event Sorting & Notification Badges

---

## Session Overview

This session covered multiple critical features:
1. **Translation System** - Continued modal translations for all 4 languages
2. **Login Page Translation Fix** - Added data-i18n attributes to login page
3. **Society Organizer PIN Fix** - Fixed PIN verification for non-LINE authenticated users
4. **Event Sorting Fix** - Events now maintain date order after editing
5. **Event Notification System** - NEW/UPDATED badges for golfers

---

## 1. Translation System Completion

### Languages Supported
- English (en)
- Thai (th)
- Korean (ko)
- Japanese (ja)

### Modal Translation Keys Added (~170 keys per language)

```javascript
// Caddy Modals
'modal.caddy.notes.title': 'Personal Notes',
'modal.caddy.notes.placeholder': 'Add your private notes about this caddy...',
'modal.caddy.book.title': 'Book Caddy',
'modal.caddy.book.date': 'Date',
'modal.caddy.book.time': 'Tee Time',
'modal.caddy.book.course': 'Course',
'modal.caddy.book.submit': 'Send Booking Request',

// Scanner Modal
'modal.scanner.title': 'Scan Scorecard',
'modal.scanner.manual': 'Manual Entry (Skip OCR)',
'modal.scanner.capture': 'Capture Scorecard',
'modal.scanner.processing': 'Processing image...',

// Player/Group Modals
'modal.player.addtogroup': 'Add Player to Group',
'modal.player.search': 'Search players...',
'modal.player.handicap': 'Handicap',
'modal.player.add': 'Add to Group',

// Games Modal
'modal.games.title': 'Join Side Games',
'modal.games.available': 'Available Games',
'modal.games.joined': 'You\'re In!',

// Scorecard Modal
'modal.scorecard.official': 'Official Scorecard',
'modal.scorecard.download': 'Download PDF',
'modal.scorecard.share': 'Share',

// LINE Export Modal
'modal.line.title': 'Export to LINE',
'modal.line.preview': 'Preview Message',
'modal.line.send': 'Send to LINE',

// Roster Modal
'modal.roster.title': 'Event Roster',
'modal.roster.registered': 'Registered Players',
'modal.roster.waitlist': 'Waitlist',

// Quick Start & Login
'quickstart.title': 'New Member? Start Here',
'quickstart.subtitle': 'Quick registration - no app download needed',
'quickstart.button': 'Quick Start Registration',
'login.enterprise.title': 'Enterprise Login Options',
'login.caddy.access': 'Caddy Access',
'login.manager.access': 'Course Manager',
'login.proshop.access': 'Pro Shop Staff',
'login.maintenance.access': 'Maintenance Crew',
'login.society.access': 'Society Organizer',
'login.course.admin': 'Course Admin',

// OTP Authentication
'otp.title': 'Mobile Verification',
'otp.subtitle': 'Enter your mobile number to receive a verification code',
'otp.phone.label': 'Mobile Number',
'otp.send': 'Send Verification Code',
'otp.verify.title': 'Enter Verification Code',
'otp.code.sent': 'Code sent to',
'otp.verify': 'Verify Code',
'otp.resend': 'Resend Code',

// Profile Creation
'profile.create.title': 'Create Your Golf Profile',
'profile.name': 'Full Name',
'profile.handicap': 'Handicap Index',
'profile.home.course': 'Home Course',
'profile.complete': 'Complete Registration',
```

### Login Page HTML Fixed (data-i18n attributes added)

**Before:** Hardcoded English text
```html
<h3 class="text-lg font-bold">New Member? Start Here</h3>
<span>Quick Start Registration</span>
```

**After:** Translation-ready
```html
<h3 class="text-lg font-bold" data-i18n="quickstart.title">New Member? Start Here</h3>
<span data-i18n="quickstart.button">Quick Start Registration</span>
```

---

## 2. Society Organizer PIN Access Fix

### Problem
- JOA society PIN worked correctly
- Travellers society PIN showed "User not authenticated"
- Issue occurred when accessing from login page without LINE authentication

### Root Cause
The `verifyPin()` function was using `AppState.currentUser?.lineUserId` instead of `AppState.selectedSociety?.organizerId`

### Fix Location
**File:** `public/index.html`
**Lines:** 61720-61790 (verifyPin function)

### Code Changes

**Before:**
```javascript
async verifyPin() {
    const inputPin = document.getElementById('societyOrganizerPinInput').value;
    const userId = AppState.currentUser?.lineUserId;

    // This fails when user isn't LINE authenticated
    if (!userId) {
        NotificationManager.show('User not authenticated', 'error');
        return;
    }

    const { data, error } = await window.SupabaseDB.client
        .rpc('verify_society_organizer_pin', {
            org_id: userId,  // WRONG - uses current user instead of society
            input_pin: inputPin
        });
}
```

**After:**
```javascript
async verifyPin() {
    const inputPin = document.getElementById('societyOrganizerPinInput').value;
    const userId = AppState.currentUser?.lineUserId;

    // IMPORTANT: Use the selected society's organizer ID for PIN verification
    const societyOrganizerId = AppState.selectedSociety?.organizerId;
    console.log('[SocietyAuth] Verifying PIN for society:', AppState.selectedSociety?.name);
    console.log('[SocietyAuth] Society organizer ID:', societyOrganizerId);

    // Check for society organizer ID, not current user
    if (!societyOrganizerId) {
        NotificationManager.show('Please select a society first', 'error');
        return;
    }

    const { data, error } = await window.SupabaseDB.client
        .rpc('verify_society_organizer_pin', {
            org_id: societyOrganizerId,  // CORRECT - uses selected society's organizer
            input_pin: inputPin
        });
}
```

### Also Fixed: saveDashboardPin()

**Lines:** 53711-53725

```javascript
async saveDashboardPin() {
    // Use selected society's organizer ID if available
    const userId = AppState.selectedSociety?.organizerId || AppState.currentUser?.lineUserId;
    console.log('[SocietyOrganizer] Saving PIN for organizer:', userId);
    // ... rest of function
}
```

---

## 3. Event Sorting Fix After Editing

### Problem
When editing an event in the organizer dashboard, after saving the event would go to the bottom of the list instead of staying in its date position.

### Root Cause
1. `getOrganizerEventsWithStats()` query had no `.order()` clause
2. `loadEvents()` didn't sort events after enrichment with payment stats

### Fix Locations

**Fix 1: Database Query Sorting**
**File:** `public/index.html`
**Lines:** 39013-39017

```javascript
// Before
const eventsQuery = window.SupabaseDB.client
    .from('society_events')
    .select('*')
    .ilike('title', `${societyPrefix}%`);

// After
const eventsQuery = window.SupabaseDB.client
    .from('society_events')
    .select('*')
    .ilike('title', `${societyPrefix}%`)
    .order('event_date', { ascending: true });  // Sort by date
```

**Fix 2: JavaScript Sorting After Enrichment**
**File:** `public/index.html`
**Lines:** 49878-49885

```javascript
this.events = enrichedEvents;

// Sort events by date to maintain proper order after editing
this.events.sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateA - dateB;  // Ascending order (earliest first)
});
```

---

## 4. Event Notification System (NEW Feature)

### Overview
Implemented a complete notification system to alert golfers when:
- **NEW** events are created (red pulsing badge)
- **UPDATED** events are modified (orange badge)

### Components

#### 4.1 EventNotificationSystem Class
**Location:** Lines 57260-57385

```javascript
class EventNotificationSystem {
    static STORAGE_KEY = 'mcipro_event_notifications';
    static LAST_SEEN_KEY = 'mcipro_events_last_seen';

    // Get last seen timestamp for events
    static getLastSeenTimestamp() {
        const stored = localStorage.getItem(this.LAST_SEEN_KEY);
        if (!stored) {
            // First time user - set to 24 hours ago
            const yesterday = new Date();
            yesterday.setHours(yesterday.getHours() - 24);
            return yesterday.toISOString();
        }
        return stored;
    }

    // Update last seen timestamp to now
    static markAllAsSeen() {
        localStorage.setItem(this.LAST_SEEN_KEY, new Date().toISOString());
        this.updateCubeBadge(0, 0);
    }

    // Mark a specific event as seen
    static markEventAsSeen(eventId) {
        const data = this.getNotificationData();
        data.seenEvents[eventId] = new Date().toISOString();
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    }

    // Determine event notification status: 'new', 'updated', or null
    static getEventStatus(event) {
        const lastSeen = new Date(this.getLastSeenTimestamp());
        const createdAt = event.createdAt ? new Date(event.createdAt) : null;
        const updatedAt = event.updatedAt ? new Date(event.updatedAt) : null;

        if (this.hasEventBeenSeen(event.id)) return null;
        if (createdAt && createdAt > lastSeen) return 'new';
        if (updatedAt && updatedAt > lastSeen && createdAt <= lastSeen) return 'updated';
        return null;
    }

    // Count new and updated events
    static countNotifications(events) {
        let newCount = 0, updatedCount = 0;
        events.forEach(event => {
            const status = this.getEventStatus(event);
            if (status === 'new') newCount++;
            if (status === 'updated') updatedCount++;
        });
        return { newCount, updatedCount, total: newCount + updatedCount };
    }

    // Update the Society Events cube badge
    static updateCubeBadge(newCount, updatedCount) {
        const badge = document.getElementById('societyEventsBadge');
        const markAllBtn = document.getElementById('markAllSeenBtn');
        const total = newCount + updatedCount;

        if (badge) {
            if (total > 0) {
                let badgeText = '';
                if (newCount > 0 && updatedCount > 0) {
                    badgeText = `${newCount} new, ${updatedCount} updated`;
                } else if (newCount > 0) {
                    badgeText = newCount === 1 ? '1 new' : `${newCount} new`;
                } else {
                    badgeText = updatedCount === 1 ? '1 updated' : `${updatedCount} updated`;
                }
                badge.textContent = badgeText;
                badge.style.display = 'block';
            } else {
                badge.style.display = 'none';
            }
        }

        if (markAllBtn) {
            markAllBtn.style.display = total > 0 ? 'flex' : 'none';
        }
    }

    // Generate badge HTML for event card
    static getEventBadgeHTML(event) {
        const status = this.getEventStatus(event);
        if (status === 'new') {
            return `<span class="absolute top-2 left-2 px-2 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full animate-pulse shadow-lg z-10">NEW</span>`;
        }
        if (status === 'updated') {
            return `<span class="absolute top-2 left-2 px-2 py-0.5 text-xs font-bold bg-orange-500 text-white rounded-full shadow-lg z-10">UPDATED</span>`;
        }
        return '';
    }
}
```

#### 4.2 Society Events Cube Badge
**Location:** Lines 23943-23954

```html
<button onclick="showGolferTab('societyevents', event)" class="card-hover metric-card text-center group relative">
    <!-- Notification Badge -->
    <span id="societyEventsBadge" class="absolute -top-1 -right-1 text-[9px] md:text-[10px] font-bold text-white bg-red-500 px-1.5 py-0.5 rounded-full shadow-md animate-pulse" style="display: none;">0 new</span>
    <div class="w-10 h-10 md:w-12 md:h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:bg-purple-200 transition-colors">
        <span class="material-symbols-outlined text-xl md:text-2xl text-purple-600">groups</span>
    </div>
    <h3 class="text-sm md:text-base font-bold text-gray-900 mb-1" data-i18n="golfer.societyevents">Society Events</h3>
    <!-- ... -->
</button>
```

#### 4.3 Event Card Badges
**Location:** Lines 57858-57870 (in renderEventCard)

```javascript
// Get notification badge (NEW or UPDATED)
const notificationBadge = EventNotificationSystem.getEventBadgeHTML(event);

return `
    <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer relative"
         onclick="GolferEventsSystem.openEventDetail('${event.id}')">
        <!-- NEW/UPDATED Notification Badge -->
        ${notificationBadge}
        <!-- Header with Society Branding -->
        ...
```

#### 4.4 "Mark All Seen" Button
**Location:** Lines 25075-25078

```html
<button onclick="EventNotificationSystem.markAllAsSeen(); GolferEventsSystem.filterEvents();"
        id="markAllSeenBtn"
        class="hover:bg-green-100 rounded-lg transition-colors text-green-600 flex items-center gap-1"
        style="padding: 6px 10px; flex-shrink: 0; margin-left: auto; display: none;"
        title="Mark all as seen">
    <span class="material-symbols-outlined" style="font-size: 16px;">done_all</span>
    <span class="text-xs font-medium hidden md:inline">Mark all seen</span>
</button>
```

#### 4.5 Integration Points

**In loadEvents() - Update badge after loading:**
```javascript
// Update notification badge on Society Events cube
const { newCount, updatedCount } = EventNotificationSystem.countNotifications(this.allEvents);
EventNotificationSystem.updateCubeBadge(newCount, updatedCount);
console.log(`[GolferEventsSystem] Notification counts - New: ${newCount}, Updated: ${updatedCount}`);
```

**In openEventDetail() - Mark event as seen:**
```javascript
// Mark event as seen (removes NEW/UPDATED badge)
EventNotificationSystem.markEventAsSeen(eventId);

// Update cube badge counts after marking as seen
const { newCount, updatedCount } = EventNotificationSystem.countNotifications(this.allEvents);
EventNotificationSystem.updateCubeBadge(newCount, updatedCount);
```

---

## Deployments

| Time | Description | URL |
|------|-------------|-----|
| Session 1 | Event sorting fix | Production |
| Session 2 | Notification badges | Production |

**Production URL:** https://www.mycaddipro.com

---

## Files Modified

| File | Changes |
|------|---------|
| `public/index.html` | All changes (single-file application) |

### Specific Line Ranges Modified

1. **Lines 2819-2988** - English translation keys
2. **Lines 3100-3269** - Thai translation keys
3. **Lines 3381-3550** - Korean translation keys
4. **Lines 3662-3831** - Japanese translation keys
5. **Lines 23399-23484** - Login page data-i18n attributes
6. **Lines 23943-23954** - Society Events cube with badge
7. **Lines 25075-25078** - Mark all seen button
8. **Lines 39013-39017** - Event query with sorting
9. **Lines 49878-49885** - Event sorting after enrichment
10. **Lines 53711-53725** - saveDashboardPin fix
11. **Lines 57260-57385** - EventNotificationSystem class
12. **Lines 57858-57870** - renderEventCard badge integration
13. **Lines 58039-58054** - openEventDetail mark as seen
14. **Lines 61720-61790** - verifyPin fix

---

## Testing Checklist

### Translation System
- [ ] Language selector changes all modal text
- [ ] Login page translates correctly
- [ ] OTP screen translates correctly
- [ ] Quick Start section translates

### PIN Access
- [ ] JOA PIN works from login page
- [ ] Travellers PIN works from login page
- [ ] PIN works when already logged in with LINE
- [ ] Error messages show correctly

### Event Sorting
- [ ] Events display in date order
- [ ] After editing, event stays in correct position
- [ ] New events appear in correct date position

### Notification Badges
- [ ] Badge appears on Society Events cube when new events exist
- [ ] Badge shows correct count (e.g., "2 new, 1 updated")
- [ ] NEW badge (red, pulsing) appears on new event cards
- [ ] UPDATED badge (orange) appears on modified event cards
- [ ] Clicking event detail removes that event's badge
- [ ] "Mark all seen" button clears all badges
- [ ] Badges persist across page refreshes (localStorage)

---

## Known Limitations

1. **Notification badges** use localStorage - won't sync across devices
2. **First-time users** see events from last 24 hours as "new"
3. **Badge counts** only update when events are loaded/refreshed

---

## Future Enhancements

1. Server-side notification tracking per user
2. Push notifications for new events
3. Email notifications for subscribed societies
4. Notification preferences in user settings
