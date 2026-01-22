/**
 * PostHog User Behavior Analytics
 * MyCaddiPro - Analytics Configuration
 */

import posthog from 'posthog-js';

// Initialize PostHog - call this at app startup
export function initPostHog() {
  const apiKey = import.meta.env.VITE_POSTHOG_KEY;

  if (!apiKey) {
    console.log('[PostHog] No API key configured, skipping initialization');
    return;
  }

  if (typeof window === 'undefined') {
    return;
  }

  posthog.init(apiKey, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com',

    // Page tracking
    capture_pageview: true,
    capture_pageleave: true,

    // Session recording for UX debugging
    disable_session_recording: false,
    session_recording: {
      maskAllInputs: false,
      maskInputOptions: {
        password: true,
      },
    },

    // Auto-capture clicks, form submissions
    autocapture: true,

    // Performance metrics
    capture_performance: true,

    // Respect Do Not Track
    respect_dnt: true,

    // Don't persist state for LINE browser compatibility
    persistence: 'localStorage',

    // Loaded callback
    loaded: function(posthog) {
      console.log('[PostHog] Initialized');

      // Identify development vs production
      if (import.meta.env.MODE !== 'production') {
        posthog.opt_out_capturing();
        console.log('[PostHog] Opted out in development mode');
      }
    },
  });
}

// Identify user (after LINE login)
export function identifyUser(userId, properties = {}) {
  posthog.identify(userId, {
    ...properties,
    $set: {
      last_seen: new Date().toISOString(),
      ...properties.$set,
    },
  });
}

// Reset user (on logout)
export function resetUser() {
  posthog.reset();
}

// Track page view with timing
export function trackPageView(pageName, properties = {}) {
  const loadTime = performance.now();

  posthog.capture('$pageview', {
    page_name: pageName,
    load_time_ms: loadTime,
    ...properties,
  });

  // Track slow loads
  if (loadTime > 3000) {
    posthog.capture('slow_page_load', {
      page: pageName,
      load_time_ms: loadTime,
      threshold_exceeded: true,
    });
  }
}

// Track tee sheet view
export function trackTeeSheetView(courseId, date, loadTimeMs) {
  posthog.capture('tee_sheet_viewed', {
    course_id: courseId,
    date: date,
    load_time_ms: loadTimeMs,
  });
}

// Track booking completion
export function trackBookingComplete(bookingData) {
  posthog.capture('booking_completed', {
    course_id: bookingData.courseId,
    tee_time: bookingData.teeTime,
    num_golfers: bookingData.numGolfers,
    load_time_ms: bookingData.loadTimeMs,
    booking_type: bookingData.bookingType || 'regular',
    $set: {
      last_booking_date: new Date().toISOString(),
      total_bookings: { $increment: 1 },
    },
  });
}

// Track caddy request
export function trackCaddyRequest(caddyData) {
  posthog.capture('caddy_requested', {
    course_id: caddyData.courseId,
    caddy_id: caddyData.caddyId,
    caddy_type: caddyData.caddyType,
    date: caddyData.date,
  });
}

// Track drag and drop on tee sheet
export function trackTeeSheetDragDrop(action, data) {
  posthog.capture('tee_sheet_drag_drop', {
    action: action, // 'moved', 'assigned', 'cancelled'
    from_time: data.fromTime,
    to_time: data.toTime,
    booking_id: data.bookingId,
  });
}

// Track society event
export function trackSocietyEvent(eventType, eventData) {
  posthog.capture('society_event', {
    event_type: eventType, // 'created', 'joined', 'updated'
    society_id: eventData.societyId,
    event_id: eventData.eventId,
    num_players: eventData.numPlayers,
  });
}

// Track scorecard actions
export function trackScorecardAction(action, data) {
  posthog.capture('scorecard_action', {
    action: action, // 'started', 'completed', 'shared'
    course_id: data.courseId,
    num_players: data.numPlayers,
    total_score: data.totalScore,
  });
}

// Track feature usage
export function trackFeatureUsage(featureName, properties = {}) {
  posthog.capture('feature_used', {
    feature_name: featureName,
    ...properties,
  });
}

// Track error occurrence
export function trackError(errorType, errorMessage, context = {}) {
  posthog.capture('error_occurred', {
    error_type: errorType,
    error_message: errorMessage,
    page: window.location.pathname,
    ...context,
  });
}

// Set user properties
export function setUserProperties(properties) {
  posthog.people.set(properties);
}

// Track timing
export function trackTiming(category, variable, timeMs, label = null) {
  posthog.capture('timing', {
    category: category,
    variable: variable,
    time_ms: timeMs,
    label: label,
  });
}

// Export posthog for advanced usage
export { posthog };
