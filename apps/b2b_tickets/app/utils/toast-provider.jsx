"use client";

import { Toaster } from "react-hot-toast";

// interface ToastProviderProps {
//   children: React.ReactNode;
// }

export default function ToastProvider({ children }) {
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
