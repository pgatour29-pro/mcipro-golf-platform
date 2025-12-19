#!/usr/bin/env python3
"""
Fix JavaScript placement - remove duplicate and ensure it's only before real </body>
"""

import re

# Read index.html
with open(r'C:\Users\pete\Documents\MciPro\index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern to find the GM Dashboard JavaScript block
gm_js_pattern = r'\s*<script>\s*/\* ===================================================================\s*GM DASHBOARD ENTERPRISE COCKPIT V3 - INTEGRATED JAVASCRIPT\s*===================================================================.*?\}\)\(\);\s*</script>'

# Find all occurrences
matches = list(re.finditer(gm_js_pattern, content, re.DOTALL))

print(f"Found {len(matches)} GM Dashboard JavaScript blocks")

if len(matches) > 1:
    # Remove all but the last one
    for match in matches[:-1]:
        print(f"Removing duplicate at position {match.start()}-{match.end()}")
        content = content[:match.start()] + content[match.end():]

    # Write back
    with open(r'C:\Users\pete\Documents\MciPro\index.html', 'w', encoding='utf-8') as f:
        f.write(content)

    print("Duplicates removed successfully!")
else:
    print("No duplicates found - JavaScript is correctly placed only once")
