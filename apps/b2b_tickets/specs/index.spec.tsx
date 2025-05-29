import React from 'react';
import { render } from '@testing-library/react';
import { redirect } from 'next/navigation';
import Page from '../app/page';

// Mock the redirect function
jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

describe('Home Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should redirect to /tickets', async () => {
    await Page();
    expect(redirect).toHaveBeenCalledWith('/tickets');
  });
});
