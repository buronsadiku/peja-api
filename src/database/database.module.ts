import { Global, Module, Logger } from '@nestjs/common';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema/index.js';
import { DRIZZLE } from './database.decorator.js';
import { getEnv } from '../config/env.js';

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE,
      useFactory: () => {
        const logger = new Logger('DatabaseModule');
        const env = getEnv();
        const pool = new Pool({
          connectionString: env.DATABASE_URL,
          max: 20,
        });
        pool.on('error', (err) => logger.error('Unexpected pool error', err));
        logger.log('Database connection pool created');
        return drizzle(pool, { schema });
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule {}
