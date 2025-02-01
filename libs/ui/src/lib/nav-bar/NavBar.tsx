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

  const customerName = session?.user?.customer_name;
  const isAdminPath = pathname === '/admin';
  const isTicketsPath = pathname === '/tickets';

  return (
    <>
      <Box
        ref={navbarRef}
        display="flex"
        justifyContent="space-between"
        className={`${styles.navBar}`}
      >
        <>
          <Stack
            className="hover:cursor-pointer "
            sx={{
              borderTopLeftRadius: '5px',
              borderTopRightRadius: '5px',
            }}
            onClick={() => {
              const savedFilter = sessionStorage.getItem('ticketFilter');
              if (savedFilter) {
                router.replace(`/tickets?${savedFilter}`);
              } else {
                router.replace(`/tickets`);
              }
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
                  objectFit: 'cover',
                }}
                placeholder="empty"
              />
            </Stack>
            <div className={`${styles.b2b_logo_text} whitespace-nowrap`}>
              Platinum Support
            </div>
          </Stack>
        </>

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
          <div
            className="border-y border-solid border-[#5b5ea090] pr-1 sm:pr-5"
            style={{
              borderRight: '1px dashed #5b5ea090',
            }}
          >
            {userHasPermission(session, AppPermissionTypes.Users_List_Page) ? (
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
              className="flex flex-col justify-center items-center "
              onClick={() => {
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

          <div className="pl-1 sm:pl-5 flex justify-center items-center gap-2 border-y border-[#5b5ea090] border-solid">
            <LoggedInIndication session={session} customerName={customerName} />
            <SessionPopup />
          </div>
        </Box>
      </Box>
    </>
  );
};
