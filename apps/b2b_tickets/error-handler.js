// Global error handler to prevent server crashes
// This should be imported in your server startup

if (typeof process !== 'undefined') {
  // Only run on server side
  const logger = console; // Fallback to console if logger not available
  
  // Try to use the actual logger
  try {
    const loggerModule = require('@b2b_tickets/logging');
    if (loggerModule) {
      // Use the actual logger
    }
  } catch (e) {
    // Fallback to console
  }

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    // Log but don't exit - let the app continue
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    
    // Check if it's the specific Next.js digest error
    if (reason && reason.message && reason.message.includes("Cannot read properties of null (reading 'digest')")) {
      logger.warn('Next.js Server Actions digest error caught - client/server build ID mismatch');
      // Don't crash the server for this specific error
      return;
    }
    
    // For other unhandled rejections, log but continue
  });
}