import { render } from '@testing-library/react';

import EscalationBars from './EscalationBars';

describe('EscalationBars', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<EscalationBars />);
    expect(baseElement).toBeTruthy();
  });
});
