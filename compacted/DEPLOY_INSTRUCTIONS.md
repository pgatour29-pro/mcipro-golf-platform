# MciPro System Deployment Instructions
**Generated:** 2025-10-20
**Purpose:** Complete deployment guide for all 4 critical fixes

---

## 🎯 OVERVIEW

This document contains step-by-step instructions to fix all 4 issues:
1. ✅ **DONE** - Fixed history query bug (shared rounds now visible)
2. Deploy database schemas (RLS policies + chat tables)
3. Deploy chat edge functions
4. Configure LINE API integration
5. Add hole-by-hole leaderboard (optional enhancement)

---

## ⚡ PHASE 1: DATABASE DEPLOYMENT (15 minutes)

### Step 1.1: Deploy All Schemas to Supabase

1. Open **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your MciPro project
3. Navigate to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Open file: `C:\Users\pete\Documents\MciPro\DEPLOY_ALL_SCHEMAS.sql`
6. Copy **entire contents** and paste into Supabase SQL Editor
7. Click **RUN** (or press Ctrl+Enter)

**Expected Output:**
```
✅ Part 1: Rounds & History System - COMPLETE
✅ Part 2: Chat System - COMPLETE

==============================================
DEPLOYMENT VERIFICATION
==============================================
Rounds.shared_with column: ✅ EXISTS
chat_rooms table: ✅ EXISTS
rounds_select_own_or_shared policy: ✅ ACTIVE
==============================================

✅ ALL SCHEMAS DEPLOYED SUCCESSFULLY

Next Steps:
1. Create storage bucket: chat-media (Private)
2. Deploy edge functions (see below)
3. Test chat and round history features
```

**If you see errors:** Check the "Messages" tab in SQL Editor for details.

---

### Step 1.2: Create Chat Media Storage Bucket

1. In Supabase Dashboard, go to **Storage** (left sidebar)
2. Click **New Bucket**
3. Configure:
   - **Name**: `chat-media`
   - **Public**: ❌ **UNCHECK** (must be Private)
   - **File size limit**: 50 MB
   - **Allowed MIME types**: Leave empty (all types)
4. Click **Create bucket**

**Verification:**
- You should see `chat-media` in the buckets list
- Icon should show 🔒 (Private)

---

## 🚀 PHASE 2: TEST FIXES (5 minutes)

### Test 2.1: Round History - Shared Rounds

1. **Open MciPro** in browser: https://mycaddipro.com
2. **Login** with your LINE account
3. Navigate to **Round History** tab
4. **Expected:** You should now see:
   - ✅ Your own completed rounds
   - ✅ Rounds shared by playing partners
   - ✅ Society event rounds (if organizer)

**Test Scenario:**
- Have another player complete a round with you in the group
- Check your Round History
- You should see their round appear automatically

---

### Test 2.2: Chat System Basic Test

1. In MciPro, click **Chat** button (💬)
2. **Expected Results:**
   - ✅ Chat UI opens
   - ✅ User list appears (may be empty initially)
   - ✅ No "relation does not exist" errors in console

**Console Check:**
- Open Browser DevTools (F12)
- Go to Console tab
- Look for `[Chat]` log messages
- Should NOT see errors about missing tables

**If chat loads successfully:** ✅ Phase 2 complete!

---

## 💬 PHASE 3: DEPLOY CHAT EDGE FUNCTIONS (20 minutes)

### Prerequisites

Install Supabase CLI if not already installed:
```bash
# Windows (PowerShell as Administrator)
npm install -g supabase

# Verify installation
supabase --version
```

### Step 3.1: Link to Supabase Project

```bash
# Navigate to MciPro directory
cd C:\Users\pete\Documents\MciPro

# Link to your project
supabase link --project-ref <YOUR_PROJECT_REF>
```

**To find your PROJECT_REF:**
1. Go to Supabase Dashboard → Settings → General
2. Copy the "Reference ID" (looks like: `pyeeplwsnupmhgbguwqs`)

---

### Step 3.2: Deploy Chat Notify Function (Optional - for push notifications)

**Note:** This function is optional. Skip if you don't need push notifications.

```bash
# Deploy the function
supabase functions deploy chat-notify

# Set environment variables (if needed)
supabase secrets set LINE_CHANNEL_ACCESS_TOKEN=<your_token>
```

---

