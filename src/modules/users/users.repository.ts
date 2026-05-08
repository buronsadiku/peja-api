import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { InjectDrizzle } from '../../database/database.decorator.js';
import type { DrizzleDB } from '../../database/database.types.js';
import { users } from '../../database/schema/index.js';

export type UserRow = typeof users.$inferSelect;
export type UserInsert = typeof users.$inferInsert;

@Injectable()
export class UsersRepository {
  constructor(@InjectDrizzle() private readonly db: DrizzleDB) {}

  async findById(id: string): Promise<UserRow | undefined> {
    const rows = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return rows[0];
  }

  async findByEmail(email: string): Promise<UserRow | undefined> {
    const rows = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return rows[0];
  }

  async create(data: UserInsert): Promise<UserRow> {
    const rows = await this.db.insert(users).values(data).returning();
    return rows[0];
  }

  async update(id: string, data: Partial<UserInsert>): Promise<UserRow> {
    const rows = await this.db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return rows[0];
  }

  async softDelete(id: string): Promise<UserRow> {
    const rows = await this.db
      .update(users)
      .set({ deletedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return rows[0];
  }
}
