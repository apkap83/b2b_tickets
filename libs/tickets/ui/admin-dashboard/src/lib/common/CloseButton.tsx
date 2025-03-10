'use client';

import { useFormStatus } from 'react-dom';

export const CloseButton = ({ label, handleClick, ...rest }: any) => {
  return (
    <button className="btn btn-sm shadow-md" {...rest}>
      {label}
    </button>
  );
};
