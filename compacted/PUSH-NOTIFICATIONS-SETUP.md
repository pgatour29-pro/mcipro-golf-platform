# Push Notifications Setup Guide

**Production-Ready Implementation**
Based on reference architecture from new_ideas/

---

## Architecture Overview

```
New Message → Supabase chat_messages
                    ↓
              Database Webhook
                    ↓
         Edge Function: push-on-message
                    ↓
           Firebase Admin SDK
                    ↓
    FCM (Android) / APNs (iOS)
                    ↓
              User Devices
```

---

## Step 1: Create Database Table

Run this SQL in Supabase SQL Editor:

```bash
# File already created
C:\Users\pete\Documents\MciPro\sql\create_chat_devices.sql
```

This creates:
- `chat_devices` table to store device tokens
- RLS policies (users manage their own devices)
- Indexes for performance
- Auto-update trigger for updated_at

**Verify:**
```sql
SELECT * FROM chat_devices;
-- Should return empty table (no errors)
```

---

## Step 2: Set Up Firebase Project

### 2.1 Create Firebase Project
1. Go to https://console.firebase.google.com/
2. Click "Add project"
3. Name: `MciPro Golf Platform`
4. Disable Google Analytics (optional)
5. Click "Create project"

### 2.2 Add Android App
1. In Firebase Console → Project Overview → Add app → Android
2. Android package name: `com.mcipro.golfplatform`
3. App nickname: `MciPro Android`
4. Click "Register app"
5. **Download `google-services.json`**
6. Place file in: `C:\Users\pete\Documents\MciPro\android\app\google-services.json`

### 2.3 Add iOS App
1. In Firebase Console → Project Overview → Add app → iOS
2. iOS bundle ID: `com.mcipro.golfplatform`
3. App nickname: `MciPro iOS`
4. Click "Register app"
5. **Download `GoogleService-Info.plist`**
6. Open Xcode: `npx cap open ios`
7. Drag `GoogleService-Info.plist` into `App/App` folder in Xcode

### 2.4 Generate Service Account Key
1. Firebase Console → Project Settings (gear icon) → Service accounts
2. Click "Generate new private key"
3. Download JSON file (save as `firebase-service-account.json`)
4. **IMPORTANT:** Keep this file secure, don't commit to git

---

## Step 3: Configure APNs for iOS

### 3.1 Create APNs Key
1. Go to https://developer.apple.com/account/resources/authkeys/list
2. Click "+" to create new key
3. Name: `MciPro Push Notifications`
4. Enable: Apple Push Notifications service (APNs)
5. Click "Continue" → "Register"
6. **Download .p8 file** (you can only download once!)
7. Note down:
   - Key ID (e.g., `ABC123XYZ`)
   - Team ID (in top right of page, e.g., `DEF456UVW`)

### 3.2 Upload APNs Key to Firebase
1. Firebase Console → Project Settings → Cloud Messaging
2. Scroll to "Apple app configuration"
3. Click "Upload" under APNs Authentication Key
4. Upload the .p8 file
5. Enter Key ID and Team ID
6. Click "Upload"

### 3.3 Enable Push in Xcode
1. Open: `npx cap open ios`
2. Select `App` target → Signing & Capabilities
3. Click "+ Capability"
4. Add "Push Notifications"
5. Add "Background Modes"
6. Enable "Remote notifications"

---

## Step 4: Deploy Edge Function

### 4.1 Install Supabase CLI
```bash
npm install -g supabase
```

### 4.2 Login to Supabase
```bash
supabase login
```

### 4.3 Link Project
```bash
cd C:\Users\pete\Documents\MciPro
supabase link --project-ref pyeeplwsnupmhgbguwqs
```

### 4.4 Set Firebase Service Account Secret
```bash
# Base64 encode the service account file (Windows PowerShell)
$content = Get-Content firebase-service-account.json -Raw
$bytes = [System.Text.Encoding]::UTF8.GetBytes($content)
$encoded = [Convert]::ToBase64String($bytes)
echo $encoded

# Copy the output and run:
supabase secrets set FCM_SERVICE_ACCOUNT="<paste-base64-here>"
```

### 4.5 Deploy Function
```bash
supabase functions deploy push-on-message
```

**Verify deployment:**
```bash
supabase functions list
# Should show: push-on-message (deployed)
```

---

## Step 5: Create Database Webhook

1. Go to Supabase Dashboard → Database → Webhooks
2. Click "Create a new hook"
3. Configure:
   - **Name:** `push-on-new-message`
   - **Table:** `chat_messages`
   - **Events:** `INSERT`
   - **Type:** `HTTP Request`
   - **Method:** `POST`
   - **URL:** `https://pyeeplwsnupmhgbguwqs.supabase.co/functions/v1/push-on-message`
   - **HTTP Headers:**
     ```
     Authorization: Bearer <your-supabase-anon-key>
     Content-Type: application/json
     ```
4. Click "Create webhook"

