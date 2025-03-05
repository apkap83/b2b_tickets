import Redis from 'ioredis';
import { config } from '@b2b-tickets/config';

export const redisClient = new Redis({
  port: config.redisPort,
  host: config.redisHost,
  //   username: 'default', // needs Redis >= 6
  //   password: 'my-top-secret',
  db: 0, // Defaults to 0
});
