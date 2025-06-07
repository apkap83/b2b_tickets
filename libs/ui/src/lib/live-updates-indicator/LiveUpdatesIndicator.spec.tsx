import { render } from '@testing-library/react';

import LiveUpdatesIndicator from './LiveUpdatesIndicator';

describe('LiveUpdatesIndicator', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<LiveUpdatesIndicator />);
    expect(baseElement).toBeTruthy();
  });
});
