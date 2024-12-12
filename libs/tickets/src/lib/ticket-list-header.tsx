'use client';
import { useState } from 'react';
import Box from '@mui/material/Box';
import { Typography } from '@mui/material';
import { userHasPermission, userHasRole } from '@b2b-tickets/utils';
import { AppPermissionTypes, AppRoleTypes } from '@b2b-tickets/shared-models';
import { NewTicketModal } from './new-ticket-modal';

import Button from '@mui/material/Button';

import { useSession } from 'next-auth/react';
import styles from './css/tickets-list.module.scss';
import clsx from 'clsx';
import { TicketFilter } from './ticket-filter-btn';
import {
  TicketDetail,
  TicketDetailForTicketCreator,
  FilterTicketsStatus,
} from '@b2b-tickets/shared-models';
import { ExportToExcelButton } from './export-excel-btn';
import { useEscKeyListener } from '@/libs/react-hooks/src';

export const TicketListHeader = ({
  totalRows,
  ticketsList,
  query,
  filter,
  currentPage,
}: {
  totalRows: number;
  ticketsList: TicketDetail[] | TicketDetailForTicketCreator[];
  query: string;
  filter: Record<string, string[]>;
  currentPage: number;
}) => {
  const [showCreateTicketModal, setShowCreateTicketModal] = useState(false);
  const { data: session, status } = useSession();

  // ESC Key Listener
  useEscKeyListener(() => {
    setShowCreateTicketModal(false);
  });
  return (
    <Box
      className={clsx(styles.ticketDetailsContainer)}
      display="flex"
      justifyContent="space-between"
      alignItems="center"
      borderBottom={`1px solid #2a2d64`}
      paddingBottom={'0.5rem'}
      marginBottom={'0.5rem'}
    >
      <Typography variant="h1" component="h1">
        Tickets
      </Typography>

      <div className="flex gap-2">
        <ExportToExcelButton
          query={query}
          currentPage={currentPage}
          filter={filter}
          disabled={totalRows === 0 ? true : false}
        />
        <TicketFilter />
        {userHasPermission(session, AppPermissionTypes.Create_New_Ticket) && (
          <Button
            variant="contained"
            onClick={() => setShowCreateTicketModal(true)}
            sx={{
              boxShadow: '0 10px 20px rgba(0,0,0,.2)',
              transition: 'all .2s',

              '&:hover': {
                boxShadow: '0 10px 20px rgba(0,0,0,.2)',
                backgroundColor: 'black',
                color: 'white',
              },

              '&:active': {
                transform: 'translateY(2px)',
                boxShadow: '0 5px 10px rgba(0,0,0,.2)',
              },
            }}
          >
            Create New Ticket
          </Button>
        )}
      </div>

      {showCreateTicketModal && (
        <NewTicketModal
          //@ts-ignore
          userId={session?.user.user_id}
          closeModal={() => setShowCreateTicketModal(false)}
        />
      )}
    </Box>
  );
};
