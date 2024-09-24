import React from 'react';
import { getServerSession } from 'next-auth';
import { TicketDetails } from '@b2b-tickets/tickets';

import { getTicketDetailsForTicketId } from '@b2b-tickets/server-actions';

import { TicketDetail } from '@b2b-tickets/shared-models';
import { redirect } from 'next/navigation';
import { options } from '@b2b-tickets/auth-options';

const App = async ({ params }: { params: any }) => {
  const ticketDetails: TicketDetail[] = await getTicketDetailsForTicketId({
    ticketNumber: params.slug,
  });

  return <TicketDetails ticketDetails={ticketDetails} />;
};

export default App;
