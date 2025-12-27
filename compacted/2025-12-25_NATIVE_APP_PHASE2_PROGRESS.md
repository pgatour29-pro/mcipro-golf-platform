# Native App Phase 2 Progress (2025-12-25)

## Goal
Convert PWA to native Android/iOS apps to fix:
1. Inconsistent LINE LIFF login in WebView
2. Losing page state when app goes to background

## Approach
Enhanced WebView wrapper (not full native rebuild)

## Files Modified

### MciProNative/src/screens/WebShell.tsx
**State Persistence Added:**
- Saves current URL to AsyncStorage when app goes to background
- Restores URL when app returns to foreground
- Uses `AppState.addEventListener('change', ...)` to detect lifecycle

**LIFF Compatibility Improved:**
- `thirdPartyCookiesEnabled={true}` - Required for LIFF cookies
- `sharedCookiesEnabled={true}` - iOS cookie sharing
- `incognito={false}` - Persist cookies
- Custom Chrome user agent on Android (avoids LIFF WebView blocking)
- Better URL handling for LINE auth redirects

**Key Code (lines 41-88):**
```javascript
// Save state when app goes to background
useEffect(() => {
  const handleAppStateChange = async (nextState) => {
    if (appStateRef.current.match(/active/) && nextState.match(/inactive|background/)) {
      const urlToSave = currentUrlRef.current;
      if (urlToSave && urlToSave !== START_URL) {
        await AsyncStorage.setItem(STORAGE_KEY_URL, urlToSave);
      }
    }
    appStateRef.current = nextState;
  };
  const subscription = AppState.addEventListener('change', handleAppStateChange);
  return () => subscription.remove();
}, []);

// Restore URL on mount
useEffect(() => {
  const restoreState = async () => {
    const savedUrl = await AsyncStorage.getItem(STORAGE_KEY_URL);
    if (savedUrl && savedUrl.startsWith('http')) {
      setInitialUrl(savedUrl);
    } else {
      setInitialUrl(START_URL);
    }
    setIsReady(true);
  };
  restoreState();
}, []);
```

### MciProNative/App.tsx
Simplified to just WebShell screen (removed unused Login/Chats screens)

## Files NOT Modified
- `public/index.html` - Web platform unchanged
- No new LINE login system created
- Existing LIFF login preserved

## Build Environment (READY)

### JDK 17 Installed
Location: `C:\Program Files\Microsoft\jdk-17.0.17.10-hotspot`

### Build Script Created
`MciProNative/build.bat` - Sets JAVA_HOME and runs Gradle:
```batch
@echo off
set "JAVA_HOME=C:\Program Files\Microsoft\jdk-17.0.17.10-hotspot"
set "PATH=%JAVA_HOME%\bin;%PATH%"
cd /d "C:\Users\pete\Documents\MciPro\MciProNative\android"
call gradlew.bat assembleDebug
```

### To Build
Option 1: Double-click `MciProNative\build.bat`
Option 2: Open cmd in `MciProNative\android` folder and run:
```cmd
set "JAVA_HOME=C:\Program Files\Microsoft\jdk-17.0.17.10-hotspot"
gradlew.bat assembleDebug
```

### APK Output Location
`android/app/build/outputs/apk/debug/app-debug.apk`

## Installing on Android Phone

### Enable Developer Mode on Phone
1. Settings → About Phone
2. Tap "Build Number" 7 times
3. Settings → Developer Options → Enable "USB Debugging"

### Install APK
Option 1 (ADB):
```cmd
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

Option 2 (Manual):
- Copy APK to phone via USB
- Tap the APK file on phone to install
- May need to allow "Install from unknown sources"

## What's Working
- [x] State persistence code in WebShell
- [x] LIFF-compatible WebView settings
- [x] URL tracking and restoration
- [x] Native bridge injection (`window.NATIVE_APP = true`)
- [x] JDK 17 installed
- [x] Build script created

## What's Pending
- [ ] Build debug APK (run build.bat)
- [ ] Test on real Android device
- [ ] Test LIFF login flow
- [ ] Test state persistence (background/foreground)
- [ ] iOS build and test

## Project Structure
```
MciProNative/
├── App.tsx                    # Main app, just WebShell
├── index.js                   # Entry point with error boundary
├── src/
│   ├── supabase.ts           # Supabase client (unchanged)
│   └── screens/
│       ├── WebShell.tsx      # UPDATED - state persistence + LIFF fixes
│       ├── Chats.tsx         # Unused
│       └── Login.tsx         # Unused
├── android/                   # Android native code
├── ios/                       # iOS native code
└── package.json              # Dependencies
```

## Dependencies (package.json)
```json
{
  "@react-native-async-storage/async-storage": "^2.2.0",
  "@react-navigation/native": "^7.1.18",
  "@react-navigation/native-stack": "^7.3.28",
  "@supabase/supabase-js": "^2.75.0",
  "react": "19.1.1",
  "react-native": "0.82.0",
  "react-native-webview": "^13.12.2",
  "react-native-safe-area-context": "^5.6.1",
  "react-native-screens": "^4.16.0"
}
```

## Next Steps When Resuming
1. Run `build.bat` (double-click or run from cmd)
2. Copy APK to Android phone or use `adb install`
3. Test app - check if LIFF login works
4. Test state persistence - leave app, return, check if same page
5. If LIFF still has issues, may need to open LINE login in external browser
6. iOS build (requires Mac with Xcode)

## Alternative Approaches (If Current Doesn't Work)
1. **External browser for LINE login** - Open LINE auth in Chrome, handle callback via deep link
2. **LINE Login SDK** - Use native LINE SDK instead of LIFF (requires new LINE channel)
3. **Capacitor** - Alternative wrapper with better plugin ecosystem

## Related Documentation
- `PHASE_2_ANDROID_IOS_NATIVE_APP.md` - Full implementation plan (more detailed than needed)
