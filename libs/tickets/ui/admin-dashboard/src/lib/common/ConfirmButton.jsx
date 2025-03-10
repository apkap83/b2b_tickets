'use client';
import clsx from 'clsx';

import { useFormStatus } from 'react-dom';

export const ConfirmButton = ({ label, className, ...rest }) => {
  const combinedClassName = clsx(
    'btn btn-sm  bg-black text-white hover:bg-gray-700',
    className
  );

  return (
    <button className={combinedClassName} {...rest}>
      {label}
    </button>
  );
};
