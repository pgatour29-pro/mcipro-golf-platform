#!/usr/bin/env python3
"""
Adds Admin tab with PIN management to Society Organizer Dashboard
"""

# Admin tab button HTML
ADMIN_TAB_BUTTON = '''                    <button onclick="showOrganizerTab('admin')" id="organizer-admin-tab" class="organizer-tab-button px-4 md:px-6 py-3 text-sm font-medium text-gray-600 hover:text-gray-900">
                        <span class="material-symbols-outlined text-sm mr-1">admin_panel_settings</span>
                        Admin
                    </button>'''

# Admin tab content HTML
ADMIN_TAB_CONTENT = '''
            <!-- Tab: Admin -->
            <div id="organizerTab-admin" class="organizer-tab-content" style="display: none;">
                <div class="max-w-2xl">
                    <h2 class="text-2xl font-bold text-gray-900 mb-2">Admin Settings</h2>
                    <p class="text-sm text-gray-600 mb-6">Manage your dashboard security and access settings.</p>

                    <!-- PIN Security Section -->
                    <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
                        <div class="flex items-center space-x-3 mb-4">
                            <div class="bg-sky-100 rounded-full p-2">
                                <span class="material-symbols-outlined text-sky-600">lock</span>
                            </div>
                            <div>
                                <h3 class="text-lg font-bold text-gray-900">Dashboard PIN</h3>
                                <p class="text-sm text-gray-600">Secure your society organizer dashboard with a PIN</p>
                            </div>
                        </div>

                        <!-- PIN Status -->
                        <div id="pinStatusSection" class="mb-6">
                            <div class="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
                                <div class="flex items-center space-x-3">
                                    <span id="pinStatusIcon" class="material-symbols-outlined text-2xl text-gray-400">lock_open</span>
                                    <div>
                                        <p id="pinStatusText" class="text-sm font-medium text-gray-900">No PIN Set</p>
                                        <p class="text-xs text-gray-500">Anyone can access your organizer dashboard</p>
                                    </div>
                                </div>
                                <button id="setPinButton" onclick="SocietyOrganizerSystem.showPinSetup()" class="btn-primary text-sm">
                                    <span class="material-symbols-outlined text-sm">add</span>
                                    Set PIN
                                </button>
                            </div>
                        </div>

                        <!-- PIN Setup Form (Hidden by default) -->
                        <div id="pinSetupForm" style="display: none;">
                            <div class="space-y-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">New PIN</label>
                                    <input type="password" id="newPin"
                                           placeholder="Enter 4-6 digit PIN"
                                           maxlength="6"
                                           class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-center text-2xl tracking-widest">
                                    <p class="text-xs text-gray-500 mt-1">Use 4-6 digits for your PIN</p>
                                </div>

                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Confirm PIN</label>
                                    <input type="password" id="confirmPin"
                                           placeholder="Re-enter PIN"
                                           maxlength="6"
                                           class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-center text-2xl tracking-widest">
                                </div>

                                <div class="bg-amber-50 rounded-lg p-4">
                                    <div class="flex items-start space-x-2">
                                        <span class="material-symbols-outlined text-amber-600 text-sm">warning</span>
                                        <div class="text-xs text-amber-800">
                                            <p class="font-medium mb-1">Important:</p>
                                            <p>• Remember this PIN - you'll need it to access this dashboard</p>
                                            <p>• Don't share your PIN with anyone</p>
                                            <p>• You can change it anytime from this Admin tab</p>
                                        </div>
                                    </div>
                                </div>

                                <div class="flex space-x-3">
                                    <button onclick="SocietyOrganizerSystem.cancelPinSetup()" class="flex-1 btn-secondary">
                                        Cancel
                                    </button>
                                    <button onclick="SocietyOrganizerSystem.saveDashboardPin()" class="flex-1 btn-primary">
                                        <span class="material-symbols-outlined text-sm">save</span>
                                        Save PIN
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- Change PIN Section (shown when PIN exists) -->
                        <div id="changePinSection" style="display: none;">
                            <button onclick="SocietyOrganizerSystem.showChangePinForm()" class="btn-secondary text-sm w-full">
                                <span class="material-symbols-outlined text-sm">edit</span>
                                Change PIN
                            </button>
                        </div>
                    </div>

                    <!-- Other Admin Settings (for future expansion) -->
                    <div class="bg-white rounded-xl shadow-lg p-6">
                        <h3 class="text-lg font-bold text-gray-900 mb-4">Dashboard Access</h3>
                        <div class="space-y-3">
                            <div class="flex items-center justify-between py-3 border-b">
                                <div>
                                    <p class="text-sm font-medium text-gray-900">Organizer ID</p>
                                    <p id="adminOrganizerId" class="text-xs text-gray-500">Loading...</p>
                                </div>
                            </div>
                            <div class="flex items-center justify-between py-3">
                                <div>
                                    <p class="text-sm font-medium text-gray-900">Last Login</p>
                                    <p class="text-xs text-gray-500">Current session</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>'''

