import React from 'react';
import { TicketDetails } from '@b2b-tickets/tickets';
import { getTicketDetailsForTicketNumber } from '@b2b-tickets/server-actions';
import { notFound } from 'next/navigation';
import { LiveUpdatesIndicator } from '@b2b-tickets/ui';
import { getServerSession } from 'next-auth';
import { options } from '@b2b-tickets/auth-options';
import { userHasRole } from '@b2b-tickets/utils';
import { AppRoleTypes } from '@b2b-tickets/shared-models';

const App = async ({ params }: { params: { slug?: string } }) => {
  const session = await getServerSession(options);

  if (!params.slug) {
    notFound();
    return null; // Safeguard against rendering further
  }

  const ticketDetails = await getTicketDetailsForTicketNumber({
    ticketNumber: params.slug,
  });

  const isInvalidTicketDetails =
    !ticketDetails || !Array.isArray(ticketDetails);

  if (isInvalidTicketDetails) {
    notFound();
    return null; // Safeguard against further rendering
  }

  return (
    <>
      <TicketDetails
        theTicketDetails={ticketDetails}
        theTicketNumber={params.slug}
      />
      {userHasRole(session, AppRoleTypes.B2B_TicketHandler) && (
        <LiveUpdatesIndicator />
      )}
    </>
  );
};

export default App;
