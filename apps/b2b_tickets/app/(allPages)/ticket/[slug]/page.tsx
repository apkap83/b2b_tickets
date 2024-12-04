import React from 'react';
import { TicketDetails } from '@b2b-tickets/tickets';
import { getTicketDetailsForTicketNumber } from '@b2b-tickets/server-actions';
import {
  TicketDetail,
  TicketDetailForTicketCreator,
} from '@/libs/shared-models/src';
import { notFound } from 'next/navigation';

const App = async ({ params }: { params: any }) => {
  const ticketDetails = (await getTicketDetailsForTicketNumber({
    ticketNumber: params.slug,
  })) as TicketDetail[] | TicketDetailForTicketCreator[];

  if (!ticketDetails) {
    notFound(); // Automatically renders `not-found.tsx`
  }

  return (
    <TicketDetails
      theTicketDetails={ticketDetails}
      theTicketNumber={params.slug}
    />
  );
};

export default App;
