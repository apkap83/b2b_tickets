'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import {
  userHasRole,
  formatDate,
  columnAllowedForFilter,
} from '@b2b-tickets/utils';
import {
  AppRoleTypes,
  TicketDetail,
  TicketDetailForTicketCreator,
} from '@b2b-tickets/shared-models';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import { TicketRow } from './ticket-row';
import { useEscKeyListener } from '@b2b-tickets/react-hooks';
import { useWebSocketContext } from '@b2b-tickets/contexts';

import styles from './css/tickets-list.module.scss';
import { WebSocketMessage } from '@b2b-tickets/shared-models';
import { getFilteredTicketsForCustomer } from '@b2b-tickets/server-actions';
import { late } from 'zod';
import { Pagination } from '@b2b-tickets/ui';
import { config } from '@b2b-tickets/config';
import { ColumnFilter } from './column-filter';
import { CiFilter } from 'react-icons/ci';
import { FaFilter } from 'react-icons/fa';
import { TbFilterCheck } from 'react-icons/tb';
import { FcFilledFilter } from 'react-icons/fc';
import { ImFilter } from 'react-icons/im';
import { debounce } from 'lodash';

export const TicketsListTable = ({
  totalRows,
  ticketsList,
  setTicketsList,
  query,
  filter,
  currentPage,
}: {
  totalRows: number;
  ticketsList: TicketDetail[] | TicketDetailForTicketCreator[];
  setTicketsList: (a: TicketDetail[] | TicketDetailForTicketCreator[]) => void;
  query: string;
  filter: Record<string, string[]>;
  currentPage: number;
}) => {
  const { data: session } = useSession();
  const { latestEventEmitted } = useWebSocketContext(); // Access WebSocket instance
  const [activeFilterColumn, setActiveFilterColumn] = useState<string | null>(
    null
  );

  const isFilterEmpty = useMemo(
    () => Object.values(filter).every((arr) => arr.length === 0),
    [filter]
  );
  const isTicketHandler = useMemo(
    () => userHasRole(session, AppRoleTypes.B2B_TicketHandler),
    [session]
  );

  const closeFilter = useCallback(() => {
    setActiveFilterColumn(null);
  }, []);

  // ESC Key Listener
  useEscKeyListener(closeFilter);

  const toggleFilter = useCallback((column: string) => {
    setActiveFilterColumn((prev) => (prev === column ? null : column));
  }, []);

  const refreshTicketsList = useCallback(async () => {
    if (!latestEventEmitted) return;

    try {
      const { event, data: ticket_id } = latestEventEmitted;
      const { ticket_id: eventTicketid } = ticket_id;

      const newTicketsList = await getFilteredTicketsForCustomer(
        currentPage,
        query,
        filter
      );

      const newTicketShouldBeIncludedInCurrentView =
        newTicketsList.pageData.some(
          (item: any) => item.ticket_id === eventTicketid
        );

      const currentUserViewShowsThisTicket = ticketsList.some(
        (item) => item.ticket_id === eventTicketid
      );

      if (event === WebSocketMessage.NEW_TICKET_CREATED) {
        if (newTicketShouldBeIncludedInCurrentView) {
          setTicketsList(newTicketsList.pageData);
        }
        return;
      }

      if (currentUserViewShowsThisTicket) {
        setTicketsList(newTicketsList.pageData);
      }
    } catch (error) {
      console.error('Error refreshing tickets:', error);
    }
  }, [
    latestEventEmitted,
    currentPage,
    query,
    filter,
    ticketsList,
    setTicketsList,
  ]);

  const debouncedRefreshTickets = useMemo(
    () =>
      debounce(() => {
        refreshTicketsList();
      }, 300),
    [refreshTicketsList]
  );

  // Actions on Events
  useEffect(() => {
    if (!latestEventEmitted) return;

    const { event } = latestEventEmitted;

    switch (event) {
      case WebSocketMessage.NEW_COMMENT_ADDED:
        debouncedRefreshTickets();
        break;

      case WebSocketMessage.NEW_TICKET_CREATED:
      case WebSocketMessage.TICKET_CLOSED:
      case WebSocketMessage.TICKET_CANCELED:
      case WebSocketMessage.TICKET_ESCALATED:
      case WebSocketMessage.TICKET_ALTERED_SEVERITY:
      case WebSocketMessage.TICKET_STARTED_WORK:
      case WebSocketMessage.TICKET_ALTERED_CATEGORY_SERVICE_TYPE:
        debouncedRefreshTickets();
        break;

      default:
        console.warn(`Unhandled WebSocket event: ${event}`);
    }

    return () => {
      debouncedRefreshTickets.cancel();
    };
  }, [latestEventEmitted]);

  const generateTableHeadAndColumns = useMemo(() => {
    let columnsForTickets = [
      'Ticket Number',
      'Opened',
      'Title',
      'Category',
      'Service',
      'Opened By',
      'Severity',
      'Status',
      'Status Date',
    ];

    if (isTicketHandler) {
      columnsForTickets.unshift('Cust. Type');
      columnsForTickets.unshift('Customer');
      columnsForTickets.push('Escalation');
      columnsForTickets.push('Cust. Last Comment');
    }

    return (
      <>
        <TableRow sx={{ whiteSpace: 'nowrap' }}>
          {columnsForTickets.map((item: any, id: number) => {
            // Check if a filter is applied to this column
            const isFiltered = !!filter[item]?.length;
            return (
              <TableCell
                key={id}
                align="center"
                sx={{
                  position: 'relative',
                  backgroundColor: isFiltered ? '#e0f7fa' : 'transparent', // Highlight if filtered
                  cursor: isTicketHandler ? 'pointer' : 'default',
                  whiteSpace: 'wrap',
                }}
                className="relative group"
                onClick={() => isTicketHandler && toggleFilter(item)} // Toggle filter visibility
              >
                <div className="flex justify-between items-center">
                  {item}
                  {/* Column Filter Only For Ticket Handlers */}
                  {isTicketHandler &&
                    columnAllowedForFilter(item) &&
                    (isFiltered ? (
                      <FaFilter
                        color="#00000085"
                        size={14}
                        className={`filter-icon ${
                          isFiltered
                            ? 'text-black visible'
                            : 'invisible group-hover:visible'
                        }`}
                      />
                    ) : (
                      <CiFilter
                        color="gray"
                        size={16}
                        className={`filter-icon ${
                          isFiltered
                            ? 'text-black visible'
                            : 'invisible group-hover:visible'
                        }`}
                      />
                    ))}
                </div>
                {activeFilterColumn === item && (
                  <ColumnFilter column={item} closeFilter={closeFilter} />
                )}
              </TableCell>
            );
          })}
        </TableRow>
      </>
    );
  }, [isTicketHandler, filter, activeFilterColumn, toggleFilter, closeFilter]);

  const generateTableBody = useMemo(() => {
    return (
      <>
        {ticketsList.map((item: any) => (
          <TicketRow key={item.ticket_id} session={session} item={item} />
        ))}
      </>
    );
  }, [ticketsList, session]);

  const totalPages = useMemo(
    () => Math.ceil(Number(totalRows) / config.TICKET_ITEMS_PER_PAGE),
    [totalRows]
  );

  if (ticketsList && ticketsList.length === 0 && isFilterEmpty)
    return <p className="text-center">No Tickets Currently Exist</p>;

  return (
    <>
      <Table
        sx={{
          width: '100%',
          bgcolor: 'white',
        }}
        size="medium"
        aria-label="a dense table"
        className={`${styles.ticketsList}`}
      >
        <TableHead>{generateTableHeadAndColumns}</TableHead>
        <TableBody>{generateTableBody}</TableBody>
      </Table>
      {totalRows > 0 && (
        <div className="pt-5 flex justify-between items-center">
          <div>Total Items: {totalRows}</div>
          {totalPages > 1 && <Pagination totalPages={totalPages} />}
        </div>
      )}
    </>
  );
};
