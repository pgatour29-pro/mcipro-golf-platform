# Fix the onConflict to upsert
with open('auth-bridge-v2.js', 'r') as f:
    content = f.read()

# Replace first occurrence
content = content.replace(
    '''    const { error: insertErr } = await supabase
      .from('profiles')
      .insert(profilePayload)
      .onConflict('line_user_id')
      .merge();''',
    '''    const { error: insertErr } = await supabase
      .from('profiles')
      .upsert(profilePayload, { onConflict: 'line_user_id' });'''
)

# Replace second occurrence  
content = content.replace(
    '''        const { error: second } = await supabase
          .from('profiles')
          .insert(rescue)
          .onConflict('line_user_id')
          .merge();''',
    '''        const { error: second } = await supabase
          .from('profiles')
          .upsert(rescue, { onConflict: 'line_user_id' });'''
)

with open('auth-bridge-v2.js', 'w') as f:
    f.write(content)

print("✓ Replaced onConflict().merge() with upsert()")
