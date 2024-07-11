import './(db)';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import Button from '@mui/material/Button';
export default function Index() {
  /*
   * Replace the elements below with your own.
   *
   * Note: The corresponding styles are in the ./index.tailwind file.
   */
  return (
    <Container>
      <Typography
        variant="h1"
        component="h1"
        marginTop={2}
        textAlign={'center'}
      >
        B2B Tickets Home Page
      </Typography>

      <Box marginTop={3} padding={3}>
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
