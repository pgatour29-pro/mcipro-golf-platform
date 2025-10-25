#!/usr/bin/env python3
"""Generate SQL for TRGG November 2025 schedule"""
import json
from datetime import datetime

# Read the formatted JSON
with open('trgg_schedule_formatted.json', 'r') as f:
    events = json.load(f)

# Filter for November 2025 events (dates 1-30 in second half of array)
# November events start after October (after entry with date "31")
november_events = []
found_nov = False
for event in events:
    date_str = event.get('event_date', '')
    course = event.get('course_name', '').strip()

    # Skip empty events
    if not course or not date_str:
        continue

    # November events come after Oct 31
    if date_str == '1' and found_nov == False and 'GREENWOOD' in course and '12.00' in event.get('first_tee_time', ''):
        found_nov = True

    if found_nov and date_str.isdigit():
        date_num = int(date_str)
        if 1 <= date_num <= 30:  # November has 30 days
            november_events.append(event)

print(f"Found {len(november_events)} November events")

# Generate SQL
sql_parts = []
organizer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'

for event in november_events:
    date_num = event['event_date']
    course = event['course_name'].replace('\n', ' ').strip()
    departure = event['departure_time'].split('\n')[0] if event['departure_time'] else '09:00'
    first_tee = event['first_tee_time'].split('\n')[0] if event['first_tee_time'] else '10:00'
    green_fee_str = event['pricing']['green_fee'].split('\n')[0] if event['pricing']['green_fee'] else '2000'

    # Clean up course name for special events
    if 'TWO MAN SCRAMBLE' in course:
        event_name = f'TRGG - {course}'
        notes = f'Departure: {departure} | First Tee: {first_tee} | TWO MAN SCRAMBLE | Cart & Caddy included'
    elif 'FREE FOOD FRIDAY' in course:
        event_name = f'TRGG - {course}'
        notes = f'Departure: {departure} | First Tee: {first_tee} | FREE FOOD FRIDAY | Cart & Caddy included'
    elif 'MONTHLY MEDAL STROKE' in course:
        event_name = f'TRGG - {course}'
        notes = f'Departure: {departure} | First Tee: {first_tee} | MONTHLY MEDAL STROKE | Cart & Caddy included'
    else:
        event_name = f'TRGG - {course}'
        notes = f'Departure: {departure} | First Tee: {first_tee} | Cart & Caddy included'

    # Clean course name for course_name field
    course_clean = course.replace(' (6 GROUPS) A-B', '').replace(' (6 GROUPS) C-A', '').replace(' (6 GROUPS) B-C', '')
    course_clean = course_clean.replace(' (2 WAY)', '').replace(' (TWO WAY)', '').replace(' (3 GROUPS)', '')
    course_clean = course_clean.replace(' A-B', '').strip()

    # Create event ID
    date_str = f'2025-11-{int(date_num):02d}'
    event_id = f'trgg-2025-11-{int(date_num):02d}-{course_clean.lower().replace(" ", "-")[:20]}'

    # Cutoff is day before at 6pm
    cutoff_date = f'2025-11-{int(date_num)-1:02d} 18:00:00+07' if int(date_num) > 1 else '2025-10-31 18:00:00+07'

    sql_part = f'''(
  '{event_id}',
  '{event_name}',
  '{date_str}',
  '{first_tee}',
  {green_fee_str},
  0,
  0,
  80,
  '{organizer_id}',
  'Travellers Rest Golf Group',
  'open',
  null,
  '{course_clean}',
  '{notes}',
  '{cutoff_date}',
  true,
  false,
  NOW(),
  NOW()
)'''
    sql_parts.append(sql_part)

# Write SQL file
sql_content = f'''-- =====================================================
-- IMPORT TRGG PATTAYA NOVEMBER 2025 SCHEDULE
-- =====================================================
-- Imports golf events from TRGG Pattaya schedule
-- Date range: November 1-30, 2025
-- Source: www.trggpattaya.com/schedule/
-- =====================================================

INSERT INTO society_events (
  id,
  name,
  date,
  start_time,
  base_fee,
  cart_fee,
  caddy_fee,
  max_players,
  organizer_id,
  organizer_name,
  status,
  course_id,
  course_name,
  notes,
  cutoff,
  auto_waitlist,
  recurring,
  created_at,
  updated_at
) VALUES

{',\n\n'.join(sql_parts)};

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT COUNT(*) as november_events
FROM society_events
WHERE organizer_id = '{organizer_id}'
  AND date >= '2025-11-01'
  AND date <= '2025-11-30';
'''

with open('sql/import-trgg-november-schedule.sql', 'w') as f:
    f.write(sql_content)

print(f"\nGenerated SQL with {len(sql_parts)} November events")
print("File: sql/import-trgg-november-schedule.sql")
