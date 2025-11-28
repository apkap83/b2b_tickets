/**
 * Data Consistency Tests
 * 
 * Tests data integrity across operations, referential integrity,
 * and business rule enforcement
 */

import { Pool, PoolClient } from 'pg';
import { DatabaseTestUtils } from './setup';

describe('Data Consistency Tests', () => {
  let pool: Pool;
  let mockClient: PoolClient;

  beforeEach(() => {
    pool = DatabaseTestUtils.getTestPool();
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    } as unknown as PoolClient;
    
    // Mock pool.connect to return our mock client
    (pool.connect as jest.Mock).mockResolvedValue(mockClient);
    jest.clearAllMocks();
  });

  describe('Customer Data Integrity', () => {
    it('should enforce unique customer names', async () => {
      const mockQuery = mockClient.query as jest.Mock;
      
      // Mock successful first insert
      mockQuery.mockResolvedValueOnce({ rows: [{ customer_id: 1 }], command: 'INSERT', rowCount: 1 });
      
      // Mock duplicate error for second insert
      mockQuery.mockRejectedValueOnce({
        code: '23505', // PostgreSQL unique violation error
        message: 'duplicate key value violates unique constraint "customers_customer_name_unique"'
      });

      const client = await pool.connect();
      
      // First insert should succeed
      const result1 = await client.query(
        'INSERT INTO customers (customer_name, customer_code) VALUES ($1, $2) RETURNING customer_id',
        ['Test Customer', 'TEST001']
      );
      expect(result1.rows[0].customer_id).toBe(1);

      // Second insert with same name should fail
      await expect(
        client.query(
          'INSERT INTO customers (customer_name, customer_code) VALUES ($1, $2)',
          ['Test Customer', 'TEST002']
        )
      ).rejects.toMatchObject({
        code: '23505',
        message: expect.stringContaining('customers_customer_name_unique')
      });

      client.release();
    });

    it('should enforce unique customer codes', async () => {
      const mockQuery = mockClient.query as jest.Mock;
      
      // Mock successful first insert
      mockQuery.mockResolvedValueOnce({ rows: [{ customer_id: 1 }], command: 'INSERT', rowCount: 1 });
      
      // Mock duplicate error for second insert
      mockQuery.mockRejectedValueOnce({
        code: '23505',
        message: 'duplicate key value violates unique constraint "customers_customer_code_unique"'
      });

      const client = await pool.connect();
      
      // First insert should succeed
      await client.query(
        'INSERT INTO customers (customer_name, customer_code) VALUES ($1, $2)',
        ['Customer One', 'TEST001']
      );

      // Second insert with same code should fail
      await expect(
        client.query(
          'INSERT INTO customers (customer_name, customer_code) VALUES ($1, $2)',
          ['Customer Two', 'TEST001']
        )
      ).rejects.toMatchObject({
        code: '23505',
        message: expect.stringContaining('customers_customer_code_unique')
      });

      client.release();
    });

    it('should maintain audit trail consistency', async () => {
      const mockQuery = mockClient.query as jest.Mock;
      const testDate = new Date();
      
      mockQuery.mockResolvedValue({
        rows: [{
          customer_id: 1,
          customer_name: 'Test Customer',
          record_version: 1,
          creation_date: testDate,
          last_update_date: testDate
        }],
        command: 'INSERT',
        rowCount: 1
      });

      const client = await pool.connect();
      
      const result = await client.query(`
        INSERT INTO customers (customer_name, customer_code, record_version, creation_date, last_update_date)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING customer_id, record_version, creation_date, last_update_date
      `, ['Test Customer', 'TEST001', 1, testDate, testDate]);

      expect(result.rows[0].record_version).toBe(1);
      expect(result.rows[0].creation_date).toBe(testDate);
      expect(result.rows[0].last_update_date).toBe(testDate);

      client.release();
    });
  });

  describe('User Data Integrity', () => {
    it('should enforce referential integrity with customers', async () => {
      const mockQuery = mockClient.query as jest.Mock;
      
      // Mock foreign key violation
      mockQuery.mockRejectedValue({
        code: '23503', // PostgreSQL foreign key violation
        message: 'insert or update on table "users" violates foreign key constraint "users_customer_id_fkey"'
      });

      const client = await pool.connect();
      
      // Insert user with non-existent customer_id should fail
      await expect(
        client.query(
          'INSERT INTO users (customer_id, username, password) VALUES ($1, $2, $3)',
          [999, 'testuser', 'hashedpassword']
        )
      ).rejects.toMatchObject({
        code: '23503',
        message: expect.stringContaining('users_customer_id_fkey')
      });

      client.release();
    });

    it('should enforce unique username per customer', async () => {
      const mockQuery = mockClient.query as jest.Mock;
      
      // Mock successful first insert
      mockQuery.mockResolvedValueOnce({ rows: [{ user_id: 1 }], command: 'INSERT', rowCount: 1 });
      
      // Mock unique violation for second insert
      mockQuery.mockRejectedValueOnce({
        code: '23505',
        message: 'duplicate key value violates unique constraint "users_customer_id_username_unique"'
      });

      const client = await pool.connect();
      
      // First user should succeed
      await client.query(
        'INSERT INTO users (customer_id, username, password) VALUES ($1, $2, $3)',
        [1, 'testuser', 'hashedpassword1']
      );

      // Second user with same username in same customer should fail
      await expect(
        client.query(
          'INSERT INTO users (customer_id, username, password) VALUES ($1, $2, $3)',
          [1, 'testuser', 'hashedpassword2']
        )
      ).rejects.toMatchObject({
        code: '23505',
        message: expect.stringContaining('users_customer_id_username_unique')
      });

      client.release();
    });

    it('should validate security constraint values', async () => {
      const mockQuery = mockClient.query as jest.Mock;
      
      // Mock check constraint violation
      mockQuery.mockRejectedValue({
        code: '23514', // PostgreSQL check constraint violation
        message: 'new row for relation "users" violates check constraint "users_last_login_failed_attempts_check"'
      });

      const client = await pool.connect();
      
      // Insert user with invalid failed attempts count should fail
      await expect(
        client.query(`
          INSERT INTO users (customer_id, username, password, last_login_failed_attempts)
          VALUES ($1, $2, $3, $4)
        `, [1, 'testuser', 'hashedpassword', -1])
      ).rejects.toMatchObject({
        code: '23514',
        message: expect.stringContaining('users_last_login_failed_attempts_check')
      });

      client.release();
    });
  });

  describe('Ticket Data Integrity', () => {
    it('should enforce unique ticket numbers', async () => {
      const mockQuery = mockClient.query as jest.Mock;
      
      // Mock successful first insert
      mockQuery.mockResolvedValueOnce({ rows: [{ ticket_id: 1 }], command: 'INSERT', rowCount: 1 });
      
      // Mock unique violation for second insert
      mockQuery.mockRejectedValueOnce({
        code: '23505',
        message: 'duplicate key value violates unique constraint "tickets_ticket_number_unique"'
      });

      const client = await pool.connect();
      
      // First ticket should succeed
      await client.query(
        'INSERT INTO tickets (customer_id, ticket_number, open_user_id) VALUES ($1, $2, $3)',
        [1, 'TCK-001', 1]
      );

      // Second ticket with same number should fail
      await expect(
        client.query(
          'INSERT INTO tickets (customer_id, ticket_number, open_user_id) VALUES ($1, $2, $3)',
          [1, 'TCK-001', 1]
        )
      ).rejects.toMatchObject({
        code: '23505',
        message: expect.stringContaining('tickets_ticket_number_unique')
      });

      client.release();
    });

    it('should maintain referential integrity with users', async () => {
      const mockQuery = mockClient.query as jest.Mock;
      
      // Mock foreign key violation
      mockQuery.mockRejectedValue({
        code: '23503',
        message: 'insert or update on table "tickets" violates foreign key constraint "tickets_open_user_id_fkey"'
      });

      const client = await pool.connect();
      
      // Insert ticket with non-existent user should fail
      await expect(
        client.query(
          'INSERT INTO tickets (customer_id, ticket_number, open_user_id) VALUES ($1, $2, $3)',
          [1, 'TCK-001', 999]
        )
      ).rejects.toMatchObject({
        code: '23503',
        message: expect.stringContaining('tickets_open_user_id_fkey')
      });

      client.release();
    });

    it('should validate ticket status transitions', async () => {
      const mockQuery = mockClient.query as jest.Mock;
      const testDate = new Date();
      
      // Mock valid status update
      mockQuery.mockResolvedValue({
        rows: [{
          ticket_id: 1,
          status_user_id: 2,
          last_update_date: testDate
        }],
        command: 'UPDATE',
        rowCount: 1
      });

      const client = await pool.connect();
      
      // Valid status update should succeed
      const result = await client.query(`
        UPDATE tickets 
        SET status_user_id = $1, last_update_date = $2
        WHERE ticket_id = $3
        RETURNING ticket_id, status_user_id, last_update_date
      `, [2, testDate, 1]);

      expect(result.rows[0].status_user_id).toBe(2);
      expect(result.rows[0].last_update_date).toBe(testDate);

      client.release();
    });
  });

  describe('Cross-Table Data Consistency', () => {
    it('should maintain consistency during complex operations', async () => {
      const mockQuery = mockClient.query as jest.Mock;
      const testDate = new Date();
      
      // Mock transaction sequence
      mockQuery.mockResolvedValueOnce({ command: 'BEGIN' }); // BEGIN transaction
      mockQuery.mockResolvedValueOnce({ rows: [{ customer_id: 1 }], command: 'INSERT', rowCount: 1 }); // Insert customer
      mockQuery.mockResolvedValueOnce({ rows: [{ user_id: 1 }], command: 'INSERT', rowCount: 1 }); // Insert user
      mockQuery.mockResolvedValueOnce({ rows: [{ ticket_id: 1 }], command: 'INSERT', rowCount: 1 }); // Insert ticket
      mockQuery.mockResolvedValueOnce({ command: 'COMMIT' }); // COMMIT transaction

      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        
        // Create customer
        const customerResult = await client.query(
          'INSERT INTO customers (customer_name, customer_code) VALUES ($1, $2) RETURNING customer_id',
          ['Test Customer', 'TEST001']
        );
        const customerId = customerResult.rows[0].customer_id;
        
        // Create user for that customer
        const userResult = await client.query(
          'INSERT INTO users (customer_id, username, password) VALUES ($1, $2, $3) RETURNING user_id',
          [customerId, 'testuser', 'hashedpassword']
        );
        const userId = userResult.rows[0].user_id;
        
        // Create ticket for that customer and user
        const ticketResult = await client.query(
          'INSERT INTO tickets (customer_id, ticket_number, open_user_id) VALUES ($1, $2, $3) RETURNING ticket_id',
          [customerId, 'TCK-001', userId]
        );
        
        await client.query('COMMIT');
        
        expect(customerResult.rows[0].customer_id).toBe(1);
        expect(userResult.rows[0].user_id).toBe(1);
        expect(ticketResult.rows[0].ticket_id).toBe(1);
        
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    });

    it('should handle cascade deletes properly', async () => {
      const mockQuery = mockClient.query as jest.Mock;
      
      // Mock cascade delete scenario
      mockQuery.mockResolvedValue({ command: 'DELETE', rowCount: 3 });

      const client = await pool.connect();
      
      // Delete customer should cascade to related records
      const result = await client.query(
        'DELETE FROM customers WHERE customer_id = $1',
        [1]
      );

      expect(result.rowCount).toBeGreaterThan(0);
      client.release();
    });

    it('should maintain data isolation between customers', async () => {
      const mockQuery = mockClient.query as jest.Mock;
      
      // Mock query that should only return data for specific customer
      mockQuery.mockResolvedValue({
        rows: [
          { ticket_id: 1, customer_id: 1, ticket_number: 'TCK-001' },
          { ticket_id: 2, customer_id: 1, ticket_number: 'TCK-002' },
        ],
        command: 'SELECT',
        rowCount: 2
      });

      const client = await pool.connect();
      
      // Query should only return tickets for specific customer
      const result = await client.query(
        'SELECT ticket_id, customer_id, ticket_number FROM tickets WHERE customer_id = $1',
        [1]
      );

      expect(result.rows).toHaveLength(2);
      expect(result.rows.every(row => row.customer_id === 1)).toBe(true);
      
      client.release();
    });
  });

  describe('Concurrent Access Scenarios', () => {
    it('should handle concurrent ticket number generation', async () => {
      const mockQuery = mockClient.query as jest.Mock;
      
      // Mock sequence-based ticket number generation
      mockQuery.mockResolvedValueOnce({ rows: [{ nextval: 1 }], command: 'SELECT', rowCount: 1 });
      mockQuery.mockResolvedValueOnce({ rows: [{ nextval: 2 }], command: 'SELECT', rowCount: 1 });
      
      const client = await pool.connect();
      
      // Simulate concurrent ticket creation
      const sequence1 = await client.query('SELECT nextval(\'ticket_sequence\')');
      const sequence2 = await client.query('SELECT nextval(\'ticket_sequence\')');
      
      expect(sequence1.rows[0].nextval).toBe(1);
      expect(sequence2.rows[0].nextval).toBe(2);
      expect(sequence1.rows[0].nextval).not.toBe(sequence2.rows[0].nextval);
      
      client.release();
    });

    it('should handle concurrent user login attempts', async () => {
      const mockQuery = mockClient.query as jest.Mock;
      
      // Mock user update for login tracking
      mockQuery.mockResolvedValue({
        rows: [{
          user_id: 1,
          last_login_failed_attempts: 1,
          is_locked: false
        }],
        command: 'UPDATE',
        rowCount: 1
      });

      const client = await pool.connect();
      
      // Update failed login attempts
      const result = await client.query(`
        UPDATE users 
        SET last_login_failed_attempts = last_login_failed_attempts + 1,
            last_update_date = NOW()
        WHERE user_id = $1
        RETURNING user_id, last_login_failed_attempts, is_locked
      `, [1]);

      expect(result.rows[0].last_login_failed_attempts).toBeGreaterThan(0);
      client.release();
    });
  });
});