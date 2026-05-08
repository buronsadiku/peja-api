import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { InjectRedis } from '../../modules/cache/cache.decorator.js';

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
};

@Injectable()
export class RateLimitService {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  async hit(
    key: string,
    limit: number,
    windowMs: number,
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - windowMs;
    const member = `${now}-${Math.random().toString(36).slice(2, 10)}`;
    const fullKey = `ratelimit:${key}`;

    const tx = this.redis.multi();
    tx.zremrangebyscore(fullKey, 0, windowStart);
    tx.zadd(fullKey, now, member);
    tx.zcard(fullKey);
    tx.pexpire(fullKey, windowMs);
    const results = await tx.exec();

    const count =
      results && results[2] && typeof results[2][1] === 'number'
        ? results[2][1]
        : 0;

    if (count > limit) {
      const oldest = await this.redis.zrange(fullKey, 0, 0, 'WITHSCORES');
      const oldestTs = Number(oldest[1] ?? now);
      const retryAfterMs = Math.max(0, oldestTs + windowMs - now);
      return {
        allowed: false,
        remaining: 0,
        retryAfterSec: Math.ceil(retryAfterMs / 1000),
      };
    }

    return {
      allowed: true,
      remaining: Math.max(0, limit - count),
      retryAfterSec: 0,
    };
  }
}
