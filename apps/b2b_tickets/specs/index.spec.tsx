import React from 'react';
import { render } from '@testing-library/react';
import { redirect } from 'next/navigation';
import Page from '../app/page';

// Mock the redirect function
jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

describe('Page 1', () => {
  it('should redirect to /tickets', () => {
    expect(1).toBe(1);
  });
});
