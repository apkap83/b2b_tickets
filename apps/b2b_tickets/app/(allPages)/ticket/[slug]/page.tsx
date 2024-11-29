import React from 'react';
import { TicketDetails } from '@b2b-tickets/tickets';
import { getTicketDetailsForTicketId } from '@b2b-tickets/server-actions';
import { TicketDetail } from '@b2b-tickets/shared-models';

const App = async ({ params }: { params: any }) => {
  const ticketDetails: TicketDetail[] = await getTicketDetailsForTicketId({
    ticketNumber: params.slug,
  });

  return (
    <TicketDetails
      theTicketDetails={ticketDetails}
      theTicketNumber={params.slug}
    />
  );
};

export default App;
