import sys

# Read index.html
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

old_code = """                    // Hide all tab content
                    const tabContents = document.querySelectorAll(`#${dashboardId} .tab-content`);
                    tabContents.forEach(content => {
                        content.classList.remove('active');
                    });

                    // Show target tab content
                    const targetContent = document.getElementById(`${dashboardId.replace('Dashboard', '')}-${tabName}`);
                    if (targetContent) {
                        targetContent.classList.add('active');
                        AppState.navigation.activeTab = tabName;"""

new_code = """                    // Hide all tab content
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

if old_code not in content:
    print('ERROR: Could not find tab visibility code')
    sys.exit(1)

content = content.replace(old_code, new_code)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print('SUCCESS: Fixed tab visibility - tabs will now properly hide/show')
print('  - Adds hidden class when hiding tabs')
print('  - Removes hidden class when showing tabs')
