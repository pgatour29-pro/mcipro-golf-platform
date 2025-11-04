#!/usr/bin/env python3
"""
Create Society in societies table - Minimal approach
"""

import os
import sys
from supabase import create_client, Client

# Supabase connection details
SUPABASE_URL = os.getenv('SUPABASE_URL', 'https://pyeeplwsnupmhgbguwqs.supabase.co')
SUPABASE_KEY = os.getenv('SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk')

SOCIETY_NAME = 'Travellers Rest Golf Group'

def main():
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Get society_profile
    society_result = supabase.table('society_profiles').select('*').eq('society_name', SOCIETY_NAME).execute()
    profile = society_result.data[0]
    society_id = profile['id']

    print(f"[INFO] Society ID: {society_id}")

    # Try inserting with just ID
    try:
        print("[INFO] Attempting to insert with minimal data...")
        result = supabase.table('societies').insert({'id': society_id}).execute()
        print("[SUCCESS] Society created!")
        print(f"  {result.data}")
    except Exception as e:
        print(f"[ERROR] Failed: {e}")

        # Try with id + name
        try:
            print("[INFO] Attempting with id + name...")
            result = supabase.table('societies').insert({
                'id': society_id,
                'name': SOCIETY_NAME
            }).execute()
            print("[SUCCESS] Society created!")
            print(f"  {result.data}")
        except Exception as e2:
            print(f"[ERROR] Also failed: {e2}")

            # Try with id + name + organizer_id
            try:
                print("[INFO] Attempting with id + name + organizer_id...")
                result = supabase.table('societies').insert({
                    'id': society_id,
                    'name': SOCIETY_NAME,
                    'organizer_id': profile['organizer_id']
                }).execute()
                print("[SUCCESS] Society created!")
                print(f"  {result.data}")
            except Exception as e3:
                print(f"[ERROR] All attempts failed: {e3}")

if __name__ == '__main__':
    main()
