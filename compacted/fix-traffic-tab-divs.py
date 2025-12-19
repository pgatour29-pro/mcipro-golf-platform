import sys

# Read index.html
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Find and fix the extra closing divs in traffic tab
broken_section = """                    </div>
                </div>


                </div>


                </div>
            </div>

            <!-- Staff Management Tab -->"""

fixed_section = """                    </div>
                </div>
            </div>

            <!-- Staff Management Tab -->"""

if broken_section not in content:
    print('ERROR: Could not find broken traffic tab section')
    sys.exit(1)

content = content.replace(broken_section, fixed_section)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print('SUCCESS: Fixed Traffic tab closing divs')
print('  - Removed 4 extra empty closing </div> tags')
print('  - Traffic tab now closes properly')
print('  - Other tabs should no longer have content bleeding through')
