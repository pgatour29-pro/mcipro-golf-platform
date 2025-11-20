import { initializeApp } from './modules/auth.js';
import { AppState } from './app-state.js';
import { UI } from './modules/ui.js';
import { loadCourses, loadSocieties, loadBookings } from './modules/data.js';
import { initDashboard } from './modules/dashboard.js';
import { setupGlobalEventListeners, setupTabNavigation, setupDrawerNavigation } from './modules/events.js';

document.addEventListener('DOMContentLoaded', async () => {
    await initializeApp();
    
    // This is a temporary solution to make the state and UI objects available globally.
    // In a real application, you would use a more robust state management solution.
    window.state = AppState;
    window.UI = UI;

    if (AppState.currentUser) {
        await initDashboard(AppState.currentUser.role);
        setupGlobalEventListeners();
        setupTabNavigation();
        setupDrawerNavigation();
    }
});
