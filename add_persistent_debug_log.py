#!/usr/bin/env python3
"""
Add persistent debug logging that survives page reloads
"""

def add_persistent_logging():
    file_path = r'C:\Users\pete\Documents\MciPro\index.html'

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Add persistent logger right after the "Clear all blocking flags" code
    search_str = '''    // CRITICAL: Clear all blocking flags on page load
    try {
        sessionStorage.removeItem('__force_liff_skip');
        sessionStorage.removeItem('__oauth_error_time');
        sessionStorage.removeItem('__liff_logged_out');
        console.log('[INIT] Cleared all LINE blocking flags');
    } catch (e) {
        console.error('[INIT] Could not clear flags:', e);
    }'''

    replace_str = '''    // CRITICAL: Clear all blocking flags on page load
    try {
        sessionStorage.removeItem('__force_liff_skip');
        sessionStorage.removeItem('__oauth_error_time');
        sessionStorage.removeItem('__liff_logged_out');
        console.log('[INIT] Cleared all LINE blocking flags');
    } catch (e) {
        console.error('[INIT] Could not clear flags:', e);
    }

    // PERSISTENT DEBUG LOGGER - Survives page reloads
    window.DEBUG_LOG = [];
    window.logDebug = function(msg) {
        const timestamp = new Date().toISOString();
        const entry = `${timestamp}: ${msg}`;
        console.log('[DEBUG]', entry);
        window.DEBUG_LOG.push(entry);

        // Save to sessionStorage
        try {
            const existingLog = sessionStorage.getItem('__debug_log') || '';
            sessionStorage.setItem('__debug_log', existingLog + entry + '\\n');
        } catch (e) {
            console.error('[DEBUG] Failed to save log:', e);
        }
    };

    // Show debug log function
    window.showDebugLog = function() {
        const log = sessionStorage.getItem('__debug_log') || 'No debug log found';
        console.log('%c========== DEBUG LOG ==========', 'background: #ff0000; color: #fff; font-size: 20px; padding: 10px;');
        console.log(log);
        alert(log);
        return log;
    };

    // Clear debug log
    window.clearDebugLog = function() {
        sessionStorage.removeItem('__debug_log');
        window.DEBUG_LOG = [];
        console.log('[DEBUG] Log cleared');
    };

    window.logDebug('PAGE LOADED');'''

    if search_str not in content:
        print("ERROR: Could not find insertion point")
        return False

    content = content.replace(search_str, replace_str, 1)

    # Now add logDebug calls to key points in the OAuth flow

    # 1. OAuth callback detection
    content = content.replace(
        "console.warn('🔥 [LINE OAuth DEBUG] Checking callback...');",
        "console.warn('🔥 [LINE OAuth DEBUG] Checking callback...');\n            window.logDebug('OAuth callback check started');"
    )

    # 2. OAuth exchange starting
    content = content.replace(
        "console.warn('🚀🚀🚀 STARTING OAUTH EXCHANGE 🚀🚀🚀');",
        "console.warn('🚀🚀🚀 STARTING OAUTH EXCHANGE 🚀🚀🚀');\n                    window.logDebug('OAuth exchange starting');"
    )

    # 3. Before setUserFromLineProfile
    content = content.replace(
        "await LineAuthentication.setUserFromLineProfile(data.profile);",
        "window.logDebug('Calling setUserFromLineProfile');\n                        await LineAuthentication.setUserFromLineProfile(data.profile);\n                        window.logDebug('setUserFromLineProfile completed');"
    )

    # 4. Before redirectToDashboard
    content = content.replace(
        "LineAuthentication.redirectToDashboard();",
        "window.logDebug('Calling redirectToDashboard');\n                        LineAuthentication.redirectToDashboard();\n                        window.logDebug('redirectToDashboard completed');"
    )

    # 5. Inside redirectToDashboard
    content = content.replace(
        "console.log('%c[redirectToDashboard] ========== REDIRECT TO DASHBOARD CALLED ==========', 'background: #00ff00; color: #000; font-size: 16px; font-weight: bold; padding: 10px;');",
        "console.log('%c[redirectToDashboard] ========== REDIRECT TO DASHBOARD CALLED ==========', 'background: #00ff00; color: #000; font-size: 16px; font-weight: bold; padding: 10px;');\n                window.logDebug('redirectToDashboard() called with role: ' + AppState.currentUser.role);"
    )

    # 6. Before ScreenManager.showScreen
    content = content.replace(
        "console.log('%c[redirectToDashboard] ========== CALLING ScreenManager.showScreen(' + targetDashboard + ') ==========', 'background: #ff00ff; color: #fff; font-size: 14px; font-weight: bold; padding: 5px;');",
        "console.log('%c[redirectToDashboard] ========== CALLING ScreenManager.showScreen(' + targetDashboard + ') ==========', 'background: #ff00ff; color: #fff; font-size: 14px; font-weight: bold; padding: 5px;');\n                window.logDebug('Showing screen: ' + targetDashboard);"
    )

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

    print("[OK] Added persistent debug logging")
    print("\nUser can now:")
    print("1. Try to login with LINE")
    print("2. After loop, open Console and type: showDebugLog()")
    print("3. Copy the output")
    return True

if __name__ == '__main__':
    add_persistent_logging()
