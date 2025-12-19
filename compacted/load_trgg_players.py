#!/usr/bin/env python3
"""
Bulk Load TRGG Players into MciPro Database
Loads 1,103 golfers from golfers.json into the Travellers Rest society database
"""

import json
import os
import sys
from supabase import create_client, Client
from datetime import datetime, timezone

# Supabase connection details
SUPABASE_URL = os.getenv('SUPABASE_URL', 'https://pyeeplwsnupmhgbguwqs.supabase.co')
# Default to the anon key from supabase-config.js
SUPABASE_KEY = os.getenv('SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk')

# Society details
SOCIETY_NAME = 'Travellers Rest Golf Group'
SOCIETY_PREFIX = 'TRGG'

def main():
    # Load golfers from JSON
    json_path = 'TRGGplayers/golfers.json'

    if not os.path.exists(json_path):
        print(f" Error: {json_path} not found")
        sys.exit(1)

    with open(json_path, 'r') as f:
        data = json.load(f)

    golfers = data.get('golfers', [])
    print(f"[INFO] Loaded {len(golfers)} golfers from JSON file")
    print(f"[INFO] Connecting to Supabase at {SUPABASE_URL}")

    # Initialize Supabase client
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print(" Connected to Supabase")
    except Exception as e:
        print(f" Error connecting to Supabase: {e}")
        sys.exit(1)

    # Get organizer_id and society_id for Travellers Rest
    try:
        society_result = supabase.table('society_profiles').select('id, organizer_id').eq('society_name', SOCIETY_NAME).execute()

        if not society_result.data:
            print(f" Error: Society '{SOCIETY_NAME}' not found in database")
            print("Please ensure the society exists before running this script")
            sys.exit(1)

        society_id = society_result.data[0]['id']
        organizer_id = society_result.data[0]['organizer_id']
        print(f" Found society ID: {society_id}")
        print(f" Found organizer ID: {organizer_id}")
    except Exception as e:
        print(f" Error fetching society: {e}")
        sys.exit(1)

    # Get existing members to avoid duplicates and find next member number
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
        print(f" Found {len(existing_golfer_ids)} existing members. Starting from member #{next_member_number}")

    except Exception as e:
        print(f"  Warning fetching existing members: {e}")
        existing_golfer_ids = set()
        next_member_number = 1

    # Prepare data for bulk insert
    user_profiles = []
    society_members = []

    for idx, golfer in enumerate(golfers, start=1):
        name = golfer.get('name', 'Unknown')
        handicap = golfer.get('handicap', 36.0)

        # Create a unique golfer_id as placeholder LINE ID
        golfer_id = f"{SOCIETY_PREFIX}-GUEST-{str(idx).zfill(4)}"

        # Skip if already exists
        if golfer_id in existing_golfer_ids:
            print(f"  Skipping {name} - already exists")
            continue

        # Generate member number
        member_number = f"{SOCIETY_PREFIX}-{str(next_member_number).zfill(3)}"
        next_member_number += 1

        # Create user profile data
        user_profile = {
            'line_user_id': golfer_id,
            'name': name,
            'profile_data': {
                'golfInfo': {
                    'handicap': str(handicap),
                    'homeClub': 'Travellers Rest Golf Group',
                    'handicapVerified': False
                },
                'guestPlayer': True,
                'importedFrom': 'TRGG-JSON-2025-11-04'
            },
            'created_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }

        # Create society member record (using actual schema)
        society_member = {
            'society_id': society_id,
            'golfer_id': golfer_id,
            'member_number': member_number,
            'role': 'member',
            'status': 'active',
            'notes': f"Imported from TRGG JSON - Original: {name}, Handicap: {handicap}"
        }

        user_profiles.append(user_profile)
        society_members.append(society_member)

    print(f"\n[INFO] Prepared {len(user_profiles)} new players to import")

    if not user_profiles:
        print("[INFO] All golfers already imported!")
        return

    print(f"[INFO] Starting bulk insert of {len(user_profiles)} players...")

    # Insert user profiles in batches of 100
    BATCH_SIZE = 100
    total_profiles_inserted = 0
    total_members_inserted = 0

    for i in range(0, len(user_profiles), BATCH_SIZE):
        batch_profiles = user_profiles[i:i + BATCH_SIZE]
        batch_members = society_members[i:i + BATCH_SIZE]

        try:
            # Insert user profiles
            profile_result = supabase.table('user_profiles').upsert(batch_profiles, on_conflict='line_user_id').execute()
            total_profiles_inserted += len(batch_profiles)

            # Insert society members
            member_result = supabase.table('society_members').insert(batch_members).execute()
            total_members_inserted += len(batch_members)

            print(f" Inserted batch {i//BATCH_SIZE + 1}: {len(batch_profiles)} profiles + {len(batch_members)} members")

        except Exception as e:
            print(f" Error inserting batch {i//BATCH_SIZE + 1}: {e}")
            print(f"First profile in failed batch: {batch_profiles[0]['name']}")
            # Continue with next batch instead of failing completely
            continue

    print(f"\n SUCCESS!")
    print(f" Inserted {total_profiles_inserted} user profiles")
    print(f" Inserted {total_members_inserted} society members")
    print(f" All golfers added to '{SOCIETY_NAME}'")
    print(f"\n Organizers can now:")
    print(f"   - View all players in the Player Directory tab")
    print(f"   - Edit player details (name, handicap, etc.)")
    print(f"   - Delete players as needed")
    print(f"   - Add players to events")

if __name__ == '__main__':
    main()
