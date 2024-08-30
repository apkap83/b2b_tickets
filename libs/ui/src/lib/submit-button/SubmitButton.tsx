'use client';
import React from 'react';
import Button from '@mui/material/Button';
import { useFormStatus } from 'react-dom';
import { Typography, useTheme } from '@mui/material';
import { tokens } from '@b2b-tickets/ui-theme';

import styled from 'styled-components';

const StyledSubmitButton = styled.div`
  color: pink;
`;

type SubmitButtonProps = {
  label: string;
  loadingText: string;
  isValid: boolean;
};

export const SubmitButton = ({
  label,
  loadingText,
  isValid,
}: SubmitButtonProps) => {
  const { pending } = useFormStatus();
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (pending) {
      event.preventDefault();
    }
  };

  return (
    <Button
      variant="contained"
      type="submit"
      className="btn btn-primary"
      disabled={!isValid || pending}
      aria-disabled={pending}
      onClick={handleClick}
      style={{
        color: `#888888`,
        border: `1px solid grey`,
      }}
    >
      {pending ? loadingText : label}
    </Button>
  );
};

// export function SubmitButton() {
//   return (
//     <StyledSubmitButton>
//       <h1>Welcome to SubmitButton!</h1>
//     </StyledSubmitButton>
//   );
// }

export default SubmitButton;
