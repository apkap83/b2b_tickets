// Jest globals are available in the test environment
import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { pgB2Bpool, setSchemaAndTimezone } from '@b2b-tickets/db-access';
import { sendEmailOnTicketUpdate } from '@b2b-tickets/email-service/server';
import { getRequestLogger } from '@b2b-tickets/server-actions/server';

// Import the function under test
import { createNewTicket } from '../lib/server-actions';
import { AppPermissionTypes, EmailNotificationType } from '@b2b-tickets/shared-models';

// Mock implementations
const mockGetServerSession = getServerSession as jest.MockedFunction<any>;
const mockPgB2BpoolQuery = pgB2Bpool.query as jest.MockedFunction<any>;
const mockPgB2BpoolConnect = pgB2Bpool.connect as jest.MockedFunction<any>;
const mockSetSchemaAndTimezone = setSchemaAndTimezone as jest.MockedFunction<any>;
const mockRevalidatePath = revalidatePath as jest.MockedFunction<any>;
const mockSendEmailOnTicketUpdate = sendEmailOnTicketUpdate as jest.MockedFunction<any>;
const mockGetRequestLogger = getRequestLogger as jest.MockedFunction<any>;

describe('createNewTicket', () => {
  let mockClient: any;
  let mockFormData: FormData;
  let mockSession: any;
  let mockLogger: any;

  beforeEach(() => {
    // Setup mock client
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };
    
    mockPgB2BpoolConnect.mockResolvedValue(mockClient);
    
    // Setup mock logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    mockGetRequestLogger.mockResolvedValue(mockLogger);

    // Setup mock session
    mockSession = {
      user: {
        user_id: 123,
        userName: 'testuser',
        customer_id: 1,
        permissions: [
          { permissionName: AppPermissionTypes.Create_New_Ticket }
        ]
      }
    };
    mockGetServerSession.mockResolvedValue(mockSession);

    // Setup mock form data
    mockFormData = new FormData();
    mockFormData.set('title', 'Test Ticket');
    mockFormData.set('description', 'Test Description');
    mockFormData.set('severity', '1');
    mockFormData.set('category', '1');
    mockFormData.set('service', '1');
    mockFormData.set('equipmentId', '1');
    mockFormData.set('sid', 'SID123');
    mockFormData.set('cid', 'CID456');
    mockFormData.set('userName', 'testuser');
    mockFormData.set('cliValue', 'CLI789');
    mockFormData.set('contactPerson', 'John Doe');
    mockFormData.set('contactPhoneNum', '1234567890');
    mockFormData.set('ccEmails', 'test@example.com');
    mockFormData.set('ccPhones', '9876543210');
    mockFormData.set('occurrenceDate', '24/10/2025 19:30');
  });

  it('should create a new ticket successfully', async () => {
    // Mock database responses for category service type query
    mockPgB2BpoolQuery.mockResolvedValueOnce({
      rows: [{ category_service_type_id: 1 }]
    });

    // Mock client queries in sequence
    mockClient.query
      .mockResolvedValueOnce(undefined) // SET search_path
      .mockResolvedValueOnce(undefined) // BEGIN transaction
      .mockResolvedValueOnce({
        rows: [{ tck_new: 'TCK001' }]
      }) // Ticket creation
      .mockResolvedValueOnce(undefined) // COMMIT
      .mockResolvedValue(undefined); // Any other queries

    const result = await createNewTicket(null, mockFormData);

    expect(result.status).toBe('SUCCESS');
    expect(result.message).toBe('Ticket Created!');
    expect(result.extraData).toBe('TCK001');

    // Verify database interactions
    expect(mockSetSchemaAndTimezone).toHaveBeenCalledWith(pgB2Bpool);
    expect(mockPgB2BpoolQuery).toHaveBeenCalledWith(
      'SELECT category_service_type_id from ticket_category_service_types_v where category_id = $1 and service_type_id = $2',
      ['1', '1']
    );

    // Verify transaction management
    expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    
    // Verify email notification
    expect(mockSendEmailOnTicketUpdate).toHaveBeenCalledWith(
      EmailNotificationType.TICKET_CREATION,
      'TCK001'
    );

    // Verify path revalidation
    expect(mockRevalidatePath).toHaveBeenCalledWith('/tickets');
    
    // Verify client cleanup
    expect(mockClient.release).toHaveBeenCalled();
  });

  it('should handle validation errors', async () => {
    // Remove required field
    mockFormData.delete('title');

    const result = await createNewTicket(null, mockFormData);

    expect(result.status).toBe('ERROR');
    expect(result.message).toContain('Validation failed');
    
    // Should not have created ticket
    expect(mockClient.query).not.toHaveBeenCalledWith('BEGIN');
    expect(mockSendEmailOnTicketUpdate).not.toHaveBeenCalled();
  });

  it('should handle unauthorized access', async () => {
    // Remove permission from session
    mockSession.user.permissions = [];
    mockGetServerSession.mockResolvedValue(mockSession);

    const result = await createNewTicket(null, mockFormData);
    
    expect(result.status).toBe('ERROR');
    expect(result.message).toContain('Unauthorized access: User is not authorized for this action');
  });

  it('should handle missing category service type', async () => {
    // Mock empty response for category service type
    mockPgB2BpoolQuery.mockResolvedValueOnce({ rows: [] });

    const result = await createNewTicket(null, mockFormData);

    expect(result.status).toBe('ERROR');
    expect(result.message).toBe('Failed to retrieve category service type information from database');
    
    // Should rollback transaction
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    expect(mockClient.release).toHaveBeenCalled();
  });

  it('should handle database errors with rollback', async () => {
    mockPgB2BpoolQuery.mockResolvedValueOnce({
      rows: [{ category_service_type_id: 1 }]
    });

    mockClient.query
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockRejectedValueOnce(new Error('Database error')); // Ticket creation fails

    const result = await createNewTicket(null, mockFormData);

    expect(result.status).toBe('ERROR');
    
    // Should rollback transaction
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    expect(mockClient.release).toHaveBeenCalled();
    
    // Should not send email
    expect(mockSendEmailOnTicketUpdate).not.toHaveBeenCalled();
  });

  it('should validate required contact information', async () => {
    // Remove required contact person
    mockFormData.delete('contactPerson');

    const result = await createNewTicket(null, mockFormData);

    expect(result.status).toBe('ERROR');
    expect(result.message).toContain('Invalid input: expected string, received null');
  });

  it('should validate phone number format', async () => {
    // Invalid phone number
    mockFormData.set('contactPhoneNum', 'invalid-phone');

    const result = await createNewTicket(null, mockFormData);

    expect(result.status).toBe('ERROR');
    expect(result.message).toContain('Must be a comma-separated list of valid Mobile Phone numbers');
  });

  it('should validate email format in CC emails', async () => {
    // Invalid email format
    mockFormData.set('ccEmails', 'invalid-email');

    const result = await createNewTicket(null, mockFormData);

    expect(result.status).toBe('ERROR');
    expect(result.message).toContain('Must be a comma-separated list of valid email addresses');
  });

  it('should handle missing ticket ID from database', async () => {
    mockPgB2BpoolQuery.mockResolvedValueOnce({
      rows: [{ category_service_type_id: 1 }]
    });

    mockClient.query
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockResolvedValueOnce({ rows: [] }); // Empty ticket creation result

    const result = await createNewTicket(null, mockFormData);

    expect(result.status).toBe('ERROR');
    expect(result.message).toContain('Failed to create new ticket - database returned no results');
    
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
  });

  it('should create ticket without optional CC information', async () => {
    // Remove optional CC fields
    mockFormData.delete('ccEmails');
    mockFormData.delete('ccPhones');

    mockPgB2BpoolQuery.mockResolvedValueOnce({
      rows: [{ category_service_type_id: 1 }]
    });

    mockClient.query
      .mockResolvedValueOnce(undefined) // SET search_path
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockResolvedValueOnce({
        rows: [{ tck_new: 'TCK002' }]
      }) // Ticket creation
      .mockResolvedValueOnce(undefined); // COMMIT

    const result = await createNewTicket(null, mockFormData);

    expect(result.status).toBe('SUCCESS');
    expect(result.extraData).toBe('TCK002');

    // Should not call CC procedures
    expect(mockClient.query).toHaveBeenCalledTimes(4); // SET search_path, BEGIN, ticket creation, COMMIT only
  });
});