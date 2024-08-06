'use client';

import styled from 'styled-components';
const StyledTicketsUi = styled.div`
  color: pink;
`;

import React, { useState, useEffect } from 'react';
import Stack from '@mui/material/Stack';
import { Typography, useTheme } from '@mui/material';

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
import { Ticket } from '@/libs/shared-models/src';
import { getAllTickets } from '@b2b-tickets/server-actions';
import { tokens } from '@b2b-tickets/ui-theme';
import { formatDate } from '@b2b-tickets/utils';
import { NewTicketModal } from './new-ticket';

interface TicketsListProps {
  tickets: Ticket[];
}

export const TicketsList: React.FC<TicketsListProps> = ({ tickets }) => {
  const [showCreateTicketModal, setShowCreateTicketModal] = useState(false);

  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const columnsForTickets = [
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
          <TableRow key={item.ticket_id} sx={{ whiteSpace: 'nowrap' }}>
            <TableCell align="center">{item.Ticket}</TableCell>
            <TableCell align="center">{formatDate(item.Opened)}</TableCell>
            <TableCell align="center">{item.Title}</TableCell>
            <TableCell align="center">{item.Category}</TableCell>
            <TableCell align="center">{item.Service}</TableCell>
            <TableCell align="center">{item.Equipment}</TableCell>
            <TableCell align="center">
              {formatDate(item['Opened By'])}
            </TableCell>
            <TableCell align="center">{item.Status}</TableCell>
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
      </Box>
      <Box>
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
      </Box>
      {showCreateTicketModal && (
        <NewTicketModal closeModal={() => setShowCreateTicketModal(false)} />
      )}
    </Container>
  );
};

export default TicketsList;
