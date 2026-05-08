export const QUEUE_NAMES = {
  TRANSCRIPTION: 'transcription',
  MEDIA: 'media',
  EMAIL: 'email',
  RENDERING: 'rendering',
  FULFILLMENT: 'fulfillment',
  CLEANUP: 'cleanup',
} as const;

export const JOB_NAMES = {
  TRANSCRIBE_MESSAGE: 'transcribe_message',
  GENERATE_PHOTO_THUMBNAIL: 'generate_photo_thumbnail',
  GENERATE_VIDEO_THUMBNAIL: 'generate_video_thumbnail',
  CONVERT_HEIC_TO_JPEG: 'convert_heic_to_jpeg',
  SEND_NEW_MESSAGE_NOTIFICATION: 'send_new_message_notification',
  SEND_PURCHASE_CONFIRMATION: 'send_purchase_confirmation',
  SEND_DAILY_DIGEST: 'send_daily_digest',
  SEND_STORAGE_EXPIRY_WARNING: 'send_storage_expiry_warning',
  SEND_WEDDING_DAY_CHECKLIST: 'send_wedding_day_checklist',
  RENDER_VIDEO_PREVIEW: 'render_video_preview',
  RENDER_VIDEO_MONTAGE: 'render_video_montage',
  GENERATE_GOLD_BOOK_PDF: 'generate_gold_book_pdf',
  SUBMIT_PRINT_ORDER: 'submit_print_order',
  CHECK_ORDER_FULFILLMENT: 'check_order_fulfillment',
  CLEANUP_EXPIRED_MEDIA: 'cleanup_expired_media',
  CLEANUP_ORPHAN_UPLOADS: 'cleanup_orphan_uploads',
  PROCESS_GDPR_DELETION: 'process_gdpr_deletion',
  GENERATE_OWNER_PHOTO_THUMBNAIL: 'generate_owner_photo_thumbnail',
  CONVERT_OWNER_HEIC_TO_JPEG: 'convert_owner_heic_to_jpeg',
} as const;

export const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 30_000, // 30 seconds
  },
  removeOnComplete: { count: 1000 },
  removeOnFail: { count: 5000 },
};

export const QUEUE_CONCURRENCY = {
  [QUEUE_NAMES.TRANSCRIPTION]: 5,
  [QUEUE_NAMES.MEDIA]: 10,
  [QUEUE_NAMES.EMAIL]: 10,
  [QUEUE_NAMES.RENDERING]: 2,
  [QUEUE_NAMES.FULFILLMENT]: 5,
  [QUEUE_NAMES.CLEANUP]: 3,
} as const;
