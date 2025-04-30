import React from 'react';
import '@testing-library/jest-dom'; // This will add custom matchers like `toBeInTheDocument`
import { render, screen } from '@testing-library/react';
import { renderActiveness } from '../help_func';

describe('renderActiveness', () => {
  it('should render "Active" with green background when active is true', () => {
    render(renderActiveness(true)); // Render the component with active=true

    const activeElement = screen.getByText('Active'); // Find the "Active" text
    expect(activeElement).toBeInTheDocument(); // Verify it's rendered
    expect(activeElement).toHaveClass('bg-green-400'); // Check if the background color class is applied
    expect(activeElement).toHaveClass('p-2'); // Verify padding class is present
    expect(activeElement).toHaveClass('rounded-lg'); // Check for rounded corners
    expect(activeElement).toHaveClass('text-white'); // Check if the text is white
  });

  it('should render "Inactive" with red background when active is false', () => {
    render(renderActiveness(false)); // Render the component with active=false

    const inactiveElement = screen.getByText('Inactive'); // Find the "Inactive" text
    expect(inactiveElement).toBeInTheDocument(); // Verify it's rendered
    expect(inactiveElement).toHaveClass('bg-red-400'); // Check if the background color class is applied
    expect(inactiveElement).toHaveClass('p-2'); // Verify padding class is present
    expect(inactiveElement).toHaveClass('rounded-full'); // Check for rounded-full corners
    expect(inactiveElement).toHaveClass('text-white'); // Check if the text is white
  });
});
