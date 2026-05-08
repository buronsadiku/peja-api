import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { CsrfController } from './csrf.controller.js';
import { AuthCleanupService } from './auth-cleanup.service.js';
import { SessionRefreshService } from './session-refresh.service.js';
import { AuditLogService } from './audit-log.service.js';
import { UsersModule } from '../users/users.module.js';

@Module({
  imports: [UsersModule],
  controllers: [AuthController, CsrfController],
  providers: [AuthCleanupService, SessionRefreshService, AuditLogService],
  exports: [SessionRefreshService, AuditLogService],
})
export class AuthModule {}
