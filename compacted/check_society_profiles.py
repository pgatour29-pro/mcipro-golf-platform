#!/usr/bin/env python3
"""
Check society_profiles table structure and data
"""

import os
from supabase import create_client, Client

# Supabase connection details
SUPABASE_URL = 'https://pyeeplwsnupmhgbguwqs.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk'

def main():
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

    print("[INFO] Querying society_profiles table...")

    # Try to get all columns
    result = supabase.table('society_profiles').select('*').execute()

    if result.data:
        print(f"\n[SUCCESS] Found {len(result.data)} society profiles")
        for profile in result.data:
            print(f"\n  Profile:")
            for key, value in profile.items():
                print(f"    {key}: {value}")
    else:
        print("[ERROR] No society profiles found")

if __name__ == '__main__':
    main()
