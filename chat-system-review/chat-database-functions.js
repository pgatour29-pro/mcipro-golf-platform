    async getChatMessages(roomId, limit = 50) {
        const { data, error } = await this.client
            .from('chat_messages')
            .select('*')
            .eq('room_id', roomId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('[Supabase] Error fetching chat messages:', error);
            return [];
        }

        return (data || []).reverse(); // Return in chronological order
    }

