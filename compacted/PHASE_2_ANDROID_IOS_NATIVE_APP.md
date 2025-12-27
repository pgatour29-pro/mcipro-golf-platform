# Phase 2: Android & iOS Native App

## Current Problems

1. **Login Inconsistency**: LINE LIFF doesn't work reliably in WebView
2. **State Loss**: App loses current page when going to background/foreground
3. **No Push Notifications**: Relies on web notifications which don't work in native wrapper
4. **Poor UX**: Feels like a web browser, not a native app

## Current Implementation (MciProNative)

```
MciProNative/
├── App.tsx              # Navigation setup (WebShell, Login, Chats)
├── src/
│   ├── supabase.ts      # Supabase client with AsyncStorage
│   └── screens/
│       ├── WebShell.tsx # WebView wrapping mycaddipro.com
│       ├── Login.tsx    # Email/password login (unused)
│       └── Chats.tsx    # Native chat screen (unused)
```

**WebShell.tsx**: Simple WebView pointing to `https://mycaddipro.com`
- No state persistence
- No native login integration
- No deep linking

---

## Phase 2 Implementation Plan

### Option A: Enhanced WebView (Recommended - Faster)

Keep WebView approach but add:
1. **Native LINE Login** - Use LINE SDK, then inject auth token into WebView
2. **State Persistence** - Save/restore URL on app lifecycle
3. **Native Push Notifications** - Firebase Cloud Messaging
4. **Deep Linking** - Handle `mcipro://` URLs

**Timeline**: 2-3 weeks

### Option B: Hybrid App (More Work)

Critical screens as native, rest in WebView:
- Native: Login, Dashboard, Live Scorecard
- WebView: Everything else

**Timeline**: 6-8 weeks

### Option C: Full Native (Most Work)

Rebuild entire app in React Native.

**Timeline**: 3-6 months

---

## Phase 2A: Enhanced WebView (Recommended)

### Step 1: Native LINE Login SDK

**Install LINE SDK:**
```bash
npm install @line/line-login-react-native
```

**Android Setup** (`android/app/build.gradle`):
```gradle
implementation 'com.linecorp.linesdk:line-sdk:5.9.0'
```

**iOS Setup** (`ios/Podfile`):
```ruby
pod 'LineSDKSwift', '~> 5.0'
```

**LINE Channel Configuration:**
- Create native app channel in LINE Developers Console
- Add Android package name and iOS bundle ID
- Get Channel ID for native SDK

**Login Flow:**
```typescript
// src/screens/NativeLogin.tsx
import LineLogin from '@line/line-login-react-native';

const login = async () => {
  try {
    const result = await LineLogin.login({
      scopes: ['profile', 'openid'],
    });

    // Get LINE user ID and access token
    const { userID, accessToken } = result;

    // Store in AsyncStorage
    await AsyncStorage.setItem('lineUserId', userID);
    await AsyncStorage.setItem('lineAccessToken', accessToken.access_token);

    // Navigate to WebShell with auth
    navigation.replace('WebShell', { lineUserId: userID });
  } catch (error) {
    console.error('LINE login failed:', error);
  }
};
```

---

### Step 2: Inject Auth into WebView

**Pass LINE credentials to web app:**
```typescript
// src/screens/WebShell.tsx
const WebShell = ({ route }) => {
  const { lineUserId } = route.params || {};
  const [injectedJS, setInjectedJS] = useState('');

  useEffect(() => {
    const loadAuth = async () => {
      const userId = lineUserId || await AsyncStorage.getItem('lineUserId');
      const token = await AsyncStorage.getItem('lineAccessToken');

      if (userId) {
        // Inject auth into web app
        setInjectedJS(`
          window.NATIVE_APP = true;
          window.NATIVE_LINE_USER_ID = '${userId}';
          window.NATIVE_LINE_TOKEN = '${token}';

          // Trigger native login in web app
          if (window.handleNativeLogin) {
            window.handleNativeLogin('${userId}', '${token}');
          }
        `);
      }
    };
    loadAuth();
  }, [lineUserId]);

  return (
    <WebView
      source={{ uri: START_URL }}
      injectedJavaScriptBeforeContentLoaded={injectedJS}
      // ... other props
    />
  );
};
```

**Web app changes (index.html):**
```javascript
// Add to initialization
window.handleNativeLogin = async function(lineUserId, lineToken) {
  console.log('[Native] Received LINE auth:', lineUserId);

  // Set user in AppState
  await loadUserProfile(lineUserId);

  // Hide login UI, show dashboard
  showDashboard();
};

// Check on page load
if (window.NATIVE_APP && window.NATIVE_LINE_USER_ID) {
  window.handleNativeLogin(window.NATIVE_LINE_USER_ID, window.NATIVE_LINE_TOKEN);
}
```

