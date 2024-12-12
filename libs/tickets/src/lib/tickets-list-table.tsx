'use client';
import { useEffect, useState } from 'react';
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
import { useWebSocket, useEscKeyListener } from '@b2b-tickets/react-hooks';
import styles from './css/tickets-list.module.scss';
import { WebSocketMessage } from '@b2b-tickets/shared-models';
import { getFilteredTicketsForCustomer } from '@b2b-tickets/server-actions';
import { AppRole } from '@/libs/db-access/src';
import { late } from 'zod';
import { Pagination } from '@b2b-tickets/ui';
import { config } from '@b2b-tickets/config';
import { ColumnFilter } from './column-filter';
import { CiFilter } from 'react-icons/ci';
import { FaFilter } from 'react-icons/fa';
import { TbFilterCheck } from 'react-icons/tb';
import { FcFilledFilter } from 'react-icons/fc';
import { ImFilter } from 'react-icons/im';

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
  const { data: session, status } = useSession();
  const { latestEventEmitted } = useWebSocket(); // Access WebSocket instance
  const [isLoading, setIsLoading] = useState(false);
  const [activeFilterColumn, setActiveFilterColumn] = useState<string | null>(
    null
  ); // Track which column's filter is active

  // ESC Key Listener
  useEscKeyListener(() => {
    setActiveFilterColumn(null);
  });

  if (totalRows === 0)
    return <p className="pt-5 text-center">No Tickets Currently Exist</p>;

  const toggleFilter = (column: string) => {
    setActiveFilterColumn((prev) => (prev === column ? null : column));
  };

  // Actions on Events
  useEffect(() => {
    const refreshTicketsList = async () => {
      setIsLoading(true);
      try {
        const { event, data: ticket_id } = latestEventEmitted;
        const { ticket_id: eventTicketid } = ticket_id;

        const filters: Record<string, string[]> = {};

        // Only for New Ticket
        if (event === WebSocketMessage.NEW_TICKET_CREATED) {
          const newTicketsList = await getFilteredTicketsForCustomer(
            currentPage,
            query,
            filter
          );

          const newTicketShouldBeIncludedInCurrentView =
            newTicketsList.pageData.some(
              (item: any) => item.ticket_id === eventTicketid
            );

          if (newTicketShouldBeIncludedInCurrentView)
            setTicketsList(newTicketsList.pageData);
          return;
        }

        // For Every Other Kind of Event Message
        const currentUserViewShowsThisTicket = ticketsList.some(
          (item) => item.ticket_id === eventTicketid
        );

        // Get Tickets List only if altered ticket exists in current user's view
        if (currentUserViewShowsThisTicket) {
          const newTicketsList = await getFilteredTicketsForCustomer(
            currentPage,
            query,
            filter
          );
          setTicketsList(newTicketsList.pageData);
        }
      } catch (error) {
        console.error('Error refreshing tickets:', error);
      } finally {
        setIsLoading(false);
      }
    };
    if (!latestEventEmitted) return;

    const { event, data } = latestEventEmitted;

    switch (event) {
      case WebSocketMessage.NEW_COMMENT_ADDED:
        if (userHasRole(session, AppRoleTypes.B2B_TicketHandler)) {
          //@ts-ignore
          setTicketsList((prevTickets) =>
            //@ts-ignore
            prevTickets.map((ticket) =>
              ticket.ticket_id === data.ticket_id
                ? {
                    ...ticket,
                    'Last Cust. Comment Date': formatDate(new Date(data.date)),
                  }
                : ticket
            )
          );
        }
        break;

      case WebSocketMessage.TICKET_ALTERED_REMEDY_INC: // No Action
        break;
      case WebSocketMessage.NEW_TICKET_CREATED:
      case WebSocketMessage.TICKET_CLOSED:
      case WebSocketMessage.TICKET_CANCELED:
      case WebSocketMessage.TICKET_ESCALATED:
      case WebSocketMessage.TICKET_ALTERED_SEVERITY:
      case WebSocketMessage.TICKET_STARTED_WORK:
      case WebSocketMessage.TICKET_ALTERED_CATEGORY_SERVICE_TYPE:
        refreshTicketsList();
        break;

      default:
        console.warn(`Unhandled WebSocket event: ${event}`);
    }
  }, [latestEventEmitted]);

  const generateTableHeadAndColumns = () => {
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

    if (userHasRole(session, AppRoleTypes.B2B_TicketHandler)) {
      columnsForTickets.unshift('Cust. Type');
      columnsForTickets.unshift('Customer');
      columnsForTickets.push('Escalation');
      columnsForTickets.push('Cust. Last Comment');
      // columnsForTickets.push('Delayed Resp');
    }

    return (
      <>
        <TableHead>
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
                    cursor: userHasRole(session, AppRoleTypes.B2B_TicketHandler)
                      ? 'pointer'
                      : 'default',
                    whiteSpace: 'wrap',
                  }}
                  className="relative group"
                  onClick={() =>
                    userHasRole(session, AppRoleTypes.B2B_TicketHandler) &&
                    toggleFilter(item)
                  } // Toggle filter visibility
                >
                  <div className="flex justify-between items-center">
                    {item}
                    {/* Column Filter Only For Ticket Handlers */}
                    {userHasRole(session, AppRoleTypes.B2B_TicketHandler) &&
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
                    <ColumnFilter
                      column={item}
                      closeFilter={() => setActiveFilterColumn(null)}
                    />
                  )}
                </TableCell>
              );
            })}
          </TableRow>
        </TableHead>
      </>
    );
  };

  const generateTableBody = (
    items: TicketDetail[] | TicketDetailForTicketCreator[]
  ) => {
    return (
      <TableBody>
        {items.map((item: any) => (
          <TicketRow key={item.ticket_id} session={session} item={item} />
        ))}
      </TableBody>
    );
  };

  const totalPages = Math.ceil(
    Number(totalRows) / config.TICKET_ITEMS_PER_PAGE
  );
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
        {generateTableHeadAndColumns()}
        {generateTableBody(ticketsList)}
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
