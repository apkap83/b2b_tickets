import { test, expect, Page } from '@playwright/test';

// Mock users data
const mockUsers = [
  {
    id: 1,
    name: 'Admin User',
    email: 'admin@example.com',
    role: 'admin',
    active: true,
    locked: false,
    lastLogin: new Date().toISOString()
  },
  {
    id: 2,
    name: 'Support Agent',
    email: 'support@example.com',
    role: 'support',
    active: true,
    locked: false,
    lastLogin: new Date().toISOString()
  },
  {
    id: 3,
    name: 'Customer User',
    email: 'customer@example.com',
    role: 'customer',
    active: true,
    locked: false,
    lastLogin: new Date().toISOString()
  }
];

// Mock roles data
const mockRoles = [
  {
    id: 1,
    name: 'admin',
    description: 'Administrator with full access',
    permissions: ['create_user', 'update_user', 'delete_user', 'create_ticket', 'update_ticket', 'delete_ticket']
  },
  {
    id: 2,
    name: 'support',
    description: 'Support staff with ticket management',
    permissions: ['create_ticket', 'update_ticket']
  },
  {
    id: 3,
    name: 'customer',
    description: 'Customer with limited access',
    permissions: ['create_ticket']
  }
];

// Mock permissions data
const mockPermissions = [
  { id: 1, name: 'create_user', description: 'Create new users' },
  { id: 2, name: 'update_user', description: 'Update existing users' },
  { id: 3, name: 'delete_user', description: 'Delete users' },
  { id: 4, name: 'create_ticket', description: 'Create new tickets' },
  { id: 5, name: 'update_ticket', description: 'Update existing tickets' },
  { id: 6, name: 'delete_ticket', description: 'Delete tickets' }
];

