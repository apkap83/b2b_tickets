import React from 'react';
import { TicketsList } from '@b2b-tickets/tickets';
import { getAllTickets } from '@b2b-tickets/server-actions';
import { Ticket } from '@/libs/shared-models/src';

const App: React.FC = async () => {
  const allTicketsList: Ticket[] = await getAllTickets();
  return <TicketsList tickets={allTicketsList} />;
};

export default App;
