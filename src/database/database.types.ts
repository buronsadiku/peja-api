import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema/index.js';

export type DrizzleDB = NodePgDatabase<typeof schema>;
