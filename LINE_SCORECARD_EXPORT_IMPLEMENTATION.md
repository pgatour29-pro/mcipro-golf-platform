# LINE Scorecard Export Feature - Implementation Report

## Overview
This feature allows users to export completed golf scorecards and send them to LINE accounts outside the system via the LINE Messaging API. The implementation includes a full UI flow, message formatting, and integration with Supabase Edge Functions.

---

## Changes Made

### 1. Frontend UI Changes (index.html)

#### A. Export Button Added to Finalized Scorecard Modal
**Location:** Line 20668-20671
**File:** C:\Users\pete\Documents\MciPro\index.html

Added green "Export to LINE" button alongside existing Print, Share, and Download buttons:

```html
<button onclick="LiveScorecardManager.showLINEExportModal()"
    class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2">
    <span class="material-symbols-outlined">send</span>
    Export to LINE
</button>
```

#### B. LINE Export Modal UI
**Location:** Line 20685-20778
**File:** C:\Users\pete\Documents\MciPro\index.html

Created a comprehensive modal with:
- **Recipient Selection**: Two options
  - Manual LINE User ID input (text field for direct entry)
  - Friends list dropdown (via LIFF - requires additional LINE permissions)
- **Message Preview**: Live preview of formatted scorecard message
- **Export Options**: Checkboxes to control content
  - Include all players in group (vs. just current user)
  - Include detailed hole-by-hole statistics
- **Send/Cancel Actions**: Buttons to execute or abort export
- **Status Display**: Real-time feedback during send operation

---

### 2. JavaScript Functions (index.html)

#### A. showLINEExportModal()
**Location:** Line 34434-34445
**File:** C:\Users\pete\Documents\MciPro\index.html

Opens the export modal and initializes:
- Updates message preview with current scorecard data
- Attempts to load LINE friends list (if LIFF available)
- Shows the modal

#### B. closeLINEExportModal()
**Location:** Line 34447-34451
**File:** C:\Users\pete\Documents\MciPro\index.html

Closes the modal and resets status messages.

#### C. updateLINEMessagePreview()
**Location:** Line 34453-34459
**File:** C:\Users\pete\Documents\MciPro\index.html

Regenerates the message preview whenever export options change:
- Triggered by checkbox changes
- Calls formatScorecardForLINE() with current settings
- Updates preview element

#### D. formatScorecardForLINE(includeAllPlayers, includeDetailedStats)
**Location:** Line 34461-34604
**File:** C:\Users\pete\Documents\MciPro\index.html

Core formatting function that creates a text-based LINE message:

**Message Format:**
```
⛳ GOLF SCORECARD
═══════════════════════════

🏆 [Society Name]
📍 [Event Name]
🏌️ [Course Name] (TEE MARKER)
📊 [Format(s)]
📅 [Date]

👤 Player Name (HCP: X)
─────────────────────────
Gross: 85 | Points: 36 | Net: 73

Hole-by-Hole:
OUT: 5 4🐦 6⬜ 5 4 3🦅 5 4 6⬜ = 42
IN:  4 5 6 4 5🐦 4 3 5 4 = 40
Points: F9=18 B9=18 TOT=36

[Additional players if includeAllPlayers=true]

═══════════════════════════
📱 Powered by MyCaddiPro
```

**Features:**
- Displays course/event information from finalized scorecard header
- Calculates gross scores, net scores, and stableford points
- Shows hole-by-hole breakdown with emoji indicators:
  - 🦅 Eagle or better (≤ -2)
  - 🐦 Birdie (-1)
  - ⬜ Bogey (+1)
  - ❌ Double bogey or worse (≥ +2)
- Supports multiple scoring formats (Stableford, Modified Stableford, Nassau)
- Conditionally includes all players or just first player
- Conditionally includes detailed stats or just summary

#### E. loadLINEFriends()
**Location:** Line 34606-34625
**File:** C:\Users\pete\Documents\MciPro\index.html

Attempts to load LINE friends list via LIFF:
- Checks if LIFF is initialized and user is logged in
- Note: Getting friends list requires special LINE API permissions
- Currently shows placeholder message (requires additional LIFF setup)

#### F. sendScorecardToLINE()
**Location:** Line 34627-34703
**File:** C:\Users\pete\Documents\MciPro\index.html

Main export function that:
1. **Validates Input**
   - Checks recipient is selected/entered
   - Validates LINE User ID format (U + 32 characters = 33 total)
   - Displays error messages for invalid input

