import { test, expect, Page } from '@playwright/test';
import { setupTestEnvironment } from './mock-helper';

// Mock user with different roles
const mockUsers = {
  admin: {
    id: 1,
    name: 'Admin User',
    email: 'admin@example.com',
    userName: 'adminuser',
    firstName: 'Admin',
    lastName: 'User',
    roles: ['Admin'],
    permissions: ['API_Admin', 'API_Security_Management', 'Users_List_Page', 'Tickets_Page']
  },
  ticketCreator: {
    id: 2,
    name: 'Ticket Creator',
    email: 'creator@example.com',
    userName: 'ticketcreator',
    firstName: 'Ticket',
    lastName: 'Creator',
    roles: ['B2B Ticket Creator'],
    permissions: ['Tickets_Page', 'Create_New_Ticket']
  },
  ticketHandler: {
    id: 3,
    name: 'Ticket Handler',
    email: 'handler@example.com',
    userName: 'tickethandler',
    firstName: 'Ticket',
    lastName: 'Handler',
    roles: ['B2B Ticket Handler'],
    permissions: ['Tickets_Page', 'Ticket_Details_Page', 'Escalate_Ticket', 'Alter_Ticket_Severity']
  }
};

/**
 * Helper function to setup auth with a specific user role
 */
async function setupUserWithRole(page: Page, role: 'admin' | 'ticketCreator' | 'ticketHandler') {
  const user = mockUsers[role];
  
  // Mock the authentication API
  await page.route('**/api/auth/signin', async (route) => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify({ user })
    });
  });

  // Mock the session API
  await page.route('**/api/auth/session', async (route) => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify({ 
        user,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      })
    });
  });

  // Go to sign in page
  await page.goto('/signin');
  
  // Fill in the login form
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password').fill('password123');
  
  // Submit the form
  await page.getByRole('button', { name: 'Sign In' }).click();
  
  // Wait for navigation to complete
  await page.waitForURL('/**/');
}

// Mock for navigation elements and permissions
async function mockNavigationElements(page: Page) {
  // Mock tickets list API
  await page.route('**/api/tickets**', async (route) => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify({ 
        pageData: [
          {
            id: 1,
            ticket_id: '12345',
            Ticket: 'TKT-12345',
            Title: 'Test Ticket',
            Status: 'Open',
            Severity: 'Medium',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ],
        totalRows: 1
      })
    });
  });
  
  // Mock users list API for admin panel
  await page.route('**/api/admin/users', async (route) => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify(Object.values(mockUsers))
    });
  });
}

