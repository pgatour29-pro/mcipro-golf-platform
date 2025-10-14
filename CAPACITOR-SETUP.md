# Capacitor Native App Setup

**Status:** ✅ Initial setup complete
**Date:** 2025-10-14
**Platform:** Android & iOS

---

## What's Been Done

### 1. Capacitor Installed ✅
- @capacitor/core v7.4.3
- @capacitor/cli v7.4.3
- @capacitor/android v7.4.3
- @capacitor/ios v7.4.3

### 2. Essential Plugins Installed ✅
- **@capacitor/push-notifications** - Push notifications (FCM + APNs)
- **@capacitor/app** - App lifecycle & back button
- **@capacitor/preferences** - Native key-value storage
- **@capacitor/filesystem** - File system access
- **@capacitor/network** - Network status monitoring
- **@capacitor/splash-screen** - Native splash screen
- **@capacitor/status-bar** - Status bar customization
- **@capacitor/haptics** - Haptic feedback
- **@capacitor/share** - Native share sheet

### 3. Native Projects Created ✅
- `android/` - Android Studio project
- `ios/` - Xcode project

### 4. Integration Code Created ✅
- `capacitor-init.js` - Native features manager
- `build-native.js` - Build script for native apps
- `capacitor.config.json` - App configuration

### 5. Configuration Applied ✅
```json
{
  "appId": "com.mcipro.golfplatform",
  "appName": "MciPro Golf Platform",
  "webDir": "www",
  "server": {
    "url": "https://mcipro-golf-platform.netlify.app"
  }
}
```

**Mode:** Server mode (loads from Netlify, native shell wrapper)

---

## Features Implemented

### ✅ Push Notifications
- FCM/APNs registration
- Token storage in localStorage
- Notification handlers for chat messages
- Deep linking to specific rooms
- Badge updates

### ✅ Native Back Button (Android)
- Smart navigation:
  - In chat → Go back to contacts
  - Modal open → Close modal
  - Can go back → Navigate back
  - Root screen → Minimize app

### ✅ Network Status
- Monitors online/offline
- Triggers sync when reconnected
- Updates UI indicator

### ✅ App State Management
- Foreground/background detection
- Auto-sync when app returns to foreground
- Reconnects realtime when active

### ✅ Local Caching
- Recent messages (last 50 per room)
- Contacts list
- 24-hour message cache expiry
- 1-hour contacts cache expiry

### ✅ Haptic Feedback
- Light/medium/heavy vibrations
- Triggers on send, receive, tap

### ✅ Native Share
- Share invites via native dialog
- Falls back to Web Share API on web

