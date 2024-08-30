import * as React from 'react';
import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';

export default function Loading() {
  //   return (
  //     <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 text-3xl">
  //       Loading...
  //     </div>
  //   );
  return (
    <Box sx={{ width: '100%', marginTop: '.1rem' }}>
      <LinearProgress />
    </Box>
  );
}
