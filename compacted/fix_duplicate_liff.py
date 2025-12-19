#!/usr/bin/env python3
"""
Fix duplicate LIFF initialization that's breaking login
"""

def fix_duplicate_liff():
    file_path = r'C:\Users\pete\Documents\MciPro\index.html'

    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # Find the start of the duplicate LIFF init block (around line 7611)
    # and the end (around line 7779)
    start_marker = "// Check if user is already logged in via LINE - do this IMMEDIATELY"
    end_marker = "// Initialize session tracking"

    start_idx = None
    end_idx = None

    for i, line in enumerate(lines):
        if start_marker in line and start_idx is None:
            # Make sure this is the SECOND occurrence (the duplicate one)
            # The first is in the initializeLIFF() method around line 5420
            if i > 7000:  # Only look for the late one
                start_idx = i
                print(f"Found duplicate LIFF init start at line {i+1}")

        if end_marker in line and start_idx is not None and end_idx is None:
            end_idx = i
            print(f"Found session tracking marker at line {i+1}")
            break

    if start_idx is not None and end_idx is not None:
        # Remove the duplicate block
        # Keep everything before start_idx and from end_idx onwards
        new_lines = lines[:start_idx] + lines[end_idx:]

        with open(file_path, 'w', encoding='utf-8') as f:
            f.writelines(new_lines)

        print(f"[OK] Successfully removed duplicate LIFF initialization")
        print(f"   Removed lines {start_idx+1} to {end_idx}")
        print(f"   Removed {end_idx - start_idx} lines")
    else:
        print(f"[ERROR] Could not find the duplicate block")
        print(f"   start_idx: {start_idx}, end_idx: {end_idx}")

if __name__ == '__main__':
    fix_duplicate_liff()
