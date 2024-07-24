import { render } from '@testing-library/react';

import ServerActions from './server-actions';

describe('ServerActions', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<ServerActions />);
    expect(baseElement).toBeTruthy();
  });
});