### Step 3.3: Deploy Chat Media Function (Optional - for image uploads)

**Note:** This function is optional. Skip if chat image uploads aren't needed yet.

```bash
# Deploy the function
supabase functions deploy chat-media
```

---

## 📱 PHASE 4: LINE API INTEGRATION (30 minutes)

### Step 4.1: Get LINE Channel Access Token

1. Go to **LINE Developers Console**: https://developers.line.biz/console/
2. Select your **Provider** or create one
3. Click your **Channel** (Messaging API type)
4. Go to **Messaging API** tab
5. Scroll to **Channel access token**
6. Click **Issue** (if not already issued)
7. **Copy the token** (starts with: `eyJhbGc...`)

**IMPORTANT:** Keep this token secret!

---

### Step 4.2: Configure Token in Supabase

1. Go to Supabase Dashboard → **Settings** → **Edge Functions**
2. Click **Secrets** tab
3. Click **Add secret**
4. Configure:
   - **Name**: `LINE_CHANNEL_ACCESS_TOKEN`
   - **Value**: (paste the token from LINE)
5. Click **Save**

---

### Step 4.3: Deploy LINE Scorecard Edge Function

```bash
# Navigate to MciPro directory
cd C:\Users\pete\Documents\MciPro

# Deploy the function
supabase functions deploy send-line-scorecard

# Verify deployment
supabase functions list
```

**Expected Output:**
```
┌─────────────────────┬─────────┬───────────┐
│ NAME                │ VERSION │ STATUS    │
├─────────────────────┼─────────┼───────────┤
│ send-line-scorecard │ v1      │ ACTIVE    │
└─────────────────────┴─────────┴───────────┘
```

---

### Step 4.4: Test LINE Export

1. **Complete a round** in MciPro
2. On the finalized scorecard, click **Export to LINE** button
3. Enter a recipient LINE User ID (format: `U` + 32 characters)
4. Click **Send to LINE**

**Expected:**
- ✅ Success message appears
- ✅ Recipient receives scorecard via LINE message
- ✅ Message shows formatted scorecard with hole-by-hole scores

**If it fails:**
- Check Console for error messages
- Verify `LINE_CHANNEL_ACCESS_TOKEN` is set correctly
- Ensure recipient User ID format is correct (`U` + 32 chars = 33 total)

---

## 🔧 PHASE 5: ADD AUTOMATIC LINE FORWARDING (30 minutes)

**Status:** This is currently a manual-only feature. To make it automatic:

### Step 5.1: Modify distributeRoundScores Function

**File:** `C:\Users\pete\Documents\MciPro\index.html`
**Function:** `distributeRoundScores()` (around Line 34305)

**Add after successful distribution:**

```javascript
// After this line:
const { error } = await window.SupabaseDB.client.rpc(
    'distribute_round_to_players',
    { p_round_id: roundId, p_player_ids: playerIds }
);

// ADD THIS:
// Automatically forward scorecard via LINE to all players
if (!error && playerIds.length > 0) {
    console.log('[LiveScorecard] Sending scorecards via LINE...');

    // Format scorecard message
    const scorecardMessage = this.formatScorecardForLINE();

    // Send to each player
    for (const playerId of playerIds) {
        try {
            const response = await window.SupabaseDB.client.functions.invoke('send-line-scorecard', {
                body: {
                    recipientUserId: playerId,
                    message: scorecardMessage
                }
            });

            if (response.error) {
                console.error(`[LiveScorecard] Failed to send to ${playerId}:`, response.error);
            } else {
                console.log(`[LiveScorecard] ✅ Sent scorecard to ${playerId}`);
            }
        } catch (err) {
            console.error(`[LiveScorecard] Error sending to ${playerId}:`, err);
        }
    }
}
```

**Test:**
1. Complete a round with multiple players
2. Check that all players receive LINE messages automatically
3. Verify no errors in console

---

## 📊 PHASE 6: HOLE-BY-HOLE LEADERBOARD (4-6 hours)

**Priority:** LOW (Enhancement, not a bug fix)
**Complexity:** MEDIUM

### Current Status
- Live leaderboard shows cumulative scores only
- Hole-by-hole data exists in database but not displayed
- Round details modal already shows hole-by-hole (can be reused)

### Implementation Steps

#### 6.1: Update Data Query (5 minutes)

