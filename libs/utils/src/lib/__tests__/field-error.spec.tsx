import React from 'react';
import '@testing-library/jest-dom'; // This will add custom matchers like `toBeInTheDocument`
import { render, screen } from '@testing-library/react';
import { FieldError } from '../field-error';

describe('FieldError component', () => {
  const mockFormik = {
    touched: { testField: true },
    errors: { testField: 'This field is required' },
  };

  it('should display an error message when the field is touched and there is an error', () => {
    render(<FieldError formik={mockFormik} name="testField" />);

    // Assert that the error message is shown
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('should not display an error message when the field is not touched', () => {
    render(
      <FieldError
        formik={{
          touched: {},
          errors: { testField: 'This field is required' },
        }}
        name="testField"
      />
    );

    // Assert that the error message is not shown
    expect(
      screen.queryByText('This field is required')
    ).not.toBeInTheDocument();
  });

  it('should not display an error message when there is no error for the field', () => {
    render(
      <FieldError
        formik={{ touched: { testField: true }, errors: {} }}
        name="testField"
      />
    );

    // Assert that the error message is not shown
    expect(
      screen.queryByText('This field is required')
    ).not.toBeInTheDocument();
  });

  it('should return null when formik or name is not provided', () => {
    render(<FieldError formik={null} name="testField" />);

    // Assert that nothing is rendered
    expect(
      screen.queryByText('This field is required')
    ).not.toBeInTheDocument();
  });
});
