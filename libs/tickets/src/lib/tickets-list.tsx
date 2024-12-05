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
  totalRows,
}: {
  searchParams?: {
    query?: string;
    page?: string;
  };
  theTicketsList: TicketDetail[] | TicketDetailForTicketCreator[];
  totalRows: number;
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

  return (
    <>
      <TicketListHeader
        totalRows={totalRows}
        ticketsList={ticketsList}
        query={searchParams?.query!}
        currentPage={Number(currentPage)}
      />
      <TicketsListTable
        totalRows={totalRows}
        ticketsList={ticketsList}
        setTicketsList={setTicketsList}
        query={searchParams?.query!}
        currentPage={Number(currentPage)}
      />
    </>
  );
};
