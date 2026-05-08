import { Module } from '@nestjs/common';
import { WhisperAdapter } from './adapters/whisper.adapter.js';
import { TranscriptionProcessor } from './transcription.processor.js';
import { MessagesModule } from '../messages/messages.module.js';

@Module({
  imports: [MessagesModule],
  providers: [
    WhisperAdapter,
    {
      provide: 'TranscriptionProvider',
      useExisting: WhisperAdapter,
    },
    TranscriptionProcessor,
  ],
  exports: [WhisperAdapter],
})
export class TranscriptionModule {}
