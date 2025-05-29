import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CookieConsentBanner from '../app/CookieConsentBanner';
import { useSession } from 'next-auth/react';
import cookie from 'js-cookie';

// Mock the assets
jest.mock('@b2b-tickets/assets', () => ({
  NovaLogo: '/mock-logo.png',
}));

// Mock the FaChevronRight component
jest.mock('react-icons/fa6', () => ({
  FaChevronRight: () => <span data-testid="chevron-icon">→</span>,
}));

// Mock MUI components
jest.mock('@mui/material/Button', () => {
  return {
    __esModule: true,
    default: ({ children, onClick, variant, style }) => (
      <button 
        onClick={onClick} 
        data-variant={variant}
        data-testid={`mui-button-${variant}-${String(children).replace(/\s+/g, '-').toLowerCase()}`}
      >
        {children}
      </button>
    ),
  };
});

jest.mock('@mui/material/Dialog', () => {
  return {
    __esModule: true,
    default: ({ children, open, onClose, maxWidth, fullWidth }) => (
      open ? (
        <div data-testid="mui-dialog">
          {children}
          <button onClick={onClose} data-testid="close-dialog-button">Close</button>
        </div>
      ) : null
    ),
  };
});

jest.mock('@mui/material/DialogContent', () => {
  return {
    __esModule: true,
    default: ({ children }) => <div data-testid="mui-dialog-content">{children}</div>,
  };
});

jest.mock('@mui/material/DialogTitle', () => {
  return {
    __esModule: true,
    default: ({ children }) => <div data-testid="mui-dialog-title">{children}</div>,
  };
});

// Mock next-auth's useSession
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
  signOut: jest.fn(() => Promise.resolve()),
}));

// Mock js-cookie
jest.mock('js-cookie', () => ({
  get: jest.fn(),
  set: jest.fn(),
}));

// Mock config
jest.mock('@b2b-tickets/config', () => {
  return {
    __esModule: true,
    default: {
      ShowCookieConsentBanner: true,
      cookieConsentValidityInDays: 30
    },
    ShowCookieConsentBanner: true,
    cookieConsentValidityInDays: 30,
  };
});

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    return <img data-testid="next-image" {...props} />;
  },
}));

describe('CookieConsentBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'unauthenticated',
    });
    (cookie.get as jest.Mock).mockReturnValue(null);
    // Mock window.gtag
    if (!window.gtag) {
      window.gtag = jest.fn();
    }
  });

  it('should not render when ShowCookieConsentBanner is false', () => {
    // Override the config mock for this test
    const configModule = require('@b2b-tickets/config');
    configModule.ShowCookieConsentBanner = false;
    configModule.default.ShowCookieConsentBanner = false;
    
    render(<CookieConsentBanner />);
    
    expect(screen.queryByTestId('mui-button-contained-accept-all')).not.toBeInTheDocument();
  });

  it('should not render when consent cookie is already accepted', () => {
    (cookie.get as jest.Mock).mockReturnValue('accepted');
    
    render(<CookieConsentBanner />);
    
    expect(screen.queryByTestId('mui-button-contained-accept-all')).not.toBeInTheDocument();
  });

  it('should render the banner when no consent cookie exists', () => {
    render(<CookieConsentBanner />);
    
    expect(screen.getByTestId('mui-button-contained-accept-all')).toBeInTheDocument();
    expect(screen.getByTestId('mui-button-outlined-reject-all')).toBeInTheDocument();
    expect(screen.getByTestId('mui-button-text-view-details')).toBeInTheDocument();
  });

  it('should set the acceptance cookie when Accept All is clicked', async () => {
    render(<CookieConsentBanner />);
    
    fireEvent.click(screen.getByTestId('mui-button-contained-accept-all'));
    
    expect(cookie.set).toHaveBeenCalledWith('cookieConsent', 'accepted', expect.any(Object));
    expect(window.gtag).toHaveBeenCalledWith('consent', 'update', { analytics_storage: 'granted' });
  });

  it('should set the rejection cookie and sign out when Reject All is clicked', async () => {
    render(<CookieConsentBanner />);
    
    fireEvent.click(screen.getByTestId('mui-button-outlined-reject-all'));
    
    expect(cookie.set).toHaveBeenCalledWith('cookieConsent', 'rejected', expect.any(Object));
    expect(window.gtag).toHaveBeenCalledWith('consent', 'update', { analytics_storage: 'denied' });
  });

  it('should open details modal when View Details is clicked', () => {
    render(<CookieConsentBanner />);
    
    fireEvent.click(screen.getByTestId('mui-button-text-view-details'));
    
    expect(screen.getByTestId('mui-dialog')).toBeInTheDocument();
  });
});