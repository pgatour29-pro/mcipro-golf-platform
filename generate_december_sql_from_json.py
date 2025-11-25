#!/usr/bin/env python3
"""Generate SQL for TRGG December 2025 schedule from the user-provided JSON"""
import json

user_provided_json = """
[
  {
    "date": 1,
    "day": "Mon",
    "courses": ["Greenwood (2-Way)"],
    "depart": ["08:10"],
    "tee_off": ["09:20"],
    "green_fee": 1750,
    "caddy": "Incl",
    "cart": "Incl"
  },
  {
    "date": 2,
    "day": "Tue",
    "courses": [
      "Khao Kheow (6 Groups) A-B",
      "Khao Kheow (6 Groups) C-A"
    ],
    "depart": ["10:25"],
    "tee_off": ["11:40"],
    "green_fee": 2250,
    "caddy": "Incl",
    "cart": "Incl"
  },
  {
    "date": 3,
    "day": "Wed",
    "courses": ["Green Valley (2-Way)"],
    "depart": ["10:20"],
    "tee_off": ["11:20"],
    "green_fee": 2650,
    "caddy": "Incl",
    "cart": "Incl"
  },
  {
    "date": 4,
    "day": "Thu",
    "courses": ["Phoenix L-O", "Phoenix M-L"],
    "depart": ["11:30", "11:15"],
    "tee_off": ["12:32", "12:16"],
    "green_fee": 2650,
    "caddy": "Incl",
    "cart": "Incl"
  },
  {
    "date": 5,
    "day": "Fri",
    "courses": ["Treasure Hill (2-Way) (Holiday) Free Food Friday"],
    "depart": ["11:00"],
    "tee_off": ["12:10"],
    "green_fee": 2150,
    "caddy": "Incl",
    "cart": "Incl"
  },
  {
    "date": 6,
    "day": "Sat",
    "courses": ["Plutaluang"],
    "depart": ["08:45"],
    "tee_off": ["10:00"],
    "green_fee": 1750,
    "caddy": "Incl",
    "cart": "Incl"
  },
  {
    "date": 8,
    "day": "Mon",
    "courses": ["Eastern Star"],
    "depart": ["09:10"],
    "tee_off": ["10:10"],
    "green_fee": 2050,
    "caddy": "Incl",
    "cart": "Incl"
  },
  {
    "date": 9,
    "day": "Tue",
    "courses": ["Bangpakong"],
    "depart": ["08:45"],
    "tee_off": ["10:15"],
    "green_fee": 1850,
    "caddy": "Incl",
    "cart": "Incl"
  },
  {
    "date": 10,
    "day": "Wed",
    "courses": ["Pleasant Valley (2-Way) (Holiday)"],
    "depart": ["11:00"],
    "tee_off": ["12:15"],
    "green_fee": 2350,
    "caddy": "Incl",
    "cart": "Incl"
  },
  {
    "date": 11,
    "day": "Thu",
    "courses": ["Phoenix (11 Groups) M-L"],
    "depart": ["10:00"],
    "tee_off": ["11:05"],
    "green_fee": 2650,
    "caddy": "Incl",
    "cart": "Incl"
  },
  {
    "date": 12,
    "day": "Fri",
    "courses": ["Burapha A-B Free Food Friday"],
    "depart": ["09:00"],
    "tee_off": ["10:00"],
    "green_fee": 2750,
    "caddy": "Incl",
    "cart": "Incl"
  },
  {
    "date": 13,
    "day": "Sat",
    "courses": ["Greenwood"],
    "depart": ["07:00"],
    "tee_off": ["08:10"],
    "green_fee": 1850,
    "caddy": "Incl",
    "cart": "Incl"
  },
  {
    "date": 15,
    "day": "Mon",
    "courses": [
      "Khao Kheow (6 Groups) A-B",
      "Khao Kheow (6 Groups) C-A"
    ],
    "depart": ["10:25"],
    "tee_off": ["11:40"],
    "green_fee": 2250,
    "caddy": "Incl",
    "cart": "Incl"
  },
  {
    "date": 16,
    "day": "Tue",
    "courses": ["Pattana (2-Way)"],
    "depart": ["07:00"],
    "tee_off": ["08:00"],
    "green_fee": 2450,
    "caddy": "Incl",
    "cart": "Incl"
  },
  {
    "date": 17,
    "day": "Wed",
    "courses": ["Royal Lakeside (2-Way)"],
    "depart": ["11:00"],
    "tee_off": ["12:15"],
    "green_fee": 2350,
    "caddy": "Incl",
    "cart": "Incl"
  },
  {
    "date": 18,
    "day": "Thu",
    "courses": [
      "Phoenix (6 Groups) L-O",
      "Phoenix (6 Groups) O-M"
    ],
    "depart": ["11:50", "11:25"],
    "tee_off": ["12:48", "12:24"],
    "green_fee": 2650,
    "caddy": "Incl",
    "cart": "Incl"
  },
  {
    "date": 19,
    "day": "Fri",
    "courses": ["Burapha A-B Free Food Friday"],
    "depart": ["09:00"],
    "tee_off": ["10:00"],
    "green_fee": 2750,
    "caddy": "Incl",
    "cart": "Incl"
  },
  {
    "date": 20,
    "day": "Sat",
    "courses": ["Silky Oak"],
    "depart": ["08:30"],
    "tee_off": ["09:30"],
    "green_fee": 2650,
    "caddy": "Incl",
    "cart": "Incl"
  },
  {
    "date": 22,
    "day": "Mon",
    "courses": ["Treasure Hill"],
    "depart": ["08:45"],
    "tee_off": ["10:00"],
    "green_fee": 1850,
    "caddy": "Incl",
    "cart": "Incl"
  },
  {
    "date": 23,
    "day": "Tue",
    "courses": [
      "Khao Kheow (6 Groups) A-B",
      "Khao Kheow (6 Groups) C-A"
    ],
    "depart": ["10:25"],
    "tee_off": ["11:40"],
    "green_fee": 2250,
    "caddy": "Incl",
    "cart": "Incl"
  },
  {
    "date": 24,
    "day": "Wed",
    "courses": ["Bangpakong"],
    "depart": ["08:00"],
    "tee_off": ["09:30"],
    "green_fee": 1850,
    "caddy": "Incl",
    "cart": "Incl"
  },
  {
    "date": 25,
    "day": "Thu",
    "courses": ["Greenwood"],
    "depart": ["08:10"],
    "tee_off": ["09:20"],
    "green_fee": 1750,
    "caddy": "Incl",
    "cart": "Incl"
  },
  {
    "date": 26,
    "day": "Fri",
    "courses": ["Burapha A-B Two Man Scramble"],
    "depart": ["09:00"],
    "tee_off": ["10:00"],
    "green_fee": 2950,
    "caddy": "Incl",
    "cart": "Incl"
  },
  {
    "date": 27,
    "day": "Sat",
    "courses": ["Mountain Shadow"],
    "depart": ["09:00"],
    "tee_off": ["10:15"],
    "green_fee": 1950,
    "caddy": "Incl",
    "cart": "Incl"
  },
  {
    "date": 29,
    "day": "Mon",
    "courses": ["Eastern Star"],
    "depart": ["09:10"],
    "tee_off": ["10:10"],
    "green_fee": 2050,
    "caddy": "Incl",
    "cart": "Incl"
  },
  {
    "date": 30,
    "day": "Tue",
    "courses": ["Pattana"],
    "depart": ["07:00"],
    "tee_off": ["08:00"],
    "green_fee": 2450,
    "caddy": "Incl",
    "cart": "Incl"
  },
  {
    "date": 31,
    "day": "Wed",
    "courses": ["St Andrews (Holiday) Monthly Medal Stroke"],
    "depart": ["08:00"],
    "tee_off": ["09:00"],
    "green_fee": 2850,
    "caddy": "Incl",
    "cart": "Incl"
  }
]
"""
events = json.loads(user_provided_json)

