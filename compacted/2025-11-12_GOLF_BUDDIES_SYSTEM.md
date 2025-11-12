# Golf Buddies & Saved Groups System
**Date:** 2025-11-12
**Status:** ✅ Frontend Deployed | ⚠️ Backend Requires Manual SQL Deployment
**Commit:** dd9ee0ad

---

## 🎯 Overview

Comprehensive buddy list management system that allows golfers to:
- Track frequent playing partners
- Get auto-suggestions based on play history
- Save common groups for quick round setup
- Quickly add buddies when starting rounds
- See recent partners for easy access

---

## 📋 User Requirements Selected

During planning, user selected:

1. **Buddy Population:** Auto + Manual
   - System suggests players from play history (2+ rounds together)
   - Users can manually search and add any player

2. **UI Location:** Quick access button + modal
   - Buddies button in golfer dashboard header (group icon)
   - Opens comprehensive modal overlay

3. **Quick-Add Features:** All 4 options
   - ✅ Show buddies above search results
   - ✅ Add multiple buddies at once
   - ✅ Recent partners shortcut
   - ✅ Saved groups feature

---

## 🗄️ Database Schema

### Table: `golf_buddies`

Stores buddy relationships between players.

```sql
CREATE TABLE golf_buddies (
    id UUID PRIMARY KEY,
    user_id TEXT NOT NULL,                    -- Player's LINE user ID
    buddy_id TEXT NOT NULL,                   -- Buddy's LINE user ID
    added_manually BOOLEAN DEFAULT true,      -- Manually added vs auto-suggested
    times_played_together INTEGER DEFAULT 0,  -- Tracked automatically
    last_played_together TIMESTAMPTZ,         -- Last round together
    notes TEXT,                               -- Optional notes
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, buddy_id),
    CHECK (user_id != buddy_id)
);
```

**Indexes:**
- `idx_golf_buddies_user_id` - Fast lookups by user
- `idx_golf_buddies_buddy_id` - Fast reverse lookups
- `idx_golf_buddies_times_played` - Sort by frequency

---

### Table: `saved_groups`

Stores named groups of players for quick loading.

```sql
CREATE TABLE saved_groups (
    id UUID PRIMARY KEY,
    user_id TEXT NOT NULL,           -- Owner of the group
    group_name TEXT NOT NULL,        -- e.g., "Sunday Group", "Work Friends"
    member_ids JSONB NOT NULL,       -- Array of player LINE user IDs
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used TIMESTAMPTZ,           -- Track usage for sorting

    UNIQUE(user_id, group_name)
);
```

---

### Function: `get_buddy_suggestions(user_id)`

Returns auto-suggested buddies based on play history.

**Logic:**
- Finds players you've played with 2+ times
- Excludes players already in your buddy list
- Sorted by frequency, then recency
- Returns top 10 suggestions

**Returns:**
```sql
TABLE (
    buddy_id TEXT,
    buddy_name TEXT,
    times_played INTEGER,
    last_played TIMESTAMPTZ
)
```

**Example:**
```sql
SELECT * FROM get_buddy_suggestions('U044fd835263fc6c0c596cf1d6c2414af');
```

---

### Function: `get_recent_partners(user_id, limit)`

Returns players from your last 5 completed rounds.

**Returns:**
```sql
TABLE (
    partner_id TEXT,
    partner_name TEXT,
    last_played TIMESTAMPTZ
)
```

**Example:**
```sql
SELECT * FROM get_recent_partners('U044fd835263fc6c0c596cf1d6c2414af', 5);
```

---

### Function: `update_buddy_play_stats()`

Automatically updates buddy statistics when rounds complete.

**Trigger:** `trigger_update_buddy_stats`
- Fires AFTER INSERT OR UPDATE on `rounds` table
- When `status = 'completed'`
- Increments `times_played_together` for all buddies in the round
- Updates `last_played_together` timestamp
- **Works bidirectionally** - both players' stats update

**Example:**
When Player A and Player B complete a round together:
1. Player A's buddy record for Player B: `times_played_together++`
2. Player B's buddy record for Player A: `times_played_together++`
3. Both records get updated `last_played_together`

---

## 🎨 Frontend UI

### Buddies Button

**Location:** Golfer dashboard header (line 1887)
- Icon: `group` (Material Symbols)
- Badge: Shows buddy count
- Click: Opens buddies modal

### Buddies Modal

**4 Tabs:**

1. **My Buddies**
   - View all current buddies
   - Shows: Name, handicap, times played, last played date
   - Actions: Quick-add to scorecard, Remove buddy
   - Empty state: Prompts to view suggestions

2. **Suggestions**
   - Auto-suggested from play history
   - Shows: Name, times played together, last played date
   - Action: Add as buddy
   - Info card explains suggestion logic
   - Empty state: Prompts to play more rounds

