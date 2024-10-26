'use client';

import { ThemeProvider } from '@mui/material';
import { useMode, ColorModeContext } from '@b2b-tickets/ui-theme';

export const AppThemeProvider = ({ children }: any) => {
  const [theme, colorMode] = useMode();

  // Adding the mode to the context value
  //@ts-ignore
  const contextValue = { ...colorMode, mode: theme.palette.mode };

  return (
    //@ts-ignore
    <ColorModeContext.Provider value={contextValue}>
      <ThemeProvider
        //@ts-ignore
        theme={theme}
      >
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
};

export default AppThemeProvider;
