// Capacitor auto-injects itself when running in native app
// This script only runs when in web mode to prevent errors
if (!window.Capacitor) {
    window.Capacitor = {
        isNativePlatform: () => false,
        getPlatform: () => 'web'
    };
}
