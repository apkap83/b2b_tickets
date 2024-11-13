import { Box } from '@mui/material';
import { MuiOtpInput } from 'mui-one-time-password-input';
import React, { useEffect, useRef } from 'react';
import { config } from '@b2b-tickets/config';

export function TwoFactAuth({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Box display="flex" justifyContent="center" alignItems="center">
      <MuiOtpInput
        autoFocus
        length={config.TwoFactorDigitsLength}
        // ref={otpInputRef} // Attach ref to the MuiOtpInput
        value={value}
        onChange={onChange}
      />
    </Box>
  );
}
