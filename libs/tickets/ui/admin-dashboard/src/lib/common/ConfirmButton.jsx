"use client";
import clsx from "clsx";

import { useFormStatus } from "react-dom";

export const ConfirmButton = ({ label, className, ...rest }) => {
  const combinedClassName = clsx("btn btn-primary", className);

  return (
    <button className={combinedClassName} {...rest}>
      {label}
    </button>
  );
};
