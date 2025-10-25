#!/usr/bin/env python3
"""Convert course dropdown to text input with datalist"""

# Read the file
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Old select dropdown
old_section = '''                                <select id="eventCourse" class="w-full rounded-lg border px-3 py-2" required>
                                    <option value="">Select Golf Course...</option>
                                    <option value="Pattana Golf">Pattana Golf</option>
                                    <option value="Siam Waterside">Siam Waterside</option>
                                    <option value="Siam Rolling Hills">Siam Rolling Hills</option>
                                    <option value="Siam Plantation">Siam Plantation</option>
                                    <option value="Siam Old Course">Siam Old Course</option>
                                    <option value="Pattaya CC">Pattaya CC</option>
                                    <option value="Hermes Golf">Hermes Golf</option>
                                    <option value="Patana Golf Resort">Patana Golf Resort</option>
                                    <option value="Burapha">Burapha</option>
                                    <option value="Lamchabang">Lamchabang</option>
                                    <option value="Pleasant Valley">Pleasant Valley</option>
                                    <option value="Green Valley">Green Valley</option>
                                    <option value="Silky Oaks">Silky Oaks</option>
                                    <option value="St. Andrews 2000">St. Andrews 2000</option>
                                    <option value="Pattavia">Pattavia</option>
                                    <option value="Phoenix">Phoenix</option>
                                    <option value="Bangkokong Riverside">Bangkokong Riverside</option>
                                    <option value="Royal Lakeside">Royal Lakeside</option>
                                    <option value="Pattaya Country Club">Pattaya Country Club</option>
                                    <option value="Khao Kheow">Khao Kheow</option>
                                    <option value="Treasure Hills">Treasure Hills</option>
                                    <option value="Eastern Star">Eastern Star</option>
                                </select>'''

# New text input with datalist
new_section = '''                                <input type="text" id="eventCourse" list="courseList" class="w-full rounded-lg border px-3 py-2" placeholder="Type or select golf course..." required>
                                <datalist id="courseList">
                                    <option value="Bangpakong">
                                    <option value="Bangpra">
                                    <option value="Burapha">
                                    <option value="Eastern Star">
                                    <option value="Greenwood">
                                    <option value="Green Valley">
                                    <option value="Hermes Golf">
                                    <option value="Khao Kheow">
                                    <option value="Lamchabang">
                                    <option value="Patana Golf Resort">
                                    <option value="Pattana Golf">
                                    <option value="Pattavia">
                                    <option value="Pattaya CC">
                                    <option value="Pattaya Country Club">
                                    <option value="Phoenix">
                                    <option value="Pleasant Valley">
                                    <option value="Plutaluang">
                                    <option value="Royal Lakeside">
                                    <option value="Siam Old Course">
                                    <option value="Siam Plantation">
                                    <option value="Siam Rolling Hills">
                                    <option value="Siam Waterside">
                                    <option value="Silky Oaks">
                                    <option value="St. Andrews 2000">
                                    <option value="Treasure Hills">
                                </datalist>'''

# Replace
if old_section in content:
    content = content.replace(old_section, new_section)
    print("Successfully replaced course dropdown with text input")
else:
    print("Could not find exact match for course dropdown")
    print("Searching for variations...")

# Write back
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("File updated successfully!")
