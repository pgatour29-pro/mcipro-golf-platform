/**
 * Supabase Client Export for Chat System
 * Provides access to the global Supabase client initialized in supabase-config.js
 */

export function getSupabaseClient() {
    // Return the global supabase client
    if (typeof window.supabase !== 'undefined') {
        return window.supabase;
    }

    console.error('[supabaseClient] Global supabase client not found!');
    throw new Error('Supabase client not initialized');
}

export default getSupabaseClient;
