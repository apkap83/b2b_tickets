import { test, expect, Page } from '@playwright/test';

// Mock ticket data for testing
const mockTickets = [
  {
    id: 1,
    title: 'Issue with login',
    status: 'Open',
    severity: 'High',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 2,
    title: 'Cannot access dashboard',
    status: 'In Progress',
    severity: 'Medium',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 3,
    title: 'Feature request: Dark mode',
    status: 'Open',
    severity: 'Low',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

// Setup authentication - this helper function logs in before tests
async function setupAuth(page: Page) {
  // Mock the authentication API
  await page.route('**/api/auth/signin', async (route) => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify({ 
        user: { 
          name: 'Test User',
          email: 'test@example.com',
          role: 'customer'
        }
      })
    });
  });

  // Mock the session API
  await page.route('**/api/auth/session', async (route) => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify({ 
        user: { 
          name: 'Test User',
          email: 'test@example.com',
          role: 'customer'
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      })
    });
  });

  // Go to sign in page
  await page.goto('/signin');
  
  // Fill in the login form
  await page.getByLabel('Email').fill('test@example.com');
  await page.getByLabel('Password').fill('password123');
  
  // Submit the form
  await page.getByRole('button', { name: 'Sign In' }).click();
  
  // Wait for navigation to complete
  await page.waitForURL('/**/');
}

test.describe('Tickets List Page', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the ticket API response
    await page.route('**/api/tickets**', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ 
          pageData: mockTickets,
          totalRows: mockTickets.length
        })
      });
    });

    // Log in before each test
    await setupAuth(page);
    
    // Navigate to tickets page
    await page.goto('/tickets');
  });

  test('should display the tickets list page', async ({ page }) => {
    // Verify page title or heading
    await expect(page.getByRole('heading', { name: /tickets/i, exact: false })).toBeVisible();
    
    // Check if the tickets table is visible
    const ticketsTable = page.locator('table');
    await expect(ticketsTable).toBeVisible();
  });

  test('should display all tickets in the list', async ({ page }) => {
    // Check if all mock tickets are displayed
    for (const ticket of mockTickets) {
      await expect(page.getByText(ticket.title)).toBeVisible();
    }
  });

  test('should be able to filter tickets', async ({ page }) => {
    // Mock filtered response
    await page.route('**/api/tickets?status=Open**', async (route) => {
      const filteredTickets = mockTickets.filter(t => t.status === 'Open');
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ 
          pageData: filteredTickets,
          totalRows: filteredTickets.length
        })
      });
    });

    // Click on filter button
    await page.getByRole('button', { name: /filter/i }).click();
    
    // Select "Open" status filter
    await page.getByText('Open').click();
    
    // Apply filter
    await page.getByRole('button', { name: /apply/i }).click();
    
    // Check that only open tickets are displayed
    await expect(page.getByText('Issue with login')).toBeVisible();
    await expect(page.getByText('Feature request: Dark mode')).toBeVisible();
    await expect(page.getByText('Cannot access dashboard')).not.toBeVisible();
  });

  test('should be able to search for tickets', async ({ page }) => {
    // Mock search response
    await page.route('**/api/tickets?query=login**', async (route) => {
      const searchResults = mockTickets.filter(t => t.title.includes('login'));
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ 
          pageData: searchResults,
          totalRows: searchResults.length
        })
      });
    });

    // Enter search query
    await page.getByPlaceholder(/search/i).fill('login');
    
    // Press Enter to search
    await page.keyboard.press('Enter');
    
    // Check search results
    await expect(page.getByText('Issue with login')).toBeVisible();
    await expect(page.getByText('Cannot access dashboard')).not.toBeVisible();
    await expect(page.getByText('Feature request: Dark mode')).not.toBeVisible();
  });

  test('should be able to navigate to ticket details', async ({ page }) => {
    // Mock the ticket detail API
    await page.route('**/api/tickets/1', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify(mockTickets[0])
      });
    });

    // Click on the first ticket
    await page.getByText('Issue with login').click();
    
    // Verify navigation to ticket details page
    await expect(page).toHaveURL(/.*\/ticket\/1/);
    
    // Verify ticket details are displayed
    await expect(page.getByText('Issue with login')).toBeVisible();
    await expect(page.getByText('High')).toBeVisible();
  });

  test('should display the create ticket button', async ({ page }) => {
    // Check if create ticket button is visible
    const createButton = page.getByRole('button', { name: /create ticket/i });
    await expect(createButton).toBeVisible();
  });

  test('should be able to create a new ticket', async ({ page }) => {
    // Mock the create ticket API
    await page.route('**/api/tickets/create', async (route) => {
      await route.fulfill({
        status: 201,
        body: JSON.stringify({ 
          id: 4,
          title: 'New Test Ticket',
          status: 'Open',
          severity: 'Medium'
        })
      });
    });

    // Click create ticket button
    await page.getByRole('button', { name: /create ticket/i }).click();
    
    // Verify modal appears
    await expect(page.getByRole('dialog')).toBeVisible();
    
    // Fill in the form
    await page.getByLabel(/title/i).fill('New Test Ticket');
    await page.getByLabel(/description/i).fill('This is a test ticket created by automation');
    await page.getByLabel(/severity/i).selectOption('Medium');
    
    // Submit the form
    await page.getByRole('button', { name: /submit/i }).click();
    
    // Verify success message
    await expect(page.getByText(/ticket created successfully/i)).toBeVisible();
  });

  test('should handle pagination correctly', async ({ page }) => {
    // Create large mock data set for pagination
    const manyTickets = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      title: `Ticket ${i + 1}`,
      status: i % 2 === 0 ? 'Open' : 'In Progress',
      severity: i % 3 === 0 ? 'High' : i % 3 === 1 ? 'Medium' : 'Low',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    // Mock first page
    await page.route('**/api/tickets?page=1**', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ 
          pageData: manyTickets.slice(0, 10), // First 10 tickets
          totalRows: manyTickets.length
        })
      });
    });

    // Mock second page
    await page.route('**/api/tickets?page=2**', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ 
          pageData: manyTickets.slice(10, 20), // Next 10 tickets
          totalRows: manyTickets.length
        })
      });
    });

    // Verify first page content
    await expect(page.getByText('Ticket 1')).toBeVisible();
    await expect(page.getByText('Ticket 10')).toBeVisible();
    
    // Go to next page
    await page.getByRole('button', { name: /next/i }).click();
    
    // Verify second page content
    await expect(page.getByText('Ticket 11')).toBeVisible();
    await expect(page.getByText('Ticket 20')).toBeVisible();
    await expect(page.getByText('Ticket 1')).not.toBeVisible();
  });
});