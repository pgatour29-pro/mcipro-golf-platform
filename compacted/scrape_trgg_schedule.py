"""
TRGG Pattaya Schedule Scraper
Scrapes golf schedule from trggpattaya.com and formats for society organizer import
"""

import requests
from bs4 import BeautifulSoup
import json
from datetime import datetime

def scrape_trgg_schedule():
    """Scrape TRGG Pattaya schedule for October 20-31 and November 1-29, 2025"""

    url = "https://www.trggpattaya.com/schedule/"

    print(f"Fetching schedule from {url}...")

    try:
        # Fetch the page
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()

        print("Page fetched successfully!")

        # Parse HTML
        soup = BeautifulSoup(response.content, 'html.parser')

        # Find the schedule table
        # This will need to be adjusted based on the actual HTML structure
        schedule_data = []

        # Look for table or schedule container
        # Common patterns: <table>, <div class="schedule">, etc.
        tables = soup.find_all('table')

        if not tables:
            print("No tables found. Looking for other schedule containers...")
            # Try finding divs with schedule-related classes
            schedule_divs = soup.find_all('div', class_=lambda x: x and 'schedule' in x.lower())
            print(f"Found {len(schedule_divs)} schedule containers")

        print(f"Found {len(tables)} tables on the page")

        # Process the first table (or adjust based on inspection)
        for table in tables:
            rows = table.find_all('tr')
            print(f"Processing table with {len(rows)} rows")

            # Skip header row
            for row in rows[1:]:
                cols = row.find_all(['td', 'th'])

                if len(cols) >= 8:  # Date, Day, Course, Departure, First Tee, G fee, Caddy, Cart
                    try:
                        date_text = cols[0].text.strip()
                        day_text = cols[1].text.strip()
                        course = cols[2].text.strip()
                        departure = cols[3].text.strip()
                        first_tee = cols[4].text.strip()
                        green_fee = cols[5].text.strip()
                        caddy_fee = cols[6].text.strip()
                        cart_fee = cols[7].text.strip()

                        # Parse date (adjust format based on website)
                        # Common formats: "20/10/2025", "2025-10-20", "Oct 20, 2025"
                        # We'll try to parse it flexibly

                        entry = {
                            "date": date_text,
                            "day": day_text,
                            "course": course,
                            "departure": departure,
                            "first_tee": first_tee,
                            "green_fee": green_fee,
                            "caddy_fee": caddy_fee,
                            "cart_fee": cart_fee
                        }

                        schedule_data.append(entry)
                        print(f"Extracted: {date_text} - {course}")

                    except Exception as e:
                        print(f"Error processing row: {e}")
                        continue

        if not schedule_data:
            print("\nNo schedule data extracted. The page structure may be different.")
            print("Saving raw HTML for inspection...")
            with open('trgg_schedule_raw.html', 'w', encoding='utf-8') as f:
                f.write(response.text)
            print("Raw HTML saved to: trgg_schedule_raw.html")
            print("Please inspect the HTML to determine the correct selectors.")
            return None

        # Filter for October 20-31 and November 1-29, 2025
        filtered_data = []
        for entry in schedule_data:
            # Add date filtering logic based on actual date format
            # For now, include all entries
            filtered_data.append(entry)

        print(f"\nExtracted {len(filtered_data)} schedule entries")

        # Save to JSON
        output_file = 'trgg_schedule.json'
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(filtered_data, f, indent=2, ensure_ascii=False)

        print(f"Schedule saved to: {output_file}")

        return filtered_data

    except requests.exceptions.RequestException as e:
        print(f"Error fetching page: {e}")
        return None
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return None


def format_for_society_organizer(schedule_data):
    """Convert TRGG schedule to Society Organizer event format"""

    if not schedule_data:
        print("No schedule data to format")
        return None

    # Format for your society organizer system
    # Adjust fields based on your database schema
    events = []

    for entry in schedule_data:
        event = {
            "event_date": entry.get("date"),
            "event_day": entry.get("day"),
            "course_name": entry.get("course"),
            "departure_time": entry.get("departure"),
            "first_tee_time": entry.get("first_tee"),
            "pricing": {
                "green_fee": entry.get("green_fee"),
                "caddy_fee": entry.get("caddy_fee"),
                "cart_fee": entry.get("cart_fee")
            },
            "event_type": "society_round",
            "status": "scheduled"
        }
        events.append(event)

    # Save formatted data
    output_file = 'trgg_schedule_formatted.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(events, f, indent=2, ensure_ascii=False)

    print(f"Formatted schedule saved to: {output_file}")
    print(f"Total events: {len(events)}")

    return events


if __name__ == "__main__":
    print("=" * 60)
    print("TRGG Pattaya Schedule Scraper")
    print("=" * 60)
    print()

    # Scrape the schedule
    schedule = scrape_trgg_schedule()

    if schedule:
        print("\n" + "=" * 60)
        print("Formatting for Society Organizer...")
        print("=" * 60)
        print()

        # Format for import
        formatted = format_for_society_organizer(schedule)

        print("\n" + "=" * 60)
        print("DONE!")
        print("=" * 60)
        print()
        print("Files created:")
        print("  - trgg_schedule.json (raw scraped data)")
        print("  - trgg_schedule_formatted.json (ready for import)")
        print()
        print("Next steps:")
        print("  1. Review the JSON files")
        print("  2. Import into your society organizer database")
    else:
        print("\nFailed to scrape schedule. Check the errors above.")
