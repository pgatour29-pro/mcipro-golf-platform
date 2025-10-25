#!/usr/bin/env python3
"""Fix society role value to match dashboard routing"""

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: Change role value from "society" to "society_organizer" in profile creation form
old_role_input = '<input type="radio" name="role" value="society" class="sr-only">'
new_role_input = '<input type="radio" name="role" value="society_organizer" class="sr-only">'

if old_role_input in content:
    content = content.replace(old_role_input, new_role_input)
    print("Fixed role value in profile creation form")
else:
    print("Already fixed or could not find society role input")

# Fix 2: Update the switch case in handleProfileCreation to use 'society_organizer' instead of 'society'
old_case = '''                case 'society':
                    roleSpecificData.societyName = formData.get('societyName');
                    roleSpecificData.societyRole = formData.get('societyRole');
                    roleSpecificData.organizingExperience = formData.get('organizingExperience');
                    roleSpecificData.groupSize = formData.get('groupSize');
                    break;'''

new_case = '''                case 'society_organizer':
                    roleSpecificData.societyName = formData.get('societyName');
                    roleSpecificData.societyRole = formData.get('societyRole');
                    roleSpecificData.organizingExperience = formData.get('organizingExperience');
                    roleSpecificData.groupSize = formData.get('groupSize');
                    break;'''

if old_case in content:
    content = content.replace(old_case, new_case)
    print("Fixed switch case in handleProfileCreation")
else:
    print("Already fixed or could not find society switch case")

# Fix 3: Update showRoleSpecificFields to handle both 'society' and 'society_organizer'
# Replace the single 'society' case with both cases
old_show_fields = '''                case 'society':
                    fieldsHTML = `
                        <h3 class="text-lg font-semibold text-gray-900 mb-4">Society Organizer Information</h3>'''

new_show_fields = '''                case 'society':
                case 'society_organizer':
                    fieldsHTML = `
                        <h3 class="text-lg font-semibold text-gray-900 mb-4">Society Organizer Information</h3>'''

if old_show_fields in content:
    content = content.replace(old_show_fields, new_show_fields)
    print("Fixed showRoleSpecificFields to handle both society and society_organizer")
else:
    print("Already fixed or could not find showRoleSpecificFields society case")

# Write the updated content
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("\nSuccessfully fixed society organizer role!")
print("- Profile creation form now uses 'society_organizer' as role value")
print("- This matches the dashboard routing in redirectToDashboard()")
print("- Derek can now create a profile and be redirected to Society Organizer Dashboard")
