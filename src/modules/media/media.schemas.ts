import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import {
  GALLERY_PAGE_SIZE_DEFAULT,
  GALLERY_PAGE_SIZE_MAX,
} from '../../common/constants.js';

export const mediaUploadItemSchema = z.object({
  type: z.enum(['photo', 'video']),
  contentType: z.string().min(1),
});

export const mediaUploadUrlsSchema = z
  .object({
    items: z.array(mediaUploadItemSchema).min(1).max(20),
  })
  .strict();

export class MediaUploadUrlsDto extends createZodDto(mediaUploadUrlsSchema) {}

export const mediaFinalizeItemSchema = z.object({
  mediaId: z.string().uuid(),
  width: z.number().int().min(1).nullable().optional(),
  height: z.number().int().min(1).nullable().optional(),
  durationSec: z.number().int().min(0).nullable().optional(),
  sizeBytes: z.number().int().min(0).nullable().optional(),
});

export const mediaFinalizeSchema = z
  .object({
    items: z.array(mediaFinalizeItemSchema).min(1).max(20),
  })
  .strict();

export class MediaFinalizeDto extends createZodDto(mediaFinalizeSchema) {}

export const galleryQuerySchema = z
  .object({
    type: z.enum(['photo', 'video', 'all']).default('all'),
    filter: z.enum(['all', 'favorites', 'gold_book']).default('all'),
    sort: z.enum(['newest', 'oldest']).default('newest'),
    search: z.string().optional(),
    cursor: z.string().optional(),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(GALLERY_PAGE_SIZE_MAX)
      .default(GALLERY_PAGE_SIZE_DEFAULT),
  })
  .strict();

export class GalleryQueryDto extends createZodDto(galleryQuerySchema) {}

export const updateMediaSchema = z
  .object({
    isFavorite: z.boolean().optional(),
    isGoldBookSelected: z.boolean().optional(),
  })
  .strict()
  .refine(
    (d) => d.isFavorite !== undefined || d.isGoldBookSelected !== undefined,
    { message: 'Provide at least one flag' },
  );

export class UpdateMediaDto extends createZodDto(updateMediaSchema) {}
