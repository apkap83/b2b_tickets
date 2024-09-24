import { getServerSession } from 'next-auth';
import { options } from '@b2b-tickets/auth-options';
import Link from 'next/link';

import {
  Ticket,
  TicketStatusName,
  TicketStatusColors,
  AppRoleTypes,
  FilterTicketsStatus,
} from '@b2b-tickets/shared-models';
import { userHasPermission, userHasRole } from '@b2b-tickets/utils';
import { getFilteredTicketsForCustomer } from '@b2b-tickets/server-actions';

import Box from '@mui/material/Box';
import { Typography } from '@mui/material';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Button from '@mui/material/Button';
import { TicketListHeader } from '@b2b-tickets/tickets';
import { formatDate } from '@b2b-tickets/utils';
import clsx from 'clsx';
import styles from './css/tickets-list.module.scss';

export const TicketsList = async ({
  query,
  currentPage,
}: {
  query: string;
  currentPage: number;
}) => {
  const itemsPerPage = 10;
  const session = await getServerSession(options);
  const ticketsList: Ticket[] = await getFilteredTicketsForCustomer(
    query,
    currentPage
  );

  if (ticketsList.length === 0) {
    return <p className="pt-5 text-center">No Tickets Currently Exist</p>;
  }

  return (
    <>
      {/* <TicketListHeader ticketsList={ticketsList} /> */}
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
    'Status',
    'Status Date',
  ];

  if (userHasRole(session, AppRoleTypes.B2B_TicketHandler)) {
    columnsForTickets.unshift('Customer');
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

const generateTableBody = async (items: Ticket[]) => {
  const session = await getServerSession(options);
  return (
    <TableBody>
      {items.map((item: any) => (
        <TableRow
          key={item.ticket_id}
          sx={{
            whiteSpace: 'nowrap',

            '&:hover': {
              backgroundColor: 'rgba(0,0,0,.05)',
              // cursor: 'pointer',
            },
          }}
        >
          {userHasRole(session, AppRoleTypes.B2B_TicketHandler) ? (
            <TableCell data-label="Customer" align="center">
              <span className="font-medium">{item.Customer}</span>
            </TableCell>
          ) : null}
          <TableCell data-label="Ticket Number" align="center">
            <Link href={`/ticket/${item.Ticket}`} className="text-blue-500">
              {
                <span className="font-medium tracking-wider">
                  {item.Ticket}
                </span>
              }
            </Link>
          </TableCell>
          <TableCell data-label="Opened" align="center">
            {formatDate(item.Opened)}
          </TableCell>
          <TableCell
            style={{
              whiteSpace: 'normal',
            }}
            data-label="Title"
            align="center"
          >
            {item.Title}
          </TableCell>
          <TableCell data-label="Category" align="center">
            {item.Category}
          </TableCell>
          <TableCell data-label="Service" align="center">
            {item.Service}
          </TableCell>
          <TableCell data-label="Opened By" align="center">
            {formatDate(item['Opened By'])}
          </TableCell>
          <TableCell data-label="Status" align="center">
            {
              <div
                className={clsx(
                  'px-1 py-1 rounded-md font-medium text-center',
                  {
                    [`text-[#ffffff]  border bg-[#6870fa]`]:
                      item.Status === TicketStatusName.NEW,
                    [`text-[#ffffff] border bg-[#916430]`]:
                      item.Status === TicketStatusName.WORKING,
                    [`text-[#ffffff] border bg-[#dc5743]`]:
                      item.Status === TicketStatusName.CANCELLED,
                    [`text-[#ffffff] border bg-[#3d8d52]`]:
                      item.Status === TicketStatusName.CLOSED,
                  }
                )}
              >
                {item.Status}
              </div>
            }
          </TableCell>
          <TableCell data-label="Status Date" align="center">
            {formatDate(item['Status Date'])}
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  );
};
