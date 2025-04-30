import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom'; // This will add custom matchers like `toBeInTheDocument`
import { ToastProvider } from '../toast-provider'; // Update with the correct path

describe('ToastProvider', () => {
  it('should render the div with the specific style', () => {
    // Render the ToastProvider with a sample child element
    const { container } = render(
      <ToastProvider>
        <div>Test Child</div>
      </ToastProvider>
    );

    // Check that the div with the specific style is present in the document
    const divWithStyle = container.querySelector(
      'div[style="position: fixed; z-index: 9999; top: 16px; left: 16px; right: 16px; bottom: 16px; pointer-events: none;"]'
    );

    // Assert that the div is in the document
    expect(divWithStyle).toBeInTheDocument();
  });
});
