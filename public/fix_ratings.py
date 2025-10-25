import re

# Read the file
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix all rating displays - add toFixed(1) where missing
patterns = [
    (r'\$\{caddie\.rating\}', r'${caddie.rating?.toFixed(1) || "4.9"}'),
    (r'\$\{caddi\.rating\}', r'${caddi.rating?.toFixed(1) || "4.9"}'),
    (r'\$\{waitlist\.rating\}', r'${waitlist.rating?.toFixed(1) || "4.9"}'),
    (r'\$\{course\.rating\}', r'${course.rating?.toFixed(1) || "4.5"}'),
    (r'\$\{ningCaddi\.rating\}', r'${ningCaddi.rating?.toFixed(1) || "4.9"}'),
    # Fix patterns like: ${caddie.promotedCourse.rating}
    (r'\$\{caddie\.promotedCourse\.rating\}', r'${caddie.promotedCourse.rating?.toFixed(1) || "4.5"}'),
]

count = 0
for pattern, replacement in patterns:
    before = content
    content = re.sub(pattern, replacement, content)
    changes = len(re.findall(pattern, before))
    if changes > 0:
        print(f"Fixed {changes} instances of {pattern}")
        count += changes

# Write back
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"DONE: Fixed {count} rating displays total")
