#!/usr/bin/env python3
"""Update JavaScript functions for two-tier PIN system"""

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update saveDashboardPin() to save both PINs
old_save_function = '''    async saveDashboardPin() {
        const newPin = document.getElementById('newPin').value;
        const confirmPin = document.getElementById('confirmPin').value;
        const userId = AppState.currentUser?.lineUserId;

        if (!userId) {
            NotificationManager.show('User not authenticated', 'error');
            return;
        }

        if (!newPin || newPin.length < 4) {
            NotificationManager.show('PIN must be at least 4 digits', 'error');
            return;
        }

        if (newPin !== confirmPin) {
            NotificationManager.show('PINs do not match', 'error');
            return;
        }

        // Validate PIN contains only numbers
        if (!/^\\d+$/.test(newPin)) {
            NotificationManager.show('PIN must contain only numbers', 'error');
            return;
        }

        try {
            const { data, error } = await window.SupabaseDB.client
                .rpc('set_organizer_pin', {
                    org_id: userId,
                    new_pin: newPin
                });

            if (error) {
                console.error('[SocietyOrganizer] Error setting PIN:', error);
                NotificationManager.show('Failed to save PIN', 'error');
                return;
            }

            NotificationManager.show('PIN saved successfully', 'success');

            // Clear form
            document.getElementById('newPin').value = '';
            document.getElementById('confirmPin').value = '';

            // Hide form and show status
            document.getElementById('pinSetupForm').style.display = 'none';
            document.getElementById('pinStatusSection').style.display = 'block';

            // Reload PIN status'''

new_save_function = '''    async saveDashboardPin() {
        const superAdminPin = document.getElementById('superAdminPin').value;
        const confirmSuperAdminPin = document.getElementById('confirmSuperAdminPin').value;
        const staffPin = document.getElementById('staffPin').value;
        const confirmStaffPin = document.getElementById('confirmStaffPin').value;
        const userId = AppState.currentUser?.lineUserId;

        if (!userId) {
            NotificationManager.show('User not authenticated', 'error');
            return;
        }

        // Validate Super Admin PIN if provided
        if (superAdminPin) {
            if (superAdminPin.length < 4) {
                NotificationManager.show('Super Admin PIN must be at least 4 digits', 'error');
                return;
            }
            if (superAdminPin !== confirmSuperAdminPin) {
                NotificationManager.show('Super Admin PINs do not match', 'error');
                return;
            }
            if (!/^\\d+$/.test(superAdminPin)) {
                NotificationManager.show('Super Admin PIN must contain only numbers', 'error');
                return;
            }
        }

        // Validate Staff PIN if provided
        if (staffPin) {
            if (staffPin.length < 4) {
                NotificationManager.show('Staff PIN must be at least 4 digits', 'error');
                return;
            }
            if (staffPin !== confirmStaffPin) {
                NotificationManager.show('Staff PINs do not match', 'error');
                return;
            }
            if (!/^\\d+$/.test(staffPin)) {
                NotificationManager.show('Staff PIN must contain only numbers', 'error');
                return;
            }
        }

        // At least one PIN must be provided
        if (!superAdminPin && !staffPin) {
            NotificationManager.show('Please set at least one PIN', 'error');
            return;
        }

        try {
            let successCount = 0;
            let errorOccurred = false;

            // Save Super Admin PIN
            if (superAdminPin) {
                const { error } = await window.SupabaseDB.client
                    .rpc('set_super_admin_pin', {
                        org_id: userId,
                        new_pin: superAdminPin
                    });

                if (error) {
                    console.error('[SocietyOrganizer] Error setting Super Admin PIN:', error);
                    NotificationManager.show('Failed to save Super Admin PIN', 'error');
                    errorOccurred = true;
                } else {
                    successCount++;
                }
            }

            // Save Staff PIN
            if (staffPin) {
                const { error } = await window.SupabaseDB.client
                    .rpc('set_staff_pin', {
                        org_id: userId,
                        new_pin: staffPin
                    });

                if (error) {
                    console.error('[SocietyOrganizer] Error setting Staff PIN:', error);
                    NotificationManager.show('Failed to save Staff PIN', 'error');
                    errorOccurred = true;
                } else {
                    successCount++;
                }
            }

            if (!errorOccurred && successCount > 0) {
                NotificationManager.show(`PIN(s) saved successfully (${successCount} PIN${successCount > 1 ? 's' : ''})`, 'success');

                // Clear form
                document.getElementById('superAdminPin').value = '';
                document.getElementById('confirmSuperAdminPin').value = '';
                document.getElementById('staffPin').value = '';
                document.getElementById('confirmStaffPin').value = '';

                // Hide form and show status
                document.getElementById('pinSetupForm').style.display = 'none';
                document.getElementById('pinStatusSection').style.display = 'block';

                // Reload PIN status'''

if old_save_function in content:
    content = content.replace(old_save_function, new_save_function)
    print("Updated saveDashboardPin() for two-tier PINs")