2. **Formats Message**
   - Gets current export options
   - Calls formatScorecardForLINE() to generate message

3. **Sends to Supabase Edge Function**
   - Calls `send-line-scorecard` edge function
   - Passes recipientUserId and message
   - Shows loading state during API call

4. **Handles Response**
   - Success: Shows green success message, closes modal after 2s
   - Error: Shows red error message with details

---

### 3. Supabase Edge Function

#### File Created: send-line-scorecard/index.ts
**Location:** C:\Users\pete\Documents\MciPro\supabase\functions\send-line-scorecard\index.ts

**Purpose:** Server-side function to send messages via LINE Messaging API

**Key Features:**

1. **Input Validation**
   - Requires recipientUserId (string, 33 chars, starts with U)
   - Requires message (string, max 5000 chars per LINE API limit)
   - Returns 400 error for invalid input

2. **LINE API Integration**
   - Uses LINE Push Message API endpoint
   - Requires LINE_CHANNEL_ACCESS_TOKEN environment variable
   - Sends text message to specified LINE user

3. **CORS Support**
   - Handles OPTIONS preflight requests
   - Allows cross-origin requests from browser

4. **Error Handling**
   - Catches LINE API errors and returns meaningful messages
   - Logs errors for debugging

5. **Optional Database Logging**
   - Attempts to log export to `scorecard_exports` table
   - Non-critical - doesn't fail request if logging fails

**Environment Variables Required:**
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anonymous key
- `LINE_CHANNEL_ACCESS_TOKEN`: LINE Messaging API channel access token

---

## How It Works: Complete User Flow

1. **User completes a golf round**
   - Finishes scoring all 18 holes
   - Clicks "Complete Round" button
   - System shows finalized scorecard modal with all players' results

2. **User initiates export**
   - Clicks green "Export to LINE" button
   - LINE export modal opens

3. **User configures export**
   - Enters recipient's LINE User ID manually, OR
   - Selects from friends list (if LIFF permissions available)
   - Checks/unchecks options:
     - Include all players (default: checked)
     - Include detailed stats (default: checked)
   - Preview updates in real-time as options change

4. **User reviews preview**
   - Sees formatted message exactly as it will appear in LINE
   - Can adjust options to customize message

5. **User sends scorecard**
   - Clicks "Send to LINE" button
   - System validates recipient ID format
   - Shows "Sending..." loading state

6. **System processes request**
   - Client calls Supabase Edge Function with recipient and message
   - Edge Function validates input
   - Edge Function calls LINE Messaging API
   - LINE delivers message to recipient

7. **User receives confirmation**
   - Success: Green message "Scorecard sent successfully!"
   - Modal closes automatically after 2 seconds
   - Error: Red message with error details shown

---

## LINE Message Format Examples

### Example 1: Single Player, Detailed Stats
```
⛳ GOLF SCORECARD
═══════════════════════════

🏆 Bangkok Golf Society
📍 Monthly Medal Competition
🏌️ Alpine Golf Club (WHITE)
📊 Stableford
📅 January 15, 2025

👤 John Smith (HCP: 18)
─────────────────────────
Gross: 92 | Points: 34

Hole-by-Hole:
OUT: 6⬜ 4 5 4🐦 6 5 4 5 6⬜ = 45
IN:  5 6 4 5 5🐦 4 6 5 6 = 47
Points: F9=17 B9=17 TOT=34

═══════════════════════════
📱 Powered by MyCaddiPro
```

### Example 2: Multiple Players, Summary Only
```
⛳ GOLF SCORECARD
═══════════════════════════

📍 Practice Round
🏌️ Riverside Golf Course (BLUE)
📊 Stroke Play
📅 January 15, 2025

👤 John Smith (HCP: 18)
─────────────────────────
Gross: 92

───────────────────────────

👤 Jane Doe (HCP: 12)
─────────────────────────
Gross: 85

───────────────────────────

👤 Bob Wilson (HCP: 24)
─────────────────────────
Gross: 98

═══════════════════════════
📱 Powered by MyCaddiPro
```

### Example 3: Nassau Format
```
⛳ GOLF SCORECARD
═══════════════════════════

📍 Saturday Match
🏌️ Ocean View Golf Club (WHITE)
📊 Nassau
📅 January 15, 2025

👤 John Smith (HCP: 18)
─────────────────────────
Gross: 92 | Net: 74

Hole-by-Hole:
OUT: 6⬜ 4 5 4🐦 6 5 4 5 6⬜ = 45
IN:  5 6 4 5 5🐦 4 6 5 6 = 47
Points: F9=17 B9=17 TOT=34

═══════════════════════════
📱 Powered by MyCaddiPro
```

