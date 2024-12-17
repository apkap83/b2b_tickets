'use client';

import { WebSocketProvider } from '@b2b-tickets/contexts';
import React from 'react';

const WebSocketWrapper = ({ children }: { children: any }) => {
  return <WebSocketProvider>{children}</WebSocketProvider>;
};

export default WebSocketWrapper;
