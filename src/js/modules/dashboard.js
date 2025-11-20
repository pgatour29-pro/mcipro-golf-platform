import { AppState } from '../app-state.js';
import { UI } from './ui.js';
import { loadCourses, loadSocieties, loadBookings } from './data.js';
import { renderHomeTab, renderBookingsTab, renderLiveScoreTab, renderHistoryTab, renderSocietyTab, renderProfileTab, renderScheduleTab, renderEarningsTab, renderAnalyticsTab, renderCaddyManagementTab } from './tabs.js';

function getTabsForRole(role) {
    const allTabs = {
        home: { id: 'home', label: 'Home', icon: 'home' },
        bookings: { id: 'bookings', label: 'Bookings', icon: 'calendar_month' },
        history: { id: 'history', label: 'History', icon: 'history' },
        profile: { id: 'profile', label: 'Profile', icon: 'person' },
        liveScore: { id: 'liveScore', label: 'Live Score', icon: 'scoreboard' },
        society: { id: 'society', label: 'Society Golf', icon: 'groups' },
        // Caddie
        schedule: { id: 'schedule', label: 'My Schedule', icon: 'event' },
        earnings: { id: 'earnings', label: 'Earnings', icon: 'payments' },
        // Manager
        caddyManagement: { id: 'caddyManagement', label: 'Caddies', icon: 'badge' },
        courseManagement: { id: 'courseManagement', label: 'Courses', icon: 'golf_course' },
        bookingManagement: { id: 'bookingManagement', label: 'Bookings', icon: 'book_online' },
        analytics: { id: 'analytics', label: 'Analytics', icon: 'analytics' },
        // Proshop
        pos: { id: 'pos', label: 'POS', icon: 'point_of_sale' },
        inventory: { id: 'inventory', label: 'Inventory', icon: 'inventory_2' },
         // Admin
        userManagement: { id: 'userManagement', label: 'Users', icon: 'manage_accounts'},
        systemHealth: { id: 'systemHealth', label: 'System', icon: 'shield'}
    };

    switch (role) {
        case 'golfer':
            return [allTabs.home, allTabs.bookings, allTabs.liveScore, allTabs.history, allTabs.society, allTabs.profile];
        case 'caddie':
            return [allTabs.schedule, allTabs.earnings, allTabs.profile];
        case 'manager':
            return [allTabs.analytics, allTabs.caddyManagement, allTabs.courseManagement, allTabs.bookingManagement, allTabs.society];
        case 'proshop':
            return [allTabs.pos, allTabs.inventory, allTabs.analytics];
        case 'admin':
            return [allTabs.userManagement, allTabs.analytics, allTabs.systemHealth, allTabs.society];
        default:
            return [allTabs.home, allTabs.profile];
    }
}

async function initGolferDashboard() {
    await loadBookings();
    renderHomeTab();
    renderBookingsTab();
    renderLiveScoreTab();
    renderHistoryTab();
    renderSocietyTab();
    renderProfileTab();
}

async function initCaddieDashboard() {
    // ... Caddie-specific logic
    renderScheduleTab();
    renderEarningsTab();
    renderProfileTab();
}

 async function initManagerDashboard() {
    renderAnalyticsTab();
    renderCaddyManagementTab();
    // ... and so on
}

async function initProshopDashboard() {
    // ...
}

async function initAdminDashboard() {
    // ...
}

async function initDashboard(role) {
    // Load data common to most roles first
    await loadCourses();
    await loadSocieties();

    // Role-specific initializations
    switch (role) {
        case 'golfer':
            await initGolferDashboard();
            break;
        case 'caddie':
            await initCaddieDashboard();
            break;
        case 'manager':
             await initManagerDashboard();
            break;
        case 'proshop':
            await initProshopDashboard();
            break;
        case 'admin':
            await initAdminDashboard();
            break;
    }

    // Activate the last active tab, or default
    const lastTab = AppState.getActiveTab(role + 'Dashboard');
    const defaultTab = getTabsForRole(role)[0].id;
    showTab(lastTab || defaultTab);
}

export { initDashboard, getTabsForRole };
