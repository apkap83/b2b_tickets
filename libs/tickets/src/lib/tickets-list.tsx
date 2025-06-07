'use client';

import { useState, useEffect, useCallback, useMemo, memo } from 'react';
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
import { LiveUpdatesIndicator } from '@b2b-tickets/ui';

export const TicketsList = memo(
  ({
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
    const params = useMemo(
      () => new URLSearchParams(searchParams),
      [searchParams]
    );
    const currentPage = useMemo(() => params.get('page') || 1, [params]);

    // Memoize the filters object to prevent unnecessary recalculations
    const filters = useMemo(() => {
      const filtersObj: Record<string, string[]> = {};

      // Loop over params and populate filters object
      params.forEach((value, key) => {
        if (key !== 'page' && key !== 'query') {
          // Skip non-filter keys
          filtersObj[key] = decodeURIComponent(value)
            .split('\x1F') // Use the delimiter to split values
            .filter(Boolean); // Remove empty or invalid values
        }
      });

      return filtersObj;
    }, [params]);

    // Memoize the getTicketList function to prevent recreating it on every render
    const getTicketList = useCallback(async () => {
      const query = params.get('query') || '';
      const pageNumber = Number(params.get('page')) || 1;

      const { pageData } = await getFilteredTicketsForCustomer(
        pageNumber,
        query,
        filters
      );
      setTicketsList(pageData);
    }, [params, filters]);

    // Get Tickets List on Search Param Change
    useEffect(() => {
      getTicketList();
    }, [getTicketList]);

    // Memoize query to avoid unnecessary string operations
    const query = useMemo(() => params.get('query') || '', [params]);

    // Memoize currentPageNumber to avoid redundant conversions
    const currentPageNumber = useMemo(() => Number(currentPage), [currentPage]);

    return (
      <>
        <TicketListHeader
          totalRows={totalRows}
          ticketsList={ticketsList}
          query={query}
          filter={filters}
          currentPage={currentPageNumber}
        />
        <TicketsListTable
          totalRows={totalRows}
          ticketsList={ticketsList}
          setTicketsList={setTicketsList}
          query={query}
          filter={filters}
          currentPage={currentPageNumber}
        />
        <LiveUpdatesIndicator />
      </>
    );
  }
);
