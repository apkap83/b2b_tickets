'use client';

import { useFormStatus } from 'react-dom';

export const SubmitButton = ({ label, loading, isValid }: any) => {
  const { pending } = useFormStatus();

  const handleClick = (event: any) => {
    if (pending) {
      event.preventDefault();
    }
  };

  return (
    <button
      className="btn btn-sm  bg-black text-white hover:bg-gray-700"
      disabled={!isValid || pending}
      type="submit"
      aria-disabled={pending}
      onClick={handleClick}
    >
      {pending ? loading : label}
    </button>
  );
};