---

## Deployment Requirements

### 1. Deploy Supabase Edge Function

```bash
cd C:\Users\pete\Documents\MciPro
supabase functions deploy send-line-scorecard
```

### 2. Set Environment Variables in Supabase

Navigate to Supabase Dashboard → Project Settings → Edge Functions → Environment Variables

Add:
```
LINE_CHANNEL_ACCESS_TOKEN=<your-line-channel-access-token>
```

### 3. Get LINE Channel Access Token

1. Go to LINE Developers Console: https://developers.line.biz/
2. Create a Messaging API channel (or use existing)
3. Go to Messaging API tab
4. Issue Channel Access Token (long-lived)
5. Copy the token and set it in Supabase environment variables

### 4. Optional: Create Database Table for Logging

```sql
CREATE TABLE IF NOT EXISTS scorecard_exports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_user_id TEXT NOT NULL,
  message_length INTEGER NOT NULL,
  exported_at TIMESTAMP WITH TIME ZONE NOT NULL,
  platform TEXT NOT NULL DEFAULT 'LINE',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for querying exports
CREATE INDEX idx_scorecard_exports_recipient ON scorecard_exports(recipient_user_id);
CREATE INDEX idx_scorecard_exports_exported_at ON scorecard_exports(exported_at DESC);
```

---

## Testing Guide

### Manual Testing Steps

1. **Test Modal Opening**
   - Complete a round
   - View finalized scorecard
   - Click "Export to LINE" button
   - Verify modal opens with preview

2. **Test Message Preview**
   - Toggle "Include all players" checkbox
   - Verify preview updates to show/hide other players
   - Toggle "Include detailed stats" checkbox
   - Verify preview shows/hides hole-by-hole breakdown

3. **Test Validation**
   - Try sending without entering User ID
   - Verify error: "Please enter a LINE User ID"
   - Enter invalid User ID (e.g., "123")
   - Verify error: "Invalid LINE User ID format"
   - Enter valid format but wrong length
   - Verify error message

4. **Test Sending (requires valid LINE User ID)**
   - Enter your own LINE User ID (find via LINE app)
   - Click "Send to LINE"
   - Verify loading state appears
   - Check LINE app for received message
   - Verify success message shows
   - Verify modal closes after 2 seconds

5. **Test Different Scoring Formats**
   - Test with Stableford round
   - Test with Stroke Play round
   - Test with Nassau round
   - Test with multiple formats selected
   - Verify message format includes correct data for each format

### Finding Your LINE User ID

1. Open LINE app on phone
2. Go to Settings → Account
3. Your User ID is shown (33 characters starting with U)
4. Or use LIFF `liff.getProfile()` after login to get userId

---

## Limitations and Considerations

### Current Limitations

1. **LINE Friends List**
   - Requires special LIFF permission from LINE
   - Permission: `profile` scope gives userId only
   - Friend list access requires additional approval from LINE
   - Currently shows placeholder - manual entry works

2. **Message Format**
   - Text-only (no rich cards or flex messages)
   - Maximum 5000 characters (LINE API limit)
   - No images or scorecard graphics
   - Emojis used for visual indicators

3. **Recipient Validation**
   - Can only validate format, not existence
   - LINE API will fail silently if user blocks bot
   - No way to verify delivery success

4. **LINE Channel Requirements**
   - Requires LINE Messaging API channel
   - Channel Access Token must be set in environment
   - Sending messages may have LINE API rate limits

### Future Enhancements

1. **Rich Message Format**
   - Use LINE Flex Messages for better visual presentation
   - Include scorecard image/screenshot
   - Add clickable buttons (view on web, etc.)

2. **LIFF Friends Integration**
   - Apply for LIFF friends list permission
   - Implement actual friend selection
   - Show friend names instead of User IDs

3. **Multiple Recipients**
   - Allow sending to multiple LINE users at once
   - Bulk export to all players in group

4. **Export History**
   - Show list of previous exports
   - Allow re-sending previous scorecards
   - Track delivery status

5. **Export Templates**
   - Save custom message templates
   - Different formats for different recipients (coach, friends, etc.)

---

## Security Considerations

1. **LINE Channel Access Token**
   - Stored securely in Supabase environment variables
   - Never exposed to client browser
   - Edge Function acts as proxy to LINE API

2. **User ID Validation**
   - Client-side validation prevents obviously wrong IDs
   - Server-side validation ensures format compliance
   - LINE API enforces final validation

