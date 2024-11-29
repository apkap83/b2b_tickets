import { getFilteredTicketsForCustomer } from '@b2b-tickets/server-actions';
import { TicketsListTable } from './tickets-list-table';

export const TicketsList = async ({
  query,
  currentPage,
}: {
  query: string;
  currentPage: number;
}) => {
  const ticketsList = await getFilteredTicketsForCustomer(query, currentPage);

  if (ticketsList.length === 0) {
    return <p className="pt-5 text-center">No Tickets Currently Exist</p>;
  }

  return (
    <>
      <TicketsListTable
        ticketsList={ticketsList}
        query={query}
        currentPage={currentPage}
      />
    </>
  );
};
