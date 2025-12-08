'use client';
import React, { useState, useEffect } from 'react';
import clsx from 'clsx';
import { useWebSocketContext } from '@b2b-tickets/contexts';

// Constants
const SHRINK_DELAY = 3500;
const HOVER_COLLAPSE_DELAY = 2000;
const ACTIVITY_INTERVAL = 3000;
const PULSE_DURATION = 1000;

export const LiveUpdatesIndicator = () => {
  const { connected: isConnected } = useWebSocketContext();
  const [connected, setConnected] = useState(isConnected);
  const [lastActivity, setLastActivity] = useState(new Date());
  const [showPulse, setShowPulse] = useState(false);
  // Always start with consistent server-side values to prevent hydration mismatches
  const [isExpanded, setIsExpanded] = useState(true);
  const [showShrunkContent, setShowShrunkContent] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);

  // Initialize state from sessionStorage after hydration to prevent mismatches
  useEffect(() => {
    if (typeof window === 'undefined') return;

    setHasHydrated(true);
    const hasSeenIndicator = sessionStorage.getItem('liveUpdatesIndicatorSeen');

    if (hasSeenIndicator) {
      // User has seen indicator before - start in collapsed state
      setIsExpanded(false);
      setShowShrunkContent(true);
    } else {
      // First time user - keep expanded but set up auto-collapse
      const shrinkTimer = setTimeout(() => {
        setIsExpanded(false);
        sessionStorage.setItem('liveUpdatesIndicatorSeen', 'true');

        // Delay showing shrunk content until after collapse animation
        setTimeout(() => {
          setShowShrunkContent(true);
        }, 700); // Match transition duration
      }, SHRINK_DELAY);

      return () => clearTimeout(shrinkTimer);
    }
  }, []);

  // Sync with WebSocket connection state
  useEffect(() => {
    setConnected(isConnected);
  }, [isConnected]);

  // Simulate activity updates with pulse effect
  useEffect(() => {
    if (!connected) return;

    const activityInterval = setInterval(() => {
      setLastActivity(new Date());
      setShowPulse(true);
      setTimeout(() => setShowPulse(false), PULSE_DURATION);
    }, ACTIVITY_INTERVAL);

    return () => clearInterval(activityInterval);
  }, [connected]);

  // Handlers
  const handleMouseEnter = () => {
    if (!isExpanded) {
      setShowShrunkContent(false); // Hide shrunk content immediately
      setIsExpanded(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isExpanded) return;

    setTimeout(() => {
      setIsExpanded(false);

      // Show shrunk content after collapse animation
      setTimeout(() => {
        setShowShrunkContent(true);
      }, 700); // Match transition duration
    }, HOVER_COLLAPSE_DELAY);
  };

  // Format timestamp
  const formattedTime = lastActivity.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div className="fixed bottom-[2.87rem] right-0 z-5 hidden md:block">
      {!hasHydrated ? (
        // Server-side placeholder - same structure but hidden content
        <div style={{ opacity: 0 }} />
      ) : (
        // Client-side full content
        <IndicatorContainer
          isExpanded={isExpanded}
          connected={connected}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <BackgroundGlow connected={connected} />

          {isExpanded ? (
            <ExpandedDot showPulse={showPulse} />
          ) : (
            <ShrunkIndicator
              connected={connected}
              showContent={showShrunkContent}
            />
          )}

          <ExpandedContent
            isExpanded={isExpanded}
            formattedTime={formattedTime}
          />
        </IndicatorContainer>
      )}

      {hasHydrated && !isExpanded && <HoverTooltip />}
    </div>
  );
};

// Sub-components for better organization

interface IndicatorContainerProps {
  isExpanded: boolean;
  connected: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  children: React.ReactNode;
}

const IndicatorContainer: React.FC<IndicatorContainerProps> = ({
  isExpanded,
  connected,
  onMouseEnter,
  onMouseLeave,
  children,
}) => {
  const containerClasses = clsx(
    'relative flex items-center rounded-md shadow-md',
    'backdrop-blur-lg border transition-all duration-700 ease-out',
    'transform hover:scale-105 cursor-default',
    'bg-gradient-to-r from-green-50/90 to-emerald-50/90 text-green-700',
    {
      'gap-3 px-2 py-2': isExpanded,
      'gap-0 px-2': !isExpanded,
      'border-green-400/30': connected,
      'border-red-400/30': !connected,
    }
  );

  return (
    <div
      className={containerClasses}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>
  );
};

interface BackgroundGlowProps {
  connected: boolean;
}

const BackgroundGlow: React.FC<BackgroundGlowProps> = ({ connected }) => {
  const glowClasses = clsx(
    'absolute inset-0 rounded-md transition-opacity duration-500',
    'bg-gradient-to-r',
    {
      'from-green-400/10 to-emerald-400/10': connected,
      'from-red-400/10 to-orange-400/10': !connected,
    }
  );

  return <div className={glowClasses} />;
};

