#!/usr/bin/env python3
"""
Add Yellow and Red tees to all scorecard YAML files
"""

import os
import re

# Directory containing YAML files
yaml_dir = r"C:\Users\pete\Documents\MciPro\public\scorecard_profiles"

# List all YAML files
yaml_files = [f for f in os.listdir(yaml_dir) if f.endswith('.yaml')]

print(f"Found {len(yaml_files)} YAML files to update\n")

for filename in yaml_files:
    filepath = os.path.join(yaml_dir, filename)

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Check if Yellow and Red tees already exist
    if 'Yellow' in content and 'Red' in content:
        print(f"[OK] {filename} - Already has Yellow and Red tees, skipping")
        continue

    # Find the tees section
    tees_match = re.search(r'(tees:\n(?:  - name:.*\n(?:    .*\n)*)*)', content)

    if not tees_match:
        print(f"[SKIP] {filename} - No tees section found, skipping")
        continue

    # Get existing tees section
    existing_tees = tees_match.group(1)

    # Parse the last tee to get ratings for reference
    lines = existing_tees.strip().split('\n')
    last_course_rating = None
    last_slope_rating = None

    for line in reversed(lines):
        if 'course_rating:' in line:
            last_course_rating = float(line.split(':')[1].strip())
        if 'slope_rating:' in line:
            last_slope_rating = int(line.split(':')[1].strip())
        if last_course_rating and last_slope_rating:
            break

    # Calculate ratings for Yellow and Red tees (typically lower than White)
    yellow_course_rating = round(last_course_rating - 1.5, 1) if last_course_rating else 68.5
    yellow_slope_rating = last_slope_rating - 5 if last_slope_rating else 115

    red_course_rating = round(last_course_rating - 3.0, 1) if last_course_rating else 67.0
    red_slope_rating = last_slope_rating - 10 if last_slope_rating else 110

    # Create new tees entries
    yellow_tee = f'''  - name: "Senior"
    color: "Yellow"
    course_rating: {yellow_course_rating}
    slope_rating: {yellow_slope_rating}'''

    red_tee = f'''  - name: "Ladies"
    color: "Red"
    course_rating: {red_course_rating}
    slope_rating: {red_slope_rating}'''

    # Add Yellow and Red tees
    new_tees = existing_tees.rstrip() + '\n' + yellow_tee + '\n' + red_tee + '\n'

    # Replace in content
    new_content = content.replace(existing_tees, new_tees)

    # Write back
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)

    print(f"[ADDED] {filename} - Yellow (CR: {yellow_course_rating}, Slope: {yellow_slope_rating}) and Red (CR: {red_course_rating}, Slope: {red_slope_rating})")

print(f"\n[SUCCESS] Updated all YAML files with Yellow and Red tees")
