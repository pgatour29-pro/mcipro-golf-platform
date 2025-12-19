#!/usr/bin/env python3
"""
Link TRGG Players to Travellers Rest Society
Links the 1,101 imported TRGG golfers to the Travellers Rest society_members table
"""

import os
import sys
from supabase import create_client, Client

# Supabase connection details
SUPABASE_URL = os.getenv('SUPABASE_URL', 'https://pyeeplwsnupmhgbguwqs.supabase.co')
SUPABASE_KEY = os.getenv('SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk')

# Society details
SOCIETY_NAME = 'Travellers Rest Golf Group'
SOCIETY_PREFIX = 'TRGG'

def main():
    print(f"[INFO] Connecting to Supabase at {SUPABASE_URL}")

    # Initialize Supabase client
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("[SUCCESS] Connected to Supabase")
    except Exception as e:
        print(f"[ERROR] Error connecting to Supabase: {e}")
        sys.exit(1)

    # Get society_id for Travellers Rest
    try:
        society_result = supabase.table('society_profiles').select('id, organizer_id, society_name').eq('society_name', SOCIETY_NAME).execute()

        if not society_result.data:
            print(f"[ERROR] Society '{SOCIETY_NAME}' not found in database")
            print("Please ensure the society exists before running this script")
            sys.exit(1)

        society_id = society_result.data[0]['id']
        organizer_id = society_result.data[0]['organizer_id']
        print(f"[SUCCESS] Found society ID: {society_id}")
        print(f"[SUCCESS] Found organizer ID: {organizer_id}")
    except Exception as e:
        print(f"[ERROR] Error fetching society: {e}")
        sys.exit(1)

    # Get all TRGG-GUEST user profiles
    try:
        print("[INFO] Fetching all TRGG-GUEST user profiles...")
        user_profiles = supabase.table('user_profiles').select('line_user_id, name, profile_data').like('line_user_id', 'TRGG-GUEST-%').execute()

        if not user_profiles.data:
            print("[ERROR] No TRGG-GUEST users found in database")
            sys.exit(1)

        print(f"[SUCCESS] Found {len(user_profiles.data)} TRGG golfers")
    except Exception as e:
        print(f"[ERROR] Error fetching user profiles: {e}")
        sys.exit(1)

    # Get existing society members to avoid duplicates and find next member number
    try:
        existing_members = supabase.table('society_members').select('member_number, golfer_id').eq('society_id', society_id).execute()

        existing_golfer_ids = {m['golfer_id'] for m in existing_members.data}

        # Find highest member number
        max_number = 0
        for member in existing_members.data:
            member_num = member.get('member_number', '')
            if member_num and member_num.startswith(f"{SOCIETY_PREFIX}-"):
                try:
                    num = int(member_num.split('-')[1])
                    max_number = max(max_number, num)
                except (IndexError, ValueError):
                    pass

        next_member_number = max_number + 1
        print(f"[INFO] Found {len(existing_golfer_ids)} existing members")
        print(f"[INFO] Starting from member #{next_member_number}")

    except Exception as e:
        print(f"[WARNING] Warning fetching existing members: {e}")
        existing_golfer_ids = set()
        next_member_number = 1

    # Prepare society_members records
    society_members = []

    for user in user_profiles.data:
        golfer_id = user['line_user_id']
        name = user.get('name', 'Unknown')

        # Skip if already exists
        if golfer_id in existing_golfer_ids:
            print(f"[SKIP] {name} - already a member")
            continue

        # Generate member number
        member_number = f"{SOCIETY_PREFIX}-{str(next_member_number).zfill(3)}"
        next_member_number += 1

        # Get handicap from profile_data
        handicap = 36.0
        if user.get('profile_data') and user['profile_data'].get('golfInfo'):
            try:
                handicap = float(user['profile_data']['golfInfo'].get('handicap', 36))
            except:
                handicap = 36.0

        # Create society member record
        society_member = {
            'society_id': society_id,
            'golfer_id': golfer_id,
            'member_number': member_number,
            'role': 'member',
            'status': 'active',
            'notes': f"Imported from TRGG JSON - {name}, Handicap: {handicap}"
        }

        society_members.append(society_member)

    print(f"\n[INFO] Prepared {len(society_members)} new members to add")

    if not society_members:
        print("[INFO] All TRGG golfers are already members!")
        return

    # Insert society members in batches
    BATCH_SIZE = 100
    total_inserted = 0

    for i in range(0, len(society_members), BATCH_SIZE):
        batch = society_members[i:i + BATCH_SIZE]

        try:
            result = supabase.table('society_members').insert(batch).execute()
            total_inserted += len(batch)
            print(f"[SUCCESS] Inserted batch {i//BATCH_SIZE + 1}: {len(batch)} members")
        except Exception as e:
            print(f"[ERROR] Error inserting batch {i//BATCH_SIZE + 1}: {e}")
            print(f"First member in failed batch: {batch[0]}")
            continue

    print(f"\n[SUCCESS] SUCCESS!")
    print(f"[SUCCESS] Inserted {total_inserted} society members")
    print(f"[SUCCESS] All TRGG golfers added to '{SOCIETY_NAME}'")
    print(f"\n[INFO] Organizers can now:")
    print(f"  - View all {total_inserted} players in the Player Directory tab")
    print(f"  - Edit player details (name, handicap, etc.)")
    print(f"  - Delete players as needed")
    print(f"  - Add players to events")

if __name__ == '__main__':
    main()