# Generate SQL
sql_parts = []
organizer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'

for event in events:
    # There can be multiple courses for a single day, so we create an event for each
    for i in range(len(event['courses'])):
        date_num = event['date']
        course = event['courses'][i]
        
        # Use the corresponding departure and tee_off time if available, otherwise use the first one
        departure = event['depart'][i] if i < len(event['depart']) else event['depart'][0]
        first_tee = event['tee_off'][i] if i < len(event['tee_off']) else event['tee_off'][0]
        
        green_fee_str = str(event['green_fee'])

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
        date_str = f'2025-12-{int(date_num):02d}'
        event_id = f'trgg-2025-12-{int(date_num):02d}-{course_clean.lower().replace(" ", "-")[:20]}'

        # Cutoff is day before at 6pm
        cutoff_date = f'2025-12-{int(date_num)-1:02d} 18:00:00+07' if int(date_num) > 1 else '2025-11-30 18:00:00+07'

        # I will try to use the column names that I think are correct, based on the errors.
        # I will use title, event_date, and green_fee instead of name, date, and base_fee.
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
-- IMPORT TRGG PATTAYA DECEMBER 2025 SCHEDULE
-- =====================================================
-- Imports golf events from TRGG Pattaya schedule
-- Date range: December 1-31, 2025
-- Source: User-provided JSON
-- =====================================================

INSERT INTO society_events (
  id,
  title,  
  event_date,
  start_time,
  green_fee,
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

SELECT COUNT(*) as december_events
FROM society_events
WHERE organizer_id = '{organizer_id}'
  AND event_date >= '2025-12-01'
  AND event_date <= '2025-12-31';
'''

with open('sql/import-trgg-december-schedule-from-json.sql', 'w') as f:
    f.write(sql_content)

print(f"\nGenerated SQL with {len(sql_parts)} December events")
print("File: sql/import-trgg-december-schedule-from-json.sql")
