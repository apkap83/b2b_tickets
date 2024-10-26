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
import { ExportToExcelButton } from './export-excel-btn';
import { useEscKeyListener } from '@/libs/react-hooks/src';

export const TicketListHeader = ({
  totalTicketsForCustomer,
  totalTickets,
  query,
  currentPage,
}: {
  totalTicketsForCustomer: number;
  totalTickets: number;
  query: string;
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
          totalTickets={totalTickets}
          query={query}
          currentPage={currentPage}
        />
        <TicketFilter totalTicketsForCustomer={totalTicketsForCustomer} />
        {userHasPermission(session, AppPermissionTypes.Create_New_Ticket) && (
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
