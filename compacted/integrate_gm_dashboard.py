#!/usr/bin/env python3
"""
GM Dashboard Integration Script
Extracts content from gm_dashboard_enterprise_cockpit_v3.html and integrates it into index.html
"""

import re

# Read the GM Dashboard file
with open(r'C:\Users\pete\Documents\MciPro\manager\gm_dashboard_enterprise_cockpit_v3.html', 'r', encoding='utf-8') as f:
    gm_content = f.read()

# Extract the main module content (between <body> and </body>, excluding scripts)
# Find the AI Learning Indicator
ai_indicator_match = re.search(r'(<div class="ai-learning-indicator".*?</div>)', gm_content, re.DOTALL)
ai_indicator = ai_indicator_match.group(1) if ai_indicator_match else ''

# Extract the main GM module div (id="gm-module")
gm_module_match = re.search(r'(<div class="module" id="gm-module">.*?)(?=<script>)', gm_content, re.DOTALL)
gm_module = gm_module_match.group(1) if gm_module_match else ''

# Extract the Cockpit module (after </html>)
cockpit_match = re.search(r'(</html>.*?<div id="cockpit".*?</div>)', gm_content, re.DOTALL)
cockpit = ''
if cockpit_match:
    cockpit_text = cockpit_match.group(1)
    # Remove the </html> part
    cockpit = re.sub(r'</html>\s*', '', cockpit_text)

# Extract the drawer HTML
drawer_match = re.search(r'(<div class="drawer" id="drawer".*?</div>\s*</div>)', gm_content, re.DOTALL)
drawer = drawer_match.group(1) if drawer_match else ''

# Extract all JavaScript (everything between <script> tags, excluding external script tags)
js_blocks = re.findall(r'<script[^>]*>(.*?)</script>', gm_content, re.DOTALL)
# Filter out empty blocks and external scripts
js_code = '\n\n'.join([block.strip() for block in js_blocks if block.strip() and not block.strip().startswith('http')])

# Create the integrated GM Dashboard HTML
integrated_html = f'''<!-- GM Dashboard Enterprise Cockpit v3 - Integrated -->
<div class="gm-dashboard">
    {ai_indicator}
    {gm_module}
    {cockpit}
    {drawer}
</div>'''

# Create the output file with just the HTML and JS
with open(r'C:\Users\pete\Documents\MciPro\gm_dashboard_extracted.txt', 'w', encoding='utf-8') as f:
    f.write("=== GM DASHBOARD HTML CONTENT ===\n\n")
    f.write(integrated_html)
    f.write("\n\n\n=== GM DASHBOARD JAVASCRIPT ===\n\n")
    f.write(js_code)

print("Extraction complete!")
print(f"HTML length: {len(integrated_html)} characters")
print(f"JavaScript length: {len(js_code)} characters")
print("Output saved to: C:\\Users\\pete\\Documents\\MciPro\\gm_dashboard_extracted.txt")
