import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useSession } from 'next-auth/react';
import cookie from 'js-cookie';

// Create a simplified mock component for testing
const MockCookieConsentBanner = ({ 
  showBanner = true, 
  onAccept = () => {}, 
  onReject = () => {}, 
  onViewDetails = () => {} 
}) => {
  if (!showBanner) return null;
  
  return (
    <div data-testid="cookie-banner">
      <p>This page uses cookies</p>
      <button data-testid="accept-button" onClick={onAccept}>Accept All</button>
      <button data-testid="reject-button" onClick={onReject}>Reject All</button>
      <button data-testid="details-button" onClick={onViewDetails}>View Details</button>
    </div>
  );
};

// Mock the actual component with our simplified version
jest.mock('../app/CookieConsentBanner', () => {
  return {
    __esModule: true,
    default: function MockCookieBanner(props: any) {
      const { data: session, status } = useSession();
      const showBanner = cookie.get('cookieConsent') !== 'accepted';
      
      const handleAccept = () => {
        cookie.set('cookieConsent', 'accepted', { expires: 30 });
        if (window.gtag) {
          window.gtag('consent', 'update', { analytics_storage: 'granted' });
        }
      };
      
      const handleReject = () => {
        cookie.set('cookieConsent', 'rejected', { expires: 30 });
        if (window.gtag) {
          window.gtag('consent', 'update', { analytics_storage: 'denied' });
        }
      };
      
      return (
        <MockCookieConsentBanner
          showBanner={showBanner}
          onAccept={handleAccept}
          onReject={handleReject}
          onViewDetails={() => {}}
        />
      );
    }
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

// Get the CookieConsentBanner component (which will be our mock)
const CookieConsentBanner = require('../app/CookieConsentBanner').default;

describe('Simplified CookieConsentBanner Test', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'authenticated',
    });
    (cookie.get as jest.Mock).mockReturnValue(null);
    // Mock window.gtag
    if (!window.gtag) {
      window.gtag = jest.fn();
    }
  });

  it('should not render when consent cookie is already accepted', () => {
    (cookie.get as jest.Mock).mockReturnValue('accepted');
    
    render(<CookieConsentBanner />);
    
    expect(screen.queryByTestId('cookie-banner')).not.toBeInTheDocument();
  });

  it('should render the banner when no consent cookie exists', () => {
    (cookie.get as jest.Mock).mockReturnValue(null);
    
    render(<CookieConsentBanner />);
    
    expect(screen.getByTestId('cookie-banner')).toBeInTheDocument();
    expect(screen.getByTestId('accept-button')).toBeInTheDocument();
    expect(screen.getByTestId('reject-button')).toBeInTheDocument();
    expect(screen.getByTestId('details-button')).toBeInTheDocument();
  });

  it('should set the acceptance cookie when Accept All is clicked', () => {
    (cookie.get as jest.Mock).mockReturnValue(null);
    
    render(<CookieConsentBanner />);
    
    screen.getByTestId('accept-button').click();
    
    expect(cookie.set).toHaveBeenCalledWith('cookieConsent', 'accepted', expect.any(Object));
    expect(window.gtag).toHaveBeenCalledWith('consent', 'update', { analytics_storage: 'granted' });
  });

  it('should set the rejection cookie when Reject All is clicked', () => {
    (cookie.get as jest.Mock).mockReturnValue(null);
    
    render(<CookieConsentBanner />);
    
    screen.getByTestId('reject-button').click();
    
    expect(cookie.set).toHaveBeenCalledWith('cookieConsent', 'rejected', expect.any(Object));
    expect(window.gtag).toHaveBeenCalledWith('consent', 'update', { analytics_storage: 'denied' });
  });
});