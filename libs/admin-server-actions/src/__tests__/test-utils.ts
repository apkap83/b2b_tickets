// Remove Session import since we're using our own MockSession interface

// Test utility types
export interface MockUser {
  id: string;
  username: string;
  email: string;
  roles: string[];
  permissions: { permissionName: string }[];
  customerId: string;
  customerName: string;
  isActive: boolean;
  isLocked: boolean;
}

export interface MockSession {
  user: MockUser;
  expires: string;
  expiresAt?: number;
}

// Mock user factory functions
export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  return {
    id: 'test-user-id',
    username: 'testuser',
    email: 'test@example.com',
    roles: ['User'],
    permissions: [{ permissionName: 'View_Tickets' }],
    customerId: 'customer-1',
    customerName: 'Test Customer',
    isActive: true,
    isLocked: false,
    ...overrides,
  };
}

export function createMockSession(userOverrides: Partial<MockUser> = {}): MockSession {
  return {
    user: createMockUser(userOverrides),
    expires: '2024-12-31',
  };
}

// Permission and role constants for testing
export const ADMIN_PERMISSIONS = [
  'API_Security_Management',
  'Create_New_App_User',
  'API_Admin',
  'View_Tickets',
  'Manage_Tickets',
  'Admin_Dashboard',
];

export const SECURITY_ADMIN_PERMISSIONS = [
  'API_Security_Management',
  'View_Tickets',
  'Manage_Users',
];

export const USER_PERMISSIONS = [
  'View_Tickets',
  'Create_Tickets',
];

// Mock session factory functions for different user types
export function createAdminSession(overrides: Partial<MockUser> = {}): MockSession {
  return createMockSession({
    roles: ['Admin'],
    permissions: ADMIN_PERMISSIONS.map(name => ({ permissionName: name })),
    ...overrides,
  });
}

export function createSecurityAdminSession(overrides: Partial<MockUser> = {}): MockSession {
  return createMockSession({
    roles: ['Security_Admin'],
    permissions: SECURITY_ADMIN_PERMISSIONS.map(name => ({ permissionName: name })),
    ...overrides,
  });
}

export function createUserSession(overrides: Partial<MockUser> = {}): MockSession {
  return createMockSession({
    roles: ['User'],
    permissions: USER_PERMISSIONS.map(name => ({ permissionName: name })),
    ...overrides,
  });
}

export function createUnauthorizedSession(overrides: Partial<MockUser> = {}): MockSession {
  return createMockSession({
    roles: ['User'],
    permissions: [],
    ...overrides,
  });
}

// Database mock helpers
export function createMockDatabaseClient() {
  const mockQuery = jest.fn();
  const mockRelease = jest.fn();
  
  return {
    query: mockQuery,
    release: mockRelease,
    mockQuery,
    mockRelease,
  };
}

export function createMockDatabasePool() {
  const mockConnect = jest.fn();
  const mockQuery = jest.fn();
  
  return {
    connect: mockConnect,
    query: mockQuery,
    mockConnect,
    mockQuery,
  };
}

// Common database response mocks
export const mockUserQueryResponse = {
  rows: [
    {
      id: 'user-1',
      username: 'testuser',
      email: 'test@example.com',
      is_active: true,
      is_locked: false,
      customer_id: 'customer-1',
      customer_name: 'Test Customer',
    },
  ],
  rowCount: 1,
};

export const mockRoleQueryResponse = {
  rows: [
    {
      id: 'role-1',
      role_name: 'User',
      description: 'Standard user role',
    },
  ],
  rowCount: 1,
};

export const mockPermissionQueryResponse = {
  rows: [
    {
      id: 'permission-1',
      permission_name: 'View_Tickets',
      description: 'View tickets permission',
    },
  ],
  rowCount: 1,
};

export const mockCustomerQueryResponse = {
  rows: [
    {
      id: 'customer-1',
      name: 'Test Customer',
      is_active: true,
    },
  ],
  rowCount: 1,
};

// Form data mock helpers
export function createMockFormData(data: Record<string, string | string[]>): FormData {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach(v => formData.append(key, v));
    } else {
      formData.append(key, value);
    }
  });
  return formData;
}

// Error simulation helpers
export function simulateDatabaseError(message = 'Database connection failed') {
  return new Error(message);
}

export function simulateValidationError(field: string, message: string) {
  const error = new Error(`Validation failed: ${message}`);
  (error as any).field = field;
  return error;
}

// Response assertion helpers
export function expectFormStateError(result: any, expectedMessage?: string) {
  expect(result.status).toBe('ERROR');
  if (expectedMessage) {
    expect(result.message).toContain(expectedMessage);
  }
  expect(result.fieldErrors).toBeDefined();
  expect(result.timestamp).toBeDefined();
}

export function expectFormStateSuccess(result: any, expectedMessage?: string) {
  expect(result.status).toBe('SUCCESS');
  if (expectedMessage) {
    expect(result.message).toContain(expectedMessage);
  }
  expect(result.fieldErrors).toBeDefined();
  expect(result.timestamp).toBeDefined();
}

// Security test helpers
export function expectSecurityViolation(result: any) {
  expect(result.status).toBe('ERROR');
  expect(result.message).toMatch(/permission|access|denied|unauthorized/i);
}

export function expectDatabaseQuery(mockQuery: jest.Mock, expectedSql: string | RegExp) {
  expect(mockQuery).toHaveBeenCalled();
  const calls = mockQuery.mock.calls;
  const sqlCall = calls.find(call => 
    typeof expectedSql === 'string' 
      ? call[0].includes(expectedSql)
      : expectedSql.test(call[0])
  );
  expect(sqlCall).toBeTruthy();
}