#!/usr/bin/env python3
"""
Integrates Society Organizer PIN Authentication into index.html
"""

# Read the source file with PIN auth code
with open('society-organizer-pin-auth.html', 'r', encoding='utf-8') as f:
    pin_auth_content = f.read()

# Extract HTML modal (lines between HTML comments)
html_start = pin_auth_content.find('<!-- Society Organizer PIN Verification Modal -->')
html_end = pin_auth_content.find('<!-- ========================================\n     JAVASCRIPT:')
html_modal = pin_auth_content[html_start:html_end].strip()

# Extract JavaScript code
js_start = pin_auth_content.find('<script>')
js_end = pin_auth_content.find('</script>') + len('</script>')
js_code = pin_auth_content[js_start:js_end].strip()

# Read index.html
with open('index.html', 'r', encoding='utf-8') as f:
    index_content = f.read()

# Find insertion point for HTML modal (before "<!-- Add Score Modal -->")
html_insert_marker = '    <!-- Add Score Modal -->'
html_insert_pos = index_content.find(html_insert_marker)

if html_insert_pos == -1:
    print("ERROR: Could not find HTML insertion marker")
    exit(1)

# Insert HTML modal
new_content = (
    index_content[:html_insert_pos] +
    '\n    ' + html_modal + '\n\n' +
    index_content[html_insert_pos:]
)

# Find insertion point for JavaScript (after window.SocietyOrganizerSystem)
js_insert_marker = 'window.SocietyOrganizerSystem = new SocietyOrganizerManager();'
js_insert_pos = new_content.find(js_insert_marker)

if js_insert_pos == -1:
    print("ERROR: Could not find JavaScript insertion marker")
    exit(1)

# Move to end of line
js_insert_pos = new_content.find('\n', js_insert_pos) + 1

# Insert JavaScript code
final_content = (
    new_content[:js_insert_pos] +
    '\n    ' + js_code + '\n' +
    new_content[js_insert_pos:]
)

# Write back to index.html
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(final_content)

print("SUCCESS: PIN Authentication integrated into index.html")
print("- HTML modal added at line ~25287")
print("- JavaScript code added after SocietyOrganizerSystem")
print("\nNext steps:")
print("1. Run SQL migration: sql/society-organizer-pin-auth.sql")
print("2. Test the PIN authentication")
print("3. Change default PIN from 1234 to something secure")