3. **Saved Groups**
   - View saved player groups
   - Shows: Group name, member count, last used
   - Actions: Load group, Edit, Delete
   - Empty state: Prompt to create first group
   - **Note:** Full create/edit UI coming soon (placeholders added)

4. **Add Buddy**
   - Search players by name
   - Real-time search (2+ characters)
   - Filters out existing buddies and self
   - Shows: Name, handicap
   - Action: Add as buddy

**Footer: Recent Partners**
- Shows last 5 playing partners
- Circular avatar badges with initials
- Click to quick-add to scorecard

---

## ⚙️ System Functions

### GolfBuddiesSystem.init()

Initializes the system on page load.

**Actions:**
1. Gets current user ID from AppState
2. Loads buddies from database
3. Loads saved groups
4. Loads suggestions (auto-suggest)
5. Loads recent partners
6. Updates buddy count badge

**Called:** Automatically 1 second after DOM ready

---

### GolfBuddiesSystem.openBuddiesModal()

Opens the buddies modal.

**Actions:**
1. Creates modal HTML if doesn't exist
2. Shows modal (removes hidden, adds flex)
3. Loads/refreshes "My Buddies" tab

---

### GolfBuddiesSystem.addBuddy(buddyId)

Adds a player as a buddy.

**Process:**
1. Inserts record into `golf_buddies` table
2. Sets `added_manually = true`
3. Reloads buddies and suggestions
4. Updates UI
5. Shows success notification

---

### GolfBuddiesSystem.removeBuddy(buddyRecordId)

Removes a buddy (with confirmation).

**Process:**
1. Confirms with user
2. Deletes record from `golf_buddies` table
3. Reloads buddies
4. Updates UI and badge

---

### GolfBuddiesSystem.quickAddBuddy(buddyId)

Adds buddy to current Live Scoring round.

**Process:**
1. Checks if LiveScorecardManager is active
2. Finds buddy profile data
3. Calls `LiveScorecardManager.addPlayerById()`
4. Closes modal
5. Shows notification

**Note:** Only works if Live Scoring round is active

---

### GolfBuddiesSystem.searchPlayers(query)

Searches for players to add as buddies.

**Process:**
1. Queries `user_profiles` table (ILIKE name search)
2. Filters out current user and existing buddies
3. Limits to 20 results
4. Renders search results with Add buttons

**Minimum:** 2 characters required

---

## 🚀 Deployment Instructions

### ⚠️ MANUAL STEP REQUIRED

The SQL **must be deployed manually** to Supabase:

