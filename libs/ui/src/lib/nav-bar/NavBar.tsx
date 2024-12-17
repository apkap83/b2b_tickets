'use client';

import { useState, useEffect, useRef, useContext } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';

import { IoListSharp } from 'react-icons/io5';
import { Box, IconButton, useTheme } from '@mui/material';
import Stack from '@mui/material/Stack';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';

import { ColorModeContext, tokens } from '@b2b-tickets/ui-theme';
import { NovaLogo } from '@b2b-tickets/assets';
import { LoggedInIndication } from '@b2b-tickets/ui';
import {
  AppPermissionTypes,
  AppRoleTypes,
  FilterTicketsStatus,
} from '@b2b-tickets/shared-models';
import { userHasPermission, userHasRole } from '@b2b-tickets/utils';
import config from '@b2b-tickets/config';
import styles from './css/NavBar.module.scss';
import { SessionPopup } from '../session-popup/SessionPopup';

export const NavBar = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const colorMode = useContext(ColorModeContext);
  const router = useRouter();
  const pathname = usePathname();

  // const [navbarHeight, setNavbarHeight] = useState(75);
  const navbarRef = useRef<HTMLDivElement | null>(null);

  const { data: session, status } = useSession();

  // useEffect(() => {
  //   const calculateHeight = () => {
  //     if (navbarRef.current) {
  //       setNavbarHeight(navbarRef.current.offsetHeight);
  //     }
  //   };

  //   // Calculate height on load
  //   calculateHeight();

  //   // Recalculate height on window resize
  //   window.addEventListener('resize', calculateHeight);
  //   return () => {
  //     window.removeEventListener('resize', calculateHeight);
  //   };
  // }, []);

  const customerName = session?.user?.customer_name;
  const isAdminPath = pathname === '/admin';
  const isTicketsPath = pathname === '/tickets';

  return (
    <>
      <Box
        ref={navbarRef}
        display="flex"
        justifyContent="space-between"
        p={1.3}
        className={`${styles.navBar} z-10`}
      >
        <div>
          {/* <Link
            href={savedFilter ? `/tickets?${params}` : '/tickets'}
            style={{
              display: 'inline-block',
              height: '100%',
            }}
          > */}
          <Stack
            className="hover:cursor-pointer"
            onClick={() => {
              if (window) {
                const savedFilter = sessionStorage.getItem('ticketFilter');
                if (!savedFilter) return router.replace(`/tickets`);

                router.replace(`/tickets?query=${savedFilter}&page=1`);
                return;
              }

              router.replace(`/tickets`);
            }}
          >
            <Stack
              sx={{
                bgcolor: 'white',
                paddingY: '5px',
                paddingX: '10px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                borderTopLeftRadius: '5px',
                borderTopRightRadius: '5px',
              }}
            >
              <Image
                priority
                src={NovaLogo}
                alt={'Nova Logo'}
                height={18}
                width={110}
                style={{
                  width: '110px',
                  height: '18.2px',
                }}
              />
            </Stack>
            <div className={`${styles.b2b_logo_text} whitespace-nowrap`}>
              Platinum Support
            </div>
          </Stack>
          {/* </Link> */}
        </div>

        {process.env['NEXT_PUBLIC_APP_ENV'] === 'staging' && (
          <div className="absolute left-[40%] rounded-md hidden lg:flex items-center justify-center h-12">
            <div className="rounded-md text-center text-sm text-gray-400 border border-gray-400 mx-auto h-auto px-2 shadow-white shadow-sm">
              Staging Environment
            </div>
          </div>
        )}
        {process.env['NODE_ENV'] === 'development' && (
          <div className="absolute left-[40%] rounded-md hidden lg:flex items-center justify-center h-12">
            <div className="rounded-md text-center text-sm text-gray-400 border border-gray-400 mx-auto h-auto px-2 shadow-white shadow-sm">
              Development Environment
            </div>
          </div>
        )}
        <Box className={`${styles.menuAndLoggedIndication}`}>
          <Box
            sx={{
              display: 'flex',
              height: '50px',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: '8px',
            }}
          ></Box>
          <Box
            sx={{
              borderTop: '1px solid #5b5ea090',
              borderBottom: '1px solid #5b5ea090',
            }}
            className={`rounded flex ${styles.myMenu}`}
            px={2}
          >
            <div
              className={`${styles.myMenuLeft}`}
              style={{
                borderRight: '1px dashed #5b5ea090',
              }}
            >
              {userHasPermission(
                session,
                AppPermissionTypes.Users_List_Page
              ) ? (
                <>
                  <IconButton
                    className="flex flex-col"
                    onClick={() => {
                      router.push('/admin');
                    }}
                    sx={{
                      color: isAdminPath
                        ? colors.blueAccent[500]
                        : colors.grey[800], // Conditionally apply color
                      borderRadius: '5px',
                      '&:hover': {
                        backgroundColor: '#3d3d3f',
                      },
                    }}
                  >
                    <SettingsOutlinedIcon />
                    <span className="text-xs">Users List</span>
                  </IconButton>
                </>
              ) : null}

              <IconButton
                className="flex flex-col justify-center items-center"
                onClick={() => {
                  // if (window) {
                  //   const savedFilter = sessionStorage.getItem('ticketFilter');
                  //   if (!savedFilter) return router.replace(`/tickets`);

                  //   router.replace(`/tickets?query=${savedFilter}&page=1`);
                  //   return;
                  // }

                  // router.replace(`/tickets`);

                  // Use the stored search params to navigate to the tickets page
                  const savedFilter = sessionStorage.getItem('ticketFilter');
                  if (savedFilter) {
                    router.replace(`/tickets?${savedFilter}`);
                  } else {
                    router.replace(`/tickets`);
                  }
                }}
                sx={{
                  color: isTicketsPath
                    ? colors.blueAccent[500]
                    : colors.grey[800], // Conditionally apply color
                  borderRadius: '5px',
                  '&:hover': {
                    backgroundColor: '#3d3d3f',
                  },
                }}
              >
                <IoListSharp />
                <span className="text-xs">Tickets List</span>
              </IconButton>
            </div>
            <div className="flex justify-center items-center gap-2">
              <LoggedInIndication
                session={session}
                customerName={customerName}
              />
              <SessionPopup />
            </div>
          </Box>
        </Box>
      </Box>

      {/* <div style={{ height: `${navbarHeight}px` }}></div> */}
    </>
  );
};
