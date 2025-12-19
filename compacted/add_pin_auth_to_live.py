#!/usr/bin/env python3
"""
Adds Society Organizer PIN Authentication to the live mycaddipro.com site
"""

# PIN Modal HTML
PIN_MODAL_HTML = '''
    <!-- Society Organizer PIN Verification Modal -->
    <div id="societyOrganizerPinModal" class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" style="display: none;">
        <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4">
            <div class="p-6 border-b border-gray-200">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-3">
                        <div class="bg-sky-100 rounded-full p-2">
                            <span class="material-symbols-outlined text-sky-600">lock</span>
                        </div>
                        <div>
                            <h3 class="text-xl font-bold text-gray-900">Society Organizer Access</h3>
                            <p class="text-sm text-gray-500">Enter PIN to continue</p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="p-6 space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Access PIN</label>
                    <input type="password" id="societyOrganizerPinInput"
                           placeholder="Enter PIN"
                           maxlength="6"
                           class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-center text-2xl tracking-widest"
                           onkeypress="if(event.key === 'Enter') SocietyOrganizerAuth.verifyPin()">
                    <p id="pinErrorMessage" class="text-red-500 text-sm mt-2 hidden">Incorrect PIN. Please try again.</p>
                </div>

                <div class="bg-sky-50 rounded-lg p-4">
                    <div class="flex items-start space-x-2">
                        <span class="material-symbols-outlined text-sky-600 text-sm">info</span>
                        <p class="text-xs text-sky-800">
                            This area is restricted to authorized society organizers only.
                            Contact your administrator if you need access.
                        </p>
                    </div>
                </div>
            </div>

            <div class="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
                <button onclick="SocietyOrganizerAuth.cancelPinEntry()" class="px-6 py-3 text-gray-700 bg-gray-200 rounded-xl font-semibold hover:bg-gray-300 transition-colors">
                    Cancel
                </button>
                <button onclick="SocietyOrganizerAuth.verifyPin()" class="px-6 py-3 bg-sky-600 text-white rounded-xl font-semibold hover:bg-sky-700 transition-colors">
                    Verify
                </button>
            </div>
        </div>
    </div>
'''

# PIN Authentication JavaScript
PIN_AUTH_JS = '''
    // ===== SOCIETY ORGANIZER PIN AUTHENTICATION =====
    const SocietyOrganizerAuth = {
        pendingRole: null,

        isVerified() {
            return sessionStorage.getItem('society_organizer_verified') === 'true';
        },

        showPinModal(targetRole) {
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

            if (!inputPin || inputPin.trim() === '') {
                this.showError('Please enter a PIN');
                return;
            }

            try {
                const { data, error } = await window.SupabaseDB.client
                    .rpc('verify_society_organizer_pin', { input_pin: inputPin });

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

        DevMode.switchToRole = function(role) {
            if (role === 'society_organizer') {
                if (SocietyOrganizerAuth.isVerified()) {
                    this.proceedWithRoleSwitch(role);
                } else {
                    SocietyOrganizerAuth.showPinModal(role);
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

    console.log('[SocietyAuth] PIN Authentication System loaded');
'''

# Read the live site file
print("Reading mycaddipro-live.html...")
with open('mycaddipro-live.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add PIN modal before "<!-- Add Score Modal -->"
print("Adding PIN modal...")
html_marker = '    <!-- Add Score Modal -->'
if html_marker in content:
    content = content.replace(html_marker, PIN_MODAL_HTML + '\n' + html_marker)
    print("[OK] PIN modal added")
else:
    print("[ERROR] Could not find marker for PIN modal")
    exit(1)

# 2. Add PIN auth JavaScript after "window.SocietyOrganizerSystem = new SocietyOrganizerManager();"
print("Adding PIN authentication JavaScript...")
js_marker = 'window.SocietyOrganizerSystem = new SocietyOrganizerManager();'
if js_marker in content:
    content = content.replace(js_marker, js_marker + '\n' + PIN_AUTH_JS)
    print("[OK] PIN authentication JavaScript added")
else:
    print("[ERROR] Could not find marker for JavaScript")
    exit(1)

# Write the modified content
print("Writing modified file...")
with open('mycaddipro-live.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("")
print("="*60)
print("SUCCESS: PIN Authentication added to mycaddipro-live.html")
print("="*60)
print("")
print("Next steps:")
print("1. Run SQL migration in Supabase (sql/society-organizer-pin-auth.sql)")
print("2. Copy mycaddipro-live.html to index.html")
print("3. Deploy with: netlify deploy --prod")
print("4. Test with PIN: 1234")
print("5. Change default PIN in database!")
