'use client';
import { useState, useEffect } from 'react';
import { getFilteredTicketsForCustomer } from '@b2b-tickets/server-actions';
import { TicketsListTable } from './tickets-list-table';
import {
  TicketDetail,
  TicketDetailForTicketCreator,
  FilterTicketsStatus,
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
  // State to manage the updated ticket list
  const [ticketsList, setTicketsList] = useState<
    TicketDetail[] | TicketDetailForTicketCreator[]
  >([]);

  const [numOfTickets, setNumOfTickets] = useState(0);

  const currentPage = Number(searchParams?.page) || 1;

  const [ticketListRetrieved, setTicketListRetrieved] = useState(false);

  // Get Tickets List for the first time
  useEffect(() => {
    const getTicketList = async () => {
      const query = searchParams?.query || '';
      const currentPage = Number(searchParams?.page) || 1;
      const { pageData, totalRows } = await getFilteredTicketsForCustomer(
        query,
        currentPage
      );

      setTicketsList(pageData);

      setNumOfTickets(totalRows);
      setTicketListRetrieved(true);
    };

    getTicketList();
  }, [searchParams]);

  if (!ticketListRetrieved) return null;

  const totalPages = Math.ceil(
    Number(numOfTickets) / config.TICKET_ITEMS_PER_PAGE
  );

  return (
    <>
      <TicketListHeader
        totalTicketsForCustomer={numOfTickets}
        totalTickets={numOfTickets}
        query={searchParams?.query!}
        currentPage={Number(currentPage)}
      />
      <TicketsListTable
        ticketsList={ticketsList}
        setTicketsList={setTicketsList}
        query={searchParams?.query!}
        currentPage={Number(currentPage)}
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
