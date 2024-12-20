import { render } from '@testing-library/react';

import PasswordComplexityAnnouncement from './PasswordComplexityAnnouncement';

describe('PasswordComplexityAnnouncement', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<PasswordComplexityAnnouncement />);
    expect(baseElement).toBeTruthy();
  });
});