---

### Step 3: State Persistence (URL Save/Restore)

**Save current URL when app goes to background:**
```typescript
// src/screens/WebShell.tsx
import { AppState } from 'react-native';

const WebShell = () => {
  const webRef = useRef<WebView>(null);
  const currentUrlRef = useRef(START_URL);

  // Track current URL
  const onNavChange = useCallback((navState) => {
    currentUrlRef.current = navState.url;
    canGoBackRef.current = navState.canGoBack;
  }, []);

  // Save/restore on app lifecycle
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (state) => {
      if (state === 'background') {
        // Save current URL
        await AsyncStorage.setItem('lastUrl', currentUrlRef.current);
        console.log('[WebShell] Saved URL:', currentUrlRef.current);
      }
    });

    // Restore URL on mount
    const restoreUrl = async () => {
      const savedUrl = await AsyncStorage.getItem('lastUrl');
      if (savedUrl && savedUrl !== START_URL) {
        console.log('[WebShell] Restoring URL:', savedUrl);
        // Navigate to saved URL
        webRef.current?.injectJavaScript(`
          window.location.href = '${savedUrl}';
        `);
      }
    };
    restoreUrl();

    return () => subscription.remove();
  }, []);

  return (
    <WebView
      ref={webRef}
      onNavigationStateChange={onNavChange}
      // ... other props
    />
  );
};
```

**Better approach - Save app state, not just URL:**
```typescript
// Inject JS to get app state
const getAppState = () => {
  webRef.current?.injectJavaScript(`
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'APP_STATE',
      url: window.location.href,
      dashboard: window.AppState?.activeDashboard,
      activeTab: window.AppState?.activeTab,
      userId: window.AppState?.currentUser?.lineUserId
    }));
  `);
};

// Listen for messages from web
const onMessage = async (event) => {
  const data = JSON.parse(event.nativeEvent.data);

  if (data.type === 'APP_STATE') {
    await AsyncStorage.setItem('appState', JSON.stringify(data));
  }
};

// Restore on mount
const restoreState = async () => {
  const savedState = await AsyncStorage.getItem('appState');
  if (savedState) {
    const state = JSON.parse(savedState);
    webRef.current?.injectJavaScript(`
      window.restoreNativeState && window.restoreNativeState(${savedState});
    `);
  }
};
```

**Web app changes:**
```javascript
// Add to index.html
window.restoreNativeState = function(state) {
  console.log('[Native] Restoring state:', state);

  // Restore dashboard
  if (state.dashboard) {
    switchDashboard(state.dashboard);
  }

  // Restore tab
  if (state.activeTab) {
    showTab(state.activeTab);
  }

  // Navigate to saved URL
  if (state.url && state.url !== window.location.href) {
    history.replaceState(null, '', state.url);
  }
};
```

---

### Step 4: Native Push Notifications

**Install Firebase:**
```bash
npm install @react-native-firebase/app @react-native-firebase/messaging
```

**Request permissions and get token:**
```typescript
// src/notifications.ts
import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

export async function requestNotificationPermission() {
  const authStatus = await messaging().requestPermission();
  const enabled = authStatus === messaging.AuthorizationStatus.AUTHORIZED;

  if (enabled) {
    const fcmToken = await messaging().getToken();
    console.log('[FCM] Token:', fcmToken);

    // Save to database
    const lineUserId = await AsyncStorage.getItem('lineUserId');
    if (lineUserId && fcmToken) {
      await supabase.from('user_devices').upsert({
        line_user_id: lineUserId,
        fcm_token: fcmToken,
        platform: Platform.OS,
        updated_at: new Date().toISOString()
      });
    }

    return fcmToken;
  }

  return null;
}

// Handle incoming notifications
messaging().onMessage(async (message) => {
  console.log('[FCM] Foreground message:', message);
  // Show local notification or update UI
});

messaging().setBackgroundMessageHandler(async (message) => {
  console.log('[FCM] Background message:', message);
});
```

**New database table:**
```sql
CREATE TABLE user_devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  line_user_id TEXT NOT NULL,
  fcm_token TEXT NOT NULL,
  platform TEXT NOT NULL,  -- 'ios' or 'android'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(line_user_id, platform)
);
```

**Server-side push (Edge Function):**
```typescript
// supabase/functions/send-push/index.ts
import { initializeApp, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

// Send push notification
async function sendPush(userId: string, title: string, body: string, data?: any) {
  const { data: devices } = await supabase
    .from('user_devices')
    .select('fcm_token')
    .eq('line_user_id', userId);

  if (!devices?.length) return;

  const messaging = getMessaging();

  for (const device of devices) {
    await messaging.send({
      token: device.fcm_token,
      notification: { title, body },
      data: data || {}
    });
  }
}
```

---

### Step 5: Deep Linking

