'use client';
import React, { useState, useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import { Typography } from '@mui/material';
import { userHasRole } from '@b2b-tickets/utils';
import { AppRoleTypes, FilterTicketsStatus } from '@/libs/shared-models/src';
import { NewTicketModal } from './new-ticket-modal';

import Button from '@mui/material/Button';

import { useSession } from 'next-auth/react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { VscFilterFilled } from 'react-icons/vsc';
import styles from './css/tickets-list.module.scss';

import clsx from 'clsx';

export const TicketListHeader = () => {
  const [showCreateTicketModal, setShowCreateTicketModal] = useState(false);
  const { data: session, status } = useSession();

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

  const handleFilter = (term: FilterTicketsStatus) => {
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

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside of it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setTicketFilterDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div
      ref={dropdownRef}
      className={`${styles.dropDownMenuFilter} flow-root dropdown dark:bg-white`}
      onClick={toggleDropDown}
    >
      <div
        tabIndex={0}
        role="button"
        className={clsx(
          'btn m-1 flex justify-center items-center shadow-md dark:bg-white',
          {
            [`${styles.myHover}`]: isTicketFilterDropdownOpen,
          }
        )}
      >
        {searchParams.get('query')?.toString() === FilterTicketsStatus.All ||
        searchParams.get('query')?.toString() == undefined ? (
          <VscFilterFilled color="#514f4f" />
        ) : (
          <>
            <VscFilterFilled />
            <span>{searchParams.get('query')?.toString()}</span>
          </>
        )}
      </div>
      {isTicketFilterDropdownOpen ? (
        <ul
          tabIndex={0}
          className="dropdown-content menu bg-base-100 rounded-box z-[1] w-52 p-2 shadow-lg dark:bg-white"
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
