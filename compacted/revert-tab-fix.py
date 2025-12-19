import sys

# Read index.html
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Revert to original working code - ONLY use active class
broken_code = """                    // Hide all tab content
                    const tabContents = document.querySelectorAll(`#${dashboardId} .tab-content`);
                    tabContents.forEach(content => {
                        content.classList.remove('active');
                        content.classList.add('hidden');
                    });

                    // Show target tab content
                    const targetContent = document.getElementById(`${dashboardId.replace('Dashboard', '')}-${tabName}`);
                    if (targetContent) {
                        targetContent.classList.add('active');
                        targetContent.classList.remove('hidden');
                        AppState.navigation.activeTab = tabName;"""

original_working_code = """                    // Hide all tab content
                    const tabContents = document.querySelectorAll(`#${dashboardId} .tab-content`);
                    tabContents.forEach(content => {
                        content.classList.remove('active');
                    });

                    // Show target tab content
                    const targetContent = document.getElementById(`${dashboardId.replace('Dashboard', '')}-${tabName}`);
                    if (targetContent) {
                        targetContent.classList.add('active');
                        AppState.navigation.activeTab = tabName;"""

if broken_code not in content:
    print('ERROR: Could not find broken tab code')
    sys.exit(1)

content = content.replace(broken_code, original_working_code)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print('SUCCESS: Reverted to original working tab code')
print('  - Removed hidden class manipulation (it does nothing)')
print('  - Only using active class (which controls display via CSS)')
