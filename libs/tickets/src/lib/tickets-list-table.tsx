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

export const TicketsListTable = ({
  ticketsList,
  setTicketsList,
}: {
  ticketsList: TicketDetail[] | TicketDetailForTicketCreator[];
  setTicketsList: (a: TicketDetail[] | TicketDetailForTicketCreator[]) => void;
}) => {
  const { data: session, status } = useSession();
  // Web Socket Connection
  // State to manage the updated ticket list
  const [updatedTickets, setUpdatedTickets] = useState<
    TicketDetail[] | TicketDetailForTicketCreator[]
  >([]);

  const { latestEventEmitted } = useWebSocket(); // Access WebSocket instance

  // Update Ticket List Based on Received Events

  useEffect(() => {
    const fetchData = async () => {
      if (!latestEventEmitted) return;

      if (latestEventEmitted.event === WebSocketMessage.NEW_COMMENT_ADDED) {
        // console.log('latestEventEmitted', latestEventEmitted);

        // console.log('Setting Comment Last Date...');
        const emittedTicketId = latestEventEmitted.data.ticket_id;
        const commentDate = formatDate(new Date(latestEventEmitted.data.date));

        setTicketsList((prevTickets: any) =>
          prevTickets.map((ticket: any) =>
            ticket.ticket_id === emittedTicketId
              ? {
                  ...ticket,
                  'Last Cust. Comment Date': commentDate,
                }
              : ticket
          )
        );
      }

      if (latestEventEmitted.event === WebSocketMessage.NEW_TICKET_CREATED) {
        // console.log('latestEventEmitted', latestEventEmitted);

        // console.log('Retrieving list of tickets again');
        const ticketsList = await getFilteredTicketsForCustomer(
          query,
          currentPage
        );
        setUpdatedTickets(ticketsList);
      }
    };

    fetchData();
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
