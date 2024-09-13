'use client';

import styled from 'styled-components';
const StyledTicketsUi = styled.div`
  color: pink;
`;

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Stack from '@mui/material/Stack';
import { Typography, useTheme } from '@mui/material';

import { useSession } from 'next-auth/react';

// MUI Lib Imports
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Container from '@mui/material/Container';
import {
  Ticket,
  TicketStatusName,
  TicketStatusColors,
  AppRoleTypes,
} from '@b2b-tickets/shared-models';
import { tokens } from '@b2b-tickets/ui-theme';
import { formatDate } from '@b2b-tickets/utils';
import { NewTicketModal } from './new-ticket-modal';
import { userHasPermission, userHasRole } from '@b2b-tickets/utils';

import clsx from 'clsx';
interface TicketsListProps {
  tickets: Ticket[];
}

export const TicketsList: React.FC<TicketsListProps> = ({ tickets }) => {
  const [showCreateTicketModal, setShowCreateTicketModal] = useState(false);
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const { data: session, status } = useSession();

  let columnsForTickets = [
    'Ticket Number',
    'Opened',
    'Title',
    'Category',
    'Service',
    'Equipment',
    'Opened By',
    'Status',
    'Status Date',
  ];

  if (userHasRole(session, AppRoleTypes.B2B_TicketHandler)) {
    columnsForTickets = [
      'Customer',
      'Ticket Number',
      'Opened',
      'Title',
      'Category',
      'Service',
      'Equipment',
      'Opened By',
      'Status',
      'Status Date',
    ];
  }

  const generateTableHeadAndColumns = (columnsArray: any) => {
    return (
      <>
        <TableHead>
          <TableRow sx={{ whiteSpace: 'nowrap' }}>
            {columnsArray.map((item: any, id: number) => (
              <TableCell key={id} align="center">
                {item}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
      </>
    );
  };

  const generateTableBody = (items: any) => {
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
              <TableCell align="center">
                <span className="font-medium">{item.Customer}</span>
              </TableCell>
            ) : null}
            <TableCell align="center">
              <Link href={`/ticket/${item.Ticket}`} className="text-blue-500">
                {
                  <span className="font-medium tracking-wider">
                    {item.Ticket}
                  </span>
                }
              </Link>
            </TableCell>
            <TableCell align="center">{formatDate(item.Opened)}</TableCell>
            <TableCell align="center">{item.Title}</TableCell>
            <TableCell align="center">{item.Category}</TableCell>
            <TableCell align="center">{item.Service}</TableCell>
            <TableCell align="center">{item.Equipment}</TableCell>
            <TableCell align="center">
              {formatDate(item['Opened By'])}
            </TableCell>
            <TableCell align="center">
              {
                <div
                  className={clsx('px-1 py-1 rounded-md font-medium', {
                    [`text-[#ffffff]  border bg-[#6870fa]`]:
                      item.Status === TicketStatusName.NEW,
                    [`text-[#ffffff] border bg-[#916430]`]:
                      item.Status === TicketStatusName.WORKING,
                    [`text-[#ffffff] border bg-[#dc5743]`]:
                      item.Status === TicketStatusName.CANCELLED,
                    [`text-[#ffffff] border bg-[#3d8d52]`]:
                      item.Status === TicketStatusName.CLOSED,
                  })}
                >
                  {item.Status}
                </div>
              }
            </TableCell>
            <TableCell align="center">
              {formatDate(item['Status Date'])}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    );
  };

  return (
    <Container
      maxWidth="xl"
      sx={{
        marginTop: 2.5,
        minWidth: '1000px',
      }}
    >
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        borderBottom={`1px solid ${colors.blueAccent[800]}`}
      >
        <Typography variant="h1" component="h1" mb={2}>
          Tickets
        </Typography>

        {!userHasRole(session, AppRoleTypes.B2B_TicketHandler) ||
        userHasRole(session, AppRoleTypes.Admin) ? (
          <Button
            variant="contained"
            onClick={() => setShowCreateTicketModal(true)}
            sx={{
              ':hover': {
                backgroundColor: 'black',
                color: 'white',
              },
            }}
          >
            Create New Ticket
          </Button>
        ) : null}
      </Box>
      <Box>
        {tickets.length === 0 ? (
          <p className="pt-5 text-center">No Tickets Currently Exist</p>
        ) : (
          <Table
            sx={{
              width: '100%',
              bgcolor:
                theme.palette.mode === 'light' ? 'white' : colors.primary[900],
            }}
            size="medium"
            aria-label="a dense table"
          >
            {generateTableHeadAndColumns(columnsForTickets)}
            {generateTableBody(tickets)}
          </Table>
        )}
      </Box>
      {showCreateTicketModal && (
        <NewTicketModal
          //@ts-ignore
          userId={session?.user.user_id}
          closeModal={() => setShowCreateTicketModal(false)}
        />
      )}
    </Container>
  );
};

export default TicketsList;
