import { Box } from '@mui/material';
import { MuiOtpInput } from 'mui-one-time-password-input';
import React, { useEffect, useRef } from 'react';

export function TwoFactAuth({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const otpInputRef = useRef<HTMLInputElement | null>(null); // Create a ref

  return (
    <Box display="flex" justifyContent="center" alignItems="center">
      <MuiOtpInput
        autoFocus
        // ref={otpInputRef} // Attach ref to the MuiOtpInput
        value={value}
        onChange={onChange}
      />
    </Box>
  );
}
