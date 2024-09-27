import React from 'react';
import { render } from '@testing-library/react';
import { redirect } from 'next/navigation';
import Page from '../app/page';

// Mock the redirect function
jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

describe('Page', () => {
  it('should redirect to /tickets', () => {
    render(<Page />);

    // Assert that the redirect function was called with '/tickets'
    expect(redirect).toHaveBeenCalledWith('/tickets');
  });
});
