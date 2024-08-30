import React from 'react';
import { getServerSession } from 'next-auth';
import { TicketsList } from '@b2b-tickets/tickets';
import { getAllTickets } from '@b2b-tickets/server-actions';
import { Ticket } from '@/libs/shared-models/src';
import { redirect } from 'next/navigation';
import { options } from '@b2b-tickets/auth-options';

const App: React.FC = async () => {
  const session = await getServerSession(options);
  if (!session) {
    redirect('/api/auth/signin?callbackUrl=/tickets');
  } else {
    const allTicketsList: Ticket[] = await getAllTickets({
      userId: session?.user?.user_id,
    });
    return <TicketsList tickets={allTicketsList} />;
  }
  // const allTicketsList: Ticket[] = await getAllTickets();
  // return <TicketsList tickets={allTicketsList} />;
};

export default App;
