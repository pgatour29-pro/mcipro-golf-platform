#!/usr/bin/env python3
"""
Fix Admin tab location - it was inserted inside Profile tab instead of after it
"""

print("Reading index.html...")
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the misplaced admin tab content
print("Locating misplaced Admin tab...")
admin_tab_start = '            <!-- Tab: Admin -->'
admin_tab_end = '            </div>\n        </main>'

# Check if admin tab exists and is misplaced
if admin_tab_start in content:
    # Extract the admin tab content
    start_idx = content.find(admin_tab_start)
    # Find the end - look for the closing div before </main>
    search_start = start_idx
    end_marker = '            </div>\n        </main>\n    </div>\n\n    <!-- Roster Modal -->'
    end_idx = content.find(end_marker, search_start)

    if end_idx == -1:
        print("[ERROR] Could not find admin tab end marker")
        exit(1)

    # Extract admin tab HTML
    admin_tab_html = content[start_idx:end_idx + len('            </div>')]
    print(f"[OK] Found Admin tab content ({len(admin_tab_html)} chars)")

    # Remove it from current location
    content = content[:start_idx] + content[end_idx + len('            </div>'):]
    print("[OK] Removed Admin tab from wrong location")

    # Find correct insertion point - after Profile tab closing div
    # Look for the Profile tab's closing </div> followed by </main>
    correct_marker = '''            </div>
        </main>
    </div>

    <!-- Roster Modal -->'''

    if correct_marker in content:
        # Insert before </main>
        insert_marker = '''        </main>
    </div>

    <!-- Roster Modal -->'''

        # Build the replacement
        replacement = admin_tab_html + '\n' + insert_marker
        content = content.replace(insert_marker, replacement)
        print("[OK] Admin tab inserted at correct location")
    else:
        print("[ERROR] Could not find correct insertion point")
        print("Looking for marker...")
        # Try alternative marker
        alt_marker = '''        </main>
    </div>'''
        if alt_marker in content:
            idx = content.find(alt_marker)
            print(f"Found </main> at position {idx}")
            content = content[:idx] + admin_tab_html + '\n' + content[idx:]
            print("[OK] Admin tab inserted using alternative method")
        else:
            exit(1)

    # Write fixed content
    print("Writing fixed index.html...")
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(content)

    print("")
    print("="*60)
    print("SUCCESS: Admin tab moved to correct location")
    print("="*60)
    print("")
    print("The Admin tab should now display correctly after deployment.")

else:
    print("[ERROR] Admin tab not found in file")
    exit(1)
