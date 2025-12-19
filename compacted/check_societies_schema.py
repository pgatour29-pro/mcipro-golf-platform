#!/usr/bin/env python3
"""
Check Societies Table Schema
"""

import os
import sys
from supabase import create_client, Client

# Supabase connection details
SUPABASE_URL = os.getenv('SUPABASE_URL', 'https://pyeeplwsnupmhgbguwqs.supabase.co')
SUPABASE_KEY = os.getenv('SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk')

def main():
    print(f"[INFO] Connecting to Supabase")

    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Try to get any existing society
    print("\n[INFO] Checking societies table...")
    try:
        result = supabase.table('societies').select('*').limit(1).execute()
        print(f"  Found {len(result.data)} records")
        if result.data:
            print(f"  Sample record: {result.data[0]}")
            print(f"  Columns: {list(result.data[0].keys())}")
    except Exception as e:
        print(f"  Error: {e}")

    # Check society_profiles
    print("\n[INFO] Checking society_profiles table...")
    try:
        result = supabase.table('society_profiles').select('*').limit(1).execute()
        print(f"  Found {len(result.data)} records")
        if result.data:
            print(f"  Sample record: {result.data[0]}")
            print(f"  Columns: {list(result.data[0].keys())}")
    except Exception as e:
        print(f"  Error: {e}")

    # Check society_members
    print("\n[INFO] Checking society_members table...")
    try:
        result = supabase.table('society_members').select('*').limit(1).execute()
        print(f"  Found {len(result.data)} records")
        if result.data:
            print(f"  Sample record: {result.data[0]}")
            print(f"  Columns: {list(result.data[0].keys())}")
        else:
            print("  No records found - showing error for schema info...")
            # Try to insert an invalid record to see schema error
            try:
                supabase.table('society_members').insert({'test': 'test'}).execute()
            except Exception as e:
                print(f"  Schema info: {e}")
    except Exception as e:
        print(f"  Error: {e}")

if __name__ == '__main__':
    main()
