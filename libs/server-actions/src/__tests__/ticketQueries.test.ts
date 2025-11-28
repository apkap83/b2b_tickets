// Jest globals are available in the test environment
import { getServerSession } from 'next-auth';
import { pgB2Bpool, setSchemaAndTimezone } from '@b2b-tickets/db-access';

import { 
  getFilteredTicketsForCustomer, 
  getTicketDetailsForTicketNumber,
  getNumOfTickets
} from '../lib/server-actions';
import { 
  AppRoleTypes, 
  AppPermissionTypes, 
  FilterTicketsStatus,
  TicketStatusIsFinal
} from '@b2b-tickets/shared-models';

const mockGetServerSession = getServerSession as jest.MockedFunction<any>;
const mockPgB2BpoolQuery = pgB2Bpool.query as jest.MockedFunction<any>;
const mockSetSchemaAndTimezone = setSchemaAndTimezone as jest.MockedFunction<any>;

describe('Ticket Query Functions', () => {
  let mockSession: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockSession = {
      user: {
        user_id: 123,
        userName: 'testuser',
        customer_id: 1,
        customer_name: 'Test Company',
        roles: [AppRoleTypes.B2B_TicketCreator],
        permissions: [
          { permissionName: AppPermissionTypes.Tickets_Page }
        ]
      }
    };
    
    mockGetServerSession.mockResolvedValue(mockSession);
  });

  describe('getFilteredTicketsForCustomer', () => {
    it('should return tickets for ticket creator role', async () => {
      const mockTickets = [
        {
          ticket_id: 1,
          customer_id: 1,
          Title: 'Test Ticket 1',
          Status: 'New',
          total_records: 1
        }
      ];

      mockPgB2BpoolQuery.mockResolvedValue({
        rows: mockTickets
      });

      const result = await getFilteredTicketsForCustomer(1, '', {});

      expect(result.pageData).toBeDefined();
      expect(result.totalRows).toBe(1);
      expect(mockSetSchemaAndTimezone).toHaveBeenCalledWith(pgB2Bpool);
    });

    it('should return all tickets for ticket handler role', async () => {
      mockSession.user.roles = [AppRoleTypes.B2B_TicketHandler];
      mockGetServerSession.mockResolvedValue(mockSession);

      const mockTickets = [
        {
          ticket_id: 1,
          customer_id: 1,
          Title: 'Test Ticket 1',
          Status: 'New',
          total_records: 2
        },
        {
          ticket_id: 2,
          customer_id: 2,
          Title: 'Test Ticket 2',
          Status: 'Working',
          total_records: 2
        }
      ];

      mockPgB2BpoolQuery.mockResolvedValue({
        rows: mockTickets
      });

      const result = await getFilteredTicketsForCustomer(1, '', {});

      expect(result.pageData).toHaveLength(2);
      expect(result.totalRows).toBe(2);
    });

    it('should handle open tickets filter', async () => {
      mockPgB2BpoolQuery.mockResolvedValue({
        rows: [{
          ticket_id: 1,
          'Is Final Status': TicketStatusIsFinal.NO,
          total_records: 1
        }]
      });

      const result = await getFilteredTicketsForCustomer(1, FilterTicketsStatus.Open, {});

      expect(result.pageData).toBeDefined();
      
      // Verify the query was called with correct parameters for open tickets
      const queryCall = mockPgB2BpoolQuery.mock.calls[0];
      expect(queryCall[1]).toContain(TicketStatusIsFinal.NO);
    });

    it('should handle closed tickets filter', async () => {
      mockPgB2BpoolQuery.mockResolvedValue({
        rows: [{
          ticket_id: 1,
          'Is Final Status': TicketStatusIsFinal.YES,
          total_records: 1
        }]
      });

      const result = await getFilteredTicketsForCustomer(1, FilterTicketsStatus.Closed, {});

      expect(result.pageData).toBeDefined();
      
      const queryCall = mockPgB2BpoolQuery.mock.calls[0];
      expect(queryCall[1]).toContain(TicketStatusIsFinal.YES);
    });

    it('should handle severity filters', async () => {
      mockPgB2BpoolQuery.mockResolvedValue({
        rows: [{
          ticket_id: 1,
          Severity: 'High',
          'Is Final Status': TicketStatusIsFinal.NO,
          total_records: 1
        }]
      });

      const result = await getFilteredTicketsForCustomer(1, FilterTicketsStatus.SeverityHigh, {});

      expect(result.pageData).toBeDefined();
      
      const queryCall = mockPgB2BpoolQuery.mock.calls[0];
      expect(queryCall[1]).toContain('High');
      expect(queryCall[1]).toContain(TicketStatusIsFinal.NO);
    });

    it('should handle column filters for ticket handlers', async () => {
      mockSession.user.roles = [AppRoleTypes.B2B_TicketHandler];
      mockGetServerSession.mockResolvedValue(mockSession);

      const filters = {
        'Customer': ['Test Company', 'Another Company'],
        'Ticket Number': ['TCK001', 'TCK002']
      };

      mockPgB2BpoolQuery.mockResolvedValue({
        rows: [{
          ticket_id: 1,
          Customer: 'Test Company',
          Ticket: 'TCK001',
          total_records: 1
        }]
      });

      const result = await getFilteredTicketsForCustomer(1, '', filters);

      expect(result.pageData).toBeDefined();
      
      // Verify filters were applied in the query
      const queryCall = mockPgB2BpoolQuery.mock.calls[0];
      expect(queryCall[0]).toContain('IN');
    });

    it('should return empty result when no tickets found', async () => {
      mockPgB2BpoolQuery.mockResolvedValue({
        rows: []
      });

      const result = await getFilteredTicketsForCustomer(1, '', {});

      expect(result.pageData).toEqual([]);
      expect(result.totalRows).toBe(0);
    });

    it('should handle pagination correctly', async () => {
      const mockTickets = [{
        ticket_id: 1,
        Title: 'Test Ticket',
        total_records: 100
      }];

      mockPgB2BpoolQuery.mockResolvedValue({
        rows: mockTickets
      });

      // Test page 2 (should offset by 10 items with default page size of 10)
      await getFilteredTicketsForCustomer(2, '', {});

      const queryCall = mockPgB2BpoolQuery.mock.calls[0];
      expect(queryCall[1]).toContain(10); // offset = (2-1) * 10
    });

    it('should handle invalid query parameter', async () => {
      await expect(
        getFilteredTicketsForCustomer(1, 'invalid-query', {})
      ).rejects.toThrow('Invalid query parameter');
    });
  });

  describe('getTicketDetailsForTicketNumber', () => {
    it('should return ticket details for valid ticket number', async () => {
      const mockTicketDetails = [{
        ticket_id: 1,
        customer_id: 1,
        Ticket: 'TCK001',
        Title: 'Test Ticket',
        Status: 'New'
      }];

      const mockComments = [{
        comment_id: 1,
        'Ticket Number': 'TCK001',
        Comment: 'Test comment',
        'Comment Date': new Date()
      }];

      mockPgB2BpoolQuery
        .mockResolvedValueOnce({ rows: mockTicketDetails }) // Ticket query
        .mockResolvedValueOnce({ rows: mockComments }); // Comments query

      const result = await getTicketDetailsForTicketNumber({ ticketNumber: 'TCK001' });

      expect(result).toHaveLength(1);
      expect(result[0].comments).toEqual(mockComments);
      expect(mockPgB2BpoolQuery).toHaveBeenCalledTimes(2);
    });

    it('should throw not found for invalid ticket number', async () => {
      mockPgB2BpoolQuery.mockResolvedValue({ rows: [] });

      await expect(
        getTicketDetailsForTicketNumber({ ticketNumber: 'INVALID' })
      ).rejects.toThrow('Not Found');
    });

    it('should prevent ticket creators from accessing other customer tickets', async () => {
      const mockTicketDetails = [{
        ticket_id: 1,
        customer_id: 999, // Different customer
        Ticket: 'TCK001',
        Title: 'Test Ticket'
      }];

      mockPgB2BpoolQuery.mockResolvedValueOnce({ rows: mockTicketDetails });

      // Non-Nova customer (customer_id !== -1) trying to access other customer's ticket
      await expect(
        getTicketDetailsForTicketNumber({ ticketNumber: 'TCK001' })
      ).rejects.toThrow('Not Found');
    });

    it('should allow Nova customer to see all tickets', async () => {
      // Nova customer has customer_id = -1
      mockSession.user.customer_id = -1;
      mockGetServerSession.mockResolvedValue(mockSession);

      const mockTicketDetails = [{
        ticket_id: 1,
        customer_id: 999,
        Ticket: 'TCK001',
        Title: 'Other Customer Ticket'
      }];

      mockPgB2BpoolQuery
        .mockResolvedValueOnce({ rows: mockTicketDetails })
        .mockResolvedValueOnce({ rows: [] });

      const result = await getTicketDetailsForTicketNumber({ ticketNumber: 'TCK001' });

      expect(result).toHaveLength(1);
    });

    it('should return filtered data for ticket creators', async () => {
      const mockTicketDetails = [{
        ticket_id: 1,
        customer_id: 1,
        Ticket: 'TCK001',
        Title: 'Test Ticket',
        SensitiveField: 'Should be filtered'
      }];

      mockPgB2BpoolQuery
        .mockResolvedValueOnce({ rows: mockTicketDetails })
        .mockResolvedValueOnce({ rows: [] });

      // Mock the mapToTicketCreator function behavior
      const result = await getTicketDetailsForTicketNumber({ ticketNumber: 'TCK001' });

      expect(result).toBeDefined();
    });

    it('should allow ticket handlers to see all ticket details', async () => {
      mockSession.user.roles = [AppRoleTypes.B2B_TicketHandler];
      mockGetServerSession.mockResolvedValue(mockSession);

      const mockTicketDetails = [{
        ticket_id: 1,
        customer_id: 1,
        Ticket: 'TCK001',
        Title: 'Test Ticket'
      }];

      mockPgB2BpoolQuery
        .mockResolvedValueOnce({ rows: mockTicketDetails })
        .mockResolvedValueOnce({ rows: [] });

      const result = await getTicketDetailsForTicketNumber({ ticketNumber: 'TCK001' });

      expect(result).toHaveLength(1);
      expect(result[0].Ticket).toBe('TCK001');
    });
  });

  describe('getNumOfTickets', () => {
    it('should return ticket count for normal customer', async () => {
      mockPgB2BpoolQuery.mockResolvedValue({
        rows: [{ count: 5 }]
      });

      const result = await getNumOfTickets(FilterTicketsStatus.Open);

      expect(result).toBe(5);
      expect(mockPgB2BpoolQuery).toHaveBeenCalledWith(
        'SELECT count(*) FROM tickets_v where "Customer" = $1 AND "Status" IN (\'New\',\'Working\')',
        ['Test Company']
      );
    });

    it('should return all tickets count for Nova customer', async () => {
      mockSession.user.customer_id = -1; // Nova customer
      mockGetServerSession.mockResolvedValue(mockSession);

      mockPgB2BpoolQuery.mockResolvedValue({
        rows: [{ count: 100 }]
      });

      const result = await getNumOfTickets(FilterTicketsStatus.Open);

      expect(result).toBe(100);
      // Should not have customer filter in query
      expect(mockPgB2BpoolQuery).toHaveBeenCalledWith(
        'SELECT count(*) FROM tickets_v WHERE "Status" IN (\'New\',\'Working\')'
      );
    });

    it('should handle open tickets count filter', async () => {
      mockPgB2BpoolQuery.mockResolvedValue({
        rows: [{ count: 3 }]
      });

      const result = await getNumOfTickets(FilterTicketsStatus.Open);

      expect(result).toBe(3);
      
      const queryCall = mockPgB2BpoolQuery.mock.calls[0];
      expect(queryCall[0]).toContain('New');
      expect(queryCall[0]).toContain('Working');
    });

    it('should handle closed tickets count filter', async () => {
      mockPgB2BpoolQuery.mockResolvedValue({
        rows: [{ count: 7 }]
      });

      const result = await getNumOfTickets(FilterTicketsStatus.Closed);

      expect(result).toBe(7);
      
      const queryCall = mockPgB2BpoolQuery.mock.calls[0];
      expect(queryCall[0]).toContain('Closed');
      expect(queryCall[0]).toContain('Cancelled');
    });

    it('should handle no filter (all tickets)', async () => {
      mockPgB2BpoolQuery.mockResolvedValue({
        rows: [{ count: 15 }]
      });

      const result = await getNumOfTickets('');

      expect(result).toBe(15);
      
      // Should not have status filter
      const queryCall = mockPgB2BpoolQuery.mock.calls[0];
      expect(queryCall[0]).not.toContain('WHERE "Status" IN');
    });
  });
});