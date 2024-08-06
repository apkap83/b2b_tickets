'use client';
import React from 'react';
import Button from '@mui/material/Button';
import { useFormStatus } from 'react-dom';

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
