import React from 'react';
import { TicketDetails } from '@b2b-tickets/tickets';

const App = async ({ params }: { params: any }) => {
  return <TicketDetails theTicketNumber={params.slug} />;
};

export default App;
