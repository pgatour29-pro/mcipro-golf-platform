#!/usr/bin/env python3
"""
Fix Society Schema - Create society in 'societies' table
"""

import os
import sys
from supabase import create_client, Client

# Supabase connection details
SUPABASE_URL = os.getenv('SUPABASE_URL', 'https://pyeeplwsnupmhgbguwqs.supabase.co')
SUPABASE_KEY = os.getenv('SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk')

SOCIETY_NAME = 'Travellers Rest Golf Group'

def main():
    print(f"[INFO] Connecting to Supabase at {SUPABASE_URL}")

    # Initialize Supabase client
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("[SUCCESS] Connected to Supabase")
    except Exception as e:
        print(f"[ERROR] Error connecting to Supabase: {e}")
        sys.exit(1)

    # Get society_profile
    try:
        society_result = supabase.table('society_profiles').select('*').eq('society_name', SOCIETY_NAME).execute()

        if not society_result.data:
            print(f"[ERROR] Society '{SOCIETY_NAME}' not found in society_profiles")
            sys.exit(1)

        profile = society_result.data[0]
        society_id = profile['id']
        organizer_id = profile['organizer_id']

        print(f"[SUCCESS] Found society profile:")
        print(f"  ID: {society_id}")
        print(f"  Name: {profile.get('society_name')}")
        print(f"  Organizer: {organizer_id}")
    except Exception as e:
        print(f"[ERROR] Error fetching society profile: {e}")
        sys.exit(1)

    # Check if society exists in societies table
    try:
        existing = supabase.table('societies').select('*').eq('id', society_id).execute()

        if existing.data:
            print(f"[INFO] Society already exists in societies table")
            print(f"  Existing record: {existing.data[0]}")
            return
    except Exception as e:
        print(f"[WARNING] Error checking societies table: {e}")

    # Insert society into societies table
    try:
        print("[INFO] Creating society in societies table...")

        society_record = {
            'id': society_id,
            'name': profile.get('society_name', SOCIETY_NAME),
            'organizer_id': organizer_id,
            'description': profile.get('description', 'Travellers Rest Golf Group'),
            'status': 'active',
            'created_at': profile.get('created_at'),
            'updated_at': profile.get('updated_at')
        }

        result = supabase.table('societies').insert(society_record).execute()

        print("[SUCCESS] Society created in societies table!")
        print(f"  Record: {result.data[0]}")

    except Exception as e:
        print(f"[ERROR] Error creating society: {e}")
        print(f"[INFO] Attempting upsert instead...")

        try:
            result = supabase.table('societies').upsert(society_record, on_conflict='id').execute()
            print("[SUCCESS] Society upserted successfully!")
        except Exception as e2:
            print(f"[ERROR] Upsert also failed: {e2}")
            sys.exit(1)

if __name__ == '__main__':
    main()
