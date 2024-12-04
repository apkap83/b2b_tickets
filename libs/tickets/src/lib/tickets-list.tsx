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
  theTicketsList,
}: {
  searchParams?: {
    query?: string;
    page?: string;
  };
  theTicketsList: TicketDetail[] | TicketDetailForTicketCreator[];
}) => {
  // State to manage the updated ticket list
  const [ticketsList, setTicketsList] = useState<
    TicketDetail[] | TicketDetailForTicketCreator[]
  >(theTicketsList);

  const currentPage = Number(searchParams?.page) || 1;

  // Get Tickets List on Search Param Change
  useEffect(() => {
    const getTicketList = async () => {
      const query = searchParams?.query || '';
      const currentPage = Number(searchParams?.page) || 1;
      const { pageData, totalRows } = await getFilteredTicketsForCustomer(
        query,
        currentPage
      );
      setTicketsList(pageData);
    };
    getTicketList();
  }, [searchParams]);

  const numOfTickets = ticketsList?.length;
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
