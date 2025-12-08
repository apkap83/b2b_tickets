// apps/your-app-name/instrumentation.ts
import { logErr, logInfo } from '@b2b-tickets/logging';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      if (
        reason?.message?.includes(
          "Cannot read properties of null (reading 'digest')"
        )
      ) {
        logInfo.warn(
          'Next.js Server Actions digest error - client/server build ID mismatch'
        );
        return;
      }

      logErr.error(reason, {
        type: 'unhandledRejection',
        promise: String(promise),
      });

      process.exit(1);
    });

    process.on('uncaughtException', (error: Error) => {
      if (
        error.message?.includes(
          "Cannot read properties of null (reading 'digest')"
        )
      ) {
        logInfo.warn('Digest error in uncaughtException - continuing');
        return;
      }

      logErr.error(error, {
        type: 'uncaughtException',
      });

      process.exit(1);
    });

    logInfo.info('Global error handlers registered');
  }
}
