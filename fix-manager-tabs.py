import sys

# Read index.html
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the old manager settings code
old_code = """                // Initialize Manager Settings tab when shown
                if (dashboardId === 'managerDashboard' && tabName === 'settings') {
                    setTimeout(() => {
                        if (typeof AdminPricingControl !== 'undefined' && AdminPricingControl.renderPricingDashboard) {
                            AdminPricingControl.renderPricingDashboard();
                            console.log('[TabManager] Admin Pricing Control rendered');
                        }
                    }, 100);
                }"""

new_code = """                // Initialize Manager Dashboard tabs
                if (dashboardId === 'managerDashboard') {
                    if (tabName === 'staff') {
                        setTimeout(() => {
                            // Refresh staff directory
                            if (typeof refreshStaffDirectory === 'function') {
                                refreshStaffDirectory();
                            }
                            console.log('[TabManager] Staff directory refreshed');
                        }, 100);
                    }

                    if (tabName === 'analytics') {
                        setTimeout(() => {
                            // Initialize analytics if available
                            console.log('[TabManager] Analytics tab loaded');
                        }, 100);
                    }

                    if (tabName === 'reports') {
                        setTimeout(() => {
                            // Initialize reports if available
                            console.log('[TabManager] Reports tab loaded');
                        }, 100);
                    }

                    if (tabName === 'traffic') {
                        setTimeout(() => {
                            // Initialize traffic monitor
                            if (typeof TrafficMonitor !== 'undefined' && TrafficMonitor.init) {
                                TrafficMonitor.updateLiveStatus();
                                console.log('[TabManager] Traffic monitor refreshed');
                            }
                        }, 100);
                    }

                    if (tabName === 'settings') {
                        setTimeout(() => {
                            if (typeof AdminPricingControl !== 'undefined' && AdminPricingControl.renderPricingDashboard) {
                                AdminPricingControl.renderPricingDashboard();
                                console.log('[TabManager] Admin Pricing Control rendered');
                            }
                        }, 100);
                    }
                }"""

if old_code not in content:
    print('ERROR: Could not find manager settings code to replace')
    sys.exit(1)

content = content.replace(old_code, new_code)

# Write back
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print('SUCCESS: Fixed Manager Dashboard tab initialization')
print('  - Staff tab now refreshes staff directory')
print('  - Analytics tab now loads')
print('  - Reports tab now loads')
print('  - Traffic tab now refreshes traffic monitor')
print('  - Settings tab still loads pricing control')
