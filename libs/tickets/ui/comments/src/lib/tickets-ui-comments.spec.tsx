import { render } from '@testing-library/react';

import TicketsUiComments from './tickets-ui-comments';

describe('TicketsUiComments', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<TicketsUiComments />);
    expect(baseElement).toBeTruthy();
  });
});
