import './(db)';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import Button from '@mui/material/Button';

// import { Ui } from '@b2b-tickets/ui';
// import { GlobalStyles } from '@b2b-tickets/ui';

export default function Index() {
  /*
   * Replace the elements below with your own.
   *
   * Note: The corresponding styles are in the ./index.tailwind file.
   */
  return (
    <Container>
      {/* <GlobalStyles /> */}
      <Typography
        variant="h1"
        component="h1"
        marginTop={2}
        textAlign={'center'}
      >
        B2B Tickets Home Page
      </Typography>

      <Box marginTop={3} padding={3}>
        {/* <Ui /> */}
        <Typography variant="h3" component="h3" marginBottom={2}>
          Available Pages
        </Typography>
        <Link href="/tickets" className="text-blue-500">
          <Button
            variant="contained"
            color="primary"
            sx={{ mt: 2, letterSpacing: '2px' }}
          >
            Tickets Page
          </Button>
          {/* 1. Show All Tickets{' '} */}
        </Link>
      </Box>
    </Container>
  );
}
