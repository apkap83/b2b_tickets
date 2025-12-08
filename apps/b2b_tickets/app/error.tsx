'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Check if this is the specific Next.js Server Actions digest error
    if (error.message.includes("Cannot read properties of null (reading 'digest')")) {
      console.warn('Server Actions digest error - likely client/server build ID mismatch');
    } else {
      // Log other errors for debugging
      console.error('Application error:', error);
    }
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="max-w-md text-center">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Something went wrong!
        </h2>
        
        <p className="text-gray-600 mb-6">
          We encountered an unexpected error. This might be a temporary issue.
        </p>
        
        <div className="space-y-3">
          <button
            className="w-full rounded-md bg-blue-500 px-4 py-2 text-sm text-white font-medium transition-colors hover:bg-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            onClick={() => reset()}
          >
            Try again
          </button>
          
          <button
            className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 font-medium transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            onClick={() => window.location.reload()}
          >
            Refresh page
          </button>
        </div>
        
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-6 text-left">
            <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
              Error details (development only)
            </summary>
            <pre className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded overflow-auto">
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </details>
        )}
      </div>
    </main>
  );
}