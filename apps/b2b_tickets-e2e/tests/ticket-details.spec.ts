import { test, expect, Page } from '@playwright/test';

// Mock ticket detail data
const mockTicketDetail = {
  id: 123,
  title: 'Network connectivity issue',
  description: 'Unable to connect to the VPN service from the branch office',
  status: 'In Progress',
  severity: 'High',
  createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
  updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
  createdBy: {
    id: 1,
    name: 'Jane Smith',
    email: 'jane.smith@example.com'
  },
  assignedTo: {
    id: 2,
    name: 'John Tech',
    email: 'john.tech@example.com'
  },
  comments: [
    {
      id: 1,
      content: 'Initial investigation shows the router might be misconfigured',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      user: {
        id: 2,
        name: 'John Tech',
        email: 'john.tech@example.com'
      }
    },
    {
      id: 2,
      content: 'Have you tried restarting the router?',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      user: {
        id: 2,
        name: 'John Tech',
        email: 'john.tech@example.com'
      }
    },
    {
      id: 3,
      content: 'Yes, restarting did not help. The issue persists.',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      user: {
        id: 1,
        name: 'Jane Smith',
        email: 'jane.smith@example.com'
      }
    }
  ]
};

// Setup authentication helper
async function setupAuth(page: Page) {
  // Mock authentication APIs
  await page.route('**/api/auth/signin', async (route) => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify({ 
        user: { 
          id: 1,
          name: 'Jane Smith',
          email: 'jane.smith@example.com',
          role: 'customer'
        }
      })
    });
  });

  await page.route('**/api/auth/session', async (route) => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify({ 
        user: { 
          id: 1,
          name: 'Jane Smith',
          email: 'jane.smith@example.com',
          role: 'customer'
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      })
    });
  });

  // Log in
  await page.goto('/signin');
  await page.getByLabel('Email').fill('jane.smith@example.com');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL('/**/');
}

