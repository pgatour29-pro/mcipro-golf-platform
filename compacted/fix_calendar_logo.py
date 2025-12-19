#!/usr/bin/env python3
"""Fix calendar sidebar to show TRGG logo"""

# Read the file
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Find and replace the logo section in showCalendarDate (around line 42975)
old_calendar_logo = '''                                <div class="flex items-center mb-2">
                                    ${event.societyLogo ? `<img src="${event.societyLogo}" class="w-6 h-6 rounded-full mr-2 object-cover">` : ''}
                                    <div class="flex-1">
                                        <div class="font-bold text-sm text-gray-900 truncate">${event.name}</div>
                                        <div class="text-xs text-gray-600">${event.societyName || event.organizerName}</div>
                                    </div>
                                </div>'''

new_calendar_logo = '''                                <div class="flex items-center mb-2">
                                    ${event.organizerId === 'trgg-pattaya' || event.organizerName === 'Travellers Rest Golf Group' ? `<img src="societylogos/trgg.jpg" class="w-6 h-6 rounded-full mr-2 object-cover">` : event.societyLogo ? `<img src="${event.societyLogo}" class="w-6 h-6 rounded-full mr-2 object-cover">` : ''}
                                    <div class="flex-1">
                                        <div class="font-bold text-sm text-gray-900 truncate">${event.name}</div>
                                        <div class="text-xs text-gray-600">${event.organizerId === 'trgg-pattaya' || event.organizerName === 'Travellers Rest Golf Group' ? 'Travellers Rest Golf Group' : event.societyName || event.organizerName}</div>
                                    </div>
                                </div>'''

# Replace calendar logo code
if old_calendar_logo in content:
    content = content.replace(old_calendar_logo, new_calendar_logo)
    print("Fixed calendar sidebar TRGG logo")
else:
    print("WARNING: Could not find calendar logo code to replace")

# Write back
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Calendar logo fix complete")
