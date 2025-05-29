import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import WebSocketWrapper from '../app/WebSocketWrapper';
import { WebSocketProvider } from '@b2b-tickets/contexts';

// Mock the WebSocketProvider
jest.mock('@b2b-tickets/contexts', () => ({
  WebSocketProvider: jest.fn(({ children }) => (
    <div data-testid="mock-websocket-provider">{children}</div>
  )),
}));

describe('WebSocketWrapper', () => {
  it('should render WebSocketProvider with children', () => {
    const { getByTestId, getByText } = render(
      <WebSocketWrapper>
        <div>Test Child</div>
      </WebSocketWrapper>
    );
    
    // Check that the WebSocketProvider is rendered
    expect(getByTestId('mock-websocket-provider')).toBeInTheDocument();
    
    // Check that the children are rendered within the provider
    expect(getByText('Test Child')).toBeInTheDocument();
    
    // Verify that WebSocketProvider was called
    expect(WebSocketProvider).toHaveBeenCalled();
  });
});