3. **Rate Limiting**
   - Consider adding rate limits to edge function
   - Prevent abuse/spam via LINE API
   - LINE API has its own rate limits

4. **Data Privacy**
   - Scorecard data sent to external LINE users
   - Users should be warned before sending to unknown recipients
   - Consider adding confirmation dialog for first-time users

---

## Code Locations Summary

| Component | File | Lines | Description |
|-----------|------|-------|-------------|
| Export Button | index.html | 20668-20671 | "Export to LINE" button in finalized scorecard modal |
| Export Modal UI | index.html | 20685-20778 | Complete LINE export modal with recipient selection, preview, options |
| showLINEExportModal() | index.html | 34434-34445 | Opens modal and initializes |
| closeLINEExportModal() | index.html | 34447-34451 | Closes modal |
| updateLINEMessagePreview() | index.html | 34453-34459 | Updates message preview |
| formatScorecardForLINE() | index.html | 34461-34604 | Formats scorecard as LINE text message |
| loadLINEFriends() | index.html | 34606-34625 | Loads LINE friends (placeholder) |
| sendScorecardToLINE() | index.html | 34627-34703 | Main export function, calls edge function |
| Edge Function | supabase/functions/send-line-scorecard/index.ts | All | Sends message via LINE API |

---

## Environment Setup

### Required Environment Variables (Supabase)

```bash
# Set in Supabase Dashboard → Settings → Edge Functions → Environment Variables
LINE_CHANNEL_ACCESS_TOKEN=<your-line-channel-access-token>
```

### LINE Developers Console Setup

1. Create Messaging API Channel
2. Enable "Use webhooks" (optional for two-way messaging)
3. Issue Channel Access Token (long-lived)
4. Add bot to your LINE account for testing
5. Get your LINE User ID for testing

---

## Troubleshooting

### Issue: Edge function not found
**Solution:** Deploy edge function first:
```bash
supabase functions deploy send-line-scorecard
```

### Issue: LINE API returns 401 Unauthorized
**Solution:** Check LINE_CHANNEL_ACCESS_TOKEN is set correctly in Supabase environment variables

### Issue: Message not received in LINE
**Possible causes:**
1. Recipient User ID is incorrect
2. Recipient has blocked the LINE bot
3. LINE channel is not properly configured
4. Channel Access Token is expired/invalid

**Debug steps:**
1. Check Supabase Edge Function logs
2. Verify LINE Developers Console shows active channel
3. Test with your own User ID first
4. Check LINE API response in edge function logs

### Issue: Preview not updating
**Solution:** Check browser console for JavaScript errors. Verify LiveScorecardManager object exists.

### Issue: Modal styling broken
**Solution:** Verify Tailwind CSS is loaded. Check for conflicting CSS.

---

## Success Criteria

✅ "Export to LINE" button appears on finalized scorecard
✅ Clicking button opens LINE export modal
✅ Message preview shows correctly formatted scorecard
✅ Preview updates when options are changed
✅ User can enter LINE User ID manually
✅ Invalid User IDs are rejected with clear error messages
✅ Valid submissions call edge function successfully
✅ Edge function sends message to LINE API
✅ Success/error messages displayed to user
✅ Modal closes automatically after successful send

---

## Next Steps for Production

1. **Deploy Edge Function**
   ```bash
   supabase functions deploy send-line-scorecard
   ```

2. **Configure LINE Channel**
   - Get Channel Access Token
   - Set environment variable in Supabase

3. **Test with Real LINE Account**
   - Get your LINE User ID
   - Send test scorecard to yourself
   - Verify message format and content

4. **Optional Enhancements**
   - Create scorecard_exports table for logging
   - Add rate limiting to edge function
   - Implement LIFF friends list (requires LINE permission)
   - Create Flex Message template for richer formatting

5. **User Documentation**
   - Create help text explaining how to find LINE User ID
   - Add tooltips/hints in UI
   - Create FAQ for common issues

---

## Summary

The LINE Scorecard Export feature is now fully implemented and ready for testing. All code changes are local and not committed to git. The feature includes:

- Complete UI with modal, recipient selection, and live preview
- Text-based scorecard formatting with emoji indicators
- Client-side validation and error handling
- Server-side Supabase Edge Function for secure LINE API integration
- Support for multiple scoring formats (Stableford, Nassau, etc.)
- Customizable export options (all players vs. single, detailed vs. summary)

**Status:** Implementation complete, pending LINE API configuration and deployment testing.
