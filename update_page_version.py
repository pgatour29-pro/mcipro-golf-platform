#!/usr/bin/env python3
"""Update page version to force Netlify cache refresh"""

# Read the file
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Update page version
old_version = "console.log('%c🚀 PAGE VERSION: 2025-10-20-SLEEK-MOBILE-MASTHEAD'"
new_version = "console.log('%c🚀 PAGE VERSION: 2025-10-21-TRGG-LOGO-FIX'"

if old_version in content:
    content = content.replace(old_version, new_version)
    print("Updated page version to 2025-10-21-TRGG-LOGO-FIX")
else:
    print("WARNING: Could not find page version to update")

# Write back
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Page version update complete")
