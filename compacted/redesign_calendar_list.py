#!/usr/bin/env python3
"""
Redesign Society Organizer Calendar from grid to list view (TRGG style)
"""

print("Reading index.html...")
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the calendar grid section to replace
calendar_grid_start = content.find('                            <!-- Calendar Grid -->')
calendar_legend_end = content.find('                            </div>\n                        </div>\n                    </div>\n\n                    <!-- Event Sidebar (1/3 width on large screens) -->')

if calendar_grid_start == -1 or calendar_legend_end == -1:
    print("[ERROR] Could not find calendar grid section")
    exit(1)

print(f"[OK] Found calendar grid section")

# New list-based calendar design
new_calendar_html = '''                            <!-- Calendar Schedule List -->
                            <div class="overflow-x-auto">
                                <table class="w-full" id="calendarEventsTable">
                                    <thead class="bg-gray-50 border-b-2 border-gray-200">
                                        <tr>
                                            <th class="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Date</th>
                                            <th class="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Day</th>
                                            <th class="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Event</th>
                                            <th class="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Course</th>
                                            <th class="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Depart</th>
                                            <th class="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Fee</th>
                                            <th class="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Players</th>
                                            <th class="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody id="calendarEventsBody" class="bg-white divide-y divide-gray-200">
                                        <!-- Events will be rendered here by JavaScript -->
                                        <tr>
                                            <td colspan="8" class="px-6 py-12 text-center text-gray-500">
                                                <span class="material-symbols-outlined text-5xl mb-2 block">event_busy</span>
                                                <p class="text-sm">No events scheduled for this month</p>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <!-- Legend -->
                            <div class="mt-6 pt-4 border-t border-gray-200">
                                <div class="flex flex-wrap gap-4 text-sm">
                                    <div class="flex items-center gap-2">
                                        <div class="w-3 h-3 rounded-full bg-green-500"></div>
                                        <span class="text-gray-600">Open</span>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <div class="w-3 h-3 rounded-full bg-blue-500"></div>
                                        <span class="text-gray-600">Soon (7 days)</span>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <div class="w-3 h-3 rounded-full bg-red-500"></div>
                                        <span class="text-gray-600">Closed</span>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <div class="w-3 h-3 rounded-full bg-gray-400"></div>
                                        <span class="text-gray-600">Past</span>
                                    </div>
                                </div>
                            </div>'''

# Replace the old calendar grid with new list view
content_before = content[:calendar_grid_start]
content_after = content[calendar_legend_end:]

new_content = content_before + new_calendar_html + content_after

print("[OK] Replaced calendar grid with list view")

# Write updated content
print("Writing updated index.html...")
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("")
print("="*60)
print("SUCCESS: Calendar redesigned to list view")
print("="*60)
print("")
print("Next step: Update SocietyCalendar JavaScript class")
print("to render events as table rows instead of grid cells")
