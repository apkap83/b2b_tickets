'use client';
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

import clsx from 'clsx';

import { getAllTickets } from '@b2b-tickets/server-actions';
import { tokens } from '@b2b-tickets/ui-theme';

const App: React.FC = () => {
  const [tickets, setTickets] = useState<any>([]);
  const [isFetching, setIsFetching] = useState(true);
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  useEffect(() => {
    const getTickets = async () => {
      const tickets = await getAllTickets();
      setTickets(tickets);
      console.log('tickets', tickets);
      setIsFetching(false);
    };

    getTickets();
  }, []);

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
      <TableHead>
        <TableRow sx={{ whiteSpace: 'nowrap' }}>
          {columnsArray.map((item: any, id: number) => (
            <TableCell key={id} align="center">
              {item}
            </TableCell>
          ))}
        </TableRow>
      </TableHead>
    );
  };

  function formatDate(date: Date) {
    if (!date) return null;
    return date
      .toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      })
      .replace(',', '');
  }

  const generateTableBody = (items: any) => {
    console.log('items', items);
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

  if (!tickets || tickets.length === 0) {
    return <h2>Loading...</h2>;
  }
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

        <Paper elevation={2}>
          <Button
            variant="contained"
            sx={{
              ':hover': {
                backgroundColor: 'black',
                color: 'white',
              },
            }}
          >
            Create New Ticket
          </Button>
        </Paper>
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
    </Container>
  );
};

export default App;
