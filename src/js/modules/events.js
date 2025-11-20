import { UI } from './ui.js';
import { AppState } from '../app-state.js';
import { ProfessionalChat } from '../chat.js';
import { showTab, switchLanguage, logout } from './dashboard.js';

function setupGlobalEventListeners() {
    UI.query('#logoutButton').onclick = logout;
    UI.query('#drawerLogoutButton').onclick = logout;
    UI.query('#chatButton').onclick = () => ProfessionalChat.openChat();
    UI.query('#emergencyButton').onclick = () => UI.showError("Emergency feature not implemented.");

    // Language toggle
    UI.query('#langEnBtn').onclick = () => switchLanguage('en');
    UI.query('#langThBtn').onclick = () => switchLanguage('th');
}

function setupTabNavigation() {
    const dashboard = UI.query(`#${AppState.currentUser.role}Dashboard`);
    if (!dashboard) return;
    
    dashboard.addEventListener('click', (e) => {
        const button = e.target.closest('.tab-button');
        if (button && button.dataset.tab) {
            showTab(button.dataset.tab);
        }
    });
}

function setupDrawerNavigation() {
    const drawer = UI.query('#mobileDrawer');
    const overlay = UI.query('#mobileDrawerOverlay');
    const openBtn = UI.query('#hamburgerMenuBtn');
    const closeBtn = UI.query('#closeDrawerBtn');

    if (!drawer || !overlay || !openBtn || !closeBtn) return;
    
    const openDrawer = () => {
        overlay.classList.add('show');
        drawer.classList.add('open');
    }
    
    const closeDrawer = () => {
        overlay.classList.remove('show');
        drawer.classList.remove('open');
    }

    openBtn.onclick = openDrawer;
    closeBtn.onclick = closeDrawer;
    overlay.onclick = closeDrawer;

    drawer.addEventListener('click', (e) => {
        const link = e.target.closest('.drawer-link');
        if (link && link.dataset.tab) {
            e.preventDefault();
            showTab(link.dataset.tab);
            closeDrawer();
        }
    });
}

export { setupGlobalEventListeners, setupTabNavigation, setupDrawerNavigation };
