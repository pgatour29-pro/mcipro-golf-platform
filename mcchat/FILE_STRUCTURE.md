# File Structure (Chat)

- chat_messages_schema.sql  → ALL tables + RLS + triggers + RPC
- fix_chat_messages_rls.sql → Safe replacement policies (idempotent)
- chat-database-functions.js → Supabase data access & realtime
- chat-system-full.js → Minimal UI glue (initChat/openConversation/send)
- chat-system-styles.css → Basic layout
- supabaseClient.js → Client initialization
- ARCHITECTURE_DIAGRAM.md → Diagram & notes
- README.md → Setup & troubleshooting
