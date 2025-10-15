# EXACT IMPLEMENTATION STEPS

## Step 1: Get User IDs (30 seconds)

Run this in Supabase SQL editor:

```sql
SELECT id, email FROM auth.users;
```

Copy Pete's and Donald's actual UUID values.

## Step 2: Update the SQL (1 minute)

Open `FINAL_COMPLETE_FIX.sql` and replace:
- `'uuid_pete'` with Pete's actual UUID
- `'uuid_donald'` with Donald's actual UUID

## Step 3: Run the SQL (1 minute)

Paste the updated SQL into Supabase SQL editor and run it.

It will:
- Create the chat_users view
- Seed Pete and Donald with proper names
- Create search_chat_contacts() and list_chat_contacts() RPCs

## Step 4: Update Frontend (5 minutes)

Replace your contact loading code with the code from `contacts.ts`:

```typescript
// Use the RPC functions instead of direct table queries
const contacts = await fetchContacts(searchQuery);
```

Replace your rendering code with the pattern from `renderContacts-example.js`:

```javascript
// Render actual names, not just "2 users"
contacts.forEach((c) => {
  // ... create list item with c.display_name, c.user_code, etc.
});
```

## Step 5: Test

1. Refresh the page
2. Search for "Donald" → should find Donald Lump (16)
3. Search for "16" → should find Donald Lump, NOT yourself
4. Search for "007" → should find Pete Park
5. Empty search → should show both users with names visible

## What You'll See

- **Contact list shows:** "Pete Park (007)" and "Donald Lump (16)"
- **Searching "16":** Returns Donald Lump only
- **Searching "donald":** Returns Donald Lump
- **Never shows yourself in results**

## If It Doesn't Work

1. Check: `SELECT * FROM public.chat_users;` shows both rows with proper display_name
2. Check: Frontend is calling `supabase.rpc('search_chat_contacts', {q})` not direct table queries
3. Check: Render loop actually runs (add console.log in forEach)
