import sys

# Read the index.html file
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Read the traffic monitor JS
with open('traffic-monitor-update.js', 'r', encoding='utf-8') as f:
    traffic_js = f.read()

# Find the injection point (after closeHoleDetails function)
injection_marker = '''        }

        // Tee Sheet Loading
        function loadTeeSheet() {'''

if injection_marker not in content:
    print('ERROR: Could not find injection point')
    sys.exit(1)

# Prepare the injection
new_section = f'''        }}

        // ===========================================================
        // TRAFFIC MONITOR MODULE - Dynamic Hole Rendering & History
        // ===========================================================
        {traffic_js}
        // ===========================================================

        // Tee Sheet Loading
        function loadTeeSheet() {{'''

# Replace
content = content.replace(injection_marker, new_section)

# Write back
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print('SUCCESS: Traffic Monitor JavaScript injected successfully')
