import { test, expect, Page } from '@playwright/test';
import { setupTestEnvironment } from './mock-helper';

// Mock user data
const mockUser = {
  id: 1,
  name: 'Test User',
  email: 'test@example.com',
  userName: 'testuser',
  firstName: 'Test',
  lastName: 'User',
  roles: ['B2B Ticket Creator'],
  permissions: ['Tickets_Page', 'Create_New_Ticket']
};

// Create large dataset for testing pagination and filtering
function generateMockTickets(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    ticket_id: `${i + 1}`,
    Ticket: `TKT-${10000 + i}`,
    Title: `Test Ticket ${i + 1}`,
    Description: `This is test ticket number ${i + 1}`,
    Status: i % 4 === 0 ? 'New' : i % 4 === 1 ? 'Working' : i % 4 === 2 ? 'Closed' : 'Cancelled',
    Severity: i % 3 === 0 ? 'High' : i % 3 === 1 ? 'Medium' : 'Low',
    Customer: `Customer ${Math.floor(i / 10) + 1}`,
    'Cust. Type': i % 2 === 0 ? 'Business' : 'Enterprise',
    'Opened By': i % 5 === 0 ? 'John Doe' : i % 5 === 1 ? 'Jane Smith' : i % 5 === 2 ? 'Bob Johnson' : i % 5 === 3 ? 'Alice Brown' : 'Tom Wilson',
    createdAt: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)).toISOString(), // Days ago
    updatedAt: new Date(Date.now() - (i * 12 * 60 * 60 * 1000)).toISOString() // Half days ago
  }));
}

/**
 * Helper function to set up auth
 */
