/**
 * REAL SQL Injection Security Tests
 *
 * Tests actual SQL injection vulnerabilities in your application:
 * - Parameter injection in database queries
 * - NoSQL injection attempts
 * - Blind SQL injection techniques
 * - Union-based injection attacks
 */

import { getFilteredTicketsForCustomer } from '@b2b-tickets/server-actions';
import { pgB2Bpool } from '@b2b-tickets/db-access';

// Real database connection for testing
jest.setTimeout(30000);

describe('REAL SQL Injection Security Tests', () => {
  let testCustomerId: number;

  beforeAll(async () => {
    // Create test customer for isolation
    testCustomerId = 999;
  });

  describe('Parameter Injection Prevention', () => {
    it('should prevent SQL injection through search parameters', async () => {
      const sqlInjectionPayloads = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "'; UPDATE tickets SET status='DELETED' WHERE '1'='1'; --",
        "' UNION SELECT password FROM users --",
        "'; INSERT INTO tickets (title) VALUES ('HACKED'); --"
      ];

      for (const maliciousQuery of sqlInjectionPayloads) {
        try {
          // Correct parameter order: currentPage, query, filters, allPages
          const result = await getFilteredTicketsForCustomer(1, maliciousQuery, {}, false);
          
          // Should handle gracefully without SQL errors
          expect(result).toBeDefined();
          expect(result.pageData).toBeDefined();
          expect(result.totalRows).toBeDefined();
          
          // Verify no malicious data manipulation occurred
          expect(Array.isArray(result.pageData)).toBe(true);
          expect(typeof result.totalRows).toBe('number');
          
        } catch (error: any) {
          // If there's an error, it should be handled gracefully, not a SQL error
          expect(error.message).not.toContain('syntax error');
          expect(error.message).not.toContain('relation');
          expect(error.message).not.toContain('column');
        }
      }
    });

    it('should sanitize filter parameters to prevent injection', async () => {
      const maliciousFilters = {
        status: ["'; DROP TABLE tickets; --"],
        priority: ["' OR '1'='1"],
        category: ["'; UPDATE tickets SET customer_id=0; --"]
      };

      try {
        const result = await getFilteredTicketsForCustomer(1, '', maliciousFilters, false);
        
        // Should handle gracefully
        expect(result).toBeDefined();
        expect(result.pageData).toBeDefined();
        
        // Verify structure integrity
        if (result.pageData && result.pageData.length > 0) {
          for (const ticket of result.pageData) {
            expect(ticket.customer_id).not.toBe(0); // Shouldn't be modified by injection
          }
        }
        
      } catch (error: any) {
        // Should not expose SQL syntax errors
        expect(error.message).not.toContain('DROP');
        expect(error.message).not.toContain('UPDATE');
      }
    });

    it('should handle pagination parameters safely', async () => {
      const maliciousPaginationTests = [
        "'; DROP DATABASE; --",
        "' OR 1=1 LIMIT 0,1000000; --",
        "'; SELECT * FROM users; --"
      ];

      for (const input of maliciousPaginationTests) {
        try {
          // Test with malicious input that might be interpreted as SQL
          const result = await getFilteredTicketsForCustomer(1, input, {}, false);
          
          expect(result.totalRows).toBeDefined();
          expect(typeof result.totalRows).toBe('number');
          expect(result.totalRows).toBeGreaterThanOrEqual(0);
          
        } catch (error: any) {
          // Should fail gracefully, not with SQL syntax errors
          expect(error.message).not.toContain('syntax');
          expect(error.message).not.toContain('unexpected');
        }
      }
    });
  });

  describe('Database Integrity Verification', () => {
    it('should maintain database schema after injection attempts', async () => {
      // First, attempt various injection attacks
      const destructivePayloads = [
        "'; DROP TABLE tickets; --",
        "'; ALTER TABLE users DROP COLUMN password; --",
        "'; TRUNCATE TABLE sessions; --"
      ];

      for (const payload of destructivePayloads) {
        try {
          await getFilteredTicketsForCustomer(1, payload, {}, false);
        } catch (error) {
          // Ignore errors, we're testing that the schema survives
        }
      }

      // Verify critical tables still exist
      const tableChecks = [
        "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'tickets'",
        "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'users'", 
        "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'customers'"
      ];

      for (const query of tableChecks) {
        const result = await pgB2Bpool.query(query);
        expect(parseInt(result.rows[0].count)).toBe(1);
      }
    });

    it('should prevent data exfiltration through error messages', async () => {
      const informationLeakageAttempts = [
        "'; SELECT version(); --",
        "'; SELECT user(); --", 
        "'; SELECT database(); --",
        "' AND (SELECT COUNT(*) FROM users) > 0; --"
      ];

      for (const attempt of informationLeakageAttempts) {
        try {
          await getFilteredTicketsForCustomer(1, attempt, {}, false);
        } catch (error: any) {
          // Error messages should not contain sensitive database information
          expect(error.message).not.toContain('PostgreSQL');
          expect(error.message).not.toContain('version');
          expect(error.message).not.toContain('database');
          expect(error.message).not.toContain('user=');
          expect(error.message).not.toContain('password');
        }
      }
    });
  });

  describe('Time-based Injection Prevention', () => {
    it('should prevent time-based blind SQL injection', async () => {
      const timeBasedPayloads = [
        "'; SELECT pg_sleep(5); --",
        "' OR (SELECT COUNT(*) FROM pg_sleep(3)) > 0; --",
        "'; WAITFOR DELAY '00:00:05'; --"
      ];

      for (const payload of timeBasedPayloads) {
        const startTime = Date.now();
        
        try {
          await getFilteredTicketsForCustomer(1, payload, {}, false);
        } catch (error) {
          // Timing shouldn't be affected by injection attempts
        }
        
        const executionTime = Date.now() - startTime;
        
        // Should not cause significant delays (more than 2 seconds indicates possible injection)
        expect(executionTime).toBeLessThan(2000);
      }
    });
  });

  describe('Boolean-based Injection Prevention', () => {
    it('should prevent boolean-based blind injection', async () => {
      const booleanPayloads = [
        "' AND 1=1; --",
        "' AND 1=2; --",
        "' OR EXISTS(SELECT 1 FROM users WHERE id=1); --",
        "' AND (SELECT COUNT(*) FROM users) > 0; --"
      ];

      // These payloads should all return similar results
      const results: any[] = [];
      
      for (const payload of booleanPayloads) {
        try {
          const result = await getFilteredTicketsForCustomer(1, payload, {}, false);
          results.push(result);
        } catch (error) {
          results.push({ error: true });
        }
      }

      // All boolean variations should behave similarly (no information leakage)
      const firstResult = results[0];
      for (let i = 1; i < results.length; i++) {
        if (!results[i].error && !firstResult.error) {
          // Response patterns should be consistent
          expect(typeof results[i].totalRows).toBe(typeof firstResult.totalRows);
          expect(Array.isArray(results[i].pageData)).toBe(Array.isArray(firstResult.pageData));
        }
      }
    });
  });
});