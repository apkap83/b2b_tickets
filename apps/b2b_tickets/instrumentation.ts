// Next.js instrumentation for global error handling
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    process.removeAllListeners('uncaughtException');
    process.removeAllListeners('unhandledRejection');

    const SAFE_ERROR_PATTERNS = [
      /Cannot read properties of null \(reading 'digest'\)/,
      /next.*digest/i,
    ];

    // Track error frequency to detect cascading failures
    const errorCounts = new Map<string, number>();
    const ERROR_THRESHOLD = 10;
    const resetInterval = setInterval(() => errorCounts.clear(), 60000);

    process.on('unhandledRejection', (reason: any) => {
      const message = reason?.message || String(reason);

      if (SAFE_ERROR_PATTERNS.some((p) => p.test(message))) {
        console.warn('[INSTRUMENTATION] Known digest error:', message);
        return;
      }

      console.error('[INSTRUMENTATION] Unhandled Rejection:', {
        message,
        stack: reason?.stack,
      });
    });

    process.on('uncaughtException', (error: Error) => {
      const message = error.message || String(error);

      // Check if it's a "safe" error
      const isSafe = SAFE_ERROR_PATTERNS.some((p) => p.test(message));

      if (isSafe) {
        console.warn('[INSTRUMENTATION] Known safe error:', message);
        return;
      }

      // Track error frequency
      const key = error.name + ':' + message.substring(0, 50);
      const count = (errorCounts.get(key) || 0) + 1;
      errorCounts.set(key, count);

      console.error('[INSTRUMENTATION] Uncaught Exception:', {
        message,
        stack: error.stack,
        name: error.name,
        occurrenceCount: count,
      });

      // If same error happens too many times, crash to prevent infinite loops
      if (count >= ERROR_THRESHOLD) {
        console.error('[INSTRUMENTATION] Error threshold exceeded - exiting');
        clearInterval(resetInterval);
        process.exit(1);
      }

      // Otherwise continue (but log prominently)
      console.warn(
        '[INSTRUMENTATION] ⚠️  Continuing despite uncaught exception'
      );
    });

    // Exit debugging
    process.on('exit', (code) => {
      clearInterval(resetInterval);
      console.error(`[INSTRUMENTATION] Process exiting with code: ${code}`);
    });

    process.on('SIGTERM', () => console.error('[INSTRUMENTATION] SIGTERM'));
    process.on('SIGINT', () => console.error('[INSTRUMENTATION] SIGINT'));

    // CRITICAL: Override process.exit to block ALL crashes in production
    const originalExit = process.exit;
    process.exit = ((code?: number) => {
      const stack = new Error().stack || '';

      console.error(`[INSTRUMENTATION] PREVENTED process.exit(${code})!`);
      console.error('[INSTRUMENTATION] Exit attempt from:', stack);

      // In production, NEVER allow process.exit()
      if (process.env.NODE_ENV === 'production') {
        console.warn('[INSTRUMENTATION] 🛑 PRODUCTION MODE - BLOCKING ALL EXITS');
        console.warn('[INSTRUMENTATION] Server will continue running...');
        return undefined as never;
      }

      // In development, allow exits for debugging
      console.error('[INSTRUMENTATION] Development mode - allowing exit');
      return originalExit.call(process, code);
    }) as typeof process.exit;

    console.info(
      '[INSTRUMENTATION] Error handlers registered (TEMPORARY DEBUG MODE)'
    );
  }
}
