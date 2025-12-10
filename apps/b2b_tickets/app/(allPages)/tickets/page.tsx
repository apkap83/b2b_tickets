import React from 'react';
import { getServerSession } from 'next-auth';
import { options } from '@b2b-tickets/auth-options';
import { TicketsList } from '@b2b-tickets/tickets';
import Container from '@mui/material/Container';
import { getFilteredTicketsForCustomer } from '@b2b-tickets/server-actions';
import { notFound, redirect } from 'next/navigation';

interface SearchParams {
  query?: string;
  page?: string;
  [key: string]: string | undefined; // Handle dynamic filter keys
}

interface PageProps {
  searchParams?: Promise<SearchParams>;
}

const App = async ({ searchParams }: PageProps) => {
  // Authentication check
  const session = await getServerSession(options);

  if (!session?.user) {
    redirect('/signin?callbackUrl=/tickets');
  }

  // ✅ FIX: Await searchParams first
  const params = (await searchParams) || {};

  const query = params.query || ''; // Use the query parameter or default to an empty string
  const page = Number(params.page) || 1; // Parse page number or default to 1

  // Extract additional filters from searchParams
  const filters: Record<string, string[]> = {};

  // console.log('searchParams', params);

  Object.keys(params).forEach((key) => {
    filters[key] = decodeURIComponent(params[key]!)
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
