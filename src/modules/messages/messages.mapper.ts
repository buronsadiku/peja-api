import type { MessageRow } from './messages.repository.js';
import type { MediaRow } from '../media/media.repository.js';
import type { GalleryItem } from '../media/media.types.js';

export type MessageSummary = {
  id: string;
  guestNames: string;
  hasAudio: boolean;
  hasVideo: boolean;
  hasPhoto: boolean;
  mediaCount: number;
  audioDurationSec: number | null;
  transcriptSnippet: string | null;
  writtenNote: string | null;
  isFavorite: boolean;
  isGoldBookSelected: boolean;
  createdAt: Date;
  photoThumbUrl: string | null;
};

export type MessageDetailDto = {
  id: string;
  guestNames: string;
  audioUrl: string | null;
  audioDurationSec: number | null;
  audioMimeType: string | null;
  media: GalleryItem[];
  writtenNote: string | null;
  transcript: string | null;
  transcriptLanguage: string | null;
  transcriptStatus: string;
  isFavorite: boolean;
  isGoldBookSelected: boolean;
  coupleNotes: string | null;
  audioTrimStartSec: number | null;
  audioTrimEndSec: number | null;
  submissionSource: string;
  createdAt: Date;
};

export const toMessageSummary = (
  msg: MessageRow,
  mediaList: MediaRow[],
  photoThumbUrl: string | null,
): MessageSummary => ({
  id: msg.id,
  guestNames: msg.guestNames,
  hasAudio: !!msg.audioKey,
  hasVideo: mediaList.some((m) => m.type === 'video'),
  hasPhoto: mediaList.some((m) => m.type === 'photo'),
  mediaCount: mediaList.length,
  audioDurationSec: msg.audioDurationSec,
  transcriptSnippet: msg.transcript ? msg.transcript.slice(0, 120) : null,
  writtenNote: msg.writtenNote,
  isFavorite: msg.isFavorite,
  isGoldBookSelected: msg.isGoldBookSelected ?? false,
  createdAt: msg.createdAt,
  photoThumbUrl,
});

export const toMessageDetail = (
  msg: MessageRow,
  audioUrl: string | null,
  media: GalleryItem[],
): MessageDetailDto => ({
  id: msg.id,
  guestNames: msg.guestNames,
  audioUrl,
  audioDurationSec: msg.audioDurationSec,
  audioMimeType: msg.audioMimeType,
  media,
  writtenNote: msg.writtenNote,
  transcript: msg.transcript,
  transcriptLanguage: msg.transcriptLanguage,
  transcriptStatus: msg.transcriptStatus,
  isFavorite: msg.isFavorite,
  isGoldBookSelected: msg.isGoldBookSelected ?? false,
  coupleNotes: msg.coupleNotes,
  audioTrimStartSec: msg.audioTrimStartSec,
  audioTrimEndSec: msg.audioTrimEndSec,
  submissionSource: msg.submissionSource,
  createdAt: msg.createdAt,
});
