import * as React from 'react';
import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';

export default function Loading() {
  return (
    <div style={{ marginTop: '-4px' }}>
      <LinearProgress />
    </div>
  );
}
