import { SetMetadata } from '@nestjs/common';

export const PUBLIC_SUBMISSION_KEY = 'isPublicSubmission';
export const PublicSubmission = () => SetMetadata(PUBLIC_SUBMISSION_KEY, true);
