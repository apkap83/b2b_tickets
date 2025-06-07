import React from 'react';
import { TicketDetails } from '@b2b-tickets/tickets';
import { getTicketDetailsForTicketNumber } from '@b2b-tickets/server-actions';
import { notFound } from 'next/navigation';
import { LiveUpdatesIndicator } from '@b2b-tickets/ui';

const App = async ({ params }: { params: { slug?: string } }) => {
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
      <LiveUpdatesIndicator />
    </>
  );
};

export default App;
