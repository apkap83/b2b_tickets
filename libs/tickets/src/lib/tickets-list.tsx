'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  getFilteredTicketsForCustomer,
  getTotalNumOfTicketsForCustomer,
} from '@b2b-tickets/server-actions';
import { TicketsListTable } from './tickets-list-table';
import {
  AppRoleTypes,
  TicketDetail,
  TicketDetailForTicketCreator,
} from '@b2b-tickets/shared-models';
import { TicketListHeader } from '@b2b-tickets/tickets';
import { Pagination } from '@b2b-tickets/ui';
import { config } from '@b2b-tickets/config';

export const TicketsList = ({
  searchParams,
}: {
  searchParams?: {
    query?: string;
    page?: string;
  };
}) => {
  const { data: session, status } = useSession();

  // State to manage the updated ticket list
  const [ticketsList, setTicketsList] = useState<
    TicketDetail[] | TicketDetailForTicketCreator[]
  >([]);

  const [numOfTickets, setNumOfTickets] = useState(0);

  const [query, setQuery] = useState('');

  const [currentPage, setCurrentPage] = useState(
    Number(searchParams?.page) || 1
  );

  const [ticketListRetrieved, setTicketListRetrieved] = useState(false);

  // Get Tickets List for the first time
  useEffect(() => {
    const getTicketList = async () => {
      const query = searchParams?.query || '';
      const currentPage = Number(searchParams?.page) || 1;
      const ticketsList = await getFilteredTicketsForCustomer(
        query,
        currentPage
      );

      console.log('ticketsList', ticketsList);
      setTicketsList(ticketsList);

      const totalTicketsForCustomer = Number(
        await getTotalNumOfTicketsForCustomer()
      );

      setNumOfTickets(totalTicketsForCustomer);

      setTicketListRetrieved(true);
    };

    getTicketList();
  }, [searchParams]);

  if (!ticketListRetrieved) return null;

  if (ticketListRetrieved && ticketsList.length === 0) {
    return <p className="pt-5 text-center">No Tickets Currently Exist</p>;
  }

  const totalPages = Math.ceil(
    Number(numOfTickets) / config.TICKET_ITEMS_PER_PAGE
  );

  return (
    <>
      <TicketListHeader
        totalTicketsForCustomer={numOfTickets}
        totalTickets={numOfTickets}
        query={''}
        currentPage={1}
      />
      <TicketsListTable
        ticketsList={ticketsList}
        setTicketsList={setTicketsList}
      />

      {numOfTickets > 0 && (
        <div className="pt-5 flex justify-between items-center">
          <div>Total Items: {numOfTickets}</div>
          {totalPages > 1 && <Pagination totalPages={totalPages} />}
        </div>
      )}
    </>
  );
};
