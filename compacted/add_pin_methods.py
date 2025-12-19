#!/usr/bin/env python3
"""
Adds PIN management methods to SocietyOrganizerManager class
"""

PIN_METHODS = '''
    // ===== PIN MANAGEMENT METHODS =====

    async loadPinStatus() {
        const userId = AppState.currentUser?.lineUserId;
        if (!userId) return;

        try {
            const { data, error } = await window.SupabaseDB.client
                .rpc('organizer_has_pin', { org_id: userId });

            if (error) {
                console.error('[SocietyOrganizer] Error checking PIN status:', error);
                return;
            }

            const hasPinSet = data === true;
            const statusIcon = document.getElementById('pinStatusIcon');
            const statusText = document.getElementById('pinStatusText');
            const setPinButton = document.getElementById('setPinButton');
            const changePinSection = document.getElementById('changePinSection');

            if (hasPinSet) {
                statusIcon.textContent = 'lock';
                statusIcon.className = 'material-symbols-outlined text-2xl text-green-600';
                statusText.textContent = 'PIN Enabled';
                statusText.nextElementSibling.textContent = 'Your dashboard is protected';
                setPinButton.style.display = 'none';
                changePinSection.style.display = 'block';
            } else {
                statusIcon.textContent = 'lock_open';
                statusIcon.className = 'material-symbols-outlined text-2xl text-gray-400';
                statusText.textContent = 'No PIN Set';
                statusText.nextElementSibling.textContent = 'Anyone can access your organizer dashboard';
                setPinButton.style.display = 'inline-flex';
                changePinSection.style.display = 'none';
            }

            // Set organizer ID display
            document.getElementById('adminOrganizerId').textContent = userId;
        } catch (error) {
            console.error('[SocietyOrganizer] Exception checking PIN status:', error);
        }
    }

    showPinSetup() {
        document.getElementById('pinStatusSection').style.display = 'none';
        document.getElementById('pinSetupForm').style.display = 'block';
        document.getElementById('newPin').focus();
    }

    showChangePinForm() {
        document.getElementById('changePinSection').style.display = 'none';
        document.getElementById('pinSetupForm').style.display = 'block';
        document.getElementById('newPin').focus();
    }

    cancelPinSetup() {
        document.getElementById('pinStatusSection').style.display = 'block';
        document.getElementById('pinSetupForm').style.display = 'none';
        document.getElementById('changePinSection').style.display = 'block';
        document.getElementById('newPin').value = '';
        document.getElementById('confirmPin').value = '';
    }

    async saveDashboardPin() {
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

            // Reload PIN status
            await this.loadPinStatus();

            // Clear session verification so they need to re-enter on next access
            sessionStorage.removeItem('society_organizer_verified');

        } catch (error) {
            console.error('[SocietyOrganizer] Exception saving PIN:', error);
            NotificationManager.show('Failed to save PIN', 'error');
        }
    }
'''

# Also need to call loadPinStatus when Admin tab is shown
INIT_PIN_UPDATE = '''
// Update showOrganizerTab to load PIN status when Admin tab is shown
const originalShowOrganizerTab = showOrganizerTab;
showOrganizerTab = function(tabName) {
    originalShowOrganizerTab(tabName);

    // Load PIN status when Admin tab is shown
    if (tabName === 'admin' && window.SocietyOrganizerSystem) {
        setTimeout(() => {
            window.SocietyOrganizerSystem.loadPinStatus();
        }, 100);
    }
};
'''

print("Reading index.html...")
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add PIN management methods before cleanup() method
print("Adding PIN management methods...")
marker = '''    cleanup() {
        SocietyGolfDB.unsubscribeAll();
    }
}'''

if marker in content:
    content = content.replace(marker, PIN_METHODS + '\n' + marker)
    print("[OK] PIN management methods added")
else:
    print("[ERROR] Could not find cleanup() method marker")
    exit(1)

# 2. Add init code after showOrganizerTab function
print("Adding PIN status initialization code...")
tab_function_marker = '''function showOrganizerTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.organizer-tab-content').forEach(tab => {
        tab.style.display = 'none';
    });

    // Remove active class from buttons
    document.querySelectorAll('.organizer-tab-button').forEach(btn => {
        btn.classList.remove('active', 'border-b-2', 'border-sky-600', 'text-sky-600');
        btn.classList.add('text-gray-600');
    });

    // Show selected tab
    document.getElementById(`organizerTab-${tabName}`).style.display = 'block';

    // Add active class to button
    const activeBtn = document.getElementById(`organizer-${tabName}-tab`);
    activeBtn.classList.add('active', 'border-b-2', 'border-sky-600', 'text-sky-600');
    activeBtn.classList.remove('text-gray-600');
}'''

if tab_function_marker in content:
    content = content.replace(tab_function_marker, tab_function_marker + '\n\n' + INIT_PIN_UPDATE)
    print("[OK] PIN status initialization added")
else:
    print("[ERROR] Could not find showOrganizerTab function")
    exit(1)

# Write the updated content
print("Writing updated file...")
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("")
print("="*60)
print("SUCCESS: PIN management methods added")
print("="*60)
print("")
print("Changes made:")
print("1. Added loadPinStatus() method")
print("2. Added showPinSetup() method")
print("3. Added showChangePinForm() method")
print("4. Added cancelPinSetup() method")
print("5. Added saveDashboardPin() method")
print("6. Added auto-load of PIN status when Admin tab shown")
print("")
print("Ready to deploy!")
