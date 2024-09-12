'use client';
import React from 'react';
import Button from '@mui/material/Button';
import { useFormStatus } from 'react-dom';
import { Typography, useTheme } from '@mui/material';
import { tokens } from '@b2b-tickets/ui-theme';
import { TicketDetailsModalActions } from '@b2b-tickets/shared-models';
import styled from 'styled-components';

const StyledSubmitButton = styled.div`
  color: pink;
`;

type SubmitButtonProps = {
  label: string;
  loadingText: string;
  isValid: boolean;
  action: TicketDetailsModalActions;
};

export const SubmitButton = ({
  label,
  loadingText,
  isValid,
  action = TicketDetailsModalActions.NO_ACTION,
}: SubmitButtonProps) => {
  const { pending } = useFormStatus();
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (pending) {
      event.preventDefault();
    }
  };

  let letterColor = '#ddd7d7';
  let backgroundColor = '#141b2d';
  let borderColor = '#141b2d';

  if (action === TicketDetailsModalActions.CANCEL) {
    letterColor = '#e9b1b1';
  }
  if (action === TicketDetailsModalActions.CLOSE) {
    letterColor = '#989cf0';
  }

  return (
    <Button
      variant="contained"
      type="submit"
      className="btn btn-primary"
      disabled={!isValid || pending}
      aria-disabled={pending}
      onClick={handleClick}
      style={{
        color: `${letterColor}`,
        backgroundColor: `${backgroundColor}`,
        border: `1px solid ${borderColor}`,
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