### ✅ Splash Screen
- Brand color (#10b981)
- White spinner
- 2-second delay

### ✅ Status Bar
- Light content style
- Green background (#10b981)

---

## Next Steps

### 1. Test on Device/Emulator

**Android:**
```bash
npm run cap:android
# Opens Android Studio
# Click Run button to test on emulator/device
```

**iOS:**
```bash
npm run cap:ios
# Opens Xcode
# Select device and click Run
```

### 2. Set Up Push Notifications

#### Android (FCM)
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create/select project: "MciPro Golf Platform"
3. Add Android app:
   - Package name: `com.mcipro.golfplatform`
   - Download `google-services.json`
   - Place in `android/app/`
4. Copy Server Key for backend

#### iOS (APNs)
1. Go to [Apple Developer](https://developer.apple.com/)
2. Create App ID: `com.mcipro.golfplatform`
3. Enable Push Notifications capability
4. Create APNs Key (.p8 file)
5. Configure in Xcode:
   - Open `ios/App/App.xcworkspace`
   - Select App target → Signing & Capabilities
   - Add Push Notifications capability
6. Upload .p8 to backend

### 3. Backend Integration

Add push notification sender to Supabase Edge Functions:

```typescript
// supabase/functions/send-push-notification/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const { tokens, title, body, data } = await req.json()

  // Send to FCM (Android)
  const fcmResponse = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      'Authorization': `key=${Deno.env.get('FCM_SERVER_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      registration_ids: tokens.android,
      notification: { title, body },
      data
    })
  })

  // Send to APNs (iOS)
  const apnsResponse = await fetch('https://api.push.apple.com/3/device/...', {
    // APNs configuration
  })

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

**Store tokens in database:**
```sql
CREATE TABLE push_tokens (
  user_id UUID REFERENCES auth.users(id),
  token TEXT UNIQUE NOT NULL,
  platform TEXT CHECK (platform IN ('ios', 'android', 'web')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Trigger push on new message:**
```sql
CREATE OR REPLACE FUNCTION notify_chat_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Call Edge Function to send push to room members
  PERFORM net.http_post(
    url := 'https://[project-ref].supabase.co/functions/v1/send-push-notification',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('request.headers')::json->>'authorization'),
    body := jsonb_build_object(
      'room_id', NEW.room_id,
      'title', 'New Message',
      'body', LEFT(NEW.content, 100),
      'data', jsonb_build_object('type', 'chat_message', 'room_id', NEW.room_id)
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_chat_message_push
AFTER INSERT ON chat_messages
FOR EACH ROW EXECUTE FUNCTION notify_chat_message();
```

### 4. App Icons & Splash

**Generate assets:**
1. Create 1024x1024 icon (PNG)
2. Use [Capacitor Assets Generator](https://github.com/capacitor-community/capacitor-assets):
   ```bash
   npm install @capacitor/assets --save-dev
   npx capacitor-assets generate --iconSource assets/icon.png --splashSource assets/splash.png
   ```

**Manual placement:**
- Android: `android/app/src/main/res/`
- iOS: `ios/App/App/Assets.xcassets/`

### 5. Build for Production

**Android (APK/AAB):**
```bash
cd android
./gradlew assembleRelease  # APK
./gradlew bundleRelease    # AAB (for Play Store)
```

**iOS (IPA):**
1. Open `ios/App/App.xcworkspace` in Xcode
2. Product → Archive
3. Distribute App → App Store Connect

### 6. Testing Checklist

- [ ] App launches on Android
- [ ] App launches on iOS
- [ ] Push notification permission requested
- [ ] Push token registered in backend
- [ ] Receive test push notification
- [ ] Tap push → Opens correct chat room
- [ ] Back button works (Android)
- [ ] Swipe back works (iOS)
- [ ] Network status updates
- [ ] App syncs when returning to foreground
- [ ] Haptic feedback on send
- [ ] Share button works
- [ ] Splash screen displays
- [ ] Status bar styled correctly
- [ ] Messages cached locally
- [ ] Offline mode works

---

## Current Mode: Server Mode

The app currently loads from **https://mcipro-golf-platform.netlify.app**.

**Pros:**
- Instant updates (no app store approval)
- Single codebase
- Native shell for UX

**Cons:**
- Requires internet to load initially
- Slower first paint

**To switch to Bundled Mode:**
1. Remove `server.url` from `capacitor.config.json`
2. Run `npm run build:native` to copy all assets to `www/`
3. Run `npm run cap:sync`
4. Test thoroughly

---

## Project Structure

```
mcipro-golf-platform/
├── android/                 # Android Studio project
├── ios/                     # Xcode project
├── www/                     # Built web assets (for bundled mode)
├── capacitor.config.json    # Capacitor configuration
├── capacitor-init.js        # Native features integration
├── build-native.js          # Build script
├── package.json             # Updated with cap: scripts
└── CAPACITOR-SETUP.md       # This file
```

---

## Useful Commands

```bash
# Build and sync to native
npm run build:native

# Open in IDE
npm run cap:android  # Android Studio
npm run cap:ios      # Xcode

# Run on device
npm run cap:run:android
npm run cap:run:ios

# Sync changes only
npm run cap:sync

# View native logs
npx cap run android --livereload  # Android with hot reload
npx cap run ios --livereload      # iOS with hot reload
```

---

## Troubleshooting

### Android Studio can't find SDK
Set `ANDROID_HOME` environment variable:
```bash
export ANDROID_HOME=$HOME/Library/Android/sdk  # macOS/Linux
# or
setx ANDROID_HOME "C:\Users\[User]\AppData\Local\Android\Sdk"  # Windows
```

### iOS build fails
1. Install CocoaPods: `sudo gem install cocoapods`
2. Run: `cd ios/App && pod install`
3. Open `.xcworkspace` not `.xcodeproj`

### Push notifications not working
1. Check `google-services.json` is in `android/app/`
2. Check APNs capability enabled in Xcode
3. Check FCM_SERVER_KEY in backend
4. Test with Firebase Console → Cloud Messaging → Send test message

### App crashes on launch
Check native logs:
```bash
# Android
adb logcat | grep Capacitor

# iOS
# View logs in Xcode → Window → Devices and Simulators
```

---

## What's Next?

**Phase 1 (This Week):**
- [x] Capacitor setup
- [ ] Test on physical device
- [ ] Set up FCM/APNs
- [ ] Implement push backend
- [ ] Ship internal test build

**Phase 2 (Next Sprint):**
- [ ] Migrate contacts/chat to React Native for better performance
- [ ] Local SQLite for instant load
- [ ] Background sync
- [ ] Share sheets
- [ ] Deep links

---

**Questions? Check:**
- [Capacitor Docs](https://capacitorjs.com/docs)
- [Push Notifications Plugin](https://capacitorjs.com/docs/apis/push-notifications)
- [Firebase Console](https://console.firebase.google.com/)
- [Apple Developer](https://developer.apple.com/)
