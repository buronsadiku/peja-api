import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { eq } from 'drizzle-orm';
import { InjectDrizzle } from '../../database/database.decorator.js';
import type { DrizzleDB } from '../../database/database.types.js';
import { jobsLog } from '../../database/schema/index.js';
import { QUEUE_NAMES, JOB_NAMES } from '../queue/queue.constants.js';
import { RendersRepository } from './renders.repository.js';

interface RenderingJobData {
  jobId: string;
  eventId: string;
  isPreview?: boolean;
  style?: string;
}

@Processor(QUEUE_NAMES.RENDERING)
export class KeepsakesProcessor extends WorkerHost {
  private readonly logger = new Logger('KeepsakesProcessor');

  constructor(
    @InjectDrizzle() private readonly db: DrizzleDB,
    private readonly rendersRepo: RendersRepository,
  ) {
    super();
  }

  async process(job: Job<RenderingJobData>): Promise<void> {
    const { jobId } = job.data;

    await this.db
      .update(jobsLog)
      .set({ status: 'running', startedAt: new Date() })
      .where(eq(jobsLog.id, jobId));

    const render = await this.rendersRepo.findByJobLogId(jobId);
    if (render) await this.rendersRepo.markRendering(render.id);

    try {
      switch (job.name) {
        case JOB_NAMES.GENERATE_GOLD_BOOK_PDF:
          this.generateGoldBookPdf(job.data);
          break;
        case JOB_NAMES.RENDER_VIDEO_PREVIEW:
          this.renderVideoPreview(job.data);
          break;
        case JOB_NAMES.RENDER_VIDEO_MONTAGE:
          this.renderVideoMontage(job.data);
          break;
        default:
          this.logger.warn({ jobName: job.name }, 'Unknown rendering job');
          return;
      }

      await this.db
        .update(jobsLog)
        .set({
          status: 'succeeded',
          finishedAt: new Date(),
        })
        .where(eq(jobsLog.id, jobId));

      if (render) {
        await this.rendersRepo.markCompleted(render.id, {});
      }
    } catch (err) {
      const errorMessage = (err as Error).message;
      await this.db
        .update(jobsLog)
        .set({
          status: 'failed',
          finishedAt: new Date(),
          lastError: errorMessage,
          attempts: job.attemptsMade + 1,
        })
        .where(eq(jobsLog.id, jobId));

      if (render) await this.rendersRepo.markFailed(render.id, errorMessage);
      throw err;
    }
  }

  private generateGoldBookPdf(data: RenderingJobData): void {
    this.logger.log(
      { eventId: data.eventId, isPreview: data.isPreview },
      'Generating Gold Book PDF',
    );
    // TODO: Implement PDF generation with puppeteer or PDF lib
    this.logger.log('Gold Book PDF generation — placeholder complete');
  }

  private renderVideoPreview(data: RenderingJobData): void {
    this.logger.log(
      { eventId: data.eventId, style: data.style },
      'Rendering video preview',
    );
    // TODO: Implement with Creatomate API or FFmpeg
    this.logger.log('Video preview rendering — placeholder complete');
  }

  private renderVideoMontage(data: RenderingJobData): void {
    this.logger.log({ eventId: data.eventId }, 'Rendering full video montage');
    // TODO: Implement with Creatomate API or FFmpeg
    this.logger.log('Video montage rendering — placeholder complete');
  }
}
