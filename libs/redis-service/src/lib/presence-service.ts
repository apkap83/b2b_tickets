import { redisClient } from './redis-service';
import { UserPresenceData } from './types';

export class PresenceService {
  static async addOnlineUser(userId: string, userData: UserPresenceData) {
    const key = `user_online:${userId}`;
    const ttl = 300; // 5 minutes

    // Store user presence with TTL
    await redisClient.setex(
      key,
      ttl,
      JSON.stringify({
        ...userData,
        lastSeen: Date.now(),
      })
    );

    // Add to indexes for fast queries
    await redisClient.sadd('online_users_index', `user_${userId}`);
    await redisClient.sadd(
      `online_by_role:${userData.roles}`,
      `user_${userId}`
    );
    await redisClient.sadd(
      `online_by_customer:${userData.customer_id}`,
      `user_${userId}`
    );

    // Set TTL on indexes too
    await redisClient.expire('online_users_index', ttl);
    await redisClient.expire(`online_by_role:${userData.roles}`, ttl);
    await redisClient.expire(`online_by_customer:${userData.customer_id}`, ttl);
  }

  static async removeOnlineUser(userId: string, userData?: UserPresenceData) {
    const key = `user_online:${userId}`;

    // Remove presence data
    await redisClient.del(key);

    // Remove from indexes
    await redisClient.srem('online_users_index', `user_${userId}`);
    if (userData) {
      await redisClient.srem(
        `online_by_role:${userData.roles}`,
        `user_${userId}`
      );
      await redisClient.srem(
        `online_by_customer:${userData.customer_id}`,
        `user_${userId}`
      );
    }
  }

  static async getOnlineUsers(): Promise<UserPresenceData[]> {
    const userKeys = await redisClient.smembers('online_users_index');
    const pipeline = redisClient.pipeline();

    userKeys.forEach((userKey) => {
      const userId = userKey.replace('user_', '');
      pipeline.get(`user_online:${userId}`);
    });

    const results = await pipeline.exec();
    return (
      results
        ?.map(([err, data]) => (data ? JSON.parse(data as string) : null))
        .filter(Boolean) || []
    );
  }

  static async updateLastSeen(userId: string) {
    const key = `user_online:${userId}`;
    const userData = await redisClient.get(key);

    if (userData) {
      const parsed = JSON.parse(userData);
      parsed.lastSeen = Date.now();
      const ttl = 300; // 5 minutes
      
      // Update the user data with new TTL
      await redisClient.setex(key, ttl, JSON.stringify(parsed));
      
      // Refresh the indexes with the same TTL to prevent them from expiring
      await redisClient.sadd('online_users_index', `user_${userId}`);
      await redisClient.expire('online_users_index', ttl);
      
      await redisClient.sadd(`online_by_role:${parsed.roles}`, `user_${userId}`);
      await redisClient.expire(`online_by_role:${parsed.roles}`, ttl);
      
      await redisClient.sadd(`online_by_customer:${parsed.customer_id}`, `user_${userId}`);
      await redisClient.expire(`online_by_customer:${parsed.customer_id}`, ttl);
    }
  }
}
