import React from 'react';
import { render, screen } from '@testing-library/react';
import { AuthProvider } from '../AuthProvider';
import { useSession } from 'next-auth/react';
import '@testing-library/jest-dom';

// Mock SessionProvider to track session context
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
  SessionProvider: ({ children }: any) => <div>{children}</div>,
}));

describe('AuthProvider Component', () => {
  it('should wrap children with SessionProvider context', () => {
    // Mock the session data
    const mockSession = {
      data: { user: { name: 'John Doe', email: 'john.doe@example.com' } },
      status: 'authenticated',
    };

    // Mock useSession hook to return the mock session
    (useSession as jest.Mock).mockReturnValue(mockSession);

    const TestComponent = () => {
      const { data, status } = useSession();
      return (
        <div>
          <span>{status}</span>
          <span>{data?.user?.name}</span>
        </div>
      );
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Check if the session context values are properly passed and rendered
    expect(screen.getByText('authenticated')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });
});
