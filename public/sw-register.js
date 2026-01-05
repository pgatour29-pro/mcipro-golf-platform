// Service Worker Registration Script
// Handles SW registration, updates, and provides utility functions

(function() {
    'use strict';

    // Skip service worker on localhost for easier development
    const isLocalhost = window.location.hostname === 'localhost' ||
                        window.location.hostname === '127.0.0.1';

    // Check if service workers are supported
    if (!('serviceWorker' in navigator)) {
        console.log('[SW-Register] Service Workers not supported');
        return;
    }

    // Register the service worker
    async function registerServiceWorker() {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js', {
                scope: '/'
            });

            console.log('[SW-Register] Service Worker registered successfully');
            console.log('[SW-Register] Scope:', registration.scope);

            // Check for updates periodically (every 30 minutes)
            setInterval(() => {
                registration.update();
            }, 30 * 60 * 1000);

            // Handle updates
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                console.log('[SW-Register] New Service Worker found');

                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed') {
                        if (navigator.serviceWorker.controller) {
                            // New version available
                            console.log('[SW-Register] New version available');

                            // Automatically activate the new service worker
                            // without prompting the user (for seamless updates)
                            newWorker.postMessage('skipWaiting');
                        } else {
                            // First install
                            console.log('[SW-Register] Service Worker installed for the first time');
                        }
                    }
                });
            });

            // Handle controller change (new SW activated)
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                console.log('[SW-Register] New Service Worker activated');
                // Optional: Could reload for fresh content, but we'll skip to avoid disruption
                // window.location.reload();
            });

            return registration;

        } catch (error) {
            console.error('[SW-Register] Service Worker registration failed:', error);
            return null;
        }
    }

    // Expose utility functions globally
    window.MciProSW = {
        // Get current SW version
        getVersion: async function() {
            if (!navigator.serviceWorker.controller) {
                return { version: 'not-active' };
            }

            return new Promise((resolve) => {
                const channel = new MessageChannel();
                channel.port1.onmessage = (event) => resolve(event.data);
                navigator.serviceWorker.controller.postMessage('getVersion', [channel.port2]);

                // Timeout fallback
                setTimeout(() => resolve({ version: 'unknown' }), 1000);
            });
        },

        // Force clear all caches
        clearCache: async function() {
            if (!navigator.serviceWorker.controller) {
                console.log('[SW-Register] No active Service Worker');
                return false;
            }

            return new Promise((resolve) => {
                const channel = new MessageChannel();
                channel.port1.onmessage = (event) => {
                    console.log('[SW-Register] Cache cleared');
                    resolve(event.data.cleared);
                };
                navigator.serviceWorker.controller.postMessage('clearCache', [channel.port2]);

                // Timeout fallback
                setTimeout(() => resolve(false), 5000);
            });
        },

        // Force update the service worker
        update: async function() {
            const registration = await navigator.serviceWorker.getRegistration();
            if (registration) {
                await registration.update();
                console.log('[SW-Register] Service Worker update triggered');
                return true;
            }
            return false;
        },

        // Unregister service worker (for debugging)
        unregister: async function() {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const registration of registrations) {
                await registration.unregister();
            }
            console.log('[SW-Register] All Service Workers unregistered');
            return true;
        },

        // Get cache stats
        getCacheStats: async function() {
            if (!('caches' in window)) {
                return { error: 'Cache API not supported' };
            }

            const cacheNames = await caches.keys();
            const stats = {};

            for (const name of cacheNames) {
                const cache = await caches.open(name);
                const keys = await cache.keys();
                stats[name] = keys.length;
            }

            return stats;
        }
    };

    // Register on page load
    if (document.readyState === 'complete') {
        registerServiceWorker();
    } else {
        window.addEventListener('load', registerServiceWorker);
    }

    // Log helpful message
    console.log('[SW-Register] Service Worker registration script loaded');
    console.log('[SW-Register] Use MciProSW.getVersion(), MciProSW.clearCache(), MciProSW.getCacheStats() for debugging');

})();
