import sys

# Read the main file
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Read the professional traffic HTML
with open('traffic-professional.html', 'r', encoding='utf-8') as f:
    new_traffic = f.read()

# Read the updated JavaScript module
with open('traffic-monitor-update.js', 'r', encoding='utf-8') as f:
    traffic_js = f.read()

# Step 1: Replace the Traffic Monitor HTML
old_traffic_start = '                <!-- Live Course Traffic Monitor - COMPACT -->'
old_traffic_end = '                </div>\n\n\n                </div>\n\n                <!-- Live Pace Monitoring - COMPACT -->'

start_idx = content.find(old_traffic_start)
end_idx = content.find(old_traffic_end)

if start_idx == -1 or end_idx == -1:
    print('ERROR: Could not find Traffic Monitor section boundaries')
    sys.exit(1)

# Replace traffic section
content = content[:start_idx] + new_traffic + '\n\n' + content[end_idx:]
print('SUCCESS: Replaced Traffic Monitor HTML with professional design')

# Step 2: Replace the TrafficMonitor JavaScript module
old_js_start = '        // ===========================================================\n        // TRAFFIC MONITOR MODULE - Dynamic Hole Rendering & History\n        // ===========================================================\n        '
old_js_end = '\n        // ==========================================================='

js_start_idx = content.find(old_js_start)
if js_start_idx == -1:
    print('ERROR: Could not find TrafficMonitor JavaScript module')
    sys.exit(1)

# Find the end marker
js_end_idx = content.find(old_js_end, js_start_idx + len(old_js_start))
if js_end_idx == -1:
    print('ERROR: Could not find JavaScript module end')
    sys.exit(1)

# Replace the JS module
new_js_section = old_js_start + traffic_js + '\n        // ==========================================================='
content = content[:js_start_idx] + new_js_section + content[js_end_idx + len(old_js_end):]
print('SUCCESS: Updated TrafficMonitor JavaScript module')

# Write back
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print('SUCCESS: Professional traffic monitor deployed')
