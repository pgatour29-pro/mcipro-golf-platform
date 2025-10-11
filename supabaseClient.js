// Supabase client module for chat system
// Reuses existing MyCaddyPro Supabase configuration

// Wait for the existing SupabaseDB to be ready
function waitForSupabaseDB() {
    return new Promise((resolve) => {
        if (window.SupabaseDB && window.SupabaseDB.ready) {
            resolve(window.SupabaseDB.client);
        } else if (window.SupabaseDB && window.SupabaseDB.readyPromise) {
            window.SupabaseDB.readyPromise.then(() => {
                resolve(window.SupabaseDB.client);
            });
        } else {
            // Poll until ready
            const checkInterval = setInterval(() => {
                if (window.SupabaseDB && window.SupabaseDB.ready) {
                    clearInterval(checkInterval);
                    resolve(window.SupabaseDB.client);
                }
            }, 100);
        }
    });
}

// Export the Supabase client (will be set when available)
export let supabase = null;

// Initialize and export
(async () => {
    supabase = await waitForSupabaseDB();
    console.log('[Chat] Supabase client ready');
})();

// Also export a function to get the client
export async function getSupabaseClient() {
    if (supabase) return supabase;
    supabase = await waitForSupabaseDB();
    return supabase;
}
