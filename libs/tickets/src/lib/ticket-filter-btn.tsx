'use client';

import { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { AppRoleTypes, FilterTicketsStatus } from '@b2b-tickets/shared-models';
import { VscFilterFilled } from 'react-icons/vsc';
import Button from '@mui/material/Button';
import { userHasRole } from '@b2b-tickets/utils';
import { useEscKeyListener } from '@b2b-tickets/react-hooks';

export const TicketFilter = () => {
  const { data: session, status } = useSession();
  const [isTicketFilterDropdownOpen, setTicketFilterDropdownOpen] =
    useState(false);

  // ESC Key Listener
  useEscKeyListener(() => {
    setTicketFilterDropdownOpen(false);
  });

  const toggleDropDown = () => {
    setTicketFilterDropdownOpen(!isTicketFilterDropdownOpen);
  };
  // const closeDropDown = () => setTicketFilterDropdownOpen(false);

  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  // Get the saved filter from sessionStorage on mount
  // useEffect(() => {
  //   const savedFilter = sessionStorage.getItem('ticketFilter');
  //   if (savedFilter) {
  //     handleFilter(savedFilter as FilterTicketsStatus);
  //   }
  // }, []);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setTicketFilterDropdownOpen(false);
      }
    };

    if (isTicketFilterDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isTicketFilterDropdownOpen]);

  const handleFilter = (term: FilterTicketsStatus) => {
    const params = new URLSearchParams(searchParams);
    if (term) {
      if (term === FilterTicketsStatus.All) {
        params.delete('query');
        params.set('page', '1');
        sessionStorage.removeItem('ticketFilter');
      } else {
        params.set('query', term);
        params.set('page', '1');
        sessionStorage.setItem('ticketFilter', params.toString()); // Use params directly
      }
    } else {
      params.delete('query');
    }
    replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div
      ref={dropdownRef}
      style={{
        position: 'relative',
      }}
    >
      <Button
        variant="outlined"
        // ref={dropdownRef}
        sx={{
          border: '1px solid #45464a50',
          height: '33px',
          paddingTop: '16px',
          paddingBottom: '16px',
          flex: 1,
        }}
        onClick={toggleDropDown}
      >
        <div className="text-xs flex flex-col justify-center items-center gap-0">
          {searchParams.get('query')?.toString() === FilterTicketsStatus.All ||
          searchParams.get('query')?.toString() === undefined ? (
            <VscFilterFilled className={'text-[#514f4f]'} />
          ) : (
            <>
              <VscFilterFilled />
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  letterSpacing: '.5px',
                  whiteSpace: 'nowrap',
                }}
              >
                {searchParams.get('query')?.toString()}
              </span>
            </>
          )}
        </div>
      </Button>
      {isTicketFilterDropdownOpen ? (
        <div
          // ref={dropdownRef}
          className="absolute top-[34px] right-[0px] w-[145px] bg-white z-[5] text-[12px] border border-[#88888845] rounded-tl-[16px] rounded-bl-[16px] rounded-br-[16px]"
        >
          <ul
            tabIndex={0}
            className={`text-xs dropdown-content 
              menu bg-base-100 rounded-box 
               p-2 shadow-lg dark:bg-white`}
          >
            <li
              onClick={() => {
                handleFilter(FilterTicketsStatus.All);
                toggleDropDown();
              }}
            >
              <a>{FilterTicketsStatus.All}</a>
            </li>

            <li
              onClick={() => {
                handleFilter(FilterTicketsStatus.Open);
                toggleDropDown();
              }}
            >
              <a>{FilterTicketsStatus.Open}</a>
            </li>
            <li
              onClick={() => {
                handleFilter(FilterTicketsStatus.Closed);
                toggleDropDown();
              }}
            >
              <a>{FilterTicketsStatus.Closed}</a>
            </li>
            {userHasRole(session, AppRoleTypes.B2B_TicketHandler) && (
              <>
                <li
                  onClick={() => {
                    handleFilter(FilterTicketsStatus.SeverityHigh);
                    toggleDropDown();
                  }}
                >
                  <a>{FilterTicketsStatus.SeverityHigh}</a>
                </li>
                <li
                  onClick={() => {
                    handleFilter(FilterTicketsStatus.SeverityMedium);
                    toggleDropDown();
                  }}
                >
                  <a>{FilterTicketsStatus.SeverityMedium}</a>
                </li>
                <li
                  onClick={() => {
                    handleFilter(FilterTicketsStatus.SeverityLow);
                    toggleDropDown();
                  }}
                >
                  <a>{FilterTicketsStatus.SeverityLow}</a>
                </li>
                <li
                  onClick={() => {
                    handleFilter(FilterTicketsStatus.Escalated);
                    toggleDropDown();
                  }}
                >
                  <a>Escalated Only</a>
                </li>
                <li
                  onClick={() => {
                    handleFilter(FilterTicketsStatus.StatusNew);
                    toggleDropDown();
                  }}
                >
                  <a>{FilterTicketsStatus.StatusNew}</a>
                </li>
              </>
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
};
