import React from 'react';
import { TicketDetails } from '@b2b-tickets/tickets';
import { getTicketDetailsForTicketNumber } from '@b2b-tickets/server-actions';
import {
  TicketDetail,
  TicketDetailForTicketCreator,
} from '@/libs/shared-models/src';

const App = async ({ params }: { params: any }) => {
  const ticketDetails = (await getTicketDetailsForTicketNumber({
    ticketNumber: params.slug,
  })) as TicketDetail[] | TicketDetailForTicketCreator[];
  return (
    <TicketDetails
      theTicketDetails={ticketDetails}
      theTicketNumber={params.slug}
    />
  );
};

export default App;
