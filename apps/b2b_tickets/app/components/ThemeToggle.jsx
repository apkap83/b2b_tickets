// components/ThemeToggle.js
'use client';

import React, { useContext } from 'react';
import { IconButton } from '@mui/material';
import { Brightness4, Brightness7 } from '@mui/icons-material';
import { ColorModeContext } from '@/b2b_tickets_app/theme';

const ThemeToggle = () => {
  const colorMode = useContext(ColorModeContext);

  // The theme mode can be derived from colorMode or passed as a prop from a parent component that has access to the theme object.

  return (
    <IconButton onClick={colorMode.toggleColorMode} color="inherit">
      {colorMode.mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
    </IconButton>
  );
};

export default ThemeToggle;
