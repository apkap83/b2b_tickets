import React from 'react';
import { TicketDetails } from '@b2b-tickets/tickets';
import { getTicketDetailsForTicketNumber } from '@b2b-tickets/server-actions';
import { notFound, redirect } from 'next/navigation';
import { LiveUpdatesIndicator } from '@b2b-tickets/ui';
import { getServerSession } from 'next-auth';
import { options } from '@b2b-tickets/auth-options';
import { userHasRole } from '@b2b-tickets/utils';
import { AppRoleTypes } from '@b2b-tickets/shared-models';
import { pgB2Bpool, setSchemaAndTimezone } from '@b2b-tickets/db-access';
import TicketDetailAutoSwitcher from './ticket-detail-auto-switcher';
import type { Session } from 'next-auth';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function getUserCompanyCount(email: string): Promise<number> {
  const query = `
    SELECT COUNT(DISTINCT c.customer_id) as company_count
    FROM users u
    INNER JOIN customers c ON u.customer_id = c.customer_id
    WHERE u.email = $1 AND u.is_active = 'y'
  `;

  const result = await pgB2Bpool.query(query, [email]);
  return Number(result.rows[0].company_count);
}

async function getTicketCompanyId(
  ticketNumber: string
): Promise<number | null> {
  const query = `
    SELECT customer_id
    FROM tickets
    WHERE ticket_number = $1
  `;

  const result = await pgB2Bpool.query(query, [ticketNumber]);

  if (result.rows.length === 0) {
    return null;
  }

  return Number(result.rows[0].customer_id);
}

async function validateUserAccess(
  email: string,
  customerId: number
): Promise<{ hasAccess: boolean; companyName?: string }> {
  const query = `
    SELECT DISTINCT c.customer_id, c.customer_name
    FROM users u
    INNER JOIN customers c ON u.customer_id = c.customer_id
    WHERE u.email = $1
      AND c.customer_id = $2
      AND u.is_active = 'y'
  `;

  const result = await pgB2Bpool.query(query, [email, customerId]);

  if (result.rows.length === 0) {
    return { hasAccess: false };
  }

  return {
    hasAccess: true,
    companyName: result.rows[0].customer_name,
  };
}

async function renderTicketDetails(
  ticketNumber: string,
  session: Session,
  showLiveIndicator: boolean = false
) {
  const ticketDetails = await getTicketDetailsForTicketNumber({
    ticketNumber,
  });

  if (!ticketDetails || !Array.isArray(ticketDetails)) {
    notFound();
  }

  return (
    <>
      <TicketDetails
        theTicketDetails={ticketDetails}
        theTicketNumber={ticketNumber}
      />
      {showLiveIndicator && (
        <div>
          <LiveUpdatesIndicator />
        </div>
      )}
    </>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const App = async ({ params }: { params: Promise<{ slug?: string }> }) => {
  // Step 1: Authentication
  const session = await getServerSession(options);

  const { slug } = await params;

  if (!session?.user) {
    redirect(`/signin?callbackUrl=/ticket/${slug || ''}`);
  }

  if (!slug) {
    notFound();
  }

  await setSchemaAndTimezone(pgB2Bpool);

  const { user } = session;
  const ticketNumber = slug;

  // Step 2: Check if user is ticket handler (bypass all company logic)
  const isTicketHandler = userHasRole(session, AppRoleTypes.B2B_TicketHandler);

  if (isTicketHandler) {
    return renderTicketDetails(ticketNumber, session, true);
  }

  // Step 3: Check if user has multiple companies (optimization)
  const companyCount = await getUserCompanyCount(user.email!);

  if (companyCount <= 1) {
    return renderTicketDetails(ticketNumber, session);
  }

  // Step 4: Multi-company user - validate access and check if switch needed
  const ticketCustomerId = await getTicketCompanyId(ticketNumber);

  if (!ticketCustomerId) {
    notFound();
  }

  const { hasAccess, companyName } = await validateUserAccess(
    user.email!,
    ticketCustomerId
  );

  if (!hasAccess) {
    notFound();
  }

  const needsSwitch = user.customer_id !== ticketCustomerId;

  // Step 5: Auto-switch if needed
  if (needsSwitch) {
    return (
      <TicketDetailAutoSwitcher
        ticketId={ticketNumber}
        ticketCustomerId={ticketCustomerId}
        ticketCompanyName={companyName!}
        currentCustomerId={user.customer_id}
      />
    );
  }

  // Step 6: No switch needed - render ticket
  return renderTicketDetails(ticketNumber, session);
};

export default App;
