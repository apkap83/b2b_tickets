'use client';
import styled from 'styled-components';

const StyledNavBar = styled.div`
  color: pink;
`;

import Image from 'next/image';
import Link from 'next/link';
import { Paper, Box, IconButton, useTheme, Typography } from '@mui/material';
import { useContext } from 'react';
import Stack from '@mui/material/Stack';

import { ColorModeContext, tokens } from '@b2b-tickets/ui-theme';

import InputBase from '@mui/material/InputBase';
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

export const NavBar = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const colorMode = useContext(ColorModeContext);

  return (
    <Box
      display="flex"
      justifyContent="space-between"
      p={1.3}
      sx={{
        bgcolor: 'black',
      }}
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
      {/* ICONS */}
      <Box
        display="flex"
        sx={{
          bgcolor: colors.grey[900],
        }}
        className="rounded"
        px={2}
      >
        <IconButton
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
        </IconButton>
        <IconButton
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
        </IconButton>

        <IconButton onClick={colorMode.toggleColorMode}>
          {theme.palette.mode === 'dark' ? (
            <LightModeOutlinedIcon />
          ) : (
            <DarkModeOutlinedIcon />
          )}
        </IconButton>
        <IconButton>
          <NotificationsOutlinedIcon />
        </IconButton>
        <IconButton>
          <SettingsOutlinedIcon />
        </IconButton>
        {/* <IconButton color="primary.main"> */}
        <IconButton>
          <PersonOutlinedIcon />
        </IconButton>
      </Box>
    </Box>
  );
};

// export default NavBar;
