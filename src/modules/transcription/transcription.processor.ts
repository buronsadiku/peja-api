import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../queue/queue.constants.js';
import { MessagesRepository } from '../messages/messages.repository.js';
import { StorageService } from '../storage/storage.service.js';
import type { TranscriptionProvider } from './transcription-provider.interface.js';

@Processor(QUEUE_NAMES.TRANSCRIPTION)
export class TranscriptionProcessor extends WorkerHost {
  private readonly logger = new Logger('TranscriptionProcessor');

  constructor(
    private readonly messagesRepo: MessagesRepository,
    private readonly storage: StorageService,
    @Inject('TranscriptionProvider')
    private readonly transcriptionProvider: TranscriptionProvider,
  ) {
    super();
  }

  async process(job: Job<{ messageId: string }>): Promise<void> {
    const { messageId } = job.data;
    this.logger.log({ messageId, jobId: job.id }, 'Starting transcription');

    const message = await this.messagesRepo.findById(messageId);
    if (!message || !message.audioKey) {
      this.logger.warn({ messageId }, 'Message not found or no audio');
      return;
    }

    if (message.transcriptStatus !== 'pending') {
      this.logger.warn(
        { messageId, status: message.transcriptStatus },
        'Skipping — not pending',
      );
      return;
    }

    await this.messagesRepo.update(messageId, {
      transcriptStatus: 'processing',
    });

    try {
      const audioUrl = await this.storage.presignPlaybackUrl(message.audioKey);
      const result = await this.transcriptionProvider.transcribe(
        audioUrl,
        message.submissionLanguage ?? undefined,
      );

      await this.messagesRepo.update(messageId, {
        transcript: result.text,
        transcriptLanguage: result.detectedLanguage,
        transcriptStatus: 'done',
        transcriptAttempts: message.transcriptAttempts + 1,
      });

      this.logger.log(
        {
          messageId,
          language: result.detectedLanguage,
          durationSec: result.durationSec,
        },
        'Transcription complete',
      );
    } catch (error) {
      const attempts = message.transcriptAttempts + 1;
      const status = attempts >= 3 ? 'failed' : 'pending';
      await this.messagesRepo.update(messageId, {
        transcriptStatus: status,
        transcriptAttempts: attempts,
      });
      this.logger.error(
        { messageId, error: (error as Error).message, attempts },
        'Transcription failed',
      );
      throw error; // Let BullMQ handle retry
    }
  }
}
