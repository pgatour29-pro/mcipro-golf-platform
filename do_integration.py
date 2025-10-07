#!/usr/bin/env python3
"""
Final Integration Script - Replaces Manager Analytics content with GM Dashboard
"""

import re

# Read the extracted GM Dashboard content
with open(r'C:\Users\pete\Documents\MciPro\gm_dashboard_extracted.txt', 'r', encoding='utf-8') as f:
    extracted = f.read()

# Split HTML and JavaScript
html_match = re.search(r'=== GM DASHBOARD HTML CONTENT ===(.*?)=== GM DASHBOARD JAVASCRIPT ===', extracted, re.DOTALL)
js_match = re.search(r'=== GM DASHBOARD JAVASCRIPT ===(.*)', extracted, re.DOTALL)

gm_html = html_match.group(1).strip() if html_match else ''
gm_js = js_match.group(1).strip() if js_match else ''

# Read index.html
with open(r'C:\Users\pete\Documents\MciPro\index.html', 'r', encoding='utf-8') as f:
    index_content = f.read()

# Replace the Manager Analytics tab content (find the div and replace its contents)
# Pattern to find: <div id="manager-analytics" class="tab-content hidden">...content...</div>\n\n            <!-- Reports Tab -->
pattern = r'(<div id="manager-analytics" class="tab-content hidden">)(.*?)(</div>\s*\n\s*<!-- Reports Tab -->)'

def replacement(match):
    return match.group(1) + '\n                ' + gm_html + '\n            ' + match.group(3)

index_content = re.sub(pattern, replacement, index_content, flags=re.DOTALL)

# Find where to insert JavaScript (before </body> tag)
# Insert before the closing </body> tag
js_insertion = f'''
    <script>
    /* ===================================================================
       GM DASHBOARD ENTERPRISE COCKPIT V3 - INTEGRATED JAVASCRIPT
       =================================================================== */
    (function() {{
        // Scope all GM Dashboard code to avoid conflicts
        {gm_js}
    }})();
    </script>
'''

index_content = index_content.replace('</body>', js_insertion + '\n</body>')

# Write the updated index.html
with open(r'C:\Users\pete\Documents\MciPro\index.html', 'w', encoding='utf-8') as f:
    f.write(index_content)

print("Integration complete!")
print(f"HTML integrated: {len(gm_html)} characters")
print(f"JavaScript integrated: {len(gm_js)} characters")
print("index.html has been updated successfully!")
