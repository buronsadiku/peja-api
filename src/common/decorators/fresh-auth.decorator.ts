import { SetMetadata } from '@nestjs/common';

export const FRESH_AUTH_KEY = 'requireFreshAuth';

/**
 * Marks an endpoint as requiring a session that re-authenticated within
 * the last `maxAgeSec` seconds (default 5 minutes). Combine with @UseGuards(FreshAuthGuard)
 * or wire as a global guard. Use for: password change, OAuth account
 * link/unlink, email change, account deletion.
 */
export const RequireFreshAuth = (maxAgeSec = 300) =>
  SetMetadata(FRESH_AUTH_KEY, maxAgeSec);