**File:** `index.html` Line 44262

**Change from:**
```javascript
const { data: rounds, error } = await window.SupabaseDB.client
    .from('rounds')
    .select('*')
    .eq('society_event_id', this.currentEventId)
    .order('total_stableford', { ascending: false });
```

**Change to:**
```javascript
const { data: rounds, error } = await window.SupabaseDB.client
    .from('rounds')
    .select('*, round_holes(*)')  // ← Add this
    .eq('society_event_id', this.currentEventId)
    .order('total_stableford', { ascending: false });
```

---

#### 6.2: Update Table HTML (30 minutes)

**File:** `index.html` Line 26224

Add hole columns to the table header:

```html
<thead>
  <tr class="text-left text-xs">
    <th class="py-2 px-2 sticky left-0 bg-white">Pos</th>
    <th class="py-2 px-2 sticky left-0 bg-white">Player</th>
    <th class="py-2 px-2">Thru</th>
    <th class="py-2 px-2">Score</th>
    <!-- Add hole columns -->
    <th class="py-1 px-1 text-center" style="min-width: 40px;">1</th>
    <th class="py-1 px-1 text-center" style="min-width: 40px;">2</th>
    <th class="py-1 px-1 text-center" style="min-width: 40px;">3</th>
    <!-- ... continue through hole 18 -->
    <th class="py-2 px-2">Total</th>
  </tr>
</thead>
```

**Make table horizontally scrollable:**
```html
<div class="overflow-x-auto">
  <table class="w-full text-sm whitespace-nowrap">
    <!-- table content -->
  </table>
</div>
```

---

#### 6.3: Update Rendering Function (1-2 hours)

**File:** `index.html` Line 44316 (`renderLeaderboard()`)

Add hole score rendering in the map function:

```javascript
tbody.innerHTML = this.leaderboardData.map((round, index) => {
    // Existing code...

    // NEW: Add hole-by-hole cells
    let holeCells = '';
    if (round.round_holes && round.round_holes.length > 0) {
        // Sort holes by hole_number
        const sortedHoles = round.round_holes.sort((a, b) => a.hole_number - b.hole_number);

        for (let i = 1; i <= 18; i++) {
            const hole = sortedHoles.find(h => h.hole_number === i);
            if (hole) {
                // Color code based on par
                const colorClass = hole.net_score < hole.par ? 'text-green-600 font-bold' :
                                   hole.net_score === hole.par ? 'text-blue-600' :
                                   'text-red-600';
                holeCells += `<td class="py-1 px-1 text-center text-xs ${colorClass}">${hole.net_score}</td>`;
            } else {
                holeCells += `<td class="py-1 px-1 text-center text-gray-400">-</td>`;
            }
        }
    } else {
        // No hole data yet - show placeholders
        for (let i = 1; i <= 18; i++) {
            holeCells += `<td class="py-1 px-1 text-center text-gray-300">-</td>`;
        }
    }

    return `
        <tr class="border-b">
            <td class="py-2 px-2">${index + 1}</td>
            <td class="py-2 px-2">${playerName}</td>
            <td class="py-2 px-2">${currentHole}</td>
            <td class="py-2 px-2 font-bold">${formatScore}</td>
            ${holeCells}
            <td class="py-2 px-2 font-bold">${round.total_stableford}</td>
        </tr>
    `;
}).join('');
```

---

#### 6.4: Mobile Optimization (1-2 hours)

Add responsive design for mobile:

```css
/* Add to index.html <style> section */
@media (max-width: 768px) {
    .leaderboard-table {
        font-size: 0.75rem;
    }

    .leaderboard-table th,
    .leaderboard-table td {
        padding: 0.25rem 0.125rem;
        min-width: 30px;
    }

    .sticky-col {
        position: sticky;
        left: 0;
        background: white;
        z-index: 10;
        box-shadow: 2px 0 5px rgba(0,0,0,0.1);
    }
}
```

---

### Testing Phase 6

1. Open society event leaderboard
2. Verify hole columns appear (1-18)
3. Complete a few holes
4. Check that hole scores update in real-time
5. Test on mobile device (side-scrolling should work)
6. Verify color coding:
   - Green = Under par
   - Blue = Par
   - Red = Over par

---

## ✅ VERIFICATION CHECKLIST