**Get anon key:**
- Supabase Dashboard → Settings → API → `anon` `public` key

---

## Step 6: Test Push Notifications

### 6.1 Build and Run App

**Android:**
```bash
npm run cap:android
# In Android Studio: Run on device/emulator
```

**iOS:**
```bash
npm run cap:ios
# In Xcode: Select device and Run
```

### 6.2 Allow Permissions
- App will request push notification permission
- Click "Allow"

### 6.3 Verify Token Registration
Check Supabase:
```sql
SELECT * FROM chat_devices;
-- Should show your device token
```

### 6.4 Send Test Message
1. Log in with two accounts (or use two devices)
2. Create a group or send DM
3. Send a message
4. **Expected:** Other device receives push notification

### 6.5 Check Logs
```bash
# Edge Function logs
supabase functions logs push-on-message

# Should show:
# [Push] New message in room <room_id>
# [Push] Notifying X users
# [Push] ✅ Sent X/X notifications
```

---

## Troubleshooting

### Push Not Received

**Check 1: Token Registered?**
```sql
SELECT * FROM chat_devices WHERE user_id = '<your-supabase-user-id>';
```
If empty → Device didn't register. Check app logs.

**Check 2: Edge Function Running?**
```bash
supabase functions logs push-on-message --tail
# Send a message and watch logs
```
If no logs → Webhook not triggering. Check webhook configuration.

**Check 3: Firebase Credentials?**
```bash
supabase secrets list
# Should show FCM_SERVICE_ACCOUNT
```
If missing → Re-run Step 4.4

**Check 4: google-services.json in place?**
- Android: `android/app/google-services.json` must exist
- iOS: `GoogleService-Info.plist` must be in Xcode project

### "No tokens" in Edge Function Logs

Users haven't opened the app yet. Device tokens are registered on first app launch.

### APNs Certificate Error (iOS)

1. Verify .p8 file uploaded to Firebase
2. Check Key ID and Team ID are correct
3. Enable Push Notifications capability in Xcode

### Database Webhook Not Triggering

1. Check webhook is enabled (Supabase Dashboard → Database → Webhooks)
2. Verify URL is correct
3. Check Authorization header has anon key

---

## How It Works

### Device Token Registration (native-push.js)
1. App launches
2. Request push permission
3. Get device token from OS
4. Store in `chat_devices` table
5. Token stored locally in `localStorage` for reference

### Push Notification Flow
1. User A sends message → Inserts into `chat_messages`
2. Database webhook triggers Edge Function
3. Edge Function:
   - Queries `chat_room_members` for room members
   - Queries `chat_devices` for device tokens
   - Sends push via Firebase Admin SDK
4. Firebase routes to FCM (Android) or APNs (iOS)
5. User B's device receives notification
6. Tapping notification → Opens app → Navigates to chat room

---

## Production Checklist

- [ ] `chat_devices` table created
- [ ] Firebase project created
- [ ] `google-services.json` in `android/app/`
- [ ] `GoogleService-Info.plist` in Xcode
- [ ] APNs key uploaded to Firebase
- [ ] Push Notifications capability enabled in Xcode
- [ ] Background Modes enabled in Xcode
- [ ] FCM_SERVICE_ACCOUNT secret set
- [ ] Edge Function deployed
- [ ] Database webhook created
- [ ] Tested on physical device (Android)
- [ ] Tested on physical device (iOS)
- [ ] Verified tokens in database
- [ ] Verified Edge Function logs show success

---

## Files Created

```
C:\Users\pete\Documents\MciPro\
├── native-push.js                              # Client-side push handler
├── sql/create_chat_devices.sql                 # Database schema
├── supabase/functions/push-on-message/
│   └── index.ts                                # Edge Function
├── capacitor.config.ts                         # Capacitor config (TypeScript)
└── PUSH-NOTIFICATIONS-SETUP.md                 # This file
```

---

## Security Notes

1. **Service Account JSON:**
   - Never commit to git
   - Only use base64-encoded in Supabase secrets
   - Rotate regularly

2. **Device Tokens:**
   - Stored per-user with RLS
   - Users can only see their own tokens
   - Auto-delete when user is deleted (CASCADE)

3. **Edge Function:**
   - Only triggered by database webhook
   - Uses service_role key (server-side only)
   - Validates room membership before sending

---

## Next Steps

1. Run Step 1-5 to complete setup
2. Test on physical devices
3. Monitor Edge Function logs
4. Add analytics for push delivery rates
5. Implement badge count sync
6. Add notification categories (reply, mark as read)

---

## Support

- Firebase Console: https://console.firebase.google.com/
- Supabase Dashboard: https://app.supabase.com/project/pyeeplwsnupmhgbguwqs
- Capacitor Push Docs: https://capacitorjs.com/docs/apis/push-notifications
- Firebase Admin SDK: https://firebase.google.com/docs/admin/setup

---

**Setup Time:** 30-60 minutes
**Difficulty:** Medium
**Status:** Ready for deployment
