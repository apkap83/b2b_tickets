/**
 * Basic Security Test to verify setup
 */

import { SecurityTestUtils } from './security-test-utils';

describe('Basic Security Test Setup', () => {
  it('should create mock user', () => {
    const user = SecurityTestUtils.createMockUser();
    expect(user.user_id).toBe(1);
    expect(user.username).toBe('testuser');
  });

  it('should create mock session', () => {
    const session = SecurityTestUtils.createMockSession(['User'], ['Tickets_Page']);
    expect(session.user.roles).toContain('User');
    expect(session.user.permissions).toHaveLength(1);
  });

  it('should validate SQL injection payloads', () => {
    const payloads = SecurityTestUtils.getSqlInjectionPayloads();
    expect(payloads.length).toBeGreaterThan(0);
    expect(payloads).toContain("'; DROP TABLE users; --");
  });
});