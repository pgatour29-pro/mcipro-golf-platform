import { AppState } from '../app-state.js';
import { showScreen, showError, showLoading, hideLoading } from './ui.js';

async function initializeApp() {
    showLoading();
    
    try {
        // Attempt to initialize LIFF
        await liff.init({ liffId: "2008228481" });

        if (!liff.isLoggedIn()) {
            console.log("User not logged in with LINE. Redirecting to login.");
            liff.login();
            return; // Stop further execution until redirected
        }
        
        // Get user profile from LINE
        const lineProfile = await liff.getProfile();
        const idToken = liff.getIDToken();

        // Store LINE token for other services (e.g., Supabase Edge Functions)
        if (idToken) {
            sessionStorage.setItem('__line_id_token', idToken);
        }

        // Check for user in our database
        let { data: userProfile, error } = await SupabaseManager.client
            .from('profiles')
            .select('*')
            .eq('line_user_id', lineProfile.userId)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116: "exact one row" violation - means no user found
            console.error("Error fetching user profile:", error);
            showError("Could not connect to database. Please try again later.");
            return;
        }

        if (userProfile) {
            // User exists, update state and show main dashboard
            AppState.setCurrentUser({
                ...userProfile,
                displayName: lineProfile.displayName,
                avatarUrl: lineProfile.pictureUrl,
                lineUserId: lineProfile.userId
            });
            console.log('User profile loaded:', AppState.currentUser);
            showScreen('main');
        } else {
            // New user, show profile creation screen
            AppState.setCurrentUser({
                displayName: lineProfile.displayName,
                avatarUrl: lineProfile.pictureUrl,
                lineUserId: line.userId
            });
            console.log('New user detected. Showing profile creation.');
            showScreen('createProfile');
        }

    } catch (err) {
        console.error("LIFF Initialization failed:", err);
        // If LIFF fails, could be running in a regular browser
        // Check for a locally stored user session for web-based access
        const localUser = AppState.loadUserFromStorage();
        if (localUser) {
            AppState.setCurrentUser(localUser);
            console.log('LIFF failed, but local session found:', localUser);
            showScreen('main');
        } else {
            showError("Could not initialize app. Please ensure you are using the LINE app or a supported browser.");
        }
    } finally {
        hideLoading();
    }
}

export { initializeApp };
