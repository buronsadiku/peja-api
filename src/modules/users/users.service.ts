import { Injectable } from '@nestjs/common';
import { UsersRepository, UserRow } from './users.repository.js';
import { NotFoundError } from '../../common/errors/errors.js';

@Injectable()
export class UsersService {
  constructor(private readonly repo: UsersRepository) {}

  async findByIdOrThrow(id: string): Promise<UserRow> {
    const user = await this.repo.findById(id);
    if (!user || user.deletedAt) throw new NotFoundError('User', id);
    return user;
  }

  async updateProfile(
    id: string,
    data: {
      fullName?: string;
      avatarUrl?: string;
      preferredLanguage?: string;
      emailPreferences?: Record<string, boolean>;
    },
  ): Promise<UserRow> {
    await this.findByIdOrThrow(id);
    return this.repo.update(id, data);
  }

  async softDelete(id: string): Promise<UserRow> {
    await this.findByIdOrThrow(id);
    return this.repo.softDelete(id);
  }
}
