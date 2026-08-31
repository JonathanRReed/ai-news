export type DataState = 'live' | 'static' | 'degraded' | 'unconfigured';

export interface FeedCursor {
  publishedAt: string;
  id: string;
}

export interface FeedItem {
  id: string;
  legacy_id: string | null;
  canonical_url: string;
  title: string;
  excerpt: string | null;
  content: string | null;
  item_type: string;
  published_at: string;
  source_key: string;
  source_name: string;
  source_url: string;
  source_type: string;
  entity_id: string;
  entity_slug: string;
  entity_name: string;
  entity_type: string;
  event_id: string | null;
  event_slug: string | null;
  event_title: string | null;
  event_significance: 'routine' | 'notable' | 'major' | null;
  significance_reason: string | null;
}

export interface FeedPage {
  data: FeedItem[];
  nextCursor: FeedCursor | null;
  state: DataState;
  cacheFreshness: string | null;
}
