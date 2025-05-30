import { test, expect, Page } from '@playwright/test';
import { setupTestEnvironment } from './mock-helper';

// Mock data for ticket creation
const mockTicketData = {
  title: 'Test Connectivity Issue',
  description: 'Unable to connect to service X from location Y',
  severity: 'High',
  category: 'Network',
  serviceType: 'Internet Access',
  contactPerson: 'John Doe',
  contactPhone: '1234567890',
  equipmentId: 'EQ12345',
  sid: 'SID98765',
  cid: 'CID54321',
  username: 'user123',
  cliValue: '2107654321'
};

/**
 * Helper function to setup auth for ticket creator
 */
async function setupTicketCreatorAuth(page: Page) {
  // Mock the authentication API
  await page.route('**/api/auth/signin', async (route) => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify({ 
        user: { 
          id: 1,
          name: 'Test User',
          email: 'test@example.com',
          role: 'B2B Ticket Creator',
          permissions: ['Create New Ticket', 'Tickets Page']
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
          id: 1,
          name: 'Test User',
          email: 'test@example.com',
          role: 'B2B Ticket Creator',
          permissions: ['Create New Ticket', 'Tickets Page']
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      })
    });
  });

  // Mock the categories API
  await page.route('**/api/tickets/categories', async (route) => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify([
        { category_id: '1', Category: 'Network' },
        { category_id: '2', Category: 'Voice' },
        { category_id: '3', Category: 'Security' }
      ])
    });
  });

  // Mock the service types API
  await page.route('**/api/tickets/service-types**', async (route) => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify([
        { category_service_type_id: '1', service_type_id: '1', service_type_name: 'Internet Access' },
        { category_service_type_id: '2', service_type_id: '2', service_type_name: 'WAN' },
        { category_service_type_id: '3', service_type_id: '3', service_type_name: 'LAN' }
      ])
    });
  });

  // Mock the severity levels API
  await page.route('**/api/tickets/severity-levels', async (route) => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify([
        { severity_id: '1', severity: 'Low' },
        { severity_id: '2', severity: 'Medium' },
        { severity_id: '3', severity: 'High' }
      ])
    });
  });

  // Mock create ticket API
  await page.route('**/api/tickets/create', async (route) => {
    await route.fulfill({
      status: 201,
      body: JSON.stringify({ 
        ticket_id: '12345',
        Ticket: 'TKT-12345',
        Title: mockTicketData.title,
        Status: 'New',
        Severity: mockTicketData.severity
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

test.describe('Ticket Creation Flow', () => {
  // For tests that can use mocks
  test.describe('Mock Tests', () => {
    test.beforeEach(async ({ page }) => {
      await setupTestEnvironment(page);
    });

    test('should have ticket creation button on tickets page', async ({ page }) => {
      // Navigate to tickets page
      await page.goto('/tickets');
      
      // Mock tickets list data
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
      
      // Verify create ticket button is visible
      const createButton = page.getByRole('button', { name: /create ticket/i, exact: false });
      await expect(createButton).toBeVisible();
    });
    
    test('should open create ticket modal when button is clicked', async ({ page }) => {
      // Navigate to tickets page
      await page.goto('/tickets');
      
      // Mock tickets list data
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
      
      // Click create ticket button
      await page.getByRole('button', { name: /create ticket/i, exact: false }).click();
      
      // Verify modal appears
      const modal = page.getByRole('dialog');
      await expect(modal).toBeVisible();
      
      // Verify modal title
      const modalTitle = page.getByText('Create New Ticket');
      await expect(modalTitle).toBeVisible();
    });
    
    test('should have all required fields in the create ticket form', async ({ page }) => {
      // Navigate to tickets page
      await page.goto('/tickets');
      
      // Mock tickets list data
      await page.route('**/api/tickets**', async (route) => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ 
            pageData: [],
            totalRows: 0
          })
        });
      });
      
      // Click create ticket button
      await page.getByRole('button', { name: /create ticket/i, exact: false }).click();
      
      // Verify form fields are visible
      await expect(page.getByLabel(/title/i)).toBeVisible();
      await expect(page.getByLabel(/description/i)).toBeVisible();
      await expect(page.getByLabel(/severity/i)).toBeVisible();
      await expect(page.getByLabel(/category/i)).toBeVisible();
      await expect(page.getByLabel(/service type/i)).toBeVisible();
      await expect(page.getByLabel(/contact person/i)).toBeVisible();
      await expect(page.getByLabel(/contact phone/i)).toBeVisible();
      
      // Verify submit button is visible
      await expect(page.getByRole('button', { name: /submit/i })).toBeVisible();
    });
    
    test('should display validation errors for empty required fields', async ({ page }) => {
      // Navigate to tickets page
      await page.goto('/tickets');
      
      // Mock tickets list data
      await page.route('**/api/tickets**', async (route) => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ 
            pageData: [],
            totalRows: 0
          })
        });
      });
      
      // Click create ticket button
      await page.getByRole('button', { name: /create ticket/i, exact: false }).click();
      
      // Submit without filling any fields
      await page.getByRole('button', { name: /submit/i }).click();
      
      // Verify validation errors
      await expect(page.getByText('Title is required')).toBeVisible();
      await expect(page.getByText('Description is required')).toBeVisible();
      await expect(page.getByText('Contact person is required')).toBeVisible();
      await expect(page.getByText('Contact phone is required')).toBeVisible();
    });
    
    test('should create a ticket successfully', async ({ page }) => {
      // Navigate to tickets page
      await page.goto('/tickets');
      
      // Mock tickets list data
      await page.route('**/api/tickets**', async (route) => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ 
            pageData: [],
            totalRows: 0
          })
        });
      });
      
      // Click create ticket button
      await page.getByRole('button', { name: /create ticket/i, exact: false }).click();
      
      // Fill in the form
      await page.getByLabel(/title/i).fill(mockTicketData.title);
      await page.getByLabel(/description/i).fill(mockTicketData.description);
      await page.getByLabel(/severity/i).selectOption('High');
      await page.getByLabel(/category/i).selectOption('Network');
      await page.getByLabel(/service type/i).selectOption('Internet Access');
      await page.getByLabel(/contact person/i).fill(mockTicketData.contactPerson);
      await page.getByLabel(/contact phone/i).fill(mockTicketData.contactPhone);
      await page.getByLabel(/equipment/i).fill(mockTicketData.equipmentId);
      await page.getByLabel(/sid/i).fill(mockTicketData.sid);
      
      // Submit the form
      await page.getByRole('button', { name: /submit/i }).click();
      
      // Verify success message or ticket creation
      await expect(page.getByText(/ticket created successfully/i)).toBeVisible();
      
      // Verify ticket ID is displayed
      await expect(page.getByText(/TKT-12345/i)).toBeVisible();
    });
  });
});