import { getServerSession } from 'next-auth';
import { options } from '@b2b-tickets/auth-options';

import {
  AppRoleTypes,
  TicketDetail,
  TicketDetailForTicketCreator,
} from '@b2b-tickets/shared-models';
import { userHasRole } from '@b2b-tickets/utils';
import { getFilteredTicketsForCustomer } from '@b2b-tickets/server-actions';

import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import styles from './css/tickets-list.module.scss';
import { TicketRow } from './ticket-row';

export const TicketsList = async ({
  query,
  currentPage,
}: {
  query: string;
  currentPage: number;
}) => {
  const ticketsList = await getFilteredTicketsForCustomer(query, currentPage);

  if (ticketsList.length === 0) {
    return <p className="pt-5 text-center">No Tickets Currently Exist</p>;
  }

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

const generateTableHeadAndColumns = async () => {
  const session = await getServerSession(options);
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
  const session = await getServerSession(options);

  return (
    <TableBody>
      {items.map((item: any) => (
        <TicketRow session={session} item={item} />
      ))}
    </TableBody>
  );
};
