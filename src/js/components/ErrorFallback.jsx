import React from 'react';

/**
 * Error Fallback Component
 * Displayed when a React error boundary catches an unhandled error
 */
export default function ErrorFallback({ error, resetError }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
        <div className="text-red-500 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <h1 className="text-xl font-bold text-gray-800 mb-2">
          Something went wrong
        </h1>

        <p className="text-gray-600 mb-4">
          We're sorry, but something unexpected happened. Our team has been notified.
        </p>

        {error && (
          <details className="text-left bg-gray-50 rounded p-3 mb-4 text-sm">
            <summary className="cursor-pointer text-gray-700 font-medium">
              Error Details
            </summary>
            <pre className="mt-2 text-red-600 whitespace-pre-wrap overflow-auto max-h-32">
              {error.message || 'Unknown error'}
            </pre>
          </details>
        )}

        <div className="space-y-2">
          {resetError && (
            <button
              onClick={resetError}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition"
            >
              Try Again
            </button>
          )}

          <button
            onClick={() => window.location.reload()}
            className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition"
          >
            Refresh Page
          </button>
        </div>
      </div>
    </div>
  );
}
