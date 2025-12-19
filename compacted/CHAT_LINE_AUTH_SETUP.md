# Chat System - LINE Authentication Bridge Setup

## ✅ What's Been Deployed

The code has been deployed to GitHub and Netlify. The following components are ready:

1. **auth-bridge.js** - Automatically creates anonymous Supabase sessions for LINE users
2. **chat-system-full.js** - Updated to call auth bridge before initializing chat
3. **bridge-line-auth.sql** - Database migration script

## 🔧 Required Supabase Dashboard Configuration

### Step 1: Enable Anonymous Authentication

1. Go to your Supabase Dashboard
2. Navigate to **Authentication → Providers**
3. Scroll down to **Anonymous Sign-ins**
4. **Toggle "Enable anonymous sign-ins" to ON**
5. Click **Save**

### Step 2: Run Database Migration

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Open the file `chat/bridge-line-auth.sql` from your local project
4. Copy ALL the SQL content
5. Paste into the SQL Editor
6. Click **Run**

This migration will:
- Add `line_user_id` column to `profiles` table
- Update RLS policies to allow anonymous authenticated users
- Grant proper permissions for chat tables

## 🧪 Testing the Chat System

After completing Steps 1 & 2, wait ~1-2 minutes for Netlify to deploy, then:

### Test in Browser Console

```javascript
// 1. Clear service worker cache (if not already done)
navigator.serviceWorker.getRegistrations().then(rs => Promise.all(rs.map(r => r.unregister()))).then(()=>location.reload());
```

**After reload:**

```javascript
// 2. Open professional chat (should work automatically)
window.__professionalChat.openProfessionalChat();
```

### Expected Behavior

You should see in the console:

```
[Auth Bridge] LINE user: U9e64d5456b0...
[Auth Bridge] ✅ Anonymous session created: <uuid>
[Auth Bridge] ✅ Profile linked: Supabase UUID <uuid> → LINE U9e64d5456b0...
[Chat] ✅ Authenticated: <uuid> (LINE: U9e64d5456b0...)
```

Then the chat should:
- Load the user list (Pete, Donald, etc.)
- Allow you to click on a user to start a conversation
- Allow you to send and receive messages

## 🔍 Troubleshooting

### Error: "Failed to create Supabase session"

**Cause:** Anonymous auth not enabled in Supabase Dashboard
**Fix:** Complete Step 1 above

### Error: "Profile upsert failed"

**Cause:** Database migration not run or `line_user_id` column doesn't exist
**Fix:** Complete Step 2 above

### Error: "No users available"

**Cause:** No other users have opened the chat yet
**Fix:** Have another LINE user open the chat system to create their profile

### Chat opens but no LINE user ID logged

**Cause:** LIFF not initialized or not logged into LINE
**Fix:** Ensure you're logged into LINE and the page shows "Welcome back, [Your Name]"

## 📊 How It Works

1. **User logs into LINE** → LIFF provides LINE user ID
2. **User opens chat** → auth-bridge.js checks for Supabase session
3. **No session exists** → Creates anonymous Supabase auth session (UUID)
4. **Links identities** → Upserts `profiles` table with:
   - `id` = Supabase UUID (from anonymous auth)
   - `line_user_id` = LINE user ID (from LIFF)
   - `display_name` = LINE display name
   - `avatar_url` = LINE profile picture
5. **Chat works** → All RLS policies use `auth.uid()` which returns the Supabase UUID
6. **Messages tracked** → Supabase UUID in all chat tables, LINE ID available for display

## 🚀 Future Enhancement (Optional)

Currently using **anonymous auth** (simplest approach).

For production, you could upgrade to **proper LINE OAuth integration**:
- Create Supabase Edge Function to verify LINE ID token
- Exchange LINE token for proper Supabase session (not anonymous)
- More secure and allows linking multiple auth providers

But anonymous auth is perfectly fine for your use case since LINE is the primary identity.

## ✅ Checklist

- [ ] Enable anonymous sign-ins in Supabase Dashboard
- [ ] Run `bridge-line-auth.sql` in Supabase SQL Editor
- [ ] Wait for Netlify deployment (~1-2 minutes)
- [ ] Clear service worker cache and reload
- [ ] Open chat with `window.__professionalChat.openProfessionalChat()`
- [ ] Verify auth bridge logs in console
- [ ] Test sending messages between users
