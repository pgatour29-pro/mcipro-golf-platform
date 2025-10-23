#!/usr/bin/env python3
"""
Fix Society Selector Modal - Remove duplicates and fix DevMode override timing
The DevMode.switchToRole override was added BEFORE DevMode was defined, causing it to fail
"""

def fix_society_selector():
    file_path = 'index.html'

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Remove the duplicate DevMode override blocks
    # They appear at lines ~28318 and ~28558
    duplicate_code = """        // Modify DevMode.switchToRole to show society selector when switching to society_organizer
        const originalSwitchToRole = DevMode.switchToRole.bind(DevMode);
        DevMode.switchToRole = async function(role) {
            if (role === 'society_organizer') {
                // Load societies and show selector modal
                await SocietySelectorSystem.init();
                SocietySelectorSystem.openModal();
            } else {
                // Use original function for other roles
                originalSwitchToRole(role);
            }
        };"""

    # Remove both occurrences
    content = content.replace(duplicate_code, '')

    # Now modify DevMode.switchToRole directly to show modal for society_organizer
    old_switch_function = """    switchToRole(role) {

        // Update current user role
        if (AppState.currentUser) {
            AppState.currentUser.role = role;

            // Save to localStorage
            const profiles = JSON.parse(localStorage.getItem('mcipro_user_profiles') || '[]');
            const myProfile = profiles.find(p => p.lineUserId === AppState.currentUser.lineUserId);
            if (myProfile) {
                myProfile.role = role;
                localStorage.setItem('mcipro_user_profiles', JSON.stringify(profiles));
            }

            // Show appropriate dashboard
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
        }
    },"""

    new_switch_function = """    async switchToRole(role) {

        // Special handling for society_organizer - show Netflix modal
        if (role === 'society_organizer') {
            // Load societies and show selector modal
            if (window.SocietySelectorSystem) {
                await window.SocietySelectorSystem.init();
                window.SocietySelectorSystem.openModal();
            } else {
                console.error('[DevMode] SocietySelectorSystem not found');
            }
            return;
        }

        // Update current user role
        if (AppState.currentUser) {
            AppState.currentUser.role = role;

            // Save to localStorage
            const profiles = JSON.parse(localStorage.getItem('mcipro_user_profiles') || '[]');
            const myProfile = profiles.find(p => p.lineUserId === AppState.currentUser.lineUserId);
            if (myProfile) {
                myProfile.role = role;
                localStorage.setItem('mcipro_user_profiles', JSON.stringify(profiles));
            }

            // Show appropriate dashboard
            const dashboardMap = {
                'golfer': 'golferDashboard',
                'caddie': 'caddieDashboard',
                'manager': 'managerDashboard',
                'proshop': 'proshopDashboard',
                'admin': 'adminDashboard'
            };

            const targetScreen = dashboardMap[role];
            if (targetScreen) {
                showScreen(targetScreen);
                this.showNotification(`Switched to ${role.toUpperCase()} dashboard`, 'success');
            }
        }
    },"""

    content = content.replace(old_switch_function, new_switch_function)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

    print("SUCCESS: Society selector timing fixed!")
    print("Changes:")
    print("  - Removed duplicate DevMode override code (2 instances)")
    print("  - Modified DevMode.switchToRole to show Netflix modal for society_organizer")
    print("  - Modal now appears AFTER DevMode is defined")
    print("")
    print("Now when you click Society Organizer in Dev Mode:")
    print("  1. Netflix modal appears with all societies")
    print("  2. Click a society card to enter their dashboard")

if __name__ == '__main__':
    fix_society_selector()