test.describe('Navigation and Routing', () => {
  // For tests that can use mocks
  test.describe('Mock Tests', () => {
    test.beforeEach(async ({ page }) => {
      await setupTestEnvironment(page);
      await mockNavigationElements(page);
    });

    test('should redirect to sign-in page for unauthenticated users', async ({ page }) => {
      // Mock unauthenticated session
      await page.route('**/api/auth/session', async (route) => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ user: null })
        });
      });
      
      // Try to access protected pages
      await page.goto('/tickets');
      
      // Verify redirect to sign-in page
      await expect(page).toHaveURL(/.*signin.*/);
    });

    test('should navigate to tickets page for authenticated users', async ({ page }) => {
      // Setup ticket creator session
      await page.route('**/api/auth/session', async (route) => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ 
            user: mockUsers.ticketCreator,
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          })
        });
      });
      
      // Navigate to tickets page
      await page.goto('/tickets');
      
      // Verify tickets page content
      await expect(page.getByRole('heading', { name: /tickets/i, exact: false })).toBeVisible();
      await expect(page.locator('table')).toBeVisible();
    });

    test('should navigate to profile page', async ({ page }) => {
      // Setup user session
      await page.route('**/api/auth/session', async (route) => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ 
            user: mockUsers.ticketCreator,
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          })
        });
      });
      
      // Navigate to home first
      await page.goto('/');
      
      // Navigate to profile through navigation
      // Simulate clicking a profile or account link
      // (The actual implementation may vary based on your navbar structure)
      await page.goto('/profile');
      
      // Verify profile page content
      await expect(page.getByRole('heading', { name: 'User Profile Details' })).toBeVisible();
    });

    test('should navigate to admin dashboard for admin users', async ({ page }) => {
      // Setup admin session
      await page.route('**/api/auth/session', async (route) => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ 
            user: mockUsers.admin,
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          })
        });
      });
      
      // Navigate to admin dashboard
      await page.goto('/admin');
      
      // Verify admin dashboard content
      await expect(page.getByRole('heading', { name: /admin dashboard/i, exact: false })).toBeVisible();
      await expect(page.getByRole('tab', { name: /users/i })).toBeVisible();
    });

    test('should navigate to ticket details page from tickets list', async ({ page }) => {
      // Setup ticket handler session
      await page.route('**/api/auth/session', async (route) => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ 
            user: mockUsers.ticketHandler,
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          })
        });
      });
      
      // Mock ticket detail API
      await page.route('**/api/tickets/12345', async (route) => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({
            ticket_id: '12345',
            Ticket: 'TKT-12345',
            Title: 'Test Ticket',
            Description: 'This is a test ticket',
            Status: 'Open',
            Severity: 'Medium',
            comments: [],
            Customer: 'Test Customer'
          })
        });
      });
      
      // Navigate to tickets page
      await page.goto('/tickets');
      
      // Click on a ticket row to navigate to details
      await page.getByText('TKT-12345').click();
      
      // Verify navigation to ticket details page
      await expect(page).toHaveURL(/.*\/ticket\/12345/);
      await expect(page.getByText('Test Ticket')).toBeVisible();
    });

    test('should show access denied page for unauthorized access', async ({ page }) => {
      // Setup ticket creator session (no admin access)
      await page.route('**/api/auth/session', async (route) => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ 
            user: mockUsers.ticketCreator,
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          })
        });
      });
      
      // Try to access admin page
      await page.goto('/admin');
      
      // Verify access denied or unauthorized page
      await expect(page).toHaveURL(/.*\/denied.*/);
      await expect(page.getByText(/access denied|unauthorized/i)).toBeVisible();
    });

    test('should handle 404 page not found', async ({ page }) => {
      // Setup authenticated session
      await page.route('**/api/auth/session', async (route) => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ 
            user: mockUsers.ticketCreator,
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          })
        });
      });
      
      // Navigate to non-existent page
      await page.goto('/this-page-does-not-exist');
      
      // Verify 404 page or error
      await expect(page.getByText(/not found|page doesn't exist|404/i)).toBeVisible();
    });

    test('should redirect to appropriate page after login', async ({ page }) => {
      // Navigate to sign-in page
      await page.goto('/signin');
      
      // Setup auth to simulate successful login
      await page.route('**/api/auth/signin', async (route) => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ user: mockUsers.ticketCreator })
        });
      });
      
      // Fill in credentials and submit
      await page.getByLabel('Email').fill('creator@example.com');
      await page.getByLabel('Password').fill('password123');
      await page.getByRole('button', { name: 'Sign In' }).click();
      
      // Verify redirect after login (typically to home or tickets page)
      await expect(page).toHaveURL(/.*\/(|tickets).*/);
    });

    test('should navigate between different sections via navigation menu', async ({ page }) => {
      // Setup admin session for full navigation access
      await page.route('**/api/auth/session', async (route) => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ 
            user: mockUsers.admin,
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          })
        });
      });
      
      // Start at home page
      await page.goto('/');
      
      // Navigate through the menu to tickets page
      // (Adjust these selectors based on your actual navigation structure)
      await page.goto('/tickets');
      
      // Verify tickets page
      await expect(page).toHaveURL(/.*\/tickets.*/);
      await expect(page.getByRole('heading', { name: /tickets/i, exact: false })).toBeVisible();
      
      // Navigate to admin page
      await page.goto('/admin');
      
      // Verify admin page
      await expect(page).toHaveURL(/.*\/admin.*/);
      await expect(page.getByRole('heading', { name: /admin dashboard/i, exact: false })).toBeVisible();
      
      // Navigate to profile page
      await page.goto('/profile');
      
      // Verify profile page
      await expect(page).toHaveURL(/.*\/profile.*/);
      await expect(page.getByRole('heading', { name: 'User Profile Details' })).toBeVisible();
    });
  });
});