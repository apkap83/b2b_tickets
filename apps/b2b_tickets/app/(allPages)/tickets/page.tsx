import React from 'react';
import { TicketsList } from '@b2b-tickets/tickets';
import Container from '@mui/material/Container';
import { getFilteredTicketsForCustomer } from '@b2b-tickets/server-actions';
import { notFound } from 'next/navigation';

const App: React.FC = async ({
  searchParams,
}: {
  searchParams?: {
    query?: string;
    page?: string;
  };
}) => {
  const defeaultQuery = searchParams?.query || '';
  const defaultPage = Number(searchParams?.page) || 1;

  const { pageData, totalRows } = await getFilteredTicketsForCustomer(
    defeaultQuery,
    defaultPage
  );

  if (!pageData) {
    notFound(); // Automatically renders `not-found.tsx`
  }

  return (
    <Container
      maxWidth="xl"
      sx={{
        marginTop: 2,
        paddingBottom: '55px',
      }}
      className="relative"
    >
      <TicketsList searchParams={searchParams} theTicketsList={pageData} />
    </Container>
  );
};

export default App;
