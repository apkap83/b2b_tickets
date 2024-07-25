const FieldError = ({ formik, name }) => {
  if (!formik?.touched[name] || !formik?.errors[name]) {
    return null;
  }

  return <p className="text-red-500 text-sm">{formik?.errors[name]}</p>;
};

export { FieldError };