else:
    print("Could not find saveDashboardPin function")
    exit(1)

# 2. Update verifyPin() to check both PINs and set role
old_verify = '''        async verifyPin() {
            const inputPin = document.getElementById('societyOrganizerPinInput').value;
            const userId = AppState.currentUser?.lineUserId;

            if (!inputPin || inputPin.trim() === '') {
                this.showError('Please enter a PIN');
                return;
            }

            if (!userId) {
                this.showError('User not authenticated');
                return;
            }

            try {
                const { data, error } = await window.SupabaseDB.client
                    .rpc('verify_society_organizer_pin', {
                        org_id: userId,
                        input_pin: inputPin
                    });

                if (error) {
                    console.error('[SocietyAuth] Error verifying PIN:', error);
                    this.showError('Error verifying PIN. Please try again.');
                    return;
                }

                if (data === true) {
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
                } else {
                    this.showError('Incorrect PIN. Please try again.');
                    document.getElementById('societyOrganizerPinInput').value = '';
                    document.getElementById('societyOrganizerPinInput').focus();
                }
            } catch (error) {
                console.error('[SocietyAuth] Exception verifying PIN:', error);
                this.showError('Error verifying PIN. Please try again.');
            }
        },'''

new_verify = '''        async verifyPin() {
            const inputPin = document.getElementById('societyOrganizerPinInput').value;
            const userId = AppState.currentUser?.lineUserId;

            if (!inputPin || inputPin.trim() === '') {
                this.showError('Please enter a PIN');
                return;
            }

            if (!userId) {
                this.showError('User not authenticated');
                return;
            }

            try {
                const { data, error } = await window.SupabaseDB.client
                    .rpc('verify_society_organizer_pin', {
                        org_id: userId,
                        input_pin: inputPin
                    });

                if (error) {
                    console.error('[SocietyAuth] Error verifying PIN:', error);
                    this.showError('Error verifying PIN. Please try again.');
                    return;
                }

                // data will be 'super_admin', 'admin', or NULL
                if (data) {
                    const userRole = data; // 'super_admin' or 'admin'
                    console.log('[SocietyAuth] PIN verified - User role:', userRole);

                    // Store verification status and role
                    sessionStorage.setItem('society_organizer_verified', 'true');
                    sessionStorage.setItem('society_organizer_role', userRole);

                    // Update user role in society_organizer_roles table
                    await this.updateUserRole(userId, userRole);

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

                        // Show welcome message with role
                        const userName = AppState.currentUser?.name || AppState.currentUser?.displayName || 'User';
                        const roleDisplay = userRole === 'super_admin' ? 'Super Admin' : 'Admin';
                        NotificationManager.show(`Welcome back, ${userName}! (${roleDisplay})`, 'success');

                        // Update UI with user data
                        if (typeof UserInterface !== 'undefined' && UserInterface.updateUserDisplays) {
                            UserInterface.updateUserDisplays();
                        }

                        // Reload admin tab to show proper UI for role
                        if (typeof SocietyOrganizerSystem !== 'undefined') {
                            SocietyOrganizerSystem.updateAdminTabUI(userRole);
                        }
                    }
                } else {
                    this.showError('Incorrect PIN. Please try again.');
                    document.getElementById('societyOrganizerPinInput').value = '';
                    document.getElementById('societyOrganizerPinInput').focus();
                }
            } catch (error) {
                console.error('[SocietyAuth] Exception verifying PIN:', error);
                this.showError('Error verifying PIN. Please try again.');
            }
        },

        async updateUserRole(userId, role) {
            try {
                const { error } = await window.SupabaseDB.client
                    .from('society_organizer_roles')
                    .upsert({
                        user_id: userId,
                        organizer_id: userId,
                        role: role
                    });

                if (error) {
                    console.error('[SocietyAuth] Error updating user role:', error);
                }
            } catch (error) {
                console.error('[SocietyAuth] Exception updating user role:', error);
            }
        },'''

if old_verify in content:
    content = content.replace(old_verify, new_verify)
    print("Updated verifyPin() to handle two-tier roles")
else:
    print("Could not find verifyPin function")
    exit(1)

# Write the updated content
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("\n" + "="*60)
print("JAVASCRIPT FUNCTIONS UPDATED FOR TWO-TIER PIN SYSTEM")
print("="*60)
print("\nUpdated functions:")
print("1. saveDashboardPin() - Saves both Super Admin PIN and Staff PIN")
print("2. verifyPin() - Verifies PIN and assigns role (super_admin or admin)")
print("3. updateUserRole() - Updates user role in database based on PIN used")
print("\nHow it works:")
print("- User enters PIN at login")
print("- System checks if it matches Super Admin PIN -> assigns 'super_admin' role")
print("- OR checks if it matches Staff PIN -> assigns 'admin' role")
print("- Role determines what UI/features they can access")
print("="*60)
