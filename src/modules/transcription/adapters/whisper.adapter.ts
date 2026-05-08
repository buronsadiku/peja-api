import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { getEnv } from '../../../config/env.js';
import { ServiceUnavailableError } from '../../../common/errors/errors.js';
import type {
  TranscriptionProvider,
  TranscriptionResult,
} from '../transcription-provider.interface.js';

@Injectable()
export class WhisperAdapter implements TranscriptionProvider {
  private readonly logger = new Logger('WhisperAdapter');
  private client: OpenAI | null = null;

  constructor() {
    const env = getEnv();
    if (env.OPENAI_API_KEY) {
      this.client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
      this.logger.log('OpenAI Whisper adapter initialized');
    } else {
      this.logger.warn('OPENAI_API_KEY not set — transcription disabled');
    }
  }

  async transcribe(
    audioUrl: string,
    languageHint?: string,
  ): Promise<TranscriptionResult> {
    if (!this.client)
      throw new ServiceUnavailableError(
        'Transcription not configured',
        'errors:service_unavailable',
      );

    // Download audio from URL to pass to Whisper
    const response = await fetch(audioUrl);
    const blob = await response.blob();
    const file = new File([blob], 'audio.webm', {
      type: response.headers.get('content-type') || 'audio/webm',
    });

    const result = await this.client.audio.transcriptions.create({
      model: 'whisper-1',
      file,
      language: languageHint,
      response_format: 'verbose_json',
    });

    const verboseResult = result as OpenAI.Audio.TranscriptionVerbose;

    return {
      text: verboseResult.text,
      detectedLanguage: verboseResult.language || languageHint || 'unknown',
      confidence: 1.0, // Whisper doesn't return confidence
      durationSec: verboseResult.duration || 0,
    };
  }
}
