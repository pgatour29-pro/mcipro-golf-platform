#!/usr/bin/env python3
"""Fix GolferEventsManager renderEventCard to show TRGG logo"""

# Read the file
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Find and replace the logo section in GolferEventsManager.renderEventCard (around line 42129)
old_logo_code = '''                            ${event.societyLogo ? `
                                <img src="${event.societyLogo}" alt="${event.societyName}" class="w-10 h-10 rounded-full border-2 border-white mr-3 object-cover bg-white">
                            ` : ''}'''

new_logo_code = '''                            ${event.organizerId === 'trgg-pattaya' || event.organizerName === 'Travellers Rest Golf Group' ? `
                                <img src="societylogos/trgg.jpg" alt="Travellers Rest Golf Group" class="w-10 h-10 rounded-full border-2 border-white mr-3 object-cover bg-white">
                            ` : event.societyLogo ? `
                                <img src="${event.societyLogo}" alt="${event.societyName}" class="w-10 h-10 rounded-full border-2 border-white mr-3 object-cover bg-white">
                            ` : ''}'''

# Replace logo code
content = content.replace(old_logo_code, new_logo_code)

# Also fix the society name display (around line 42135)
old_name_code = '''                                    ${event.societyName || event.organizerName || 'Society Golf'}'''

new_name_code = '''                                    ${event.organizerId === 'trgg-pattaya' || event.organizerName === 'Travellers Rest Golf Group' ? 'Travellers Rest Golf Group' : event.societyName || event.organizerName || 'Society Golf'}'''

# Replace name code
content = content.replace(old_name_code, new_name_code, 1)

# Write back
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed GolferEventsManager.renderEventCard to show TRGG logo")
print("Logo path: societylogos/trgg.jpg")
print("Condition: event.organizerId === 'trgg-pattaya' || event.organizerName === 'Travellers Rest Golf Group'")
