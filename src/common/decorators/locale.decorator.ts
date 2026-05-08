import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { SUPPORTED_LANGUAGES } from '../constants.js';
import type { SupportedLanguage } from '../constants.js';
import type { PejaRequest } from '../types/request.js';

export const Locale = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SupportedLanguage => {
    const request = ctx.switchToHttp().getRequest<PejaRequest>();

    // Authenticated user's preference takes priority
    const userLang = request.currentUser?.preferredLanguage as
      | string
      | undefined;
    if (
      userLang &&
      SUPPORTED_LANGUAGES.includes(userLang as SupportedLanguage)
    ) {
      return userLang as SupportedLanguage;
    }

    // Fall back to Accept-Language header
    const acceptLang = request.headers['accept-language'];
    if (acceptLang) {
      const preferred = acceptLang
        .split(',')
        .map((part) => part.split(';')[0].trim().substring(0, 2).toLowerCase())
        .find((code) =>
          SUPPORTED_LANGUAGES.includes(code as SupportedLanguage),
        );
      if (preferred) {
        return preferred as SupportedLanguage;
      }
    }

    return 'en';
  },
);
