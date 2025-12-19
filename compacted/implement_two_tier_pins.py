#!/usr/bin/env python3
"""Implement two-tier PIN system (Super Admin PIN + Staff PIN)"""

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update the PIN setup UI to show two separate PIN sections
old_pin_setup = '''                            <!-- PIN Setup Form (Hidden by default) -->
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
                                                <p>• This PIN protects the entire Society Organizer dashboard</p>
                                                <p>• Only Super Admin can change this PIN</p>
                                                <p>• All users (including regular admins) must enter this PIN to access</p>
                                            </div>
                                        </div>
                                    </div>'''

new_pin_setup = '''                            <!-- PIN Setup Form (Hidden by default) -->
                            <div id="pinSetupForm" style="display: none;">
                                <div class="space-y-6">
                                    <!-- Super Admin PIN Section -->
                                    <div class="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4 border-2 border-purple-300">
                                        <div class="flex items-center gap-2 mb-3">
                                            <span class="material-symbols-outlined text-purple-600">admin_panel_settings</span>
                                            <h4 class="font-bold text-gray-900">Super Admin PIN (Your Personal PIN)</h4>
                                        </div>
                                        <div class="space-y-3">
                                            <div>
                                                <label class="block text-sm font-medium text-gray-700 mb-2">Super Admin PIN</label>
                                                <input type="password" id="superAdminPin"
                                                       placeholder="Enter 4-6 digit PIN"
                                                       maxlength="6"
                                                       class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-center text-2xl tracking-widest">
                                                <p class="text-xs text-gray-600 mt-1">Full access - Event management, user management, PIN settings</p>
                                            </div>
                                            <div>
                                                <label class="block text-sm font-medium text-gray-700 mb-2">Confirm Super Admin PIN</label>
                                                <input type="password" id="confirmSuperAdminPin"
                                                       placeholder="Re-enter PIN"
                                                       maxlength="6"
                                                       class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-center text-2xl tracking-widest">
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Staff PIN Section -->
                                    <div class="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 border-2 border-blue-300">
                                        <div class="flex items-center gap-2 mb-3">
                                            <span class="material-symbols-outlined text-blue-600">badge</span>
                                            <h4 class="font-bold text-gray-900">Staff/Admin PIN (Share with Team)</h4>
                                        </div>
                                        <div class="space-y-3">
                                            <div>
                                                <label class="block text-sm font-medium text-gray-700 mb-2">Staff PIN</label>
                                                <input type="password" id="staffPin"
                                                       placeholder="Enter 4-6 digit PIN"
                                                       maxlength="6"
                                                       class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-2xl tracking-widest">
                                                <p class="text-xs text-gray-600 mt-1">Limited access - Event management, roster management (cannot change PINs)</p>
                                            </div>
                                            <div>
                                                <label class="block text-sm font-medium text-gray-700 mb-2">Confirm Staff PIN</label>
                                                <input type="password" id="confirmStaffPin"
                                                       placeholder="Re-enter PIN"
                                                       maxlength="6"
                                                       class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-2xl tracking-widest">
                                            </div>
                                        </div>
                                    </div>

                                    <div class="bg-amber-50 rounded-lg p-4">
                                        <div class="flex items-start space-x-2">
                                            <span class="material-symbols-outlined text-amber-600 text-sm">info</span>
                                            <div class="text-xs text-amber-800">
                                                <p class="font-medium mb-1">Two-Tier Security:</p>
                                                <p>• <strong>Super Admin PIN</strong>: Keep this private - full control including PIN management</p>
                                                <p>• <strong>Staff PIN</strong>: Share with trusted team members - limited access</p>
                                                <p>• You can set one or both PINs (leave blank to skip)</p>
                                            </div>
                                        </div>
                                    </div>'''

if old_pin_setup in content:
    content = content.replace(old_pin_setup, new_pin_setup)
    print("Updated PIN setup UI to show two-tier PIN fields")
else:
    print("Could not find PIN setup form")
    exit(1)

# Write the updated content
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("\n" + "="*60)
print("TWO-TIER PIN SYSTEM UI UPDATED")
print("="*60)
print("\nChanges:")
print("1. PIN setup now shows TWO sections:")
print("   - Super Admin PIN (purple) - Full access")
print("   - Staff PIN (blue) - Limited access")
print("\nNext steps:")
print("1. Run the SQL migration: sql/upgrade-two-tier-pin-system.sql")
print("2. Update JavaScript saveDashboardPin() function")
print("3. Update JavaScript verifyPin() function")
print("4. Update Admin tab UI based on user role")
print("="*60)
