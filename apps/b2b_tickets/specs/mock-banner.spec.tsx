import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Create a simple mock component for testing
const MockBanner = ({ 
  cookieConsent, 
  onAccept, 
  onReject, 
  onViewDetails 
}: { 
  cookieConsent: string | null;
  onAccept: () => void;
  onReject: () => void;
  onViewDetails: () => void;
}) => {
  // Don't render if consent is already given
  if (cookieConsent === 'accepted') return null;
  
  return (
    <div data-testid="cookie-banner">
      <p>This page uses cookies</p>
      <button data-testid="accept-button" onClick={onAccept}>Accept All</button>
      <button data-testid="reject-button" onClick={onReject}>Reject All</button>
      <button data-testid="details-button" onClick={onViewDetails}>View Details</button>
      
      {/* Modal dialogs will appear here when needed */}
    </div>
  );
};

describe('Mock Cookie Consent Banner', () => {
  const mockSetCookie = jest.fn();
  const mockGtag = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    // Set up global gtag
    window.gtag = mockGtag;
  });
  
  it('should not render when cookie consent is accepted', () => {
    render(
      <MockBanner 
        cookieConsent="accepted"
        onAccept={jest.fn()}
        onReject={jest.fn()}
        onViewDetails={jest.fn()}
      />
    );
    
    expect(screen.queryByTestId('cookie-banner')).not.toBeInTheDocument();
  });
  
  it('should render when no cookie consent exists', () => {
    render(
      <MockBanner 
        cookieConsent={null}
        onAccept={jest.fn()}
        onReject={jest.fn()}
        onViewDetails={jest.fn()}
      />
    );
    
    expect(screen.getByTestId('cookie-banner')).toBeInTheDocument();
    expect(screen.getByTestId('accept-button')).toBeInTheDocument();
    expect(screen.getByTestId('reject-button')).toBeInTheDocument();
    expect(screen.getByTestId('details-button')).toBeInTheDocument();
  });
  
  it('should call onAccept when Accept All button is clicked', () => {
    const mockAccept = jest.fn(() => {
      mockSetCookie('cookieConsent', 'accepted', { expires: 30 });
      mockGtag('consent', 'update', { analytics_storage: 'granted' });
    });
    
    render(
      <MockBanner 
        cookieConsent={null}
        onAccept={mockAccept}
        onReject={jest.fn()}
        onViewDetails={jest.fn()}
      />
    );
    
    fireEvent.click(screen.getByTestId('accept-button'));
    
    expect(mockAccept).toHaveBeenCalled();
    expect(mockSetCookie).toHaveBeenCalledWith('cookieConsent', 'accepted', { expires: 30 });
    expect(mockGtag).toHaveBeenCalledWith('consent', 'update', { analytics_storage: 'granted' });
  });
  
  it('should call onReject when Reject All button is clicked', () => {
    const mockReject = jest.fn(() => {
      mockSetCookie('cookieConsent', 'rejected', { expires: 30 });
      mockGtag('consent', 'update', { analytics_storage: 'denied' });
    });
    
    render(
      <MockBanner 
        cookieConsent={null}
        onAccept={jest.fn()}
        onReject={mockReject}
        onViewDetails={jest.fn()}
      />
    );
    
    fireEvent.click(screen.getByTestId('reject-button'));
    
    expect(mockReject).toHaveBeenCalled();
    expect(mockSetCookie).toHaveBeenCalledWith('cookieConsent', 'rejected', { expires: 30 });
    expect(mockGtag).toHaveBeenCalledWith('consent', 'update', { analytics_storage: 'denied' });
  });
  
  it('should call onViewDetails when View Details button is clicked', () => {
    const mockViewDetails = jest.fn();
    
    render(
      <MockBanner 
        cookieConsent={null}
        onAccept={jest.fn()}
        onReject={jest.fn()}
        onViewDetails={mockViewDetails}
      />
    );
    
    fireEvent.click(screen.getByTestId('details-button'));
    
    expect(mockViewDetails).toHaveBeenCalled();
  });
});