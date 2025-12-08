// Next.js instrumentation for global error handling
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Remove any existing listeners to prevent conflicts
    process.removeAllListeners('uncaughtException');
    process.removeAllListeners('unhandledRejection');
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      // Check for the specific Next.js digest error
      if (
        reason?.message?.includes(
          "Cannot read properties of null (reading 'digest')"
        )
      ) {
        console.warn(
          '[INSTRUMENTATION] Next.js Server Actions digest error - client/server build ID mismatch'
        );
        // Don't crash the server for this specific error
        return;
      }

      // Log other unhandled rejections
      console.error('[INSTRUMENTATION] Unhandled Promise Rejection:', {
        reason: reason,
        message: reason?.message || 'Unknown error',
        stack: reason?.stack || 'No stack trace',
      });

      // Don't exit for unhandled rejections - let them fail gracefully
    });

    const SAFE_ERROR_PATTERNS = [
      "Cannot read properties of null (reading 'digest')",
      // Add other known safe patterns
    ];

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      const isSafeError = SAFE_ERROR_PATTERNS.some((pattern) =>
        error.message?.includes(pattern)
      );

      if (isSafeError) {
        console.warn(
          '[INSTRUMENTATION] Known safe error - continuing',
          error.message
        );
        return;
      }

      console.error('[INSTRUMENTATION] Fatal uncaught exception:', error);
      process.exit(1);
    });

    // Add debugging to see what's causing process exits
    process.on('exit', (code) => {
      console.error(`[INSTRUMENTATION] Process exiting with code: ${code}`);
      console.error(`[INSTRUMENTATION] Exit stack trace:`, new Error().stack);
    });

    process.on('SIGTERM', () => {
      console.error('[INSTRUMENTATION] Received SIGTERM signal');
    });

    process.on('SIGINT', () => {
      console.error('[INSTRUMENTATION] Received SIGINT signal');
    });

    process.on('SIGHUP', () => {
      console.error('[INSTRUMENTATION] Received SIGHUP signal');
    });

    process.on('beforeExit', (code) => {
      console.error(`[INSTRUMENTATION] Before exit with code: ${code}`);
    });

    // Catch ANY process termination
    process.on('warning', (warning) => {
      console.error('[INSTRUMENTATION] Process warning:', warning);
    });

    // Override process.exit to see who's calling it
    const originalExit = process.exit;
    process.exit = ((code?: number) => {
      console.error(`[INSTRUMENTATION] process.exit(${code}) called!`);
      console.error('[INSTRUMENTATION] Exit called from:', new Error().stack);
      return originalExit.call(process, code);
    }) as typeof process.exit;

    console.info(
      '[INSTRUMENTATION] Global error handlers and exit debugging registered'
    );
  }
}