async function setupAuth(page: Page) {
  // Mock the authentication API
  await page.route('**/api/auth/signin', async (route) => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify({ user: mockUser })
    });
  });

  // Mock the session API
  await page.route('**/api/auth/session', async (route) => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify({ 
        user: mockUser,
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

// Helper function to measure load time
async function measureLoadTime(action: () => Promise<void>): Promise<number> {
  const startTime = Date.now();
  await action();
  return Date.now() - startTime;
}

test.describe('Performance Tests', () => {
  test.describe('Mock Tests', () => {
    test.beforeEach(async ({ page }) => {
      await setupTestEnvironment(page);
    });

    test('should paginate through large dataset efficiently', async ({ page }) => {
      // Create large dataset of 100 tickets
      const allTickets = generateMockTickets(100);
      const pageSize = 10; // Tickets per page
      
      // Set up auth
      await page.route('**/api/auth/session', async (route) => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ 
            user: mockUser,
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          })
        });
      });
      
      // Mock first page of tickets
      await page.route('**/api/tickets?page=1**', async (route) => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ 
            pageData: allTickets.slice(0, pageSize),
            totalRows: allTickets.length
          })
        });
      });
      
      // Navigate to tickets page
      await page.goto('/tickets');
      
      // Verify first page loaded
      await expect(page.getByText('TKT-10000')).toBeVisible();
      await expect(page.getByText('TKT-10009')).toBeVisible();
      
      // Mock second page
      await page.route('**/api/tickets?page=2**', async (route) => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ 
            pageData: allTickets.slice(pageSize, pageSize * 2),
            totalRows: allTickets.length
          })
        });
      });
      
      // Measure time to load second page
      const pageLoadTime = await measureLoadTime(async () => {
        // Navigate to second page
        await page.getByRole('button', { name: /next/i }).click();
        
        // Wait for second page to load
        await expect(page.getByText('TKT-10010')).toBeVisible();
      });
      
      // Assert that page load time is acceptable (under 2000ms for mock data)
      expect(pageLoadTime).toBeLessThan(2000);
      
      // Verify second page data
      await expect(page.getByText('TKT-10010')).toBeVisible();
      await expect(page.getByText('TKT-10019')).toBeVisible();
      
      // Mock last page
      const lastPage = Math.ceil(allTickets.length / pageSize);
      await page.route(`**/api/tickets?page=${lastPage}**`, async (route) => {
        const startIndex = (lastPage - 1) * pageSize;
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ 
            pageData: allTickets.slice(startIndex),
            totalRows: allTickets.length
          })
        });
      });
      
      // Measure time to load last page
      const lastPageLoadTime = await measureLoadTime(async () => {
        // Navigate to last page
        await page.getByRole('button', { name: new RegExp(`${lastPage}`) }).click();
        
        // Wait for last page to load
        await expect(page.getByText(`TKT-${10000 + (lastPage - 1) * pageSize}`)).toBeVisible();
      });
      
      // Assert that last page load time is acceptable
      expect(lastPageLoadTime).toBeLessThan(2000);
    });

    test('should filter large dataset efficiently', async ({ page }) => {
      // Create large dataset of 100 tickets
      const allTickets = generateMockTickets(100);
      
      // Set up auth
      await page.route('**/api/auth/session', async (route) => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ 
            user: mockUser,
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          })
        });
      });
      
      // Mock initial tickets data
      await page.route('**/api/tickets**', async (route) => {
        const url = route.request().url();
        
        // Default response for main tickets page
        if (!url.includes('query=') && !url.includes('status=')) {
          await route.fulfill({
            status: 200,
            body: JSON.stringify({ 
              pageData: allTickets.slice(0, 10),
              totalRows: allTickets.length
            })
          });
          return;
        }
        
        // Let other specific routes be handled separately
        await route.continue();
      });
      
      // Navigate to tickets page
      await page.goto('/tickets');
      
      // Mock search results
      const searchQuery = 'Ticket 5';
      const searchResults = allTickets.filter(t => t.Title.includes(searchQuery));
      
      await page.route(`**/api/tickets?query=${encodeURIComponent(searchQuery)}**`, async (route) => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ 
            pageData: searchResults.slice(0, 10),
            totalRows: searchResults.length
          })
        });
      });
      
      // Measure search performance
      const searchTime = await measureLoadTime(async () => {
        // Perform search
        await page.getByPlaceholder(/search/i).fill(searchQuery);
        await page.keyboard.press('Enter');
        
        // Wait for search results
        await expect(page.getByText('Ticket 5')).toBeVisible();
      });
      
      // Assert that search time is acceptable (under 2000ms for mock data)
      expect(searchTime).toBeLessThan(2000);
      
      // Mock filter results
      const filterStatus = 'New';
      const filteredTickets = allTickets.filter(t => t.Status === filterStatus);
      
      await page.route(`**/api/tickets?status=${filterStatus}**`, async (route) => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ 
            pageData: filteredTickets.slice(0, 10),
            totalRows: filteredTickets.length
          })
        });
      });
      
      // Measure filter performance
      const filterTime = await measureLoadTime(async () => {
        // Apply filter
        await page.getByRole('button', { name: /filter/i }).click();
        await page.getByText(filterStatus).click();
        await page.getByRole('button', { name: /apply/i }).click();
        
        // Wait for filtered results
        await expect(page.getByText('Status')).toBeVisible();
      });
      
      // Assert that filter time is acceptable
      expect(filterTime).toBeLessThan(2000);
    });

    test('should handle rendering large data tables efficiently', async ({ page }) => {
      // Create large dataset with 50 tickets for a single page
      const largePageData = generateMockTickets(50);
      
      // Set up auth
      await page.route('**/api/auth/session', async (route) => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ 
            user: mockUser,
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          })
        });
      });
      
      // Mock tickets with large page size
      await page.route('**/api/tickets**', async (route) => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ 
            pageData: largePageData,
            totalRows: largePageData.length
          })
        });
      });
      
      // Measure large table render time
      const renderTime = await measureLoadTime(async () => {
        // Navigate to tickets page
        await page.goto('/tickets');
        
        // Wait for table to render completely (check for last item)
        await expect(page.getByText(`TKT-${10000 + largePageData.length - 1}`)).toBeVisible();
      });
      
      // Assert that render time is acceptable for large dataset (under 3000ms)
      expect(renderTime).toBeLessThan(3000);
      
      // Verify scrolling performance by measuring time to scroll to bottom
      const scrollTime = await measureLoadTime(async () => {
        // Scroll to bottom of page
        await page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });
        
        // Wait for a moment to ensure scrolling completed
        await page.waitForTimeout(300);
      });
      
      // Assert that scroll time is acceptable
      expect(scrollTime).toBeLessThan(1000);
    });

    test('should load ticket details efficiently', async ({ page }) => {
      // Create mock ticket with many comments
      const ticketId = '12345';
      const ticketComments = Array.from({ length: 30 }, (_, i) => ({
        comment_id: `${i + 1}`,
        ticket_id: ticketId,
        'Ticket Number': `TKT-${ticketId}`,
        'Comment Date': new Date(Date.now() - (i * 24 * 60 * 60 * 1000)),
        Username: i % 2 === 0 ? 'testuser' : 'supportuser',
        'First Name': i % 2 === 0 ? 'Test' : 'Support',
        'Last Name': i % 2 === 0 ? 'User' : 'Agent',
        user_customer_id: i % 2 === 0 ? '1' : '2',
        'User Customer Name': i % 2 === 0 ? 'Test Customer' : 'Support Team',
        Comment: `This is comment number ${i + 1} for the ticket. Adding some more text to make it longer and test rendering performance with substantial content.`,
        is_closure: i === 0 ? 'y' : 'n',
        by_system: 'n',
        escalation_level: i % 10 === 0 ? '1' : null
      }));
      
      // Set up auth
      await page.route('**/api/auth/session', async (route) => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ 
            user: mockUser,
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          })
        });
      });
      
      // Mock ticket details API
      await page.route(`**/api/tickets/${ticketId}`, async (route) => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({
            ticket_id: ticketId,
            Ticket: `TKT-${ticketId}`,
            Title: 'Test Performance Ticket',
            Description: 'This is a test ticket for measuring performance of ticket details page rendering.',
            Status: 'Open',
            Severity: 'High',
            Customer: 'Test Customer',
            comments: ticketComments
          })
        });
      });
      
      // Measure ticket details page load time
      const detailsLoadTime = await measureLoadTime(async () => {
        // Navigate to ticket details page
        await page.goto(`/ticket/${ticketId}`);
        
        // Wait for main ticket details to load
        await expect(page.getByText('Test Performance Ticket')).toBeVisible();
        
        // Wait for comments to load
        await expect(page.getByText('This is comment number 1')).toBeVisible();
      });
      
      // Assert that details load time is acceptable
      expect(detailsLoadTime).toBeLessThan(3000);
      
      // Measure time to load all comments (scroll down to see more)
      const commentsLoadTime = await measureLoadTime(async () => {
        // Scroll down to see more comments
        await page.evaluate(() => {
          const commentsSection = document.querySelector('.comments-section') || document.body;
          commentsSection.scrollTo(0, commentsSection.scrollHeight);
        });
        
        // Wait for last comment to be visible
        await expect(page.getByText(`This is comment number ${ticketComments.length}`)).toBeVisible();
      });
      
      // Assert that comments load time is acceptable
      expect(commentsLoadTime).toBeLessThan(2000);
    });

    test('should handle ticket creation form efficiently', async ({ page }) => {
      // Set up auth
      await page.route('**/api/auth/session', async (route) => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ 
            user: mockUser,
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          })
        });
      });
      
      // Mock tickets list
      await page.route('**/api/tickets**', async (route) => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ 
            pageData: generateMockTickets(10),
            totalRows: 10
          })
        });
      });
      
      // Mock categories and service types for form
      await page.route('**/api/tickets/categories', async (route) => {
        // Create a large list of categories to test dropdown performance
        const categories = Array.from({ length: 50 }, (_, i) => ({
          category_id: `${i + 1}`,
          Category: `Category ${i + 1}`
        }));
        
        await route.fulfill({
          status: 200,
          body: JSON.stringify(categories)
        });
      });
      
      await page.route('**/api/tickets/service-types**', async (route) => {
        // Create a large list of service types
        const serviceTypes = Array.from({ length: 100 }, (_, i) => ({
          category_service_type_id: `${i + 1}`,
          service_type_id: `${i + 1}`,
          service_type_name: `Service Type ${i + 1}`
        }));
        
        await route.fulfill({
          status: 200,
          body: JSON.stringify(serviceTypes)
        });
      });
      
      // Measure time to open ticket creation form
      const formOpenTime = await measureLoadTime(async () => {
        // Navigate to tickets page
        await page.goto('/tickets');
        
        // Click create ticket button
        await page.getByRole('button', { name: /create ticket/i, exact: false }).click();
        
        // Wait for form to appear
        await expect(page.getByRole('dialog')).toBeVisible();
        await expect(page.getByLabel(/title/i)).toBeVisible();
      });
      
      // Assert that form opens quickly
      expect(formOpenTime).toBeLessThan(2000);
      
      // Measure dropdown rendering performance
      const dropdownRenderTime = await measureLoadTime(async () => {
        // Click to open category dropdown
        await page.getByLabel(/category/i).click();
        
        // Wait for dropdown options to appear
        await expect(page.getByText('Category 50')).toBeVisible();
      });
      
      // Assert that dropdown renders quickly despite large number of options
      expect(dropdownRenderTime).toBeLessThan(1500);
      
      // Mock ticket creation API
      await page.route('**/api/tickets/create', async (route) => {
        await route.fulfill({
          status: 201,
          body: JSON.stringify({ 
            ticket_id: '12345',
            Ticket: 'TKT-12345',
            Title: 'Performance Test Ticket',
            Status: 'New'
          })
        });
      });
      
      // Measure form submission performance
      const formSubmitTime = await measureLoadTime(async () => {
        // Fill in the form
        await page.getByLabel(/title/i).fill('Performance Test Ticket');
        await page.getByLabel(/description/i).fill('This is a test for measuring form submission performance');
        await page.getByLabel(/category/i).selectOption('Category 1');
        await page.getByLabel(/service type/i).selectOption('Service Type 1');
        await page.getByLabel(/severity/i).selectOption('High');
        await page.getByLabel(/contact person/i).fill('Test Contact');
        await page.getByLabel(/contact phone/i).fill('1234567890');
        
        // Submit the form
        await page.getByRole('button', { name: /submit/i }).click();
        
        // Wait for success message
        await expect(page.getByText(/ticket created successfully/i)).toBeVisible();
      });
      
      // Assert that form submission is quick
      expect(formSubmitTime).toBeLessThan(2500);
    });
  });
});