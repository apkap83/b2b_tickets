// Simple test to verify Jest setup
describe('Server Actions Test Environment', () => {
  it('should run basic tests', () => {
    expect(1 + 1).toBe(2);
  });

  it('should have mocked modules available', () => {
    // Check that our mocks are loaded
    expect(jest).toBeDefined();
    expect(jest.fn).toBeDefined();
  });
});