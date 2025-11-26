#!/usr/bin/env python3
"""
Remove duplicate SocietySelectorSystem declarations from index.html
Keeps only the first occurrence, removes the 2nd and 3rd duplicates
"""

import re

# Read the file
with open('public/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

print("Original file size:", len(content), "characters")

# Find all occurrences of SocietySelectorSystem blocks
# Pattern: from "const SocietySelectorSystem = {" to "window.SocietySelectorSystem = SocietySelectorSystem;"
pattern = r'const SocietySelectorSystem = \{[\s\S]*?window\.SocietySelectorSystem = SocietySelectorSystem;[\s\S]*?console\.log\(\'\[SocietySelectorSystem\] Module loaded\'\);'

matches = list(re.finditer(pattern, content))
print(f"\nFound {len(matches)} SocietySelectorSystem blocks")

if len(matches) >= 2:
    # Keep the first one, remove the rest
    print(f"\nRemoving {len(matches) - 1} duplicate blocks...")

    # Remove from end to start to preserve indices
    for i in range(len(matches) - 1, 0, -1):
        match = matches[i]
        print(f"  - Removing block {i+1} at position {match.start()}-{match.end()}")
        content = content[:match.start()] + content[match.end():]

    # Write back
    with open('public/index.html', 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"\n✅ Successfully removed {len(matches) - 1} duplicate blocks")
    print("New file size:", len(content), "characters")
else:
    print("\n⚠️  Expected at least 2 blocks, found:", len(matches))

# Also check for duplicate SocietySelector (the simpler one)
pattern2 = r'const SocietySelector = \{[\s\S]*?document\.addEventListener\(\'DOMContentLoaded\',[\s\S]*?\}\);'

# Reload content if we modified it
if len(matches) >= 2:
    with open('public/index.html', 'r', encoding='utf-8') as f:
        content = f.read()

matches2 = list(re.finditer(pattern2, content))
print(f"\n\nFound {len(matches2)} SocietySelector blocks (simple version)")

if len(matches2) > 1:
    print(f"Removing {len(matches2) - 1} duplicate SocietySelector blocks...")

    # Remove from end to start
    for i in range(len(matches2) - 1, 0, -1):
        match = matches2[i]
        print(f"  - Removing SocietySelector block {i+1} at position {match.start()}-{match.end()}")
        content = content[:match.start()] + content[match.end():]

    # Write back
    with open('public/index.html', 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"\n✅ Successfully removed {len(matches2) - 1} duplicate SocietySelector blocks")
    print("Final file size:", len(content), "characters")

print("\n✅ Done! Duplicates removed from public/index.html")
