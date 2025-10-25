#!/usr/bin/env python3
"""Fix organizer calendar sidebar to show TRGG logo"""

# Read the file
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Find and replace the event card in showEventsForDate (around line 44301)
old_calendar_event = '''            html += `
                <div class="p-3 border border-gray-200 rounded-lg hover:shadow-md transition cursor-pointer"
                     onclick="window.SocietyOrganizerSystem.editEvent('${event.id}')">
                    <div class="flex items-start gap-2 mb-2">
                        <div class="w-3 h-3 rounded-full ${this.getEventColor(event)} mt-1"></div>
                        <div class="flex-1">
                            <div class="font-semibold text-gray-800">${event.name}</div>
                            <div class="text-xs text-gray-600">${event.eventFormat || 'Format not set'}</div>
                        </div>
                    </div>'''

new_calendar_event = '''            html += `
                <div class="p-3 border border-gray-200 rounded-lg hover:shadow-md transition cursor-pointer"
                     onclick="window.SocietyOrganizerSystem.editEvent('${event.id}')">
                    <div class="flex items-start gap-2 mb-2">
                        ${event.organizerId === 'trgg-pattaya' || event.organizerName === 'Travellers Rest Golf Group' ? `<img src="societylogos/trgg.jpg" class="w-8 h-8 rounded-full object-cover">` : '<div class="w-3 h-3 rounded-full ' + this.getEventColor(event) + ' mt-1"></div>'}
                        <div class="flex-1">
                            <div class="font-semibold text-gray-800">${event.name}</div>
                            <div class="text-xs text-gray-600">${event.organizerId === 'trgg-pattaya' || event.organizerName === 'Travellers Rest Golf Group' ? 'Travellers Rest Golf Group' : event.eventFormat || 'Format not set'}</div>
                        </div>
                    </div>'''

# Replace calendar event card
if old_calendar_event in content:
    content = content.replace(old_calendar_event, new_calendar_event)
    print("Fixed organizer calendar sidebar TRGG logo")
else:
    print("WARNING: Could not find calendar event card to replace")

# Write back
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Organizer calendar logo fix complete")
