// Next.js instrumentation for global error handling
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Remove any existing listeners to prevent conflicts
    process.removeAllListeners('uncaughtException');
    process.removeAllListeners('unhandledRejection');
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      // Check for the specific Next.js digest error
      if (reason?.message?.includes("Cannot read properties of null (reading 'digest')")) {
        console.warn('[INSTRUMENTATION] Next.js Server Actions digest error - client/server build ID mismatch');
        // Don't crash the server for this specific error
        return;
      }

      // Log other unhandled rejections
      console.error('[INSTRUMENTATION] Unhandled Promise Rejection:', {
        reason: reason,
        message: reason?.message || 'Unknown error',
        stack: reason?.stack || 'No stack trace'
      });
      
      // Don't exit for unhandled rejections - let them fail gracefully
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      // Check for the specific Next.js digest error
      if (error.message?.includes("Cannot read properties of null (reading 'digest')")) {
        console.warn('[INSTRUMENTATION] Digest error in uncaughtException - continuing');
        // Don't crash the server for this specific error
        return;
      }

      // Log other uncaught exceptions
      console.error('[INSTRUMENTATION] Uncaught Exception:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      // Don't exit for any uncaught exceptions - just log and continue
      // This prevents the container from restarting on errors
    });

    console.info('[INSTRUMENTATION] Global error handlers registered');
  }
}
