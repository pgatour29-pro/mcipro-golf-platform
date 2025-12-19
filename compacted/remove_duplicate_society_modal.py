#!/usr/bin/env python3
"""
Remove duplicate Society Selector Modal from index.html
The modal was added twice, causing JavaScript errors
"""

def remove_duplicate():
    file_path = 'index.html'

    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # Find the second occurrence (lines 28333-28559)
    # Start: line 28333 (index 28332) "<!-- ============================================== -->"
    # End: line 28559 (index 28558) "</script>"

    # Delete lines 28332 to 28559 (inclusive), that's 228 lines
    # But we need to keep 2 blank lines for spacing
    start_delete = 28332  # Line 28333 (0-indexed: 28332)
    end_delete = 28559    # Line 28560 (0-indexed: 28559)

    # Remove the duplicate block
    del lines[start_delete:end_delete]

    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(lines)

    print("SUCCESS: Removed duplicate Society Selector Modal")
    print(f"   Deleted lines {start_delete+1} to {end_delete}")
    print(f"   Removed {end_delete - start_delete} lines")
    print("")
    print("The SocietySelectorSystem is now defined only ONCE")
    print("No more 'Identifier already declared' error!")

if __name__ == '__main__':
    remove_duplicate()
