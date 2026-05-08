import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InjectDrizzle } from '../../database/database.decorator.js';
import type { DrizzleDB } from '../../database/database.types.js';
import { jobsLog } from '../../database/schema/index.js';
import { QUEUE_NAMES, JOB_NAMES } from '../queue/queue.constants.js';
import { renderJobOptions } from '../queue/queue.utils.js';
import { ProductsRepository } from './products.repository.js';
import { RendersRepository } from './renders.repository.js';
import type {
  GoldBookPreviewDto,
  VideoMontagePreviewDto,
} from './keepsakes.schemas.js';

export interface CatalogItem {
  sku: string;
  name: string;
  description: string;
  priceCents: number;
  currency: string;
}

@Injectable()
export class KeepsakesService {
  constructor(
    @InjectDrizzle() private readonly db: DrizzleDB,
    @InjectQueue(QUEUE_NAMES.RENDERING) private readonly renderingQueue: Queue,
    private readonly productsRepo: ProductsRepository,
    private readonly rendersRepo: RendersRepository,
  ) {}

  async getCatalog(category?: string): Promise<{ products: CatalogItem[] }> {
    const rows = await this.productsRepo.listActive(category);
    return {
      products: rows.map((row) => ({
        sku: row.sku,
        name: row.name,
        description: row.description ?? '',
        priceCents: row.basePriceCents,
        currency: row.currency,
      })),
    };
  }

  async getProductBySlug(slug: string) {
    const result = await this.productsRepo.findBySlugWithRelations(slug);
    if (!result) throw new NotFoundException(`Product not found: ${slug}`);
    return result;
  }

  async requestGoldBookPreview(eventId: string, dto: GoldBookPreviewDto) {
    return this.createRenderJob({
      jobType: JOB_NAMES.GENERATE_GOLD_BOOK_PDF,
      eventId,
      productType: 'gold_book',
      queuePayload: { ...dto, isPreview: true },
      rendersPayload: { ...dto },
    });
  }

  async requestVideoMontagePreview(
    eventId: string,
    dto: VideoMontagePreviewDto,
  ) {
    return this.createRenderJob({
      jobType: JOB_NAMES.RENDER_VIDEO_PREVIEW,
      eventId,
      productType: 'video_montage',
      queuePayload: { ...dto },
      rendersPayload: { ...dto },
    });
  }

  private async createRenderJob(params: {
    jobType: string;
    eventId: string;
    productType: string;
    queuePayload: Record<string, unknown>;
    rendersPayload: Record<string, unknown>;
  }) {
    const [job] = await this.db
      .insert(jobsLog)
      .values({
        jobType: params.jobType,
        resourceId: params.eventId,
        status: 'queued',
        payload: { eventId: params.eventId, ...params.queuePayload },
      })
      .returning();

    await this.rendersRepo.create({
      eventId: params.eventId,
      productType: params.productType,
      renderType: 'preview',
      status: 'queued',
      jobLogId: job.id,
      inputPayload: params.rendersPayload,
    });

    await this.renderingQueue.add(
      params.jobType,
      { jobId: job.id, eventId: params.eventId, ...params.queuePayload },
      renderJobOptions(),
    );

    return { jobId: job.id };
  }
}