# Updated PIN verification JavaScript
UPDATED_PIN_AUTH_JS = '''
    // ===== SOCIETY ORGANIZER PIN AUTHENTICATION (Per-Organizer) =====
    const SocietyOrganizerAuth = {
        pendingRole: null,

        isVerified() {
            return sessionStorage.getItem('society_organizer_verified') === 'true';
        },

        async checkIfPinRequired() {
            const userId = AppState.currentUser?.lineUserId;
            if (!userId) return false;

            try {
                const { data, error } = await window.SupabaseDB.client
                    .rpc('organizer_has_pin', { org_id: userId });

                if (error) {
                    console.error('[SocietyAuth] Error checking PIN:', error);
                    return false;
                }

                return data === true;
            } catch (error) {
                console.error('[SocietyAuth] Exception checking PIN:', error);
                return false;
            }
        },

        async showPinModal(targetRole) {
            this.pendingRole = targetRole;
            document.getElementById('societyOrganizerPinModal').style.display = 'flex';
            document.getElementById('societyOrganizerPinInput').value = '';
            document.getElementById('pinErrorMessage').classList.add('hidden');
            setTimeout(() => {
                document.getElementById('societyOrganizerPinInput').focus();
            }, 100);
        },

        hidePinModal() {
            document.getElementById('societyOrganizerPinModal').style.display = 'none';
            document.getElementById('societyOrganizerPinInput').value = '';
            document.getElementById('pinErrorMessage').classList.add('hidden');
        },

        async verifyPin() {
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
                    if (this.pendingRole) {
                        DevMode.proceedWithRoleSwitch(this.pendingRole);
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

        cancelPinEntry() {
            this.pendingRole = null;
            this.hidePinModal();
        },

        showError(message) {
            const errorEl = document.getElementById('pinErrorMessage');
            errorEl.textContent = message;
            errorEl.classList.remove('hidden');
        },

        clearVerification() {
            sessionStorage.removeItem('society_organizer_verified');
        }
    };

    // Override DevMode.switchToRole to check PIN for society_organizer
    if (typeof DevMode !== 'undefined') {
        DevMode.originalSwitchToRole = DevMode.switchToRole;

        DevMode.switchToRole = async function(role) {
            if (role === 'society_organizer') {
                if (SocietyOrganizerAuth.isVerified()) {
                    this.proceedWithRoleSwitch(role);
                } else {
                    // Check if this organizer has a PIN set
                    const hasPinSet = await SocietyOrganizerAuth.checkIfPinRequired();
                    if (hasPinSet) {
                        SocietyOrganizerAuth.showPinModal(role);
                    } else {
                        // No PIN set, allow direct access
                        this.proceedWithRoleSwitch(role);
                    }
                }
            } else {
                this.proceedWithRoleSwitch(role);
            }
        };

        DevMode.proceedWithRoleSwitch = function(role) {
            if (AppState.currentUser) {
                AppState.currentUser.role = role;
                const profiles = JSON.parse(localStorage.getItem('mcipro_user_profiles') || '[]');
                const myProfile = profiles.find(p => p.lineUserId === AppState.currentUser.lineUserId);
                if (myProfile) {
                    myProfile.role = role;
                    localStorage.setItem('mcipro_user_profiles', JSON.stringify(profiles));
                }
            }

            const dashboardMap = {
                'golfer': 'golferDashboard',
                'caddie': 'caddieDashboard',
                'manager': 'managerDashboard',
                'proshop': 'proshopDashboard',
                'admin': 'adminDashboard',
                'society_organizer': 'societyOrganizerDashboard'
            };

            const targetScreen = dashboardMap[role];
            if (targetScreen) {
                showScreen(targetScreen);
                this.showNotification(`Switched to ${role.toUpperCase()} dashboard`, 'success');
            }
            this.hide();
        };
    }

    console.log('[SocietyAuth] PIN Authentication System loaded (Per-Organizer)');'''

print("Reading index.html...")
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add Admin tab button after Profile tab button
print("Adding Admin tab button...")
profile_button = '''                    <button onclick="showOrganizerTab('profile')" id="organizer-profile-tab" class="organizer-tab-button px-4 md:px-6 py-3 text-sm font-medium text-gray-600 hover:text-gray-900">
                        <span class="material-symbols-outlined text-sm mr-1">badge</span>
                        Profile
                    </button>'''

if profile_button in content:
    content = content.replace(profile_button, profile_button + '\n' + ADMIN_TAB_BUTTON)
    print("[OK] Admin tab button added")
else:
    print("[ERROR] Could not find Profile tab button")
    exit(1)

# 2. Add Admin tab content before </main> in Society Organizer Dashboard
print("Adding Admin tab content...")
profile_tab_end = '''            </div>
        </main>
    </div>

    <!-- Roster Modal -->'''

if profile_tab_end in content:
    content = content.replace(profile_tab_end, ADMIN_TAB_CONTENT + '\n' + profile_tab_end)
    print("[OK] Admin tab content added")
else:
    print("[ERROR] Could not find Profile tab end marker")
    exit(1)

# 3. Replace the old PIN auth JavaScript with the new per-organizer version
print("Updating PIN authentication JavaScript...")
old_js_marker = "    // ===== SOCIETY ORGANIZER PIN AUTHENTICATION ====="
new_js_marker = "    // ===== SOCIETY ORGANIZER PIN AUTHENTICATION (Per-Organizer) ====="

if old_js_marker in content:
    # Find and replace the entire old auth section
    start_idx = content.find(old_js_marker)
    end_marker = "    console.log('[SocietyAuth] PIN Authentication System loaded');"
    end_idx = content.find(end_marker, start_idx) + len(end_marker)

    content = content[:start_idx] + UPDATED_PIN_AUTH_JS + content[end_idx:]
    print("[OK] PIN authentication JavaScript updated")
else:
    print("[ERROR] Could not find old PIN auth JavaScript")
    exit(1)

# Write the updated content
print("Writing updated file...")
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("")
print("="*60)
print("SUCCESS: Admin tab with PIN management added")
print("="*60)
print("")
print("Changes made:")
print("1. Added 'Admin' tab to Society Organizer Dashboard")
print("2. Added PIN setup/change UI in Admin tab")
print("3. Updated PIN auth to be per-organizer (not global)")
print("")
print("Next steps:")
print("1. Add PIN management methods to SocietyOrganizerSystem class")
print("2. Run new SQL migration (society-organizer-pin-auth-per-organizer.sql)")
print("3. Deploy with: netlify deploy --prod")
