'use client';
import React, { useEffect, useState } from 'react';
import { getAllTickets } from '@/app/lib/actions';

const App: React.FC = () => {
  useEffect(() => {
    const getTickets = async () => {
      const tickets = await getAllTickets();
    };

    getTickets();
  }, []);
  return <h1>All Tickets</h1>;
};

export default App;
