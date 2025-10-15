// contacts.ts - Bulletproof contact fetch
type ChatContact = {
  id: string;
  display_name: string | null;
  username: string | null;
  user_code: string | null;
  avatar_url: string | null;
};

export async function fetchContacts(q: string) {
  const query = (q ?? '').trim();

  let resp;
  if (query.length === 0) {
    resp = await supabase.rpc('list_chat_contacts');
  } else {
    resp = await supabase.rpc('search_chat_contacts', { q: query });
  }

  const { data, error } = resp;
  if (error) throw error;

  // Normalize display text and filter any accidental self row (belt-and-suspenders)
  const myId = (await supabase.auth.getUser()).data.user?.id;
  const contacts: ChatContact[] = (data || [])
    .filter((c: ChatContact) => c.id !== myId)
    .map((c: ChatContact) => ({
      ...c,
      display_name: c.display_name || c.username || c.user_code || 'Unknown',
    }));

  return contacts;
}
