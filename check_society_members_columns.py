#!/usr/bin/env python3
"""
Check society_members table columns
"""

import os
from supabase import create_client, Client

# Supabase connection details
SUPABASE_URL = 'https://pyeeplwsnupmhgbguwqs.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk'

def main():
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

    print("[INFO] Getting one row from society_members to see columns...")

    result = supabase.table('society_members').select('*').limit(1).execute()

    if result.data:
        print(f"\n[SUCCESS] Columns in society_members:")
        for key in result.data[0].keys():
            print(f"  - {key}: {type(result.data[0][key]).__name__}")
    else:
        print("[ERROR] No data found")

if __name__ == '__main__':
    main()
