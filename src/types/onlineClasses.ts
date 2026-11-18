export type OnlineClassProvider = 'youtube' | 'tiktok';
export type OnlineClassStatus =
  | 'draft'
  | 'scheduled'
  | 'live'
  | 'completed'
  | 'cancelled';
export type OnlineClassCategory =
  | 'live_class'
  | 'demonstration'
  | 'recorded_tutorial'
  | 'art_tutorial';

export interface OnlineClass {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  instructorName: string;
  category: OnlineClassCategory;
  provider: OnlineClassProvider;
  videoUrl: string;
  videoId: string;
  scheduledAt: string | null;
  status: OnlineClassStatus;
  published: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OnlineClassInput {
  title: string;
  description: string;
  thumbnailUrl: string | null;
  instructorName: string;
  category: OnlineClassCategory;
  provider: OnlineClassProvider;
  videoUrl: string;
  videoId: string;
  scheduledAt: string | null;
  status: OnlineClassStatus;
  published: boolean;
}
