import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from '../users/users.service.js';
import { updateProfileSchema, type UpdateProfileDto } from './auth.schemas.js';
import { ApiSuccessResponse } from '../../common/swagger/api-data-response.js';
import {
  ApiCommonErrors,
  ApiValidationError,
} from '../../common/swagger/global-errors.js';
import { MessageResultDto, UserWrapperDto } from './auth.responses.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Locale } from '../../common/decorators/locale.decorator.js';
import { t } from '../../common/i18n/t.js';
import type { SupportedLanguage } from '../../common/constants.js';

/**
 * Auth-related profile endpoints. Sign-in, sign-up, OAuth, password
 * reset, email verification, and sign-out all live in Better Auth's
 * handler in the Next.js app — see peja-web/src/app/api/auth/[...all].
 */
@ApiTags('Auth')
@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiSuccessResponse(200, 'Current user profile', UserWrapperDto)
  @ApiCommonErrors()
  me(@CurrentUser() user: { id: string; email: string; role: string }) {
    return { data: { user } };
  }

  @Patch('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiSuccessResponse(200, 'Profile updated', UserWrapperDto)
  @ApiCommonErrors()
  @ApiValidationError()
  async updateMe(
    @CurrentUser('id') userId: string,
    @Body(new ZodValidationPipe(updateProfileSchema)) body: UpdateProfileDto,
  ) {
    const user = await this.usersService.updateProfile(userId, body);
    return { data: { user } };
  }

  @Delete('me')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Initiate account deletion (GDPR)' })
  @ApiSuccessResponse(202, 'Account deletion initiated', MessageResultDto)
  @ApiCommonErrors()
  async deleteMe(
    @CurrentUser('id') userId: string,
    @Locale() locale: SupportedLanguage,
  ) {
    await this.usersService.softDelete(userId);
    return {
      data: {
        message: t('auth:delete_account.success', locale),
      },
    };
  }
}