// Admin authentication setup
async function setupAdminAuth(page: Page) {
  // Mock the authentication APIs
  await page.route('**/api/auth/signin', async (route) => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify({ 
        user: { 
          id: 1,
          name: 'Admin User',
          email: 'admin@example.com',
          role: 'admin'
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
          name: 'Admin User',
          email: 'admin@example.com',
          role: 'admin'
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      })
    });
  });

  // Log in as admin
  await page.goto('/signin');
  await page.getByLabel('Email').fill('admin@example.com');
  await page.getByLabel('Password').fill('admin123');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL('/**/');
}

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Set up admin authentication
    await setupAdminAuth(page);
    
    // Mock the users API
    await page.route('**/api/admin/users', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify(mockUsers)
      });
    });
    
    // Mock the roles API
    await page.route('**/api/admin/roles', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify(mockRoles)
      });
    });
    
    // Mock the permissions API
    await page.route('**/api/admin/permissions', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify(mockPermissions)
      });
    });
    
    // Navigate to admin dashboard
    await page.goto('/admin');
  });

  test('should display the admin dashboard with correct tabs', async ({ page }) => {
    // Check if dashboard is loaded
    await expect(page.getByText(/admin dashboard/i)).toBeVisible();
    
    // Verify tabs exist
    await expect(page.getByRole('tab', { name: /users/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /roles/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /permissions/i })).toBeVisible();
  });

  test('should display users in the users tab', async ({ page }) => {
    // Click on Users tab if not already active
    await page.getByRole('tab', { name: /users/i }).click();
    
    // Check if users are displayed
    for (const user of mockUsers) {
      await expect(page.getByText(user.email)).toBeVisible();
      await expect(page.getByText(user.name)).toBeVisible();
    }
  });

  test('should be able to create a new user', async ({ page }) => {
    // Mock the create user API
    await page.route('**/api/admin/users/create', async (route) => {
      await route.fulfill({
        status: 201,
        body: JSON.stringify({
          id: 4,
          name: 'New Test User',
          email: 'newuser@example.com',
          role: 'customer',
          active: true,
          locked: false
        })
      });
    });

    // Click on Users tab
    await page.getByRole('tab', { name: /users/i }).click();
    
    // Click create user button
    await page.getByRole('button', { name: /create user/i }).click();
    
    // Verify modal appears
    await expect(page.getByRole('dialog')).toBeVisible();
    
    // Fill in the form
    await page.getByLabel(/name/i).fill('New Test User');
    await page.getByLabel(/email/i).fill('newuser@example.com');
    await page.getByLabel(/role/i).selectOption('customer');
    await page.getByLabel(/password/i).fill('Password123!');
    await page.getByLabel(/confirm password/i).fill('Password123!');
    
    // Submit the form
    await page.getByRole('button', { name: /submit/i }).click();
    
    // Verify success message
    await expect(page.getByText(/user created successfully/i)).toBeVisible();
  });

  test('should be able to edit an existing user', async ({ page }) => {
    // Mock the get user API
    await page.route('**/api/admin/users/2', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify(mockUsers[1])
      });
    });
    
    // Mock the update user API
    await page.route('**/api/admin/users/update', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          ...mockUsers[1],
          name: 'Updated Support Name',
          role: 'admin'
        })
      });
    });

    // Click on Users tab
    await page.getByRole('tab', { name: /users/i }).click();
    
    // Click edit button for the second user
    await page.locator(`[data-testid="edit-user-2"]`).click();
    
    // Verify modal appears
    await expect(page.getByRole('dialog')).toBeVisible();
    
    // Edit user details
    await page.getByLabel(/name/i).fill('Updated Support Name');
    await page.getByLabel(/role/i).selectOption('admin');
    
    // Submit the form
    await page.getByRole('button', { name: /submit/i }).click();
    
    // Verify success message
    await expect(page.getByText(/user updated successfully/i)).toBeVisible();
  });

  test('should be able to disable a user', async ({ page }) => {
    // Mock the disable user API
    await page.route('**/api/admin/users/disable', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          ...mockUsers[2],
          active: false
        })
      });
    });

    // Click on Users tab
    await page.getByRole('tab', { name: /users/i }).click();
    
    // Click disable button for the third user
    await page.locator(`[data-testid="disable-user-3"]`).click();
    
    // Confirm in the dialog
    await page.getByRole('button', { name: /confirm/i }).click();
    
    // Verify success message
    await expect(page.getByText(/user disabled successfully/i)).toBeVisible();
  });

  test('should display roles in the roles tab', async ({ page }) => {
    // Click on Roles tab
    await page.getByRole('tab', { name: /roles/i }).click();
    
    // Check if roles are displayed
    for (const role of mockRoles) {
      await expect(page.getByText(role.name)).toBeVisible();
      await expect(page.getByText(role.description)).toBeVisible();
    }
  });

  test('should be able to create a new role', async ({ page }) => {
    // Mock the create role API
    await page.route('**/api/admin/roles/create', async (route) => {
      await route.fulfill({
        status: 201,
        body: JSON.stringify({
          id: 4,
          name: 'manager',
          description: 'Manager role with extended permissions',
          permissions: ['create_ticket', 'update_ticket', 'create_user']
        })
      });
    });

    // Click on Roles tab
    await page.getByRole('tab', { name: /roles/i }).click();
    
    // Click create role button
    await page.getByRole('button', { name: /create role/i }).click();
    
    // Verify modal appears
    await expect(page.getByRole('dialog')).toBeVisible();
    
    // Fill in the form
    await page.getByLabel(/name/i).fill('manager');
    await page.getByLabel(/description/i).fill('Manager role with extended permissions');
    
    // Select permissions
    await page.getByText('create_ticket').click();
    await page.getByText('update_ticket').click();
    await page.getByText('create_user').click();
    
    // Submit the form
    await page.getByRole('button', { name: /submit/i }).click();
    
    // Verify success message
    await expect(page.getByText(/role created successfully/i)).toBeVisible();
  });

  test('should display permissions in the permissions tab', async ({ page }) => {
    // Click on Permissions tab
    await page.getByRole('tab', { name: /permissions/i }).click();
    
    // Check if permissions are displayed
    for (const permission of mockPermissions) {
      await expect(page.getByText(permission.name)).toBeVisible();
      await expect(page.getByText(permission.description)).toBeVisible();
    }
  });

  test('should be able to create a new permission', async ({ page }) => {
    // Mock the create permission API
    await page.route('**/api/admin/permissions/create', async (route) => {
      await route.fulfill({
        status: 201,
        body: JSON.stringify({
          id: 7,
          name: 'view_reports',
          description: 'View system reports'
        })
      });
    });

    // Click on Permissions tab
    await page.getByRole('tab', { name: /permissions/i }).click();
    
    // Click create permission button
    await page.getByRole('button', { name: /create permission/i }).click();
    
    // Verify modal appears
    await expect(page.getByRole('dialog')).toBeVisible();
    
    // Fill in the form
    await page.getByLabel(/name/i).fill('view_reports');
    await page.getByLabel(/description/i).fill('View system reports');
    
    // Submit the form
    await page.getByRole('button', { name: /submit/i }).click();
    
    // Verify success message
    await expect(page.getByText(/permission created successfully/i)).toBeVisible();
  });

  test('should handle password reset for users', async ({ page }) => {
    // Mock the password reset API
    await page.route('**/api/admin/users/reset-password', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true })
      });
    });

    // Click on Users tab
    await page.getByRole('tab', { name: /users/i }).click();
    
    // Click reset password button for the third user
    await page.locator(`[data-testid="reset-password-3"]`).click();
    
    // Verify modal appears
    await expect(page.getByRole('dialog')).toBeVisible();
    
    // Fill in new password
    await page.getByLabel(/new password/i).fill('NewPassword123!');
    await page.getByLabel(/confirm password/i).fill('NewPassword123!');
    
    // Submit the form
    await page.getByRole('button', { name: /reset/i }).click();
    
    // Verify success message
    await expect(page.getByText(/password reset successfully/i)).toBeVisible();
  });
});