'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { userHasRole, formatDate } from '@b2b-tickets/utils';
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
import { useWebSocket } from '@b2b-tickets/react-hooks';
import styles from './css/tickets-list.module.scss';
import { WebSocketMessage } from '@b2b-tickets/shared-models';
import { getFilteredTicketsForCustomer } from '@b2b-tickets/server-actions';
import { AppRole } from '@/libs/db-access/src';
import { late } from 'zod';

export const TicketsListTable = ({
  ticketsList,
  setTicketsList,
  query,
  currentPage,
}: {
  ticketsList: TicketDetail[] | TicketDetailForTicketCreator[];
  setTicketsList: (a: TicketDetail[] | TicketDetailForTicketCreator[]) => void;
  query: string;
  currentPage: number;
}) => {
  const { data: session, status } = useSession();
  const { latestEventEmitted } = useWebSocket(); // Access WebSocket instance
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const refreshTicketsList = async () => {
      setIsLoading(true);
      try {
        const { event, data: ticket_id } = latestEventEmitted;
        const { ticket_id: eventTicketid } = ticket_id;

        // Only for New Ticket
        if (event === WebSocketMessage.NEW_TICKET_CREATED) {
          const newTicketsList = await getFilteredTicketsForCustomer(
            query,
            currentPage
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
            query,
            currentPage
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

  if (!ticketsList || ticketsList.length === 0)
    return <p className="pt-5 text-center">No Tickets Currently Exist</p>;

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
            {columnsForTickets.map((item: any, id: number) => (
              <TableCell key={id} align="center">
                {item}
              </TableCell>
            ))}
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

  if (!ticketsList || ticketsList.length === 0) return null;

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
    </>
  );
};
