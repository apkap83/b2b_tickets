'use client';
import React, { useState, useEffect } from 'react';
import { useWebSocketContext } from '@b2b-tickets/contexts';

export const LiveUpdatesIndicator = () => {
  const { connected: isConnected } = useWebSocketContext();
  const [connected, setConnected] = useState(isConnected);
  const [lastActivity, setLastActivity] = useState(new Date());
  const [showPulse, setShowPulse] = useState(false);

  // Check if user has seen the indicator before in this session
  const [isExpanded, setIsExpanded] = useState(() => {
    if (typeof window !== 'undefined') {
      const hasSeenIndicator = sessionStorage.getItem(
        'liveUpdatesIndicatorSeen'
      );
      return !hasSeenIndicator; // Start expanded only if not seen before
    }
    return true;
  });

  // Auto-shrink after 3 seconds (only on first visit)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasSeenIndicator = sessionStorage.getItem(
        'liveUpdatesIndicatorSeen'
      );

      if (!hasSeenIndicator) {
        const shrinkTimer = setTimeout(() => {
          setIsExpanded(false);
          // Mark as seen for this session
          sessionStorage.setItem('liveUpdatesIndicatorSeen', 'true');
        }, 3000);

        return () => clearTimeout(shrinkTimer);
      }
    }
  }, []);

  // Sync with actual connection state
  useEffect(() => {
    setConnected(isConnected);
  }, [isConnected]);

  // Simulate activity updates
  useEffect(() => {
    const activityInterval = setInterval(() => {
      if (connected) {
        setLastActivity(new Date());
        setShowPulse(true);
        setTimeout(() => setShowPulse(false), 1000);
      }
    }, 3000);

    return () => clearInterval(activityInterval);
  }, [connected]);

  // Expand temporarily on hover when shrunk
  const handleMouseEnter = () => {
    if (!isExpanded) {
      setIsExpanded(true);
    }
  };

  const handleMouseLeave = () => {
    if (isExpanded) {
      // Delay shrinking to allow reading
      setTimeout(() => {
        setIsExpanded(false);
      }, 2000);
    }
  };

  return (
    <div className="fixed bottom-[2.85rem] right-1 z-50">
      {/* Main indicator container */}
      <div
        className={`
          relative flex items-center rounded-2xl shadow-2xl
          backdrop-blur-lg border transition-all duration-700 ease-out
          transform hover:scale-105 cursor-default
          ${
            connected
              ? 'bg-gradient-to-r from-green-50/90 to-emerald-50/90 border-green-200/50 text-green-700'
              : 'bg-gradient-to-r from-red-50/90 to-rose-50/90 border-red-200/50 text-red-700'
          }
          ${isExpanded ? 'gap-3 px-4 py-3' : 'gap-0 px-3 py-3 w-14'}
        `}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Animated background glow */}
        <div
          className={`
            absolute inset-0 rounded-2xl transition-opacity duration-500
            ${
              connected
                ? 'bg-gradient-to-r from-green-400/10 to-emerald-400/10'
                : 'bg-gradient-to-r from-red-400/10 to-rose-400/10'
            }
          `}
        />

        {/* Status indicator with multiple animation layers */}
        <div className="relative flex items-center justify-center w-8 h-8 flex-shrink-0">
          {/* Outer pulse ring */}
          {connected && (
            <div className="absolute inset-0 rounded-full bg-green-400/20 animate-ping" />
          )}

          {/* Middle glow ring */}
          <div
            className={`
              absolute inset-1 rounded-full transition-all duration-300
              ${
                connected
                  ? 'bg-gradient-to-r from-green-400/30 to-emerald-400/30 animate-pulse'
                  : 'bg-gradient-to-r from-red-400/30 to-rose-400/30'
              }
            `}
          />

          {/* Inner dot with gradient */}
          <div
            className={`
              relative w-4 h-4 rounded-full transition-all duration-300
              ${
                connected
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 shadow-lg shadow-green-500/25'
                  : 'bg-gradient-to-r from-red-500 to-rose-500 shadow-lg shadow-red-500/25'
              }
            `}
          >
            {/* Inner highlight */}
            <div className="absolute inset-0.5 rounded-full bg-white/30" />
          </div>

          {/* Activity pulse overlay */}
          {showPulse && (
            <div className="absolute inset-0 rounded-full bg-green-400/40 animate-ping" />
          )}
        </div>

        {/* Status content - slides in/out */}
        <div
          className={`
            relative flex flex-col transition-all duration-700 ease-out overflow-hidden
            ${
              isExpanded
                ? 'opacity-100 max-w-xs translate-x-0'
                : 'opacity-0 max-w-0 -translate-x-4'
            }
          `}
        >
          <div className="flex items-center gap-2 whitespace-nowrap">
            {/* Status text with icon */}
            <span className="font-semibold text-sm">
              {connected ? 'Live Updates' : 'Disconnected'}
            </span>

            {/* Signal bars animation when connected */}
            {connected && (
              <div className="flex gap-0.5 items-end">
                {[1, 2, 3].map((bar) => (
                  <div
                    key={bar}
                    className={`
                      w-1 bg-gradient-to-t from-green-500 to-emerald-400 rounded-full
                      animate-pulse
                    `}
                    style={{
                      height: `${bar * 3 + 2}px`,
                      animationDelay: `${bar * 0.2}s`,
                      animationDuration: '1.5s',
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Last activity timestamp */}
          {connected && (
            <span className="text-xs opacity-70 font-medium whitespace-nowrap">
              Last update:{' '}
              {lastActivity.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </span>
          )}
        </div>

        {/* Floating particles effect when connected */}
        {connected && (
          <>
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className={`
                  absolute w-1 h-1 bg-green-400 rounded-full opacity-60
                  animate-bounce
                `}
                style={{
                  top: `${20 + i * 10}%`,
                  right: `${isExpanded ? 10 + i * 15 : 20 + i * 10}%`,
                  animationDelay: `${i * 0.5}s`,
                  animationDuration: '2s',
                }}
              />
            ))}
          </>
        )}
      </div>

      {/* Connection status tooltip on hover - only show when shrunk */}
      {!isExpanded && (
        <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
          {connected
            ? '🟢 Real-time updates active'
            : '🔴 Connection lost - attempting to reconnect'}
          <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
};

export default LiveUpdatesIndicator;
