'use client';
import { useEffect, useState, useRef } from 'react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { FilterTicketsStatus } from '@b2b-tickets/shared-models';
import { VscFilterFilled } from 'react-icons/vsc';
import Button from '@mui/material/Button';

export const TicketFilter = () => {
  const [isTicketFilterDropdownOpen, setTicketFilterDropdownOpen] =
    useState(false);

  const toggleDropDown = () =>
    setTicketFilterDropdownOpen(!isTicketFilterDropdownOpen);
  // const closeDropDown = () => setTicketFilterDropdownOpen(false);

  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  // Get the saved filter from sessionStorage on mount
  useEffect(() => {
    const savedFilter = sessionStorage.getItem('ticketFilter');
    if (savedFilter) {
      handleFilter(savedFilter as FilterTicketsStatus);
    }
  }, []);

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
        sessionStorage.setItem('ticketFilter', term);
      }
    } else {
      params.delete('query');
    }
    replace(`${pathname}?${params.toString()}`);
  };

  const buttonRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside of it and the button
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
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
    <div ref={buttonRef}>
      <Button
        variant="outlined"
        // ref={dropdownRef}
        sx={{
          border: '1px solid #45464a50',
          height: '33px',
          paddingTop: '16px',
          paddingBottom: '16px',
          position: 'relative',
          flex: 1,
        }}
        onClick={toggleDropDown}
      >
        {/* <div
        tabIndex={0}
        role="button"
        className={clsx(
          'btn m-1 flex justify-center items-center shadow-md dark:bg-white',
          {
            [`${styles.myHover}`]: isTicketFilterDropdownOpen,
          }
        )}
      > */}
        <div className="text-xs flex flex-col justify-center items-center">
          {searchParams.get('query')?.toString() === FilterTicketsStatus.All ||
          searchParams.get('query')?.toString() == undefined ? (
            <VscFilterFilled color="#514f4f" />
          ) : (
            <>
              <VscFilterFilled />
              <span
                style={{
                  fontSize: '8px',
                  fontWeight: 800,
                }}
              >
                {searchParams.get('query')?.toString()}
              </span>
            </>
          )}
        </div>
        {isTicketFilterDropdownOpen ? (
          <div
            ref={dropdownRef}
            className="absolute top-[34px] left-0 w-[160px] bg-white z-[15] text-[12px] border border-[#88888845] rounded-bl-[16px] rounded-br-[16px]"
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
            </ul>
          </div>
        ) : null}
      </Button>
    </div>
  );
};
