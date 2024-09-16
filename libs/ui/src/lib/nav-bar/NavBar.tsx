'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';

import Link from 'next/link';
import { Paper, Box, IconButton, useTheme, Typography } from '@mui/material';
import { useContext } from 'react';
import Stack from '@mui/material/Stack';

import { ColorModeContext, tokens } from '@b2b-tickets/ui-theme';

import InputBase from '@mui/material/InputBase';
import { IoListSharp } from 'react-icons/io5';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import SearchIcon from '@mui/icons-material/Search';
import PublishedWithChangesIcon from '@mui/icons-material/PublishedWithChanges';
import DataSaverOnIcon from '@mui/icons-material/DataSaverOn';
import { NovaLogo } from '@b2b-tickets/assets';
import { toast } from 'react-hot-toast';
import { syncDBAlterTrueAction, seedDB } from '@/libs/server-actions/src';
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
      <Link href="/">
        <Stack
          sx={{
            bgcolor: 'white',
            paddingY: '5px',
            paddingX: '10px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            borderRadius: '5px',
            ml: 1,
          }}
        >
          <Image priority src={NovaLogo} alt={'Nova Logo'} height={18} />
          <Typography
            component="p"
            variant="myVariantTypo1"
            sx={{
              fontWeight: '700',
              border: `1px dashed ${colors.grey[800]}`,
              marginTop: '5px',
              paddingY: '1px',
              paddingX: '10px',
            }}
          >
            B2B Tickets
          </Typography>
        </Stack>
      </Link>
      <div className="text-white text-xs flex flex-col justify-center items-center ">
        {customerName !== 'Nova' ? (
          <div className="text-lg">{customerName}</div>
        ) : null}
      </div>
      {/* ICONS */}
      <Box className={`${styles.menuAndLoggedIndication}`}>
        <Box
          sx={{
            bgcolor: colors.grey[900],
            marginRight: '10px',
          }}
          className="rounded"
          px={2}
        >
          {userHasRole(session, AppRoleTypes.SimpleUser) ? (
            <>
              {/* <IconButton
                className="flex flex-col"
                onClick={async () => {
                  try {
                    await syncDBAlterTrueAction();
                    console.log('Sync DB Alter True Complete!');
                  } catch (error: any) {
                    toast.error(error.message);
                  }
                }}
              >
                <PublishedWithChangesIcon />
                <span className="text-xs">Sync DB</span>
              </IconButton>
              <IconButton
                className="flex flex-col"
                onClick={async () => {
                  try {
                    await seedDB();
                    console.log('Seed Database Complete!');
                  } catch (error: any) {
                    toast.error(error.message);
                  }
                }}
              >
                <DataSaverOnIcon />
                <span className="text-xs">Seed DB</span>
              </IconButton> */}
              <IconButton
                className="flex flex-col"
                onClick={() => {
                  router.push('/admin');
                }}
                style={{
                  color: isAdminPath
                    ? colors.blueAccent[500]
                    : colors.grey[100], // Conditionally apply color
                }}
              >
                <SettingsOutlinedIcon />
                <span className="text-xs">Users List</span>
              </IconButton>
            </>
          ) : null}

          <IconButton
            className="flex flex-col"
            onClick={() => {
              router.push('/tickets');
            }}
            style={{
              color: isTicketsPath ? colors.blueAccent[500] : colors.grey[100], // Conditionally apply color
            }}
          >
            <IoListSharp />
            <span className="text-xs">Tickets</span>
          </IconButton>
          {/* <IconButton
            className="flex flex-col"
            onClick={colorMode.toggleColorMode}
          >
            {theme.palette.mode === 'dark' ? (
              <LightModeOutlinedIcon />
            ) : (
              <DarkModeOutlinedIcon />
            )}
            <span className="text-xs">Theme</span>
          </IconButton> */}

          {/* <IconButton color="primary.main"> */}

          {/* <IconButton>
          <PersonOutlinedIcon />
          </IconButton> */}
        </Box>
        <LoggedInIndication session={session} />
      </Box>
    </Box>
  );
};

// export default NavBar;
