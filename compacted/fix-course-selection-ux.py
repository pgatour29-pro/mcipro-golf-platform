#!/usr/bin/env python3
"""
Fix Course Selection UX for Start Round
========================================
Makes it impossible to miss when course isn't selected:
- Flash dropdown red if not selected
- Scroll to dropdown
- Big obvious alert
- Show which fields are missing
"""

import re

def fix_course_selection_ux():
    with open('index.html', 'r', encoding='utf-8') as f:
        content = f.read()

    original = content

    # Find the startRound method's course validation section
    old_code = '''        if (!courseId) {
            console.warn('[LiveScorecard] ⚠️ No course selected');
            NotificationManager.show('Please select a course', 'error');
            return;
        }'''

    new_code = '''        if (!courseId) {
            console.warn('[LiveScorecard] ⚠️ No course selected');

            // Flash the dropdown red and scroll to it
            const dropdown = document.getElementById('scorecardCourseSelect');
            if (dropdown) {
                dropdown.style.border = '3px solid red';
                dropdown.style.backgroundColor = '#ffe6e6';
                dropdown.scrollIntoView({ behavior: 'smooth', block: 'center' });

                // Remove red after 3 seconds
                setTimeout(() => {
                    dropdown.style.border = '';
                    dropdown.style.backgroundColor = '';
                }, 3000);
            }

            // Show big obvious alert
            alert('⚠️ COURSE NOT SELECTED\\n\\nPlease select a golf course from the dropdown first, then click Start Round.');

            NotificationManager.show('Please select a course', 'error');
            return;
        }'''

    if old_code in content:
        content = content.replace(old_code, new_code)
        print("[OK] Fixed course validation in startRound()")
    else:
        print("[WARN] Course validation code not found - checking alternate format...")
        # Try alternate formatting
        search_pattern = r'if \(!courseId\) \{\s+console\.warn\(\'\[LiveScorecard\] ⚠️ No course selected\'\);\s+NotificationManager\.show\(\'Please select a course\', \'error\'\);\s+return;\s+\}'
        if re.search(search_pattern, content):
            content = re.sub(search_pattern, new_code, content)
            print("[OK] Fixed course validation with regex")
        else:
            print("[ERROR] Could not find course validation code")
            return False

    # Save
    if content != original:
        with open('index.html', 'w', encoding='utf-8') as f:
            f.write(content)
        print("\n[SUCCESS] COURSE SELECTION UX IMPROVED")
        print("\nChanges:")
        print("  - Dropdown flashes RED if not selected")
        print("  - Page scrolls to dropdown automatically")
        print("  - Big alert popup explains the problem")
        print("  - User can't miss it anymore")
        return True
    else:
        print("[ERROR] No changes made")
        return False

if __name__ == '__main__':
    fix_course_selection_ux()
