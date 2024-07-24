import * as yup from "yup";

export type FormState = {
  status: "UNSET" | "SUCCESS" | "ERROR";
  message: string;
  fieldErrors: Record<string, string[] | undefined>;
  timestamp: number;
};

export const EMPTY_FORM_STATE: FormState = {
  status: "UNSET" as const,
  message: "",
  fieldErrors: {},
  timestamp: Date.now(),
};

export const fromErrorToFormState = (error: unknown) => {
  if (error instanceof yup.ValidationError) {
    const validationErrors = error.inner.map((err) => ({
      path: err.path,
      message: err.message,
    }));

    return {
      status: "ERROR" as const,
      message: validationErrors[0].message,
      fieldErrors: "",
      timestamp: Date.now(),
    };
  } else if (error instanceof Error) {
    return {
      status: "ERROR" as const,
      message: error.message,
      fieldErrors: {},
      timestamp: Date.now(),
    };
  } else {
    return {
      status: "ERROR" as const,
      message: "An unknown error occurred",
      fieldErrors: {},
      timestamp: Date.now(),
    };
  }
};

export const toFormState = (
  status: FormState["status"],
  message: string
): FormState => {
  return {
    status,
    message,
    fieldErrors: {},
    timestamp: Date.now(),
  };
};
