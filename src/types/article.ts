export interface Article {
  id: string;
  company: string;
  title: string;
  url: string;
  published_at: string;
  item_type?: string;
  source_type?: string;
  summary?: string;
  content?: string;
  source_url?: string;
  source_key?: string;
}

import type { DataState, FeedCursor } from './intelligence.js';

export type PageData = {
  data: Article[];
  next?: FeedCursor;
  state: DataState;
  cacheFreshness: string | null;
};
