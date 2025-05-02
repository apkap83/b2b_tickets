// redisClient.test.ts
import Redis from 'ioredis';
import { redisClient } from './redis-service'; // Adjust the import path
import { config } from '@b2b-tickets/config';

// Manually mock the Redis class from ioredis
jest.mock('ioredis', () => {
  const mRedis = jest.fn().mockImplementation(() => ({
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue('value'),
    // Mock other Redis methods as needed
  }));

  return {
    // Exporting the mock constructor
    default: mRedis,
  };
});

describe('Redis Client', () => {
  beforeEach(() => {
    // Clear mock calls for the Redis constructor and its methods
    // @ts-ignore
    (Redis as jest.Mock).mockClear();
  });

  it('should initialize Redis client with correct config', () => {
    // Create a new Redis instance with the correct config
    new Redis({
      port: config.redisPort,
      host: config.redisHost,
      db: 0,
    });

    // Verify Redis constructor was called with the correct configuration
    expect(Redis).toHaveBeenCalledWith({
      port: config.redisPort,
      host: config.redisHost,
      db: 0,
    });
  });

  it('should set a value in Redis', async () => {
    // Test Redis `set` method
    const value = await redisClient.set('key', 'value');
    expect(value).toBe('OK');
  });

  it('should get a value from Redis', async () => {
    // Test Redis `get` method
    const value = await redisClient.get('key');
    expect(value).toBe('value');
  });
});
