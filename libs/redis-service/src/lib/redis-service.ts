import Redis from 'ioredis';
import { config } from '@b2b-tickets/config';

// Create Redis client with option to not attempt connection in test environment
export const redisClient = new Redis({
  port: config.redisPort,
  host: config.redisHost,
  //   username: 'default', // needs Redis >= 6
  //   password: 'my-top-secret',
  db: 0, // Defaults to 0,
  lazyConnect: process.env.NODE_ENV === 'test', // Don't connect automatically in test environment
});

// Cleanup function to properly close Redis connections in tests
export const disconnectRedisClient = async (): Promise<void> => {
  try {
    await redisClient.quit();
  } catch (error) {
    console.error('Error disconnecting Redis client:', error);
  }
};
