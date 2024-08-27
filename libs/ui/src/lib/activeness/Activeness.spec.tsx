import { render } from '@testing-library/react';

import Activeness from './Activeness';

describe('Activeness', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<Activeness />);
    expect(baseElement).toBeTruthy();
  });
});
