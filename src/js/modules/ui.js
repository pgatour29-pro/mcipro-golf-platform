import { AppState } from '../app-state.js';

export const UI = {
    screens: {
        login: document.getElementById('loginScreen'),
        createProfile: document.getElementById('createProfileScreen'),
        main: document.getElementById('mainScreen'),
    },
    // All other UI elements are queried dynamically to avoid null errors on startup
    query: (selector) => document.querySelector(selector),
    queryAll: (selector) => document.querySelectorAll(selector),
    
    show: (id) => { const el = document.getElementById(id); if (el) el.style.display = 'block'; },
    hide: (id) => { const el = document.getElementById(id); if (el) el.style.display = 'none'; },
    
    setText: (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; },
    setHtml: (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; },
    
    showLoading: () => UI.show('loadingOverlay'),
    hideLoading: () => UI.hide('loadingOverlay'),

    showError: (message) => {
        console.error("UI Error:", message);
        const errorContainer = UI.query('#errorContainer');
        if (errorContainer) {
            errorContainer.textContent = message;
            errorContainer.style.display = 'block';
            setTimeout(() => errorContainer.style.display = 'none', 5000);
        }
    },

    showSuccess: (message) => {
        console.log("UI Success:", message);
        const successContainer = document.createElement('div');
        successContainer.className = 'fixed top-5 right-5 bg-green-500 text-white p-4 rounded-lg shadow-lg z-50';
        successContainer.textContent = message;
        document.body.appendChild(successContainer);
        setTimeout(() => successContainer.remove(), 3000);
    },

    showScreen(screenId) {
        console.log(`[Navigation] Showing screen: ${screenId}`);
        Object.values(this.screens).forEach(screen => {
            if (screen) screen.classList.remove('active');
        });
        const targetScreen = this.screens[screenId] || document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.add('active');
            AppState.currentScreen = screenId;
            
            // Update URL for better navigation history
            const url = new URL(window.location);
            if (url.searchParams.get('screen') !== screenId) {
                url.searchParams.set('screen', screenId);
                history.pushState({ screen: screenId }, '', url);
            }
        } else {
            this.showError(`Screen "${screenId}" not found.`);
        }
    },

    updateAvatar(elementId, url) {
        const img = document.getElementById(elementId);
        if (img) {
            img.src = url || 'https://via.placeholder.com/80'; // Fallback
        }
    },

    renderTabs(role) {
        const tabs = getTabsForRole(role);
        const tabContainer = UI.query(`#${role}Dashboard`);
        const drawerNav = UI.query('#mobileDrawer nav');
        
        if (!tabContainer || !drawerNav) return;

        const tabHtml = `
            <div class="border-b border-gray-200 bg-white sticky top-16 z-30 tab-navigation">
                <div class="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
                    <nav class="-mb-px flex space-x-2 overflow-x-auto scrollbar-hide" aria-label="Tabs">
                        ${tabs.map(tab => `
                            <button data-tab="${tab.id}" class="tab-button ${AppState.getActiveTab(role + 'Dashboard') === tab.id ? 'active' : ''}">
                                <span class="material-symbols-outlined">${tab.icon}</span>
                                <span>${tab.label}</span>
                            </button>
                        `).join('')}
                    </nav>
                </div>
            </div>
            <div class="py-4">
                ${tabs.map(tab => `<div id="tab-${tab.id}" class="tab-content ${AppState.getActiveTab(role + 'Dashboard') === tab.id ? 'active' : ''}"></div>`).join('')}
            </div>
        `;
        
        tabContainer.innerHTML = tabHtml;

        // Render drawer menu
        const drawerHtml = tabs.map(tab => `
            <a href="#" data-tab="${tab.id}" class="drawer-link">
                <span class="material-symbols-outlined">${tab.icon}</span>
                <span>${tab.label}</span>
            </a>
        `).join('');
         drawerNav.innerHTML = `<div class="py-2">${drawerHtml}</div>`;
    }
};
