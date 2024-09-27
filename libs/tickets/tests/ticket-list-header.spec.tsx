import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TicketListHeader } from '@b2b-tickets/tickets';
import { useSession } from 'next-auth/react';
import { AppRoleTypes } from '@b2b-tickets/shared-models';
import '@testing-library/jest-dom/extend-expect'; // Import matchers

jest.resetModules();

// Mock useSession from next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

// Mock userHasRole utility
jest.mock('@b2b-tickets/utils', () => ({
  userHasRole: jest.fn(),
}));

// trying to mock createLogger to return a specific logger instance
jest.mock('winston', () => {
  const logger = {
    debug: jest.fn(),
    log: jest.fn(),
  };

  return {
    format: {
      colorize: jest.fn(),
      combine: jest.fn(),
      label: jest.fn(),
      timestamp: jest.fn(),
      printf: jest.fn(),
      json: jest.fn(),
      align: jest.fn(),
      errors: jest.fn(),
    },
    createLogger: jest.fn().mockReturnValue(logger),
    transports: {
      Console: jest.fn(),
    },
  };
});
import * as winston from 'winston';

describe('TicketListHeader', () => {
  const mockSession = {
    data: {
      user: {
        user_id: '123',
      },
    },
    status: 'authenticated',
  };

  test('always true test', () => {
    expect(true).toBe(true);
  });

  it('should render the "Tickets" header', () => {
    (useSession as jest.Mock).mockReturnValue(mockSession);

    render(<TicketListHeader query="test-query" currentPage={1} />);

    const header = screen.getByText(/Tickets/i);
    expect(header).toBeTruthy();
  });
});
