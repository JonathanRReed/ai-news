export interface Article {
  id: string;
  company: string;
  title: string;
  url: string;
  published_at: string;
  source_type?: string;
  summary?: string;
  content?: string;
  source_url?: string;
}

export type PageData = { data: Article[]; next?: number };
