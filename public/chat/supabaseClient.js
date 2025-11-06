/**
 * Supabase Client Export for Chat System
 * Provides access to the global Supabase client initialized in supabase-config.js
 */

export async function getSupabaseClient() {
    // Wait for SupabaseDB to be initialized
    if (typeof window.SupabaseDB !== 'undefined') {
        await window.SupabaseDB.waitForReady();
        return window.SupabaseDB.client;
    }

    console.error('[supabaseClient] Global SupabaseDB not found!');
    throw new Error('Supabase client not initialized');
}

export default getSupabaseClient;
