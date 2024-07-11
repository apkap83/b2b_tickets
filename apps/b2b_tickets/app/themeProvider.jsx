'use client';

import { ThemeProvider } from '@mui/material';
import { useMode, ColorModeContext } from './theme';

const AppThemeProvider = ({ children }) => {
  const [theme, colorMode] = useMode();

  // Adding the mode to the context value
  const contextValue = { ...colorMode, mode: theme.palette.mode };

  return (
    <ColorModeContext.Provider value={contextValue}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </ColorModeContext.Provider>
  );
};

export default AppThemeProvider;
