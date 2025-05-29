import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

describe('Simple Tests', () => {
  it('should render a simple component', () => {
    const { getByText } = render(<div>Hello World</div>);
    expect(getByText('Hello World')).toBeInTheDocument();
  });
});