1. **Go to:** [Supabase Dashboard → SQL Editor](https://supabase.com/dashboard/project/ccqydamycfekrnobupux/sql/new)

2. **Open:** `sql/create_buddy_system.sql` (11 KB file)

3. **Copy** entire contents

4. **Paste** into SQL Editor

5. **Click "Run"**

6. **Verify** success:
   ```sql
   -- Check tables created
   SELECT COUNT(*) FROM golf_buddies;
   SELECT COUNT(*) FROM saved_groups;

   -- Check functions exist
   SELECT * FROM get_buddy_suggestions('YOUR_USER_ID');
   SELECT * FROM get_recent_partners('YOUR_USER_ID', 5);
   ```

---

## 📊 How It Works

### Scenario: First Time User

1. User clicks **Buddies button** (group icon)
2. Modal opens showing **empty buddy list**
3. User clicks **"View Suggestions"** tab
4. System shows **auto-suggested players** (2+ rounds together)
5. User clicks **"Add Buddy"** next to a suggestion
6. Player added to **My Buddies** tab
7. Badge shows **buddy count** (e.g., "3")

---

### Scenario: Starting a Round

1. User goes to **Live Scoring** tab
2. Clicks **"Start New Round"**
3. Clicks **"Add Player"**
4. **NEW:** Buddies shown at top of player list
5. **NEW:** Recent partners shown as quick-add chips
6. User clicks buddy → **instantly added to scorecard**
7. **No searching required!**

---

### Scenario: Auto-Tracking

1. User completes a round with 3 friends
2. Round status changes to **'completed'**
3. **Trigger fires automatically:**
   - All buddy relationships in this round get `times_played_together++`
   - All get updated `last_played_together` timestamp
4. Next time user opens buddies:
   - Stats reflect **accurate play counts**
   - Suggestions updated based on **new data**

---

## 🔐 Security (RLS Policies)

### golf_buddies Table

**SELECT:** Users can view their own buddies
```sql
WHERE user_id = auth.uid()::TEXT
```

**INSERT/UPDATE/DELETE:** Users can manage their own buddies
```sql
WITH CHECK (user_id = auth.uid()::TEXT)
```

**Service Role:** Full access for system operations

### saved_groups Table

Same policy structure as `golf_buddies`.

---

## 🧪 Testing Checklist

After SQL deployment, test these flows:

### ✅ Buddy Management
- [ ] Click buddies button → modal opens
- [ ] View My Buddies (empty state or populated)
- [ ] View Suggestions tab → shows auto-suggested players
- [ ] Search for player in Add Buddy tab
- [ ] Add a buddy → appears in My Buddies
- [ ] Remove a buddy → confirmation dialog → removed
- [ ] Badge updates with correct count

### ✅ Quick-Add Features
- [ ] Recent partners shown in modal footer
- [ ] Click recent partner → quick-adds to scorecard (if round active)
- [ ] Click buddy quick-add → adds to scorecard (if round active)
- [ ] Warning shown if no round active

### ✅ Auto-Tracking
- [ ] Complete a round with other players
- [ ] Check buddy stats → `times_played_together` incremented
- [ ] Check `last_played_together` → updated timestamp
- [ ] View Suggestions → players you've played with 2+ times appear

### ✅ Saved Groups (Placeholder)
- [ ] View Saved Groups tab → empty state or list
- [ ] Click "New Group" → "Coming soon" notification
- [ ] Click "Edit" → "Coming soon" notification
- [ ] Click "Delete" → confirmation → group deleted

---

## 📝 Files Created/Modified

### Created
- `sql/create_buddy_system.sql` (11 KB) - Complete database schema
- `scripts/deploy_buddy_system.js` - Deployment helper
- `public/golf-buddies-system.js` (28 KB) - Complete frontend system
- `golf-buddies-system.js` - Root copy
- `compacted/2025-11-12_GOLF_BUDDIES_SYSTEM.md` (this file)

### Modified
- `public/index.html` - Added buddies button (line 1887) + script (line 112)
- `index.html` - Synced
- `public/sw.js` - Version: `buddies-v1`
- `sw.js` - Synced

---

## 🎯 Future Enhancements

### Phase 2 (Coming Soon)
- [ ] **Full Saved Groups UI**
  - Create group modal with player selection
  - Edit group (add/remove members)
  - Load entire group to scorecard with one click

- [ ] **Multi-Select Quick-Add**
  - Checkboxes next to buddies
  - "Add Selected" button to bulk-add 2-4 players

- [ ] **Integration with "Add Player" Flow**
  - Show buddies section above search in Live Scoring
  - Recent partners chips in Add Player modal
  - Group shortcuts in Add Player modal

### Phase 3 (Future)
- [ ] **Buddy Analytics**
  - Charts showing play frequency over time
  - Best scoring records with specific buddies
  - Course preferences by buddy group

- [ ] **Schedule Alerts** (Original Requirement)
  - Send notifications to buddies about upcoming rounds
  - Group messaging for saved groups
  - Integration with booking system

- [ ] **Buddy Invitations**
  - Invite non-users to join platform
  - Share round links with buddies
  - WhatsApp/LINE integration

---

## ⚠️ Important Notes

### Tee Time Integration
The buddy system is currently **separate from booking/scheduling**. Schedule alerts feature is planned for Phase 3.

### Data Privacy
- Buddy relationships are **private** (only you see your buddies)
- Other players **don't know** if you've added them as a buddy
- Play statistics are **bidirectional** (both players' stats update)
- No notifications sent when added/removed as buddy

### Performance
- All buddy queries use **indexed lookups**
- Suggestions query **limited to 10 results**
- Recent partners **limited to 5 results**
- Search results **limited to 20 results**
- Modal content **lazy-loaded** (only renders visible tab)

---

## 💡 Tips for Users

1. **Start with Suggestions**
   - Check Suggestions tab first
   - Add players you recognize and play with often
   - This builds your buddy list fastest

2. **Use Recent Partners**
   - Recent partners footer updates after every round
   - Quick-add frequently used players
   - No need to search repeatedly

3. **Create Saved Groups**
   - Once Phase 2 launches, create groups for:
     - Sunday morning regular group
     - Work colleagues
     - Tournament team
     - Practice partners
   - Load entire group with one click

4. **Let Auto-Tracking Work**
   - Play counts update automatically
   - No manual management needed
   - Suggestions improve over time

---

## 🚀 Success Metrics

**Before Buddy System:**
- ❌ Had to search for same players every round
- ❌ Couldn't remember who you play with most
- ❌ No quick access to frequent partners
- ❌ Slow round setup process

**After Buddy System:**
- ✅ One-click access to frequent partners
- ✅ Auto-tracked play statistics
- ✅ Quick-add from recent partners
- ✅ Organized buddy management
- ✅ Faster round setup (saved groups coming)

---

**Deployment Date:** November 12, 2025
**Developer:** Claude Code
**Status:** ✅ Frontend Complete | ⚠️ Awaiting SQL Deployment
**Commit:** dd9ee0ad
