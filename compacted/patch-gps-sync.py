import sys

# Read index.html
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Read the patch
with open('gps-sync-patch.js', 'r', encoding='utf-8') as f:
    patch = f.read()

# Find the old detectCurrentHole function
old_func_start = '        function detectCurrentHole() {'
old_func_end = '        }\n\n        function calculateDistances()'

start_idx = content.find(old_func_start)
if start_idx == -1:
    print('ERROR: Could not find detectCurrentHole function')
    sys.exit(1)

end_idx = content.find(old_func_end, start_idx)
if end_idx == -1:
    print('ERROR: Could not find end of detectCurrentHole function')
    sys.exit(1)

# Replace the function
new_content = content[:start_idx] + patch + '\n\n        function calculateDistances()' + content[end_idx + len(old_func_end):]

# Write back
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(new_content)

print('SUCCESS: GPS sync function added to detectCurrentHole')
print('  - updateGPSPositionsForTrafficMonitor() stores caddy position')
print('  - Updates mcipro_gps_positions localStorage')
print('  - Traffic Monitor will auto-sync booking.currentHole')