### Issue #1: Round History ✅ FIXED
- [x] Removed `.eq('golfer_id', userId)` from queries
- [x] Added comments explaining RLS policy handles filtering
- [ ] Tested: Can see rounds shared by playing partners
- [ ] Tested: Can see society event rounds as organizer

### Issue #2: Database Schemas
- [ ] Executed `DEPLOY_ALL_SCHEMAS.sql` in Supabase
- [ ] Verified: `rounds.shared_with` column exists
- [ ] Verified: `chat_rooms` table exists
- [ ] Verified: `rounds_select_own_or_shared` policy active
- [ ] Created: `chat-media` storage bucket (Private)

### Issue #3: Chat System
- [ ] Database schema deployed
- [ ] Chat UI loads without errors
- [ ] Can open chat window
- [ ] (Optional) Edge functions deployed

### Issue #4: LINE Integration
- [ ] LINE Channel Access Token obtained
- [ ] Token configured in Supabase Secrets
- [ ] `send-line-scorecard` edge function deployed
- [ ] Tested: Manual LINE export works
- [ ] (Optional) Automatic forwarding implemented

### Issue #5: Hole-by-Hole Leaderboard (Optional)
- [ ] Query updated to include `round_holes`
- [ ] Table HTML updated with hole columns
- [ ] Rendering function updated
- [ ] Color coding applied
- [ ] Mobile responsive design tested

---

## 🆘 TROUBLESHOOTING

### Problem: SQL script fails with "relation already exists"
**Solution:** This is OK! Script is idempotent. Check verification output at end.

### Problem: Chat shows "relation does not exist" error
**Solution:**
1. Check Supabase SQL Editor for errors
2. Verify tables created: `SELECT * FROM chat_rooms LIMIT 1;`
3. Re-run `DEPLOY_ALL_SCHEMAS.sql`

### Problem: LINE export fails with 401 Unauthorized
**Solution:**
1. Verify token is set: Supabase → Settings → Edge Functions → Secrets
2. Check token hasn't expired (re-issue from LINE Console)
3. Verify token format (should be long string starting with `eyJhbGc`)

### Problem: Round history still not showing shared rounds
**Solution:**
1. Hard refresh browser (Ctrl+Shift+R)
2. Check console for errors
3. Verify RLS policy: `SELECT * FROM pg_policies WHERE tablename = 'rounds';`
4. Should see policy named `rounds_select_own_or_shared`

### Problem: Hole-by-hole not showing in leaderboard
**Solution:**
1. Check if `round_holes` data exists: `SELECT * FROM round_holes LIMIT 1;`
2. Verify query includes `.select('*, round_holes(*)')`
3. Check console for query errors
4. Inspect `round.round_holes` in renderLeaderboard()

---

## 📞 NEXT STEPS AFTER DEPLOYMENT

1. **Test all features** with real users
2. **Monitor Console** for errors during use
3. **Check Supabase Logs** (Dashboard → Logs) for backend errors
4. **Gather User Feedback** on new shared rounds feature
5. **Consider** implementing automatic LINE forwarding (Phase 5)
6. **Consider** adding hole-by-hole leaderboard (Phase 6)

---

## 📊 ESTIMATED TIME BREAKDOWN

| Phase | Task | Time | Priority |
|-------|------|------|----------|
| 1 | Deploy database schemas | 15 min | 🔴 HIGH |
| 2 | Test fixes | 5 min | 🔴 HIGH |
| 3 | Deploy chat edge functions | 20 min | 🟡 MEDIUM |
| 4 | Configure LINE API | 30 min | 🟡 MEDIUM |
| 5 | Automatic LINE forwarding | 30 min | 🟢 LOW |
| 6 | Hole-by-hole leaderboard | 4-6 hours | 🟢 LOW |

**Total for HIGH priority:** 20 minutes
**Total for MEDIUM priority:** 1 hour
**Total for complete system:** 6-8 hours

---

## ✨ COMPLETION

When all phases are complete, you will have:
- ✅ Round history showing shared rounds
- ✅ Fully functional chat system
- ✅ LINE scorecard export (manual or automatic)
- ✅ (Optional) Hole-by-hole leaderboard display

**Document Version:** 1.0
**Last Updated:** 2025-10-20
**Questions?** Review console logs and Supabase logs for debugging

---

**🎉 Good luck with deployment!**
