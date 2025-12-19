#!/usr/bin/env python3
"""Add PIN protection to society organizer normal login flow"""

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Find and replace the redirectToDashboard function to add PIN check for society_organizer
old_redirect = '''            static redirectToDashboard() {
                console.log('[redirectToDashboard] Called with user:', AppState.currentUser);

                const dashboardMap = {
                    'golfer': 'golferDashboard',
                    'caddie': 'caddieDashboard',
                    'manager': 'managerDashboard',
                    'proshop': 'proshopDashboard',
                    'society_organizer': 'societyOrganizerDashboard',
                    'maintenance': 'maintenanceDashboard'
                };

                const targetDashboard = dashboardMap[AppState.currentUser.role] || 'golferDashboard';
                console.log('[redirectToDashboard] Redirecting to:', targetDashboard, 'for role:', AppState.currentUser.role);
                ScreenManager.showScreen(targetDashboard);'''

new_redirect = '''            static async redirectToDashboard() {
                console.log('[redirectToDashboard] Called with user:', AppState.currentUser);

                const dashboardMap = {
                    'golfer': 'golferDashboard',
                    'caddie': 'caddieDashboard',
                    'manager': 'managerDashboard',
                    'proshop': 'proshopDashboard',
                    'society_organizer': 'societyOrganizerDashboard',
                    'maintenance': 'maintenanceDashboard'
                };

                const targetDashboard = dashboardMap[AppState.currentUser.role] || 'golferDashboard';
                console.log('[redirectToDashboard] Redirecting to:', targetDashboard, 'for role:', AppState.currentUser.role);

                // PIN PROTECTION: Check if society_organizer needs PIN verification
                if (AppState.currentUser.role === 'society_organizer') {
                    if (typeof SocietyOrganizerAuth !== 'undefined') {
                        // Check if already verified in this session
                        if (!SocietyOrganizerAuth.isVerified()) {
                            // Check if this organizer has a PIN set
                            const hasPinSet = await SocietyOrganizerAuth.checkIfPinRequired();
                            if (hasPinSet) {
                                console.log('[redirectToDashboard] Society organizer has PIN set - showing PIN modal');
                                // Store the pending dashboard so we can redirect after PIN verification
                                SocietyOrganizerAuth.pendingDashboard = targetDashboard;
                                SocietyOrganizerAuth.showPinModal('society_organizer');
                                return; // Don't proceed to dashboard yet - wait for PIN verification
                            } else {
                                console.log('[redirectToDashboard] Society organizer has NO PIN set - allowing access');
                            }
                        } else {
                            console.log('[redirectToDashboard] Society organizer already verified in this session');
                        }
                    }
                }

                ScreenManager.showScreen(targetDashboard);'''

if old_redirect in content:
    content = content.replace(old_redirect, new_redirect)
    print("Updated redirectToDashboard to check PIN for society_organizer")
else:
    print("Could not find redirectToDashboard function")
    exit(1)

# Update SocietyOrganizerAuth.verifyPin to redirect to dashboard after successful PIN entry
old_verify = '''                if (data === true) {
                    sessionStorage.setItem('society_organizer_verified', 'true');
                    this.hidePinModal();
                    if (this.pendingRole) {
                        DevMode.proceedWithRoleSwitch(this.pendingRole);
                    }
                }'''

new_verify = '''                if (data === true) {
                    sessionStorage.setItem('society_organizer_verified', 'true');
                    this.hidePinModal();

                    // Handle DevMode role switch
                    if (this.pendingRole) {
                        DevMode.proceedWithRoleSwitch(this.pendingRole);
                        this.pendingRole = null;
                    }

                    // Handle normal login redirect to dashboard
                    if (this.pendingDashboard) {
                        console.log('[SocietyAuth] PIN verified - redirecting to:', this.pendingDashboard);
                        ScreenManager.showScreen(this.pendingDashboard);
                        this.pendingDashboard = null;

                        // Show welcome message
                        const userName = AppState.currentUser?.name || AppState.currentUser?.displayName || 'User';
                        NotificationManager.show(`Welcome back, ${userName}!`, 'success');

                        // Update UI with user data
                        if (typeof UserInterface !== 'undefined' && UserInterface.updateUserDisplays) {
                            UserInterface.updateUserDisplays();
                        }
                    }
                }'''

if old_verify in content:
    content = content.replace(old_verify, new_verify)
    print("Updated verifyPin to handle dashboard redirect")
else:
    print("Could not find verifyPin success handler")
    exit(1)

# Initialize pendingDashboard in SocietyOrganizerAuth
old_auth_init = '''    const SocietyOrganizerAuth = {
        pendingRole: null,'''

new_auth_init = '''    const SocietyOrganizerAuth = {
        pendingRole: null,
        pendingDashboard: null,'''

if old_auth_init in content:
    content = content.replace(old_auth_init, new_auth_init)
    print("Added pendingDashboard to SocietyOrganizerAuth")
else:
    print("Could not find SocietyOrganizerAuth initialization")
    exit(1)

# Update cancelPinEntry to clear pendingDashboard as well
old_cancel = '''        cancelPinEntry() {
            this.pendingRole = null;
            this.hidePinModal();
        },'''

new_cancel = '''        cancelPinEntry() {
            this.pendingRole = null;
            this.pendingDashboard = null;
            this.hidePinModal();

            // If user cancels PIN during login, redirect to golfer dashboard instead
            if (AppState.currentUser?.role === 'society_organizer') {
                console.log('[SocietyAuth] PIN entry cancelled - redirecting to golfer dashboard');
                NotificationManager.show('Society Organizer access requires PIN. Redirecting to Golfer dashboard.', 'warning');
                ScreenManager.showScreen('golferDashboard');
            }
        },'''

if old_cancel in content:
    content = content.replace(old_cancel, new_cancel)
    print("Updated cancelPinEntry to handle cancelled login")
else:
    print("Could not find cancelPinEntry function")
    exit(1)

# Write the updated content
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("\n" + "="*60)
print("PIN PROTECTION ADDED TO SOCIETY ORGANIZER LOGIN")
print("="*60)
print("\nHow it works:")
print("1. User creates profile with 'Society Organizer' role")
print("2. User logs in with LINE")
print("3. System checks: 'Does this organizer have a PIN set?'")
print("4. If YES → Show PIN modal, require correct PIN to access dashboard")
print("5. If NO → Allow access (they're the first/original organizer)")
print("\nFirst organizer should:")
print("- Login → Create profile → Access dashboard")
print("- Go to Admin tab → Set PIN")
print("- Now dashboard is protected for all future logins")
print("\nSecurity:")
print("- Each society has its own PIN (tied to organizer's LINE ID)")
print("- PIN verification required for EVERY new login session")
print("- Session-based (cleared when browser closes)")
print("="*60)
