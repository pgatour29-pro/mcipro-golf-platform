#!/usr/bin/env python3
"""
Fix Society Organizer Dashboard tab structure
- Tab content divs are orphaned outside the dashboard screen
- Profile tab is missing closing </div>
- Admin tab is nested inside Profile tab
"""

print("Reading index.html...")
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the orphaned tab content section (starts at line ~21328)
tab_events_start = content.find('            <!-- Tab: Events -->')
if tab_events_start == -1:
    print("[ERROR] Could not find Tab: Events")
    exit(1)

# Find where this orphaned section ends (before Caddy Dashboard at line ~21839)
caddy_dashboard_start = content.find('    <!-- Caddy Dashboard -->')
if caddy_dashboard_start == -1:
    print("[ERROR] Could not find Caddy Dashboard")
    exit(1)

# Extract the entire orphaned section
orphaned_section = content[tab_events_start:caddy_dashboard_start]
print(f"[OK] Found orphaned tab section ({len(orphaned_section)} chars)")

# Now fix the Profile tab closing issue
# Find where Profile tab ends (before Admin tab comment)
profile_tab_pattern = '            <!-- Tab: Admin -->'
admin_tab_start_in_orphan = orphaned_section.find(profile_tab_pattern)

if admin_tab_start_in_orphan == -1:
    print("[ERROR] Could not find Admin tab comment in orphaned section")
    exit(1)

# Insert missing </div> for Profile tab before Admin tab comment
profile_section = orphaned_section[:admin_tab_start_in_orphan]
admin_section = orphaned_section[admin_tab_start_in_orphan:]

# Add the missing closing div for Profile tab
fixed_orphaned_section = profile_section + '            </div>\n\n' + admin_section

# Remove the extra closing divs at the end (lines 21835-21837)
# These are: </div></main></div> which were part of old structure
# Find the end of Admin tab content
admin_tab_close = fixed_orphaned_section.rfind('            </div>')  # Last tab closing div

# Get content up to and including the admin tab closing div
tab_content_only = fixed_orphaned_section[:admin_tab_close + len('            </div>')]

print(f"[OK] Fixed tab structure ({len(tab_content_only)} chars)")

# Remove the orphaned section from original content
content_before = content[:tab_events_start]
content_after = content[caddy_dashboard_start:]

# Now find where to insert in societyOrganizerDashboard
# Find the tab buttons closing div (line ~25414)
society_dash_start = content_after.find('<div id="societyOrganizerDashboard" class="screen">')
if society_dash_start == -1:
    print("[ERROR] Could not find societyOrganizerDashboard")
    exit(1)

# Find the closing of tab buttons div and main tag
tab_buttons_end = content_after.find('                </div>\n            </div>\n\n        </main>', society_dash_start)
if tab_buttons_end == -1:
    print("[ERROR] Could not find tab buttons end")
    exit(1)

# Find where </main> is
main_close = content_after.find('        </main>', society_dash_start)
if main_close == -1:
    print("[ERROR] Could not find </main>")
    exit(1)

# Insert tab content BEFORE </main>
insertion_point = main_close
content_before_insertion = content_after[:insertion_point]
content_after_insertion = content_after[insertion_point:]

# Insert the tab content with proper indentation
new_content = content_before + content_before_insertion + '\n' + tab_content_only + '\n' + content_after_insertion

print("[OK] Tab content inserted into societyOrganizerDashboard")

# Write fixed content
print("Writing fixed index.html...")
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("")
print("="*60)
print("SUCCESS: Society Organizer Dashboard structure fixed")
print("="*60)
print("")
print("Fixed:")
print("  ✓ Removed orphaned tab content section")
print("  ✓ Added missing </div> for Profile tab")
print("  ✓ Moved all tab content inside societyOrganizerDashboard")
print("  ✓ Proper tab order: Events > Calendar > Profile > Admin")
