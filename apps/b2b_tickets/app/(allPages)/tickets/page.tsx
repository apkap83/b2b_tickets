import React from 'react';
import { TicketsList } from '@b2b-tickets/tickets';
import Container from '@mui/material/Container';

const App: React.FC = ({
  searchParams,
}: {
  searchParams?: {
    query?: string;
    page?: string;
  };
}) => {
  return (
    <Container
      maxWidth="xl"
      sx={{
        marginTop: 2,
        paddingBottom: '55px',
      }}
      className="relative"
    >
      <TicketsList searchParams={searchParams} />
    </Container>
  );
};

export default App;
