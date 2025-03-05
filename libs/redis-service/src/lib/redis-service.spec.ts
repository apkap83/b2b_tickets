import { redisService } from './redis-service';

describe('redisService', () => {
  it('should work', () => {
    expect(redisService()).toEqual('redis-service');
  });
});
