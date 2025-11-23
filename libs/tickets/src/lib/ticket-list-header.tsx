'use client';
import { useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import { Typography } from '@mui/material';
import { userHasPermission } from '@b2b-tickets/utils';
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
} from '@b2b-tickets/shared-models';
import { ExportToExcelButton } from './export-excel-btn';
import { useEscKeyListener } from '@b2b-tickets/react-hooks';

export const TicketListHeader = ({
  totalRows,
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

  const permissionForTicketCreation = userHasPermission(
    session,
    AppPermissionTypes.Create_New_Ticket
  );

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

      <div className="flex gap-2 items-center">
        {/* <CompanySwitchDropdownMenu /> */}
        <ExportToExcelButton
          query={query}
          currentPage={currentPage}
          filter={filter}
          disabled={totalRows === 0}
        />
        <TicketFilter />

        {permissionForTicketCreation && (
          <button
            onClick={() => setShowCreateTicketModal(true)}
            className="btn btn-primary btn-sm"
          >
            Create New Ticket
          </button>
        )}
      </div>

      {showCreateTicketModal && (
        <NewTicketModal
          //@ts-ignore
          closeModal={() => setShowCreateTicketModal(false)}
        />
      )}
    </Box>
  );
};