test.describe('Ticket Details Page', () => {
  test.beforeEach(async ({ page }) => {
    // Set up authentication
    await setupAuth(page);
    
    // Mock the ticket detail API
    await page.route(`**/api/tickets/123`, async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify(mockTicketDetail)
      });
    });
    
    // Navigate to ticket details page
    await page.goto('/ticket/123');
  });

  test('should display ticket details correctly', async ({ page }) => {
    // Check basic ticket information
    await expect(page.getByText('Network connectivity issue')).toBeVisible();
    await expect(page.getByText('Unable to connect to the VPN service from the branch office')).toBeVisible();
    await expect(page.getByText('High')).toBeVisible();
    await expect(page.getByText('In Progress')).toBeVisible();
    
    // Check creator and assignee information
    await expect(page.getByText('Jane Smith')).toBeVisible();
    await expect(page.getByText('John Tech')).toBeVisible();
  });

  test('should display all comments', async ({ page }) => {
    // Check if all comments are visible
    for (const comment of mockTicketDetail.comments) {
      await expect(page.getByText(comment.content)).toBeVisible();
      await expect(page.getByText(comment.user.name)).toBeVisible();
    }
  });

  test('should be able to add a new comment', async ({ page }) => {
    // Mock the add comment API
    await page.route('**/api/tickets/123/comments', async (route) => {
      const newComment = {
        id: 4,
        content: 'This is a new test comment',
        createdAt: new Date().toISOString(),
        user: {
          id: 1,
          name: 'Jane Smith',
          email: 'jane.smith@example.com'
        }
      };
      
      // Add new comment to the list and return updated ticket
      const updatedTicket = {
        ...mockTicketDetail,
        comments: [...mockTicketDetail.comments, newComment]
      };
      
      await route.fulfill({
        status: 201,
        body: JSON.stringify(updatedTicket)
      });
    });

    // Type new comment
    await page.getByPlaceholder(/add comment/i).fill('This is a new test comment');
    
    // Submit comment
    await page.getByRole('button', { name: /submit/i }).click();
    
    // Verify new comment is visible
    await expect(page.getByText('This is a new test comment')).toBeVisible();
  });

  test('should be able to change ticket status', async ({ page }) => {
    // Mock the update ticket API
    await page.route('**/api/tickets/123', async (route) => {
      // Return updated ticket with new status
      const updatedTicket = {
        ...mockTicketDetail,
        status: 'Resolved'
      };
      
      await route.fulfill({
        status: 200,
        body: JSON.stringify(updatedTicket)
      });
    });

    // Open status dropdown
    await page.getByText('In Progress').click();
    
    // Select "Resolved" status
    await page.getByText('Resolved').click();
    
    // Verify status has changed
    await expect(page.getByText('Resolved')).toBeVisible();
    await expect(page.getByText('In Progress')).not.toBeVisible();
  });

  test('should be able to change ticket severity', async ({ page }) => {
    // Mock the update ticket API
    await page.route('**/api/tickets/123', async (route) => {
      // Return updated ticket with new severity
      const updatedTicket = {
        ...mockTicketDetail,
        severity: 'Medium'
      };
      
      await route.fulfill({
        status: 200,
        body: JSON.stringify(updatedTicket)
      });
    });

    // Open severity dropdown
    await page.getByText('High').click();
    
    // Select "Medium" severity
    await page.getByText('Medium').click();
    
    // Verify severity has changed
    await expect(page.getByText('Medium')).toBeVisible();
    await expect(page.getByText('High')).not.toBeVisible();
  });

  test('should be able to escalate a ticket', async ({ page }) => {
    // Mock the escalate ticket API
    await page.route('**/api/tickets/123/escalate', async (route) => {
      // Return updated ticket with escalation status
      const updatedTicket = {
        ...mockTicketDetail,
        isEscalated: true,
        escalationReason: 'Need urgent attention from higher tier'
      };
      
      await route.fulfill({
        status: 200,
        body: JSON.stringify(updatedTicket)
      });
    });

    // Click escalate button
    await page.getByRole('button', { name: /escalate/i }).click();
    
    // Fill in escalation reason
    await page.getByLabel(/reason/i).fill('Need urgent attention from higher tier');
    
    // Submit escalation
    await page.getByRole('button', { name: /confirm/i }).click();
    
    // Verify escalation status
    await expect(page.getByText(/escalated/i)).toBeVisible();
    await expect(page.getByText('Need urgent attention from higher tier')).toBeVisible();
  });

  test('should show ticket history timeline', async ({ page }) => {
    // Check if the timeline section is visible
    await expect(page.getByText(/timeline/i)).toBeVisible();
    
    // Verify timeline events
    await expect(page.getByText(/ticket created/i)).toBeVisible();
    await expect(page.getByText(/comment added/i)).toBeVisible();
    await expect(page.getByText(/status changed/i)).toBeVisible();
  });

  test('should navigate back to tickets list', async ({ page }) => {
    // Mock the tickets list API
    await page.route('**/api/tickets**', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ 
          pageData: [mockTicketDetail],
          totalRows: 1
        })
      });
    });

    // Click back button
    await page.getByRole('button', { name: /back/i }).click();
    
    // Verify navigation to tickets list page
    await expect(page).toHaveURL(/.*\/tickets/);
  });

  test('should handle file attachments', async ({ page }) => {
    // Mock the file upload API
    await page.route('**/api/tickets/123/attachments', async (route) => {
      await route.fulfill({
        status: 201,
        body: JSON.stringify({ 
          id: 1,
          filename: 'test-file.pdf',
          url: 'https://example.com/test-file.pdf',
          uploadedBy: {
            id: 1,
            name: 'Jane Smith'
          },
          uploadedAt: new Date().toISOString()
        })
      });
    });

    // Click attach file button
    await page.getByRole('button', { name: /attach/i }).click();
    
    // Set file input (Note: This is a simplified approach - actual implementation may vary)
    await page.setInputFiles('input[type="file"]', {
      name: 'test-file.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('test file content'),
    });
    
    // Verify file was attached
    await expect(page.getByText('test-file.pdf')).toBeVisible();
  });
});