import { render } from '@testing-library/react';

import AdminServerActions from './admin-server-actions';

describe('AdminServerActions', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<AdminServerActions />);
    expect(baseElement).toBeTruthy();
  });
});