interface ExpandedDotProps {
  showPulse: boolean;
}

const ExpandedDot: React.FC<ExpandedDotProps> = ({ showPulse }) => (
  <div className="relative flex items-center justify-center w-8 h-8 flex-shrink-0">
    {/* Outer pulse ring */}
    <div className="absolute inset-0 rounded-full bg-green-400/20 animate-ping" />

    {/* Middle glow ring */}
    <div
      className={clsx(
        'absolute inset-1 rounded-full transition-all duration-300',
        'bg-gradient-to-r from-green-400/30 to-emerald-400/30 animate-pulse'
      )}
    />

    {/* Inner dot with gradient */}
    <div
      className={clsx(
        'relative w-4 h-4 rounded-full transition-all duration-300',
        'bg-gradient-to-r from-green-500 to-emerald-500',
        'shadow-lg shadow-green-500/25'
      )}
    >
      <div className="absolute inset-0.5 rounded-full bg-white/30" />
    </div>

    {/* Activity pulse overlay */}
    {showPulse && (
      <div className="absolute inset-0 rounded-full bg-green-400/40 animate-ping" />
    )}
  </div>
);

interface ShrunkIndicatorProps {
  connected: boolean;
  showContent: boolean;
}

const ShrunkIndicator: React.FC<ShrunkIndicatorProps> = ({
  connected,
  showContent,
}) => (
  <div
    className={clsx(
      'relative flex gap-1 items-center justify-center flex-shrink-0 overflow-hidden',
      'transition-all duration-700 ease-out',
      {
        'opacity-100 max-w-[200px]': showContent,
        'opacity-0 max-w-0': !showContent,
      }
    )}
  >
    <StatusDot connected={connected} />
    <StatusText connected={connected} />
  </div>
);

interface StatusDotProps {
  connected: boolean;
}

const StatusDot: React.FC<StatusDotProps> = ({ connected }) => {
  const dotClasses = clsx(
    'relative w-4 h-4 rounded-full transition-all duration-300',
    'bg-gradient-to-r shadow-lg shadow-green-500/25',
    {
      'from-green-500 to-emerald-500': connected,
      'from-red-500 to-orange-500': !connected,
    }
  );

  return (
    <div className={dotClasses}>
      <div className="absolute inset-0.5 rounded-full bg-white/30" />
    </div>
  );
};

interface StatusTextProps {
  connected: boolean;
}

const StatusText: React.FC<StatusTextProps> = ({ connected }) => {
  const textClasses = clsx(
    'text-xs font-bold tracking-wide transition-all duration-300',
    {
      'text-green-600': connected,
      'text-red-600': !connected,
    }
  );

  return (
    <span className={textClasses}>
      {connected ? 'Live Updates' : 'No Live Updates'}
    </span>
  );
};

interface ExpandedContentProps {
  isExpanded: boolean;
  formattedTime: string;
}

const ExpandedContent: React.FC<ExpandedContentProps> = ({
  isExpanded,
  formattedTime,
}) => {
  const contentClasses = clsx(
    'relative flex flex-col transition-all duration-700 ease-out overflow-hidden',
    {
      'opacity-100 max-w-xs translate-x-0': isExpanded,
      'opacity-0 max-w-0 -translate-x-4': !isExpanded,
    }
  );

  return (
    <div className={contentClasses}>
      <div className="flex items-center gap-2 whitespace-nowrap">
        <span className="font-semibold text-sm">Live Updates</span>
        <SignalBars />
      </div>

      <span className="text-xs opacity-70 font-medium whitespace-nowrap">
        Last update: {formattedTime}
      </span>
    </div>
  );
};

const SignalBars: React.FC = () => (
  <div className="flex gap-0.5 items-end">
    {[1, 2, 3].map((bar) => (
      <div
        key={bar}
        className="w-1 bg-gradient-to-t from-green-500 to-emerald-400 rounded-full animate-pulse"
        style={{
          height: `${bar * 3 + 2}px`,
          animationDelay: `${bar * 0.2}s`,
          animationDuration: '1.5s',
        }}
      />
    ))}
  </div>
);

const HoverTooltip: React.FC = () => (
  <div
    className={clsx(
      'absolute bottom-full right-0 mb-2 px-3 py-2',
      'bg-gray-900 text-white text-sm rounded-lg',
      'opacity-0 hover:opacity-100 transition-opacity duration-200',
      'pointer-events-none whitespace-nowrap'
    )}
  >
    🟢 Real-time updates active
    <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
  </div>
);

export default LiveUpdatesIndicator;
