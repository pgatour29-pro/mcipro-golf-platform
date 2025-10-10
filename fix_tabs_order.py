#!/usr/bin/env python3
"""
Fix tab order: Admin tab should be AFTER Profile tab
"""

print("Reading index.html...")
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Find Admin tab
admin_start_marker = '            <!-- Tab: Admin -->'
admin_start = content.find(admin_start_marker)

if admin_start == -1:
    print("[ERROR] Could not find Admin tab")
    exit(1)

# Find the end of Admin tab (look for closing </div> followed by another tab or </main>)
# Search for next tab or </main> after Admin tab starts
search_from = admin_start + len(admin_start_marker)
next_tab = content.find('            <!-- Tab:', search_from)
if next_tab == -1:
    # No next tab, look for </main>
    main_close = content.find('        </main>', search_from)
    if main_close == -1:
        print("[ERROR] Could not find end of Admin tab")
        exit(1)
    admin_end = main_close
else:
    admin_end = next_tab

# Extract admin tab HTML
admin_html = content[admin_start:admin_end]
print(f"[OK] Found Admin tab ({len(admin_html)} chars)")

# Remove admin tab from current location
content = content[:admin_start] + content[admin_end:]
print("[OK] Removed Admin tab from current location")

# Find Profile tab end (look for next tab after Profile)
profile_start_marker = '            <!-- Tab: Profile -->'
profile_start = content.find(profile_start_marker)

if profile_start == -1:
    print("[ERROR] Could not find Profile tab")
    exit(1)

# Find end of Profile tab
search_from_profile = profile_start + len(profile_start_marker)
next_after_profile = content.find('            <!-- Tab:', search_from_profile)

if next_after_profile == -1:
    # Profile is last tab, insert before </main>
    main_close = content.find('        </main>', search_from_profile)
    if main_close == -1:
        print("[ERROR] Could not find </main>")
        exit(1)
    insert_point = main_close
else:
    insert_point = next_after_profile

# Insert Admin tab after Profile
content = content[:insert_point] + admin_html + content[insert_point:]
print("[OK] Admin tab inserted after Profile tab")

# Write fixed content
print("Writing fixed index.html...")
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("")
print("=" * 60)
print("SUCCESS: Tab order fixed")
print("=" * 60)
print("")
print("Correct order: Events > Calendar > Profile > Admin")
