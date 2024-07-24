import * as yup from "yup";
export const EMPTY_FORM_STATE = {
    status: "UNSET",
    message: "",
    fieldErrors: {},
    timestamp: Date.now(),
};
export const fromErrorToFormState = (error) => {
    if (error instanceof yup.ValidationError) {
        const validationErrors = error.inner.map((err) => ({
            path: err.path,
            message: err.message,
        }));
        return {
            status: "ERROR",
            message: validationErrors[0].message,
            fieldErrors: "",
            timestamp: Date.now(),
        };
    }
    else if (error instanceof Error) {
        return {
            status: "ERROR",
            message: error.message,
            fieldErrors: {},
            timestamp: Date.now(),
        };
    }
    else {
        return {
            status: "ERROR",
            message: "An unknown error occurred",
            fieldErrors: {},
            timestamp: Date.now(),
        };
    }
};
export const toFormState = (status, message) => {
    return {
        status,
        message,
        fieldErrors: {},
        timestamp: Date.now(),
    };
};
//# sourceMappingURL=to-form-state.js.map