**Configure URL schemes:**

**Android** (`android/app/src/main/AndroidManifest.xml`):
```xml
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="mcipro" />
</intent-filter>
```

**iOS** (`ios/MciProNative/Info.plist`):
```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>mcipro</string>
    </array>
  </dict>
</array>
```

**Handle deep links:**
```typescript
// App.tsx
import { Linking } from 'react-native';

useEffect(() => {
  const handleDeepLink = (event) => {
    const url = event.url;
    // mcipro://event/123 -> navigate to event
    // mcipro://scorecard/456 -> navigate to scorecard

    const parsed = parseDeepLink(url);
    if (parsed.type === 'event') {
      navigationRef.current?.navigate('WebShell', {
        initialUrl: `https://mycaddipro.com/#event=${parsed.id}`
      });
    }
  };

  Linking.addEventListener('url', handleDeepLink);

  // Check if app was opened via deep link
  Linking.getInitialURL().then(url => {
    if (url) handleDeepLink({ url });
  });

  return () => Linking.removeAllListeners('url');
}, []);
```

---

## Implementation Checklist

### Week 1: Native Login
- [ ] Install LINE SDK for React Native
- [ ] Configure LINE channel for native apps
- [ ] Implement native LINE login screen
- [ ] Inject auth credentials into WebView
- [ ] Modify web app to accept native auth
- [ ] Test login flow on Android emulator
- [ ] Test login flow on iOS simulator

### Week 2: State Persistence
- [ ] Save current URL on app background
- [ ] Restore URL on app foreground
- [ ] Save full app state (dashboard, tab, user)
- [ ] Add `restoreNativeState` function to web app
- [ ] Test state persistence across app kills
- [ ] Handle edge cases (logged out, expired session)

### Week 3: Push Notifications & Polish
- [ ] Set up Firebase project
- [ ] Install Firebase messaging
- [ ] Request notification permissions
- [ ] Save FCM tokens to database
- [ ] Create Edge Function for sending pushes
- [ ] Integrate with existing LINE push logic
- [ ] Configure deep linking
- [ ] Test end-to-end on real devices
- [ ] Build release APK and IPA
- [ ] Submit to Play Store / App Store

---

## Files to Modify/Create

### React Native (MciProNative/)
| File | Changes |
|------|---------|
| `package.json` | Add LINE SDK, Firebase |
| `App.tsx` | Add deep linking, auth check |
| `src/screens/NativeLogin.tsx` | NEW - LINE login screen |
| `src/screens/WebShell.tsx` | Add state persistence, auth injection |
| `src/notifications.ts` | NEW - Push notification setup |
| `android/app/build.gradle` | LINE SDK, Firebase config |
| `android/app/src/main/AndroidManifest.xml` | Deep links |
| `ios/Podfile` | LINE SDK, Firebase pods |
| `ios/MciProNative/Info.plist` | URL schemes |

### Web App (public/index.html)
| Location | Changes |
|----------|---------|
| Initialization | Add `handleNativeLogin()` function |
| Initialization | Add `restoreNativeState()` function |
| Initialization | Check `window.NATIVE_APP` flag |

### Database
| Table | Purpose |
|-------|---------|
| `user_devices` | NEW - Store FCM tokens |

### Supabase Functions
| Function | Purpose |
|----------|---------|
| `send-push` | NEW - Send Firebase push notifications |

---

## Testing Checklist

### Android
- [ ] LINE login works
- [ ] Session persists after app kill
- [ ] State restores correctly
- [ ] Back button navigates in WebView
- [ ] Push notifications received
- [ ] Deep links open correct screens

### iOS
- [ ] LINE login works
- [ ] Session persists after app kill
- [ ] State restores correctly
- [ ] Swipe back gesture works
- [ ] Push notifications received
- [ ] Deep links open correct screens

---

## App Store Requirements

### Google Play Store
- [ ] App icon (512x512)
- [ ] Feature graphic (1024x500)
- [ ] Screenshots (phone + tablet)
- [ ] Privacy policy URL
- [ ] App description
- [ ] Release APK signed with upload key

### Apple App Store
- [ ] App icon (1024x1024)
- [ ] Screenshots (6.5", 5.5", iPad)
- [ ] Privacy policy URL
- [ ] App description
- [ ] Provisioning profiles
- [ ] App-specific password for upload

---

## Success Metrics

1. **Login Success Rate**: >95% successful logins
2. **State Retention**: 100% return to last page after background
3. **Push Delivery**: >90% notification delivery rate
4. **Crash-Free Rate**: >99.5%
5. **App Store Rating**: >4.0 stars

---

## Next Steps

1. Approve this plan
2. Set up LINE native channel in LINE Developers Console
3. Set up Firebase project for push notifications
4. Begin Week 1 implementation
