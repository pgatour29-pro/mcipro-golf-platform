#!/bin/bash

# Fix 1: Update line ~398 - select statement in queryContactsServer
sed -i "398s/.select('line_user_id, name, caddy_number')/.select('id, display_name, username, line_user_id')/" chat-system-full.js

# Fix 2: Update line ~399 - or clause in queryContactsServer  
sed -i "399s/.or(\`name.ilike.%\${q}%,caddy_number.ilike.%\${q}%\`)/.or(\`display_name.ilike.%\${q}%,username.ilike.%\${q}%,line_user_id.ilike.%\${q}%\`)/" chat-system-full.js

# Fix 3: Update line ~1131 - select statement in initChat
sed -i "1131s/.select('line_user_id, name, caddy_number')/.select('id, display_name, username, line_user_id')/" chat-system-full.js

# Fix 4: Update line ~1132 - neq clause in initChat
sed -i "1132s/.neq('line_user_id', user.id)/.neq('id', user.id)/" chat-system-full.js

# Fix 5: Update line ~1133 - order clause in initChat
sed -i "1133s/.order('name')/.order('display_name')/" chat-system-full.js

echo "Chat fixes applied!"
