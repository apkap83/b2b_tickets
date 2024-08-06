export const FormStateError = ({ formState }) => {
  if (formState?.status === "UNSET") return;

  return (
    <>
      <p className="text-sm text-red-500">{formState?.message}</p>
    </>
  );
};
