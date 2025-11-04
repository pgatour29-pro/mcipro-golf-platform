#!/usr/bin/env python3
"""
Test if TRGG user profiles exist
"""

import os
from supabase import create_client, Client

# Supabase connection details
SUPABASE_URL = 'https://pyeeplwsnupmhgbguwqs.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk'

def main():
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Test a few TRGG user IDs
    test_ids = ['TRGG-GUEST-0001', 'TRGG-GUEST-0002', 'TRGG-GUEST-0100']

    for user_id in test_ids:
        print(f"\n[TEST] Checking: {user_id}")
        result = supabase.table('user_profiles').select('line_user_id, name, profile_data').eq('line_user_id', user_id).execute()

        if result.data:
            print(f"  [OK] Found: {result.data[0]['name']}")
            print(f"  Handicap: {result.data[0].get('profile_data', {}).get('golfInfo', {}).get('handicap', 'N/A')}")
        else:
            print(f"  [ERROR] NOT FOUND")

    # Check total count
    print(f"\n[TOTAL] Counting all TRGG-GUEST users...")
    result = supabase.table('user_profiles').select('line_user_id', count='exact').like('line_user_id', 'TRGG-GUEST-%').execute()
    print(f"  Total TRGG-GUEST profiles: {result.count}")

if __name__ == '__main__':
    main()
