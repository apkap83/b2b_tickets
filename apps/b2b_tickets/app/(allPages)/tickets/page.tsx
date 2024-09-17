import React from 'react';
import { getServerSession } from 'next-auth';
import { TicketsList } from '@b2b-tickets/tickets';
import { getAllTicketsForCustomer } from '@b2b-tickets/server-actions';
import { Ticket } from '@/libs/shared-models/src';
import { redirect } from 'next/navigation';
import { options } from '@b2b-tickets/auth-options';

const App: React.FC = async () => {
  const allTicketsList: Ticket[] = await getAllTicketsForCustomer();
  return <TicketsList tickets={allTicketsList} />;

  // const allTicketsList: Ticket[] = await getAllTicketsForCustomerId();
  // return <TicketsList tickets={allTicketsList} />;
};

export default App;
