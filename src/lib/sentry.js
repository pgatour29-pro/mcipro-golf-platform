/**
 * Sentry Error Tracking & Performance Monitoring
 * MyCaddiPro - Frontend Monitoring Configuration
 */

import * as Sentry from "@sentry/react";

// Initialize Sentry - call this at app startup
export function initSentry() {
  // Don't initialize in development if no DSN configured
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) {
    console.log('[Sentry] No DSN configured, skipping initialization');
    return;
  }

  Sentry.init({
    dsn: dsn,
    environment: import.meta.env.MODE || 'production',
    release: import.meta.env.VITE_APP_VERSION || 'unknown',

    integrations: [
      // Browser tracing for performance monitoring
      Sentry.browserTracingIntegration(),
      // Session replay for debugging user issues
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],

    // Performance Monitoring
    // Capture 10% of transactions in production (adjust as needed)
    tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,

    // Session Replay
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

    // Filter out common noise
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      'Network request failed',
      'Failed to fetch',
      'Load failed',
      'AbortError',
      // LINE LIFF specific
      'LIFF initialization failed',
      // Service worker errors
      'ServiceWorker',
    ],

    // Don't send errors from certain URLs
    denyUrls: [
      // Chrome extensions
      /extensions\//i,
      /^chrome:\/\//i,
      /^chrome-extension:\/\//i,
      // Firefox extensions
      /^moz-extension:\/\//i,
    ],

    // Add context to all events
    beforeSend(event, hint) {
      // Add custom context
      const userAgent = navigator.userAgent;
      event.tags = event.tags || {};

      // Detect LINE browser
      if (userAgent.includes('Line/')) {
        event.tags.browser = 'LINE';
      }

      // Detect if running as PWA
      if (window.matchMedia('(display-mode: standalone)').matches) {
        event.tags.pwa = 'standalone';
      }

      return event;
    },
  });

  console.log('[Sentry] Initialized for', import.meta.env.MODE);
}

// Track custom transactions for key user flows
export function startTransaction(name, operation = 'ui.action') {
  return Sentry.startTransaction({
    name: name,
    op: operation,
  });
}

// Track tee sheet loading performance
export async function trackTeeSheetLoad(courseId, date, loadFn) {
  const transaction = Sentry.startTransaction({
    name: 'load-tee-sheet',
    op: 'ui.load',
  });

  const span = transaction.startChild({
    op: 'db.query',
    description: 'Fetch tee times from Supabase',
  });

  try {
    const result = await loadFn();
    span.finish();

    // Record success metric
    Sentry.setMeasurement('tee_sheet_load_time', transaction.endTimestamp - transaction.startTimestamp, 'millisecond');

    return result;
  } catch (error) {
    span.setStatus('internal_error');
    span.finish();

    Sentry.captureException(error, {
      tags: {
        feature: 'tee-sheet',
        course_id: courseId,
        date: date,
      },
    });
    throw error;
  } finally {
    transaction.finish();
  }
}

// Track booking completion
export function trackBookingComplete(bookingData) {
  Sentry.addBreadcrumb({
    category: 'booking',
    message: 'Booking completed',
    level: 'info',
    data: {
      course_id: bookingData.courseId,
      tee_time: bookingData.teeTime,
      num_golfers: bookingData.numGolfers,
    },
  });
}

// Track caddy assignment
export function trackCaddyAssignment(caddyId, bookingId) {
  Sentry.addBreadcrumb({
    category: 'caddy',
    message: 'Caddy assigned',
    level: 'info',
    data: {
      caddy_id: caddyId,
      booking_id: bookingId,
    },
  });
}

// Capture error with context
export function captureError(error, context = {}) {
  Sentry.captureException(error, {
    tags: context.tags || {},
    extra: context.extra || {},
  });
}

// Set user context (after LINE login)
export function setUserContext(userId, profileData = {}) {
  Sentry.setUser({
    id: userId,
    username: profileData.displayName || undefined,
    email: profileData.email || undefined,
  });
}

// Clear user context (on logout)
export function clearUserContext() {
  Sentry.setUser(null);
}

// Export Sentry for advanced usage
export { Sentry };
