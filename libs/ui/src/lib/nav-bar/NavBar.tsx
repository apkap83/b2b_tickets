'use client';

import { useState, useContext } from 'react';
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
import { AppPermissionTypes, AppRoleTypes } from '@b2b-tickets/shared-models';
import { userHasRole } from '@b2b-tickets/utils';

import styles from './css/NavBar.module.scss';

export const NavBar = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const colorMode = useContext(ColorModeContext);
  const router = useRouter();
  const pathname = usePathname();

  const { data: session, status } = useSession();

  //@ts-ignore
  const customerName = session?.user?.customer_name;

  const isAdminPath = pathname === '/admin';
  const isTicketsPath = pathname === '/tickets';

  const [companyName, setCompanyName] = useState('');

  const userHasPermission = (session: any, permissionName: any) => {
    if (!session) return false;
    return session?.user?.permissions.some(
      (permission: any) =>
        permission.permissionName === permissionName ||
        permission.permissionName === AppPermissionTypes.API_Admin
    );
  };

  return (
    <Box
      display="flex"
      justifyContent="space-between"
      p={1.3}
      className={`${styles.navBar}`}
    >
      <div>
        <Link
          href="/"
          style={{
            display: 'inline-block',
            height: '100%',
          }}
        >
          <Stack>
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
              <Image priority src={NovaLogo} alt={'Nova Logo'} height={18} />
            </Stack>
            <div className={`${styles.b2b_logo_text}`}>Platinum Support</div>
          </Stack>
        </Link>
      </div>

      <Box className={`${styles.menuAndLoggedIndication}`}>
        <Box
          sx={{
            borderTop: '1px solid #5b5ea090',
            borderBottom: '1px solid #5b5ea090',
          }}
          className={`rounded flex gap-5 ${styles.myMenu}`}
          px={2}
        >
          <div
            style={{
              borderRight: '1px dashed #5b5ea090',
              paddingRight: '1.25rem',
            }}
          >
            {userHasRole(session, AppRoleTypes.SimpleUser) ? (
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
                router.replace('/tickets');
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
          <LoggedInIndication session={session} customerName={customerName} />
        </Box>
      </Box>
    </Box>
  );
};

// export default NavBar;
