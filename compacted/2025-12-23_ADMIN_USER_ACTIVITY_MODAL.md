# 2025-12-23 Admin User Activity Modal

## FEATURE OVERVIEW

New modal in Admin Dashboard showing:
1. **New Users** - Most recent signups (by `created_at`)
2. **Recent Activity** - Most recently active users (by `updated_at`)

---

## HOW TO ACCESS

1. Go to Admin Dashboard
2. Click blue **"User Activity"** button in header (next to Refresh)
3. Modal opens with two-column layout

---

## MODAL LAYOUT

```
┌─────────────────────────────────────────────────────────┐
│  🔍 User Activity                                    ✕  │
│     New signups & recent logins                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  👤 New Users              🔐 Recent Activity           │
│  (Most recent signups)     (Most recently active)       │
│                                                         │
│  ┌─────────────────┐      ┌─────────────────┐          │
│  │ Avatar  Name    │      │ Avatar  Name NEW│          │
│  │         @user   │      │         @user   │          │
│  │         role    │      │         role    │          │
│  │         2h ago  │      │         5m ago  │          │
│  └─────────────────┘      └─────────────────┘          │
│  ... (20 users)           ... (20 users)               │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  ℹ Showing top 20 users              [Refresh]         │
└─────────────────────────────────────────────────────────┘
```

---

## USER CARD DISPLAY

Each user shows:
- **Avatar** - Profile picture or initial with gradient background
- **Name** - Display name
- **Username** - @username
- **Role Badge** - Color-coded by role
- **Time** - Relative time (e.g., "2 hours ago")
- **NEW Badge** - Yellow badge if joined within 24 hours

### Role Color Coding
| Role | Color |
|------|-------|
| admin | Red (`bg-red-100 text-red-700`) |
| society_organizer | Purple (`bg-purple-100 text-purple-700`) |
| golfer | Blue (`bg-blue-100 text-blue-700`) |
| caddy | Green (`bg-green-100 text-green-700`) |

---

## CODE LOCATIONS

### Button (Header)
`public/index.html` line 33705-33708

```html
<button onclick="AdminSystem.showUserActivityModal()" class="btn-primary text-xs md:text-sm">
    <span class="material-symbols-outlined text-sm">person_search</span>
    <span class="hidden md:inline">User Activity</span>
</button>
```

### Modal HTML
`public/index.html` lines 34146-34206

### JavaScript Functions
`public/index.html` lines 42254-42404 (inside AdminSystem object)

```javascript
// Main functions:
AdminSystem.showUserActivityModal()    // Opens modal
AdminSystem.closeUserActivityModal()   // Closes modal
AdminSystem.loadUserActivityData()     // Fetches data from Supabase
AdminSystem.renderNewUsersList()       // Renders new users column
AdminSystem.renderRecentLoginsList()   // Renders recent activity column
```

---

## DATABASE QUERIES

### New Users Query
```javascript
await window.SupabaseDB.client
    .from('user_profiles')
    .select('line_user_id, name, username, role, created_at, updated_at, profile_data')
    .order('created_at', { ascending: false })
    .limit(20);
```

### Recent Activity Query
```javascript
await window.SupabaseDB.client
    .from('user_profiles')
    .select('line_user_id, name, username, role, created_at, updated_at, profile_data')
    .order('updated_at', { ascending: false })
    .limit(20);
```

---

## DATA FIELDS USED

From `user_profiles` table:
| Field | Usage |
|-------|-------|
| `line_user_id` | Unique identifier |
| `name` | Display name |
| `username` | @username |
| `role` | Role badge |
| `created_at` | Join date (New Users sort) |
| `updated_at` | Last activity (Recent Activity sort) |
| `profile_data.pictureUrl` | Avatar image |

---

## NEW BADGE LOGIC

```javascript
// Check if user joined within last 24 hours
const isNew = createdAt && (Date.now() - new Date(createdAt).getTime()) < 24 * 60 * 60 * 1000;
```

If `isNew` is true, shows yellow "NEW" badge next to name.

---

## TIME AGO DISPLAY

Uses existing `AdminSystem.getTimeAgo()` function:
- "just now" (< 1 minute)
- "X minutes ago"
- "X hours ago"
- "X days ago"
- "X months ago"

---

## STYLING

- **Modal backdrop**: `bg-black/50` with blur
- **Modal container**: `max-w-4xl` white card with rounded corners
- **Header**: Purple gradient (`from-indigo-600 to-purple-600`)
- **Two-column layout**: Side by side on desktop, stacked on mobile
- **Scrollable lists**: `max-h-[400px] overflow-y-auto`
- **Alternating row colors**: `bg-gray-50` / `bg-white`

---

## COMMIT

- `1ade15e0` - feat: Add User Activity modal to Admin dashboard

---

**Session Date**: 2025-12-23
**Status**: DEPLOYED
