export const SUPPORTED_LANGUAGES = [
  'en',
  'fr',
  'nl',
  'de',
  'es',
  'it',
] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const PLAN_TIERS = ['essentials', 'premium', 'bundle'] as const;
export type PlanTier = (typeof PLAN_TIERS)[number];

export const EVENT_STATUSES = [
  'draft',
  'active',
  'paused',
  'archived',
] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const TRANSCRIPT_STATUSES = [
  'pending',
  'processing',
  'done',
  'failed',
  'skipped',
] as const;

export const SUBMISSION_SOURCES = ['kiosk', 'qr_scan', 'direct_link'] as const;

export const ORDER_TYPES = ['plan', 'keepsake'] as const;
export const ORDER_STATUSES = [
  'pending',
  'paid',
  'failed',
  'refunded',
  'cancelled',
  'in_production',
  'shipped',
  'delivered',
] as const;

export const INVITATION_CHANNELS = [
  'whatsapp',
  'email',
  'sms',
  'link',
  'qr_print',
  'ig_story',
] as const;

export const MAX_AUDIO_SIZE_BYTES = 50 * 1024 * 1024;
export const MAX_VIDEO_SIZE_BYTES = 150 * 1024 * 1024;
export const MAX_PHOTO_SIZE_BYTES = 25 * 1024 * 1024;
export const MAX_AUDIO_DURATION_SEC = 180;
export const MAX_VIDEO_DURATION_SEC = 60;
export const MAX_GUEST_NAMES_LENGTH = 200;
export const MAX_WELCOME_MESSAGE_LENGTH = 200;
export const MAX_WRITTEN_NOTE_LENGTH = 200;

export const MEDIA_MAX_SIZES = {
  audio: MAX_AUDIO_SIZE_BYTES,
  video: MAX_VIDEO_SIZE_BYTES,
  photo: MAX_PHOTO_SIZE_BYTES,
} as const;

export const ACCEPTED_MIMES = {
  audio: ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg'],
  video: ['video/webm', 'video/mp4'],
  photo: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
} as const;

export const PRESIGN_PUT_EXPIRY_SEC = 900;
export const PRESIGN_GET_EXPIRY_SEC = 3600;

export const GALLERY_PAGE_SIZE_DEFAULT = 24;
export const GALLERY_PAGE_SIZE_MAX = 100;
export const MESSAGES_PAGE_SIZE_DEFAULT = 20;
export const MESSAGES_PAGE_SIZE_MAX = 100;

export const PLAN_CONFIG = {
  essentials: { messageLimit: 50, storageDays: 30, keepsakeCreditCents: 0 },
  premium: { messageLimit: null, storageDays: 365, keepsakeCreditCents: 0 },
  bundle: { messageLimit: null, storageDays: null, keepsakeCreditCents: 5000 },
} as const;
