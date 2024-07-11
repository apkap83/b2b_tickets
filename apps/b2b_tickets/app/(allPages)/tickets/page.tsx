'use client';
import React, { useEffect } from 'react';
import Stack from '@mui/material/Stack';
import {
  Box,
  Button,
  IconButton,
  Typography,
  useTheme,
  Paper,
  Container,
} from '@mui/material';
import clsx from 'clsx';

import { getAllTickets } from '@/app/lib/actions';
import ThemeToggle from '@/b2b_tickets_app/components/ThemeToggle';
import { ColorModeContext, tokens } from '@/b2b_tickets_app/theme';

const App: React.FC = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  useEffect(() => {
    const getTickets = async () => {
      const tickets = await getAllTickets();
    };

    getTickets();
  }, []);
  return (
    <Container>
      <Paper elevation={6}>
        <Box>
          <Box sx={{ m: 3, p: 3 }}>
            <Typography variant="h3" className="text-slate-50">
              Hello
            </Typography>
            <Typography sx={{ mt: 2 }}>
              Lorem ipsum dolor, sit amet consectetur adipisicing elit.
              Reiciendis quaerat a id nostrum! Modi quibusdam delectus,
              repellat, quidem assumenda aliquam error repudiandae vero itaque
              facilis alias dolores quis, mollitia voluptatibus!
            </Typography>
            <Button variant="contained" color="primary" sx={{ mt: 2 }}>
              Learn more
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default App;
