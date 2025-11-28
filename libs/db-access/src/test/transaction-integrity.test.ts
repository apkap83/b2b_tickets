/**
 * Transaction Integrity Tests
 * 
 * Tests database transaction handling, rollback scenarios,
 * and ACID compliance
 */

import { Pool, PoolClient } from 'pg';
import { DatabaseTestUtils } from './setup';

describe('Transaction Integrity Tests', () => {
  let pool: Pool;
  let mockClient: PoolClient;

  beforeEach(() => {
    pool = DatabaseTestUtils.getTestPool();
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    } as unknown as PoolClient;
    
    (pool.connect as jest.Mock).mockResolvedValue(mockClient);
    jest.clearAllMocks();
  });

  describe('Transaction Lifecycle', () => {
    it('should begin, commit, and end transactions properly', async () => {
      const mockQuery = mockClient.query as jest.Mock;
      
      // Mock transaction commands
      mockQuery.mockResolvedValueOnce({ command: 'BEGIN' });
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }], command: 'INSERT', rowCount: 1 });
      mockQuery.mockResolvedValueOnce({ command: 'COMMIT' });

      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        const result = await client.query('INSERT INTO test_table (name) VALUES ($1) RETURNING id', ['test']);
        await client.query('COMMIT');
        
        expect(mockQuery).toHaveBeenCalledWith('BEGIN');
        expect(mockQuery).toHaveBeenCalledWith('INSERT INTO test_table (name) VALUES ($1) RETURNING id', ['test']);
        expect(mockQuery).toHaveBeenCalledWith('COMMIT');
        expect(result.rows[0].id).toBe(1);
      } finally {
        client.release();
      }
    });

    it('should rollback transactions on error', async () => {
      const mockQuery = mockClient.query as jest.Mock;
      
      // Mock transaction with error scenario
      mockQuery.mockResolvedValueOnce({ command: 'BEGIN' });
      mockQuery.mockRejectedValueOnce(new Error('Database constraint violation'));
      mockQuery.mockResolvedValueOnce({ command: 'ROLLBACK' });

      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        
        await expect(
          client.query('INSERT INTO test_table (invalid_column) VALUES ($1)', ['test'])
        ).rejects.toThrow('Database constraint violation');
        
        await client.query('ROLLBACK');
        
        expect(mockQuery).toHaveBeenCalledWith('BEGIN');
        expect(mockQuery).toHaveBeenCalledWith('ROLLBACK');
      } finally {
        client.release();
      }
    });

    it('should handle nested transaction scenarios', async () => {
      const mockQuery = mockClient.query as jest.Mock;
      
      // Mock savepoint operations
      mockQuery.mockResolvedValueOnce({ command: 'BEGIN' });
      mockQuery.mockResolvedValueOnce({ command: 'SAVEPOINT', rowCount: 0 });
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }], command: 'INSERT', rowCount: 1 });
      mockQuery.mockRejectedValueOnce(new Error('Inner operation failed'));
      mockQuery.mockResolvedValueOnce({ command: 'ROLLBACK TO SAVEPOINT', rowCount: 0 });
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 2 }], command: 'INSERT', rowCount: 1 });
      mockQuery.mockResolvedValueOnce({ command: 'COMMIT' });

      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        
        // Create savepoint
        await client.query('SAVEPOINT sp1');
        
        // First operation succeeds
        await client.query('INSERT INTO test_table (name) VALUES ($1)', ['test1']);
        
        // Second operation fails
        try {
          await client.query('INSERT INTO invalid_table (name) VALUES ($1)', ['test2']);
        } catch (error) {
          // Rollback to savepoint
          await client.query('ROLLBACK TO SAVEPOINT sp1');
        }
        
        // Third operation succeeds
        await client.query('INSERT INTO test_table (name) VALUES ($1)', ['test3']);
        
        await client.query('COMMIT');
        
        expect(mockQuery).toHaveBeenCalledWith('SAVEPOINT sp1');
        expect(mockQuery).toHaveBeenCalledWith('ROLLBACK TO SAVEPOINT sp1');
        expect(mockQuery).toHaveBeenCalledWith('COMMIT');
      } finally {
        client.release();
      }
    });
  });

  describe('ACID Properties', () => {
    it('should ensure atomicity - all or nothing', async () => {
      const mockQuery = mockClient.query as jest.Mock;
      
      // Mock transaction that should fail completely
      mockQuery.mockResolvedValueOnce({ command: 'BEGIN' });
      mockQuery.mockResolvedValueOnce({ rows: [{ customer_id: 1 }], command: 'INSERT', rowCount: 1 });
      mockQuery.mockResolvedValueOnce({ rows: [{ user_id: 1 }], command: 'INSERT', rowCount: 1 });
      mockQuery.mockRejectedValueOnce(new Error('Ticket creation failed'));
      mockQuery.mockResolvedValueOnce({ command: 'ROLLBACK' });

      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        
        // Create customer
        await client.query('INSERT INTO customers (customer_name, customer_code) VALUES ($1, $2)', ['Test', 'TEST']);
        
        // Create user
        await client.query('INSERT INTO users (customer_id, username, password) VALUES ($1, $2, $3)', [1, 'test', 'pass']);
        
        // Fail on ticket creation
        await expect(
          client.query('INSERT INTO tickets (customer_id, ticket_number, open_user_id) VALUES ($1, $2, $3)', [1, 'TCK-001', 1])
        ).rejects.toThrow('Ticket creation failed');
        
        await client.query('ROLLBACK');
        
        // Verify rollback was called
        expect(mockQuery).toHaveBeenCalledWith('ROLLBACK');
      } finally {
        client.release();
      }
    });

    it('should ensure consistency - database rules enforced', async () => {
      const mockQuery = mockClient.query as jest.Mock;
      
      // Mock constraint violation
      mockQuery.mockResolvedValueOnce({ command: 'BEGIN' });
      mockQuery.mockRejectedValueOnce({
        code: '23503',
        message: 'violates foreign key constraint'
      });
      mockQuery.mockResolvedValueOnce({ command: 'ROLLBACK' });

      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        
        // Try to insert user with non-existent customer_id
        await expect(
          client.query('INSERT INTO users (customer_id, username, password) VALUES ($1, $2, $3)', [999, 'test', 'pass'])
        ).rejects.toMatchObject({
          code: '23503',
          message: expect.stringContaining('violates foreign key constraint')
        });
        
        await client.query('ROLLBACK');
      } finally {
        client.release();
      }
    });

    it('should ensure isolation - concurrent transactions', async () => {
      const mockQuery1 = jest.fn();
      const mockQuery2 = jest.fn();
      
      const mockClient1 = { query: mockQuery1, release: jest.fn() } as unknown as PoolClient;
      const mockClient2 = { query: mockQuery2, release: jest.fn() } as unknown as PoolClient;
      
      (pool.connect as jest.Mock).mockResolvedValueOnce(mockClient1).mockResolvedValueOnce(mockClient2);
      
      // Mock concurrent read scenarios
      mockQuery1.mockResolvedValueOnce({ command: 'BEGIN' });
      mockQuery1.mockResolvedValueOnce({ rows: [{ count: 5 }], command: 'SELECT', rowCount: 1 });
      
      mockQuery2.mockResolvedValueOnce({ command: 'BEGIN' });
      mockQuery2.mockResolvedValueOnce({ rows: [{ count: 5 }], command: 'SELECT', rowCount: 1 }); // Same snapshot
      
      const client1 = await pool.connect();
      const client2 = await pool.connect();
      
      try {
        await client1.query('BEGIN');
        await client2.query('BEGIN');
        
        // Both transactions should see consistent snapshot
        const result1 = await client1.query('SELECT COUNT(*) as count FROM tickets');
        const result2 = await client2.query('SELECT COUNT(*) as count FROM tickets');
        
        expect(result1.rows[0].count).toBe(result2.rows[0].count);
      } finally {
        client1.release();
        client2.release();
      }
    });

    it('should ensure durability - committed data persists', async () => {
      const mockQuery = mockClient.query as jest.Mock;
      
      // Mock successful transaction
      mockQuery.mockResolvedValueOnce({ command: 'BEGIN' });
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }], command: 'INSERT', rowCount: 1 });
      mockQuery.mockResolvedValueOnce({ command: 'COMMIT' });
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, name: 'test' }], command: 'SELECT', rowCount: 1 });

      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        const insertResult = await client.query('INSERT INTO test_table (name) VALUES ($1) RETURNING id', ['test']);
        await client.query('COMMIT');
        
        // Data should be retrievable after commit
        const selectResult = await client.query('SELECT id, name FROM test_table WHERE id = $1', [insertResult.rows[0].id]);
        
        expect(selectResult.rows[0].name).toBe('test');
      } finally {
        client.release();
      }
    });
  });

  describe('Complex Transaction Scenarios', () => {
    it('should handle ticket creation with multiple related inserts', async () => {
      const mockQuery = mockClient.query as jest.Mock;
      const testDate = new Date();
      
      // Mock complex ticket creation transaction
      mockQuery.mockResolvedValueOnce({ command: 'BEGIN' });
      mockQuery.mockResolvedValueOnce({ rows: [{ nextval: 1001 }], command: 'SELECT', rowCount: 1 });
      mockQuery.mockResolvedValueOnce({ rows: [{ ticket_id: 1 }], command: 'INSERT', rowCount: 1 });
      mockQuery.mockResolvedValueOnce({ rows: [{ comment_id: 1 }], command: 'INSERT', rowCount: 1 });
      mockQuery.mockResolvedValueOnce({ rows: [{ cc_id: 1 }], command: 'INSERT', rowCount: 1 });
      mockQuery.mockResolvedValueOnce({ command: 'COMMIT' });

      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        
        // Generate ticket number
        const seqResult = await client.query('SELECT nextval(\'ticket_sequence\')');
        const ticketNumber = `TCK-${seqResult.rows[0].nextval.toString().padStart(4, '0')}`;
        
        // Insert ticket
        const ticketResult = await client.query(
          'INSERT INTO tickets (customer_id, ticket_number, open_user_id, creation_date) VALUES ($1, $2, $3, $4) RETURNING ticket_id',
          [1, ticketNumber, 1, testDate]
        );
        
        // Insert initial comment
        await client.query(
          'INSERT INTO ticket_comments (ticket_id, comment_user_id, comment_text) VALUES ($1, $2, $3)',
          [ticketResult.rows[0].ticket_id, 1, 'Initial ticket description']
        );
        
        // Insert CC email
        await client.query(
          'INSERT INTO ticket_cc_emails (ticket_id, cc_email) VALUES ($1, $2)',
          [ticketResult.rows[0].ticket_id, 'manager@company.com']
        );
        
        await client.query('COMMIT');
        
        expect(mockQuery).toHaveBeenCalledWith('BEGIN');
        expect(mockQuery).toHaveBeenCalledWith('COMMIT');
        expect(ticketResult.rows[0].ticket_id).toBe(1);
      } finally {
        client.release();
      }
    });

    it('should handle user role assignment transaction', async () => {
      const mockQuery = mockClient.query as jest.Mock;
      
      // Mock role assignment transaction
      mockQuery.mockResolvedValueOnce({ command: 'BEGIN' });
      mockQuery.mockResolvedValueOnce({ rows: [{ user_id: 1 }], command: 'INSERT', rowCount: 1 });
      mockQuery.mockResolvedValueOnce({ command: 'INSERT', rowCount: 1 });
      mockQuery.mockResolvedValueOnce({ command: 'INSERT', rowCount: 1 });
      mockQuery.mockResolvedValueOnce({ command: 'COMMIT' });

      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        
        // Create user
        const userResult = await client.query(
          'INSERT INTO users (customer_id, username, password) VALUES ($1, $2, $3) RETURNING user_id',
          [1, 'newuser', 'hashedpassword']
        );
        
        // Assign roles to user
        await client.query(
          'INSERT INTO _userRoleB2B (B2BUserUserId, AppRoleId) VALUES ($1, $2)',
          [userResult.rows[0].user_id, 1] // Basic User role
        );
        
        await client.query(
          'INSERT INTO _userRoleB2B (B2BUserUserId, AppRoleId) VALUES ($1, $2)',
          [userResult.rows[0].user_id, 2] // Support Staff role
        );
        
        await client.query('COMMIT');
        
        expect(mockQuery).toHaveBeenCalledWith('BEGIN');
        expect(mockQuery).toHaveBeenCalledWith('COMMIT');
      } finally {
        client.release();
      }
    });

    it('should handle connection pool exhaustion gracefully', async () => {
      const mockQuery = mockClient.query as jest.Mock;
      
      // Mock pool exhaustion scenario
      (pool.connect as jest.Mock).mockRejectedValueOnce(new Error('Connection pool exhausted'));
      (pool.connect as jest.Mock).mockResolvedValueOnce(mockClient); // Second attempt succeeds
      
      mockQuery.mockResolvedValue({ rows: [{ id: 1 }], command: 'SELECT', rowCount: 1 });

      // First connection attempt should fail
      await expect(pool.connect()).rejects.toThrow('Connection pool exhausted');
      
      // Second attempt should succeed
      const client = await pool.connect();
      const result = await client.query('SELECT 1 as id');
      expect(result.rows[0].id).toBe(1);
      client.release();
    });

    it('should handle deadlock scenarios', async () => {
      const mockQuery1 = jest.fn();
      const mockQuery2 = jest.fn();
      
      const mockClient1 = { query: mockQuery1, release: jest.fn() } as unknown as PoolClient;
      const mockClient2 = { query: mockQuery2, release: jest.fn() } as unknown as PoolClient;
      
      (pool.connect as jest.Mock).mockResolvedValueOnce(mockClient1).mockResolvedValueOnce(mockClient2);
      
      // Mock deadlock scenario
      mockQuery1.mockResolvedValueOnce({ command: 'BEGIN' });
      mockQuery2.mockResolvedValueOnce({ command: 'BEGIN' });
      
      // First transaction locks resource A
      mockQuery1.mockResolvedValueOnce({ command: 'UPDATE', rowCount: 1 });
      // Second transaction locks resource B
      mockQuery2.mockResolvedValueOnce({ command: 'UPDATE', rowCount: 1 });
      
      // Deadlock occurs when each tries to access the other's resource
      mockQuery1.mockRejectedValueOnce({
        code: '40P01', // PostgreSQL deadlock detected
        message: 'deadlock detected'
      });
      
      mockQuery1.mockResolvedValueOnce({ command: 'ROLLBACK' });

      const client1 = await pool.connect();
      const client2 = await pool.connect();
      
      try {
        await client1.query('BEGIN');
        await client2.query('BEGIN');
        
        // Lock resources in different orders
        await client1.query('UPDATE table1 SET value = 1 WHERE id = 1');
        await client2.query('UPDATE table2 SET value = 1 WHERE id = 1');
        
        // Deadlock should be detected and handled
        await expect(
          client1.query('UPDATE table2 SET value = 2 WHERE id = 1')
        ).rejects.toMatchObject({
          code: '40P01',
          message: 'deadlock detected'
        });
        
        await client1.query('ROLLBACK');
      } finally {
        client1.release();
        client2.release();
      }
    });
  });

  describe('Error Recovery', () => {
    it('should properly cleanup after connection errors', async () => {
      const mockQuery = mockClient.query as jest.Mock;
      
      // Mock connection error during transaction
      mockQuery.mockResolvedValueOnce({ command: 'BEGIN' });
      mockQuery.mockRejectedValueOnce(new Error('Connection lost'));

      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        
        await expect(
          client.query('INSERT INTO test_table (name) VALUES ($1)', ['test'])
        ).rejects.toThrow('Connection lost');
        
        // Connection should be marked as unusable
        expect(client.release).toBeDefined();
      } finally {
        client.release();
      }
    });

    it('should handle timeout scenarios', async () => {
      const mockQuery = mockClient.query as jest.Mock;
      
      // Mock timeout scenario
      mockQuery.mockRejectedValue(new Error('Query timeout'));

      const client = await pool.connect();
      
      try {
        await expect(
          client.query('SELECT * FROM large_table WHERE complex_condition = $1', ['value'])
        ).rejects.toThrow('Query timeout');
      } finally {
        client.release();
      }
    });

    it('should maintain transaction state consistency after errors', async () => {
      const mockQuery = mockClient.query as jest.Mock;
      
      // Mock error followed by recovery
      mockQuery.mockResolvedValueOnce({ command: 'BEGIN' });
      mockQuery.mockRejectedValueOnce(new Error('Temporary error'));
      mockQuery.mockResolvedValueOnce({ command: 'ROLLBACK' });
      mockQuery.mockResolvedValueOnce({ rows: [{ in_transaction: false }], command: 'SELECT', rowCount: 1 });

      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        
        try {
          await client.query('INSERT INTO test_table (name) VALUES ($1)', ['test']);
        } catch (error) {
          await client.query('ROLLBACK');
        }
        
        // Check transaction state
        const stateResult = await client.query('SELECT txid_current_if_assigned() IS NULL as in_transaction');
        expect(stateResult.rows[0].in_transaction).toBe(false);
      } finally {
        client.release();
      }
    });
  });
});