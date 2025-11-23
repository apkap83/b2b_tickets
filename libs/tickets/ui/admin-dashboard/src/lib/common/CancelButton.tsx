'use client';

export const CancelButton = ({ label, onClick, ...rest }: any) => {
  return (
    <button className="btn btn-secondary btn-sm" onClick={onClick} {...rest}>
      Close
    </button>
  );
};
