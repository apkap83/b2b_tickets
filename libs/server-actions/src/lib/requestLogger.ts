'use server';

import { headers } from 'next/headers';
import { createRequestLogger } from '@b2b-tickets/logging';
import { TransportName } from '@b2b-tickets/shared-models';

export async function getRequestLogger(transportName: TransportName) {
  // Ensure this is executed in a server-side context
  try {
    const headersList = headers(); // Server-side request headers
    const reqIP = headersList.get('request-ip') || 'unknown-ip';
    const reqURL = headersList.get('request-url') || 'unknown-url';
    const sessionId = headersList.get('session-id') || 'unknown-session';

    // Create the request logger with gathered headers
    const logRequest = createRequestLogger(
      transportName,
      reqIP,
      reqURL,
      sessionId
    );

    return logRequest;
  } catch (error) {
    // Log or handle the error if this function is called outside server-side context
    console.error(
      'Failed to retrieve headers. Ensure this is used server-side:',
      error
    );
    throw new Error('getRequestLogger must be used in a server-side context.');
  }
}
