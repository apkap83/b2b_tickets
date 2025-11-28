// Mock NextAuth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

// Mock Next.js functions
jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
  notFound: jest.fn(() => {
    throw new Error('Not Found');
  }),
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

// Mock database connections
jest.mock('@b2b-tickets/db-access', () => ({
  pgB2Bpool: {
    query: jest.fn(),
    connect: jest.fn(() => ({
      query: jest.fn(),
      release: jest.fn(),
    })),
  },
  setSchemaAndTimezone: jest.fn(),
}));

// Mock config
jest.mock('@b2b-tickets/config', () => ({
  config: {
    TICKET_ITEMS_PER_PAGE: 10,
    api: {
      user: 'test-user',
      process: 'test-process',
    },
    postgres_b2b_database: {
      debugMode: false,
      schemaName: 'test_schema',
    },
    cookieConsentValidityInDays: 365,
    attachmentsPrefixPath: '/test/attachments',
  },
}));

// Mock file system operations  
jest.mock('fs/promises', () => ({
  writeFile: jest.fn(),
  readFile: jest.fn(),
  mkdir: jest.fn(),
  unlink: jest.fn(),
}));

// Mock email service
jest.mock('@b2b-tickets/email-service/server', () => ({
  sendEmailOnTicketUpdate: jest.fn(),
  sendEmailForNewHandlerComment: jest.fn(),
}));

// Mock logging
jest.mock('@b2b-tickets/logging', () => ({
  CustomLogger: class MockLogger {
    debug = jest.fn();
    info = jest.fn();
    warn = jest.fn();
    error = jest.fn();
  }
}));

jest.mock('@b2b-tickets/server-actions/server', () => ({
  getRequestLogger: jest.fn(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

// Mock winston
jest.mock('winston', () => ({
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    json: jest.fn(),
    printf: jest.fn(),
    colorize: jest.fn(),
    align: jest.fn(),
    errors: jest.fn()
  },
  createLogger: jest.fn(),
  transports: {
    Console: jest.fn(),
    File: jest.fn()
  }
}));

// Mock winston-daily-rotate-file
jest.mock('winston-daily-rotate-file', () => {
  return jest.fn().mockImplementation(() => ({
    filename: 'test.log',
    level: 'info'
  }));
});

// Mock child_process
jest.mock('child_process', () => ({
  execSync: jest.fn(() => 'abc123'),
}));

// Mock path
jest.mock('path', () => ({
  dirname: jest.fn(),
  basename: jest.fn(),
  join: jest.fn(),
  normalize: jest.fn(),
}));

// Mock date utilities and user permission functions
jest.mock('@b2b-tickets/utils', () => ({
  convertTo24HourFormat: jest.fn((date) => {
    if (!date) return '';
    // Mock successful conversion for test dates
    if (date.includes('19:30')) return '19:30';
    return '12:00';
  }),
  parseCustomDate: jest.fn((dateString) => {
    if (!dateString) return null;
    // Mock successful date parsing
    if (dateString.includes('24/10/2025')) {
      return new Date('2025-10-24T19:30:00Z');
    }
    return new Date('2024-01-01T12:00:00Z');
  }),
  toFormState: jest.fn((status, message, extraData) => ({
    status,
    message,
    extraData,
    fieldErrors: {},
    timestamp: Date.now(),
  })),
  fromErrorToFormState: jest.fn((error) => ({
    status: 'ERROR',
    message: error.message || 'An error occurred',
    fieldErrors: {},
    timestamp: Date.now(),
  })),
  EMPTY_FORM_STATE: {
    status: 'UNSET',
    message: '',
    fieldErrors: {},
    timestamp: Date.now(),
  },
  // Mock user permission functions
  userHasPermission: jest.fn((session, permissionName) => {
    return session?.user?.permissions?.some((p: any) => p.permissionName === permissionName) || false;
  }),
  userHasRole: jest.fn((session, roleName) => {
    if (!session?.user?.roles) return false;
    // Admin role has access to everything
    if (session.user.roles.includes('Admin')) return true;
    return session.user.roles.includes(roleName);
  }),
  // Mock data mapping functions
  mapToTicketCreator: jest.fn((ticket) => ticket),
  mapToTicketHandler: jest.fn((ticket) => ticket)
}));

// Set up global test environment
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
  
  // Reset environment variables
  process.env.NODE_ENV = 'test';
  process.env.NEXT_PUBLIC_APP_ENV = 'test';
});