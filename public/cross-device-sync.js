// Cross-device sync via storage events
window.addEventListener('storage', (e) => {
    if (e.key === 'mcipro_bookings' && e.newValue) {
        console.log('[CrossDeviceSync] Bookings updated in another tab/device');
        try {
            const newBookings = JSON.parse(e.newValue);
            if (typeof BookingManager !== 'undefined' && BookingManager.bookings) {
                BookingManager.bookings = newBookings;
                // Refresh UI if on bookings page
                if (typeof displayBookings === 'function') {
                    displayBookings();
                }
                console.log('[CrossDeviceSync] Synced', newBookings.length, 'bookings from other device');
            }
        } catch (err) {
            console.error('[CrossDeviceSync] Failed to sync:', err);
        }
    }
});

// Force sync when page becomes visible
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        console.log('[CrossDeviceSync] Page visible - forcing sync');
        if (typeof SimpleCloudSync !== 'undefined' && SimpleCloudSync.loadFromCloud) {
            SimpleCloudSync.loadFromCloud();
        }
    }
});
