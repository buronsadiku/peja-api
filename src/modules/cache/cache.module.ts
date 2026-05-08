import { Global, Module, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './cache.decorator.js';
import { CacheService } from './cache.service.js';
import { getEnv } from '../../config/env.js';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: () => {
        const logger = new Logger('CacheModule');
        const env = getEnv();
        const redis = new Redis(env.REDIS_URL, {
          maxRetriesPerRequest: 3,
          lazyConnect: true,
          // Railway's internal Redis plugin resolves over IPv6.
          // family: 0 lets the resolver use either family without
          // breaking local IPv4 docker.
          family: 0,
        });
        redis.on('connect', () => logger.log('Redis connected'));
        redis.on('error', (err) => logger.error('Redis error', err));
        return redis;
      },
    },
    CacheService,
  ],
  exports: [REDIS_CLIENT, CacheService],
})
export class CacheModule {}
