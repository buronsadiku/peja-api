export interface TranscriptionResult {
  text: string;
  detectedLanguage: string;
  confidence: number;
  durationSec: number;
}

export interface TranscriptionProvider {
  transcribe(
    audioUrl: string,
    languageHint?: string,
  ): Promise<TranscriptionResult>;
}
