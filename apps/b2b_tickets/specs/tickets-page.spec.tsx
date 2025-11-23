// Add BEFORE other imports
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@b2b-tickets/auth-options', () => ({
  options: {},
}));

jest.mock('next/navigation', () => ({
  notFound: jest.fn(),
  redirect: jest.fn(), // Add this
}));

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import TicketsPage from '../app/(allPages)/tickets/page';
import { getFilteredTicketsForCustomer } from '@b2b-tickets/server-actions';
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

// Mock dependencies
jest.mock('@b2b-tickets/tickets', () => ({
  TicketsList: jest.fn(({ theTicketsList, totalRows }) => (
    <div
      data-testid="tickets-list"
      data-tickets={JSON.stringify(theTicketsList)}
      data-total={totalRows}
    >
      Tickets List Component
    </div>
  )),
}));

jest.mock('@b2b-tickets/server-actions', () => ({
  getFilteredTicketsForCustomer: jest.fn(),
}));

jest.mock('@mui/material/Container', () => ({
  __esModule: true,
  default: ({
    children,
    maxWidth,
    className,
  }: React.PropsWithChildren<any>) => (
    <div
      data-testid="mui-container"
      data-max-width={maxWidth}
      className={className}
    >
      {children}
    </div>
  ),
}));

describe('Tickets Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock authenticated session by default
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: '1', email: 'test@example.com', name: 'Test User' },
    });
  });

  it('should render tickets list with default parameters when no search params are provided', async () => {
    // Mock API response
    const mockPageData = [{ id: 1, title: 'Test Ticket' }];
    const mockTotalRows = 1;

    (getFilteredTicketsForCustomer as jest.Mock).mockResolvedValue({
      pageData: mockPageData,
      totalRows: mockTotalRows,
    });

    const page = await TicketsPage({ searchParams: {} });
    render(page);

    expect(getFilteredTicketsForCustomer).toHaveBeenCalledWith(
      1,
      '',
      expect.any(Object)
    );
    expect(screen.getByTestId('tickets-list')).toBeInTheDocument();
    expect(screen.getByTestId('tickets-list')).toHaveAttribute(
      'data-tickets',
      JSON.stringify(mockPageData)
    );
    expect(screen.getByTestId('tickets-list')).toHaveAttribute(
      'data-total',
      mockTotalRows.toString()
    );
  });

  it('should use provided search parameters when available', async () => {
    // Mock API response
    const mockPageData = [{ id: 2, title: 'Another Ticket' }];
    const mockTotalRows = 1;

    (getFilteredTicketsForCustomer as jest.Mock).mockResolvedValue({
      pageData: mockPageData,
      totalRows: mockTotalRows,
    });

    const searchParams = {
      query: 'test query',
      page: '2',
      status: 'open\x1Fpending', // Using the delimiter to represent multiple values
    };

    const page = await TicketsPage({ searchParams });
    render(page);

    // Verify filters are correctly parsed and passed
    const expectedFilters = {
      query: ['test query'],
      page: ['2'],
      status: ['open', 'pending'],
    };

    expect(getFilteredTicketsForCustomer).toHaveBeenCalledWith(
      2,
      'test query',
      expect.objectContaining(expectedFilters)
    );
    expect(screen.getByTestId('tickets-list')).toBeInTheDocument();
  });

  it('should call notFound when no pageData is returned', async () => {
    // Mock API response with no data
    (getFilteredTicketsForCustomer as jest.Mock).mockResolvedValue({
      pageData: null,
      totalRows: 0,
    });

    await TicketsPage({ searchParams: {} });

    expect(notFound).toHaveBeenCalled();
  });

  it('should redirect to signin when user is not authenticated', async () => {
    // Mock unauthenticated session
    (getServerSession as jest.Mock).mockResolvedValue(null);

    await TicketsPage({ searchParams: {} });

    expect(redirect).toHaveBeenCalledWith('/signin?callbackUrl=/tickets');
  });
});
