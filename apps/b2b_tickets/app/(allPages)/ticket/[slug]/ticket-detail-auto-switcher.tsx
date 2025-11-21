'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { switchUserCompany } from '@b2b-tickets/admin-server-actions';
import {
  CircularProgress,
  Box,
  Typography,
  Alert,
  Button,
  Container,
} from '@mui/material';

interface TicketDetailAutoSwitcherProps {
  ticketId: string;
  ticketCustomerId: number;
  ticketCompanyName: string;
  currentCustomerId: number;
}

export default function TicketDetailAutoSwitcher({
  ticketId,
  ticketCustomerId,
  ticketCompanyName,
  currentCustomerId,
}: TicketDetailAutoSwitcherProps) {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [switchError, setSwitchError] = useState<string | null>(null);

  useEffect(() => {
    async function handleCompanySwitch() {
      if (!session?.user) {
        setSwitchError('Session not available');
        return;
      }

      try {
        // Switch company on the server
        const result = await switchUserCompany(ticketCustomerId);

        if (result.success) {
          if ('customer_id' in result && 'customer_name' in result) {
            // Update the session
            await update({
              customer_id: result.customer_id,
              customer_name: result.customer_name,
            });
          }

          // Small delay to ensure session is updated
          await new Promise((resolve) => setTimeout(resolve, 400));

          // Refresh to reload with new company context
          router.refresh();
        } else {
          if ('error' in result) {
            setSwitchError(
              `Failed to switch to ${ticketCompanyName}: ${
                result?.error || 'Unknown error'
              }`
            );
          }
        }
      } catch (error) {
        console.error('Error switching company:', error);
        setSwitchError('An error occurred while switching companies');
      }
    }

    handleCompanySwitch();
  }, []); // Run once on mount

  if (switchError) {
    return (
      <Container
        maxWidth="xl"
        className="relative mt-[20px] mb-[64px] sm:mt-[96px]"
      >
        <Box p={3}>
          <Alert severity="error" sx={{ mb: 2 }}>
            {switchError}
          </Alert>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Ticket ID: {ticketId}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Required Company: {ticketCompanyName}
          </Typography>
          <Button variant="contained" onClick={() => router.push('/tickets')}>
            Go to Tickets List
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container
      maxWidth="xl"
      className="relative mt-[20px] mb-[64px] sm:mt-[96px]"
    >
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="400px"
        gap={2}
      >
        <CircularProgress size={60} />
        <Typography variant="h5">
          Switching to company {ticketCompanyName}...
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Loading ticket {ticketId}
        </Typography>
      </Box>
    </Container>
  );
}
