import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mcipro.golfplatform',
  appName: 'MciPro Golf Platform',
  webDir: 'www',
  server: { androidScheme: 'https', cleartext: false, allowNavigation: ['mycaddipro.com','mcipro-golf-platform.netlify.app','*.line.me','*.line-scdn.net','*.supabase.co','accounts.google.com','api.line.me','access.line.me'] },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true,
    backgroundColor: '#10b981',
    overrideUserAgent: 'Mozilla/5.0 (Linux; Android 13; SM-F741B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 MciProApp/1.0'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      backgroundColor: '#10b981',
      showSpinner: true,
      androidSpinnerStyle: 'small',
      iosSpinnerStyle: 'small',
      spinnerColor: '#ffffff',
      androidSplashResourceName: 'splash',
      splashFullScreen: true,
      splashImmersive: true
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    StatusBar: {
      style: 'light',
      backgroundColor: '#10b981',
      overlaysWebView: false
    },
    Keyboard: {
      resize: 'native',
      style: 'dark'
    }
  }
};

export default config;
