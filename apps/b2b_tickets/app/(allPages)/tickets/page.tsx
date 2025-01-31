import React from 'react';
import { TicketsList } from '@b2b-tickets/tickets';
import Container from '@mui/material/Container';
import { getFilteredTicketsForCustomer } from '@b2b-tickets/server-actions';
import { notFound } from 'next/navigation';

const App: React.FC = async ({
  searchParams = {}, // Provide a default empty object
}: {
  searchParams?: {
    query?: string;
    page?: string;
    [key: string]: string | undefined; // Handle dynamic filter keys
  };
}) => {
  const query = searchParams.query || ''; // Use the query parameter or default to an empty string
  const page = Number(searchParams.page) || 1; // Parse page number or default to 1

  // Extract additional filters from searchParams
  const filters: Record<string, string[]> = {};

  Object.keys(searchParams).forEach((key) => {
    filters[key] = decodeURIComponent(searchParams[key]!)
      .split('\x1F') // Use the delimiter to split values
      .filter(Boolean); // Remove empty values
  });
  const { pageData, totalRows } = await getFilteredTicketsForCustomer(
    page,
    query,
    filters // Pass filters to the backend
  );

  if (!pageData) {
    notFound(); // Automatically renders `not-found.tsx`
  }

  return (
    <Container
      maxWidth="xl"
      className="relative mt-[20px] mb-[64px] sm:mt-[96px]"
    >
      <TicketsList theTicketsList={pageData} totalRows={totalRows} />
    </Container>
  );
};

export default App;
