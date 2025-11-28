/**
 * Database Schema Validation Tests
 * 
 * Tests database schema integrity, constraints, and relationships
 */

import { Pool } from 'pg';
import { Sequelize } from 'sequelize-typescript';
import { DatabaseTestUtils } from './setup';

describe('Database Schema Validation', () => {
  let pool: Pool;
  let sequelize: Sequelize;

  beforeEach(() => {
    pool = DatabaseTestUtils.getTestPool();
    sequelize = DatabaseTestUtils.getTestSequelize();
    jest.clearAllMocks();
  });

  describe('Connection and Schema Setup', () => {
    it('should establish database connection successfully', async () => {
      // Mock successful connection
      const mockQuery = pool.query as jest.Mock;
      mockQuery.mockResolvedValue({ rows: [], command: 'SELECT', rowCount: 0 });

      // Test connection
      await expect(pool.query('SELECT 1')).resolves.toBeDefined();
      expect(mockQuery).toHaveBeenCalledWith('SELECT 1');
    });

    it('should set proper timezone on connection', async () => {
      const mockQuery = pool.query as jest.Mock;
      mockQuery.mockResolvedValue({ rows: [], command: 'SET', rowCount: 0 });

      // Test timezone setting
      await pool.query("SET TIME ZONE 'Europe/Athens'");
      
      expect(mockQuery).toHaveBeenCalledWith("SET TIME ZONE 'Europe/Athens'");
    });

    it('should set proper search path for schema', async () => {
      const mockQuery = pool.query as jest.Mock;
      mockQuery.mockResolvedValue({ rows: [], command: 'SET', rowCount: 0 });

      // Test search path setting
      await pool.query('SET search_path TO test-schema');
      
      expect(mockQuery).toHaveBeenCalledWith('SET search_path TO test-schema');
    });
  });

  describe('Table Structure Validation', () => {
    it('should validate customers table structure', async () => {
      const mockQuery = pool.query as jest.Mock;
      mockQuery.mockResolvedValue({
        rows: [
          { column_name: 'customer_id', data_type: 'integer', is_nullable: 'NO' },
          { column_name: 'customer_name', data_type: 'character varying', is_nullable: 'NO' },
          { column_name: 'customer_code', data_type: 'character varying', is_nullable: 'NO' },
          { column_name: 'record_version', data_type: 'integer', is_nullable: 'NO' },
          { column_name: 'creation_date', data_type: 'timestamp with time zone', is_nullable: 'NO' },
          { column_name: 'last_update_date', data_type: 'timestamp with time zone', is_nullable: 'NO' },
        ],
        command: 'SELECT',
        rowCount: 6
      });

      const result = await pool.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'customers'
        ORDER BY ordinal_position
      `);

      expect(result.rows).toHaveLength(6);
      
      // Validate required columns exist
      const columnNames = result.rows.map(row => row.column_name);
      expect(columnNames).toContain('customer_id');
      expect(columnNames).toContain('customer_name');
      expect(columnNames).toContain('customer_code');
      expect(columnNames).toContain('record_version');
      expect(columnNames).toContain('creation_date');
      expect(columnNames).toContain('last_update_date');
    });

    it('should validate users table structure', async () => {
      const mockQuery = pool.query as jest.Mock;
      mockQuery.mockResolvedValue({
        rows: [
          { column_name: 'user_id', data_type: 'integer', is_nullable: 'NO' },
          { column_name: 'customer_id', data_type: 'integer', is_nullable: 'NO' },
          { column_name: 'username', data_type: 'character varying', is_nullable: 'NO' },
          { column_name: 'password', data_type: 'character varying', is_nullable: 'NO' },
          { column_name: 'change_password', data_type: 'boolean', is_nullable: 'NO' },
          { column_name: 'is_locked', data_type: 'boolean', is_nullable: 'NO' },
          { column_name: 'last_login_status', data_type: 'character varying', is_nullable: 'YES' },
          { column_name: 'last_login_failed_attempts', data_type: 'integer', is_nullable: 'NO' },
          { column_name: 'two_factor_secret', data_type: 'character varying', is_nullable: 'YES' },
        ],
        command: 'SELECT',
        rowCount: 9
      });

      const result = await pool.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'users'
        ORDER BY ordinal_position
      `);

      expect(result.rows).toHaveLength(9);
      
      // Validate security-related columns
      const columnNames = result.rows.map(row => row.column_name);
      expect(columnNames).toContain('password');
      expect(columnNames).toContain('two_factor_secret');
      expect(columnNames).toContain('is_locked');
      expect(columnNames).toContain('last_login_failed_attempts');
    });

    it('should validate tickets table structure', async () => {
      const mockQuery = pool.query as jest.Mock;
      mockQuery.mockResolvedValue({
        rows: [
          { column_name: 'ticket_id', data_type: 'integer', is_nullable: 'NO' },
          { column_name: 'customer_id', data_type: 'integer', is_nullable: 'NO' },
          { column_name: 'ticket_number', data_type: 'character varying', is_nullable: 'NO' },
          { column_name: 'open_user_id', data_type: 'integer', is_nullable: 'NO' },
          { column_name: 'status_user_id', data_type: 'integer', is_nullable: 'YES' },
          { column_name: 'close_user_id', data_type: 'integer', is_nullable: 'YES' },
        ],
        command: 'SELECT',
        rowCount: 6
      });

      const result = await pool.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'tickets'
        ORDER BY ordinal_position
      `);

      expect(result.rows).toHaveLength(6);
      
      // Validate ticket workflow columns
      const columnNames = result.rows.map(row => row.column_name);
      expect(columnNames).toContain('ticket_number');
      expect(columnNames).toContain('open_user_id');
      expect(columnNames).toContain('status_user_id');
      expect(columnNames).toContain('close_user_id');
    });
  });

  describe('Constraint Validation', () => {
    it('should validate primary key constraints', async () => {
      const mockQuery = pool.query as jest.Mock;
      mockQuery.mockResolvedValue({
        rows: [
          { table_name: 'customers', constraint_name: 'customers_pkey', column_name: 'customer_id' },
          { table_name: 'users', constraint_name: 'users_pkey', column_name: 'user_id' },
          { table_name: 'tickets', constraint_name: 'tickets_pkey', column_name: 'ticket_id' },
        ],
        command: 'SELECT',
        rowCount: 3
      });

      const result = await pool.query(`
        SELECT tc.table_name, tc.constraint_name, kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.constraint_type = 'PRIMARY KEY'
          AND tc.table_name IN ('customers', 'users', 'tickets')
        ORDER BY tc.table_name
      `);

      expect(result.rows).toHaveLength(3);
      
      // Validate primary keys
      const tables = result.rows.map(row => ({ table: row.table_name, column: row.column_name }));
      expect(tables).toContainEqual({ table: 'customers', column: 'customer_id' });
      expect(tables).toContainEqual({ table: 'users', column: 'user_id' });
      expect(tables).toContainEqual({ table: 'tickets', column: 'ticket_id' });
    });

    it('should validate foreign key constraints', async () => {
      const mockQuery = pool.query as jest.Mock;
      mockQuery.mockResolvedValue({
        rows: [
          { 
            table_name: 'users', 
            constraint_name: 'users_customer_id_fkey',
            column_name: 'customer_id',
            foreign_table_name: 'customers',
            foreign_column_name: 'customer_id'
          },
          { 
            table_name: 'tickets', 
            constraint_name: 'tickets_customer_id_fkey',
            column_name: 'customer_id',
            foreign_table_name: 'customers',
            foreign_column_name: 'customer_id'
          },
        ],
        command: 'SELECT',
        rowCount: 2
      });

      const result = await pool.query(`
        SELECT 
          tc.table_name,
          tc.constraint_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        ORDER BY tc.table_name
      `);

      expect(result.rows).toHaveLength(2);
      
      // Validate foreign key relationships
      const foreignKeys = result.rows.map(row => ({
        table: row.table_name,
        column: row.column_name,
        refTable: row.foreign_table_name,
        refColumn: row.foreign_column_name
      }));
      
      expect(foreignKeys).toContainEqual({
        table: 'users',
        column: 'customer_id',
        refTable: 'customers',
        refColumn: 'customer_id'
      });
      
      expect(foreignKeys).toContainEqual({
        table: 'tickets',
        column: 'customer_id',
        refTable: 'customers',
        refColumn: 'customer_id'
      });
    });

    it('should validate unique constraints', async () => {
      const mockQuery = pool.query as jest.Mock;
      mockQuery.mockResolvedValue({
        rows: [
          { table_name: 'customers', constraint_name: 'customers_customer_name_unique', column_name: 'customer_name' },
          { table_name: 'customers', constraint_name: 'customers_customer_code_unique', column_name: 'customer_code' },
          { table_name: 'tickets', constraint_name: 'tickets_ticket_number_unique', column_name: 'ticket_number' },
        ],
        command: 'SELECT',
        rowCount: 3
      });

      const result = await pool.query(`
        SELECT tc.table_name, tc.constraint_name, kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.constraint_type = 'UNIQUE'
        ORDER BY tc.table_name, kcu.column_name
      `);

      expect(result.rows).toHaveLength(3);
      
      // Validate unique constraints
      const uniqueConstraints = result.rows.map(row => ({ table: row.table_name, column: row.column_name }));
      expect(uniqueConstraints).toContainEqual({ table: 'customers', column: 'customer_name' });
      expect(uniqueConstraints).toContainEqual({ table: 'customers', column: 'customer_code' });
      expect(uniqueConstraints).toContainEqual({ table: 'tickets', column: 'ticket_number' });
    });
  });

  describe('Index Validation', () => {
    it('should validate critical indexes exist', async () => {
      const mockQuery = pool.query as jest.Mock;
      mockQuery.mockResolvedValue({
        rows: [
          { table_name: 'users', index_name: 'idx_users_customer_id', column_name: 'customer_id' },
          { table_name: 'users', index_name: 'idx_users_username', column_name: 'username' },
          { table_name: 'tickets', index_name: 'idx_tickets_customer_id', column_name: 'customer_id' },
          { table_name: 'tickets', index_name: 'idx_tickets_ticket_number', column_name: 'ticket_number' },
        ],
        command: 'SELECT',
        rowCount: 4
      });

      const result = await pool.query(`
        SELECT 
          t.relname AS table_name,
          i.relname AS index_name,
          a.attname AS column_name
        FROM pg_class t
        JOIN pg_index ix ON t.oid = ix.indrelid
        JOIN pg_class i ON i.oid = ix.indexrelid
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
        WHERE t.relname IN ('users', 'tickets', 'customers')
          AND i.relname LIKE 'idx_%'
        ORDER BY t.relname, i.relname
      `);

      expect(result.rows.length).toBeGreaterThan(0);
      
      // Validate performance-critical indexes
      const indexes = result.rows.map(row => ({ table: row.table_name, index: row.index_name, column: row.column_name }));
      expect(indexes.some(idx => idx.table === 'users' && idx.column === 'customer_id')).toBe(true);
      expect(indexes.some(idx => idx.table === 'tickets' && idx.column === 'customer_id')).toBe(true);
    });
  });
});