'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
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
  theTicketsList,
  totalRows,
}: {
  theTicketsList: TicketDetail[] | TicketDetailForTicketCreator[];
  totalRows: number;
}) => {
  // State to manage the updated ticket list
  const [ticketsList, setTicketsList] = useState<
    TicketDetail[] | TicketDetailForTicketCreator[]
  >(theTicketsList);

  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams);
  const currentPage = params.get('page') || 1;
  const filters: Record<string, string[]> = {};

  // Loop over params and populate filters object
  params.forEach((value, key) => {
    if (key !== 'page' && key !== 'query') {
      // Skip non-filter keys
      filters[key] = decodeURIComponent(value)
        .split('\x1F') // Use the delimiter to split values
        .filter(Boolean); // Remove empty or invalid values
    }
  });

  // const filters = searchParams?.filter;

  // Get Tickets List on Search Param Change
  useEffect(() => {
    const getTicketList = async () => {
      const query = params.get('query') || '';
      const currentPage = Number(params.get('page')) || 1;

      //@ts-ignore
      Object.keys(searchParams).forEach((key) => {
        //@ts-ignore
        filters[key] = decodeURIComponent(searchParams[key]!)
          .split('\x1F') // Use the delimiter to split values
          .filter(Boolean); // Remove empty values
      });

      const { pageData, totalRows } = await getFilteredTicketsForCustomer(
        currentPage,
        query,
        filters
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
        query={params.get('query') || ''}
        currentPage={Number(currentPage)}
      />
      <TicketsListTable
        totalRows={totalRows}
        ticketsList={ticketsList}
        setTicketsList={setTicketsList}
        query={params.get('query') || ''}
        filter={filters}
        currentPage={Number(currentPage)}
      />
    </>
  );
};
