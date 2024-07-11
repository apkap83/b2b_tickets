'use client';
import Image from 'next/image';
import Link from 'next/link';
import { Paper, Box, IconButton, useTheme, Typography } from '@mui/material';
import { useContext } from 'react';
import Stack from '@mui/material/Stack';

import { ColorModeContext, tokens } from '@/b2b_tickets_app/theme';
import InputBase from '@mui/material/InputBase';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import SearchIcon from '@mui/icons-material/Search';
import NovaLogo from '@/b2b_tickets_app/assets/novaLogo.svg';

const Topbar = () => {
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
          }}
        >
          <Image
            // className={'company--logo-navbar'}
            priority
            src={NovaLogo}
            alt={'Nova Logo'}
            // width="100px"
            height={18}
          />
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
      >
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
        <IconButton color="primary.main">
          <PersonOutlinedIcon />
        </IconButton>
      </Box>
    </Box>
  );
};

export default Topbar;
