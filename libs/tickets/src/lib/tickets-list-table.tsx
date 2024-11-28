'use client';
import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { userHasRole } from '@b2b-tickets/utils';
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
import styles from './css/tickets-list.module.scss';
import { io } from 'socket.io-client';

export const TicketsListTable = ({ ticketsList }: { ticketsList: any }) => {
  const { data: session, status } = useSession();

  useEffect(() => {
    // Create the socket connection once
    const socket = io('http://127.0.0.1:3456', {
      transports: ['websocket'], // Use WebSocket for persistent connection
    });

    // Log when the socket is connected
    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
    });

    // Handle socket disconnection
    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected due to:', reason);
    });

    // Listen for the 'alter-ticket-severity' event
    socket.on('MyBigEvent', (data) => {
      console.log('Received MyBigEvent:', data);
    });

    // Clean up the socket when the component is unmounted
    return () => {
      socket.disconnect();
      console.log('Socket disconnected!');
    };
  }, []); // Empty dependency array ensures this effect runs only once

  const generateTableHeadAndColumns = async () => {
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

  const generateTableBody = async (
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
