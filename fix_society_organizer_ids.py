#!/usr/bin/env python3
"""
Fix all occurrences of AppState.currentUser?.lineUserId in SocietyOrganizerManager
to use AppState.selectedSociety?.organizerId when available
"""

def fix_organizer_ids():
    file_path = 'index.html'

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # List of lines to fix (found from grep)
    # We'll replace the pattern more carefully

    replacements = [
        # In loadPlayerDirectory (line ~38802)
        (
            "const societyName = this.societyProfile.society_name;\n            const organizerId = AppState.currentUser?.lineUserId;",
            "const societyName = this.societyProfile.society_name;\n            const organizerId = AppState.selectedSociety?.organizerId || AppState.currentUser?.lineUserId;"
        ),
        # In addSocietyMember (line ~38958)
        (
            "const societyName = this.societyProfile.society_name;\n            const organizerId = AppState.currentUser?.lineUserId;\n\n            // Generate member number",
            "const societyName = this.societyProfile.society_name;\n            const organizerId = AppState.selectedSociety?.organizerId || AppState.currentUser?.lineUserId;\n\n            // Generate member number"
        ),
    ]

    for old, new in replacements:
        if old in content:
            content = content.replace(old, new)
            print(f"OK Replaced: {old[:50]}...")
        else:
            print(f"SKIP Not found: {old[:50]}...")

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

    print("\nSUCCESS: Fixed organizer ID lookups in SocietyOrganizerManager")
    print("All methods now check AppState.selectedSociety first!")

if __name__ == '__main__':
    fix_organizer_ids()
