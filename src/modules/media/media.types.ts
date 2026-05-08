export type GalleryItem = {
  id: string;
  type: 'photo' | 'video';
  uploaderType: 'guest' | 'owner';
  uploaderName: string | null;
  messageId: string | null;
  url: string | null;
  thumbUrl: string | null;
  width: number | null;
  height: number | null;
  durationSec: number | null;
  isFavorite: boolean;
  isGoldBookSelected: boolean;
  createdAt: Date;
};
