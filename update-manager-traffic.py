import sys

# Read the main file
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Read the replacement HTML sections
with open('traffic-compact.html', 'r', encoding='utf-8') as f:
    new_traffic = f.read()

with open('pace-compact.html', 'r', encoding='utf-8') as f:
    new_pace = f.read()

with open('teesheet-compact.html', 'r', encoding='utf-8') as f:
    new_teesheet = f.read()

# Find and replace Traffic Monitor section
old_traffic_start = '                <!-- Live Course Traffic Monitor -->'
old_traffic_end = '                </div>\n\n                <!-- Live Pace Monitoring -->'

start_idx = content.find(old_traffic_start)
end_idx = content.find(old_traffic_end)

if start_idx == -1 or end_idx == -1:
    print('ERROR: Could not find Traffic Monitor section boundaries')
    sys.exit(1)

# Replace traffic section
content = content[:start_idx] + new_traffic + '\n\n' + content[end_idx:]
print('SUCCESS: Replaced Traffic Monitor section')

# Find and replace Pace Monitoring section
old_pace_start = '                <!-- Live Pace Monitoring -->'
old_pace_end = '                </div>\n\n                <!-- Today\'s Tee Sheet -->'

start_idx = content.find(old_pace_start)
end_idx = content.find(old_pace_end)

if start_idx == -1 or end_idx == -1:
    print('ERROR: Could not find Pace Monitoring section boundaries')
    sys.exit(1)

# Replace pace section
content = content[:start_idx] + new_pace + '\n\n' + content[end_idx:]
print('SUCCESS: Replaced Pace Monitoring section')

# Find and replace Tee Sheet section
old_teesheet_start = '                <!-- Today\'s Tee Sheet -->'
# Find the end by looking for the closing div of the card, then the next major section
# We'll find the end of the table structure

start_idx = content.find(old_teesheet_start)
if start_idx == -1:
    print('ERROR: Could not find Tee Sheet section start')
    sys.exit(1)

# Find the closing </div> for this card section
# Look for the pattern that ends this section
search_start = start_idx + len(old_teesheet_start)
# Find the ending pattern - look for </table> then </div> then </div>
temp_idx = content.find('</tbody>\n                        </table>\n                    </div>\n                </div>', search_start)

if temp_idx == -1:
    print('ERROR: Could not find Tee Sheet section end')
    sys.exit(1)

# Include the full closing tags
end_idx = temp_idx + len('</tbody>\n                        </table>\n                    </div>\n                </div>')

# Replace teesheet section
content = content[:start_idx] + new_teesheet + content[end_idx:]
print('SUCCESS: Replaced Tee Sheet section')

# Write back
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print('SUCCESS: All three sections updated successfully')
