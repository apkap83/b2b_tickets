import { ZodError, ZodIssue } from 'zod';
import {
  FormState,
  fromErrorToFormState,
  toFormState,
  EMPTY_FORM_STATE,
} from '../to-form-state';

describe('toFormState', () => {
  it('should return a FormState with the correct status, message, and timestamp', () => {
    const status: FormState['status'] = 'SUCCESS';
    const message = 'Operation completed successfully';
    const extraData = 'Additional data';

    const result = toFormState(status, message, extraData);

    expect(result.status).toBe(status);
    expect(result.message).toBe(message);
    expect(result.extraData).toBe(extraData);
    expect(result.fieldErrors).toEqual({});
    expect(result.timestamp).toBeGreaterThan(0);
  });

  it('should return a FormState with undefined extraData when not provided', () => {
    const status: FormState['status'] = 'ERROR';
    const message = 'An error occurred';

    const result = toFormState(status, message);

    expect(result.status).toBe(status);
    expect(result.message).toBe(message);
    expect(result.extraData).toBeUndefined();
    expect(result.fieldErrors).toEqual({});
    expect(result.timestamp).toBeGreaterThan(0);
  });

  it('should return a FormState with ERROR status and the correct message', () => {
    const status: FormState['status'] = 'ERROR';
    const message = 'Something went wrong';

    const result = toFormState(status, message);

    expect(result.status).toBe('ERROR');
    expect(result.message).toBe(message);
    expect(result.extraData).toBeUndefined();
    expect(result.fieldErrors).toEqual({});
    expect(result.timestamp).toBeGreaterThan(0);
  });

  it('should return a FormState with SUCCESS status and the correct message and timestamp', () => {
    const status: FormState['status'] = 'SUCCESS';
    const message = 'Operation successful';

    const result = toFormState(status, message);

    expect(result.status).toBe('SUCCESS');
    expect(result.message).toBe(message);
    expect(result.extraData).toBeUndefined();
    expect(result.fieldErrors).toEqual({});
    expect(result.timestamp).toBeGreaterThan(0);
  });
});

describe('fromErrorToFormState', () => {
  it('should return a form state with ERROR status for ZodError', () => {
    // Create a ZodInvalidTypeIssue with the required properties
    const zodError = new ZodError([
      {
        path: ['email'],
        message: 'Invalid email format',
        code: 'invalid_type',
        expected: 'string',
        received: 'number',
      },
    ]);
    const result = fromErrorToFormState(zodError);

    expect(result.status).toBe('ERROR');
    expect(result.message).toBe('Invalid email format');
    expect(result.fieldErrors).toBe('');
    expect(result.timestamp).toBeGreaterThan(0);
  });

  it('should return a form state with ERROR status for generic Error', () => {
    const error = new Error('Something went wrong');

    const result = fromErrorToFormState(error);

    expect(result.status).toBe('ERROR');
    expect(result.message).toBe('Something went wrong');
    expect(result.fieldErrors).toEqual({});
    expect(result.timestamp).toBeGreaterThan(0);
  });

  it('should return a form state with ERROR status for unknown error type', () => {
    const unknownError = { message: 'Unknown error' };

    const result = fromErrorToFormState(unknownError);

    expect(result.status).toBe('ERROR');
    expect(result.message).toBe('An unknown error occurred');
    expect(result.fieldErrors).toEqual({});
    expect(result.timestamp).toBeGreaterThan(0);
  });

  it('should return EMPTY_FORM_STATE as the initial state', () => {
    expect(EMPTY_FORM_STATE).toEqual({
      status: 'UNSET',
      message: '',
      fieldErrors: {},
      timestamp: expect.any(Number),
    });
  });
});
