#!/usr/bin/env python3
"""
Fix Profile and Admin tab layout - add mx-auto to center the max-w-2xl containers
"""

print("Reading index.html...")
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix Profile tab - add mx-auto to max-w-2xl
old_profile = '            <div id="organizerTab-profile" class="organizer-tab-content" style="display: none;">\n                <div class="max-w-2xl">'
new_profile = '            <div id="organizerTab-profile" class="organizer-tab-content" style="display: none;">\n                <div class="max-w-2xl mx-auto">'

if old_profile in content:
    content = content.replace(old_profile, new_profile)
    print("[OK] Fixed Profile tab layout - added mx-auto")
else:
    print("[WARNING] Could not find Profile tab pattern")

# Fix Admin tab - add mx-auto to max-w-2xl
old_admin = '            <div id="organizerTab-admin" class="organizer-tab-content" style="display: none;">\n                <div class="max-w-2xl">'
new_admin = '            <div id="organizerTab-admin" class="organizer-tab-content" style="display: none;">\n                <div class="max-w-2xl mx-auto">'

if old_admin in content:
    content = content.replace(old_admin, new_admin)
    print("[OK] Fixed Admin tab layout - added mx-auto")
else:
    print("[WARNING] Could not find Admin tab pattern")

# Write updated content
print("Writing updated index.html...")
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("")
print("="*60)
print("SUCCESS: Profile and Admin tab layouts fixed")
print("="*60)
print("")
print("Changes:")
print("  - Added 'mx-auto' to Profile tab's max-w-2xl container")
print("  - Added 'mx-auto' to Admin tab's max-w-2xl container")
print("  - Content will now be centered instead of left-aligned")
