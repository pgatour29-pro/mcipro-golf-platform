/**
 * MyCaddiPro - Main React Entry Point
 * Initializes monitoring, error tracking, and renders the app
 */

import '../styles/tailwind.css';
import React from 'react';
import { createRoot } from 'react-dom/client';

// Performance Monitoring
import { initSentry, Sentry } from '../lib/sentry.js';
import { initPostHog } from '../lib/posthog.js';
import { trackWebVitals } from '../lib/performance-logger.js';

// Components
import HelloWorld from './components/HelloWorld.jsx';
import ErrorFallback from './components/ErrorFallback.jsx';

// Initialize monitoring BEFORE React renders
initSentry();
initPostHog();

// Track web vitals after page load
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    // Wait for LCP to settle
    setTimeout(() => {
      trackWebVitals();
    }, 1000);
  });
}

// App wrapper with error boundary
function App() {
  return <HelloWorld />;
}

// Render the app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);

  // Wrap with Sentry error boundary for crash reporting
  root.render(
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => (
        <ErrorFallback error={error} resetError={resetError} />
      )}
      onError={(error, componentStack) => {
        console.error('[ErrorBoundary] Caught error:', error);
        console.error('[ErrorBoundary] Component stack:', componentStack);
      }}
    >
      <App />
    </Sentry.ErrorBoundary>
  );

  console.log('[MyCaddiPro] React app initialized with monitoring');
} else {
  console.error('React root container #root not found');
}
