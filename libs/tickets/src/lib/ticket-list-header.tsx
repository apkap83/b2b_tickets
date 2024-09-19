'use client';
import React, { useState } from 'react';
import Box from '@mui/material/Box';
import { Typography } from '@mui/material';
import { userHasPermission, userHasRole } from '@b2b-tickets/utils';
import {
  Ticket,
  TicketStatusName,
  TicketStatusColors,
  AppRoleTypes,
  FilterTicketsStatus,
} from '@/libs/shared-models/src';
import { NewTicketModal } from './new-ticket-modal';

import Button from '@mui/material/Button';

import { useSession } from 'next-auth/react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { VscFilterFilled } from 'react-icons/vsc';
import styles from './css/tickets-list.module.scss';

export const TicketListHeader = () => {
  const [showCreateTicketModal, setShowCreateTicketModal] = useState(false);
  const { data: session, status } = useSession();

  return (
    <Box
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
        <TicketFilter />
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

const TicketFilter = () => {
  const [isTicketFilterDropdownOpen, setTicketFilterDropdownOpen] =
    useState(false);

  const toggleDropDown = () =>
    setTicketFilterDropdownOpen(!isTicketFilterDropdownOpen);
  const closeDropDown = () => setTicketFilterDropdownOpen(false);

  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  // Inside the Search Component...
  const handleFilter = (term: FilterTicketsStatus) => {
    console.log(`Searching... ${term}`);

    const params = new URLSearchParams(searchParams);
    if (term) {
      if (term === FilterTicketsStatus.All) {
        params.delete('query');
        params.set('page', '1');
      } else {
        params.set('query', term);
        params.set('page', '1');
      }
    } else {
      params.delete('query');
    }
    replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div
      className={`${styles.dropDownMenuFilter} dropdown dropdown-end`}
      onClick={toggleDropDown}
    >
      <div tabIndex={0} role="button" className="btn m-1">
        {searchParams.get('query')?.toString() === FilterTicketsStatus.All ? (
          <VscFilterFilled color="#514f4f" />
        ) : (
          <>
            <VscFilterFilled />
            {searchParams.get('query')?.toString()}
          </>
        )}
      </div>
      {isTicketFilterDropdownOpen ? (
        <ul
          tabIndex={0}
          className="dropdown-content menu bg-base-100 rounded-box z-[1] w-52 p-2 shadow"
        >
          <li
            onClick={() => {
              handleFilter(FilterTicketsStatus.All);
              closeDropDown();
            }}
          >
            <a>{FilterTicketsStatus.All}</a>
          </li>
          <li
            onClick={() => {
              handleFilter(FilterTicketsStatus.Open);
              closeDropDown();
            }}
          >
            <a>{FilterTicketsStatus.Open}</a>
          </li>
          <li
            onClick={() => {
              handleFilter(FilterTicketsStatus.Closed);
              closeDropDown();
            }}
          >
            <a>{FilterTicketsStatus.Closed}</a>
          </li>
        </ul>
      ) : null}
    </div>
  );
};
