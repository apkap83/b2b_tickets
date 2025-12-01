/// <reference types="jest" />

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

// Mock Redis service
jest.mock('@b2b-tickets/redis-service', () => ({
  RedisService: {
    getActiveUsers: jest.fn(),
    setUserActive: jest.fn(),
    removeUserFromActive: jest.fn(),
    getUserLastSeen: jest.fn(),
  },
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

// Mock email service
jest.mock('@b2b-tickets/email-service/server', () => ({
  sendEmailOnTicketUpdate: jest.fn(),
  sendEmailForNewHandlerComment: jest.fn(),
  sendUserCreatedEmail: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
}));

// Mock auth options
jest.mock('@b2b-tickets/auth-options', () => ({
  authOptions: {
    providers: [],
    callbacks: {
      session: jest.fn(),
    },
  },
}));

// Mock logging
jest.mock('@b2b-tickets/logging', () => ({
  CustomLogger: class MockLogger {
    debug = jest.fn();
    info = jest.fn();
    warn = jest.fn();
    error = jest.fn();
  },
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
    errors: jest.fn(),
  },
  createLogger: jest.fn(),
  transports: {
    Console: jest.fn(),
    File: jest.fn(),
  },
}));

// Mock utilities
jest.mock('@b2b-tickets/utils', () => ({
  convertTo24HourFormat: jest.fn((date) => {
    if (!date) return '';
    return '12:00';
  }),
  parseCustomDate: jest.fn((dateString) => {
    if (!dateString) return null;
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
  userHasPermission: jest.fn((session: unknown, permissionName: unknown) => {
    const typedSession = session as { user?: { roles?: string[], permissions?: { permissionName: string }[] } } | null;
    if (!typedSession?.user) return false;
    if (typedSession.user.roles?.includes('Admin')) return true;
    return (
      typedSession?.user?.permissions?.some(
        (p: { permissionName: string }) => p.permissionName === permissionName
      ) || false
    );
  }),
  userHasRole: jest.fn((session: unknown, roleName: unknown) => {
    const typedSession = session as { user?: { roles?: string[] } } | null;
    if (!typedSession?.user?.roles) return false;
    const rolesToCheck = Array.isArray(roleName) ? roleName : [roleName];
    return typedSession.user.roles.some(
      (role: string) => rolesToCheck.includes(role) || role === 'Admin'
    );
  }),
}));

// Mock external packages
jest.mock('yup', () => ({
  object: jest.fn(() => ({
    validate: jest.fn(),
  })),
  string: jest.fn(() => ({
    required: jest.fn(() => ({
      min: jest.fn(() => ({
        max: jest.fn(),
      })),
    })),
    min: jest.fn(() => ({
      max: jest.fn(),
    })),
    max: jest.fn(),
  })),
  array: jest.fn(() => ({
    of: jest.fn(),
    min: jest.fn(),
  })),
}));

// Mock dayjs with extend method
const mockDayjs: any = jest.fn(() => ({
  format: jest.fn(() => '2024-01-01 12:00:00'),
  isValid: jest.fn(() => true),
}));
(mockDayjs as any).extend = jest.fn();

jest.mock('dayjs', () => mockDayjs);
jest.mock('dayjs/plugin/customParseFormat', () => ({}));

jest.mock('uuid', () => ({
  v7: jest.fn(() => 'mock-uuid-v7'),
}));

// Declare uuid module to avoid TypeScript warnings
declare module 'uuid' {
  export function v7(): string;
}

// Set up global test environment
beforeEach(() => {
  jest.clearAllMocks();
  // Use Object.assign to avoid read-only property issues
  Object.assign(process.env, {
    NODE_ENV: 'test',
    NEXT_PUBLIC_APP_ENV: 'test'
  });
});