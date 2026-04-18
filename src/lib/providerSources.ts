import type { Database } from '../types/database.js';

export type ProviderSourceType = Database['public']['Enums']['news_source_type'];
export type ProviderFeedKind = 'rss' | 'atom';

export interface ProviderSource {
  company: string;
  sourceType: ProviderSourceType;
  feeds: Array<{
    kind: ProviderFeedKind;
    url: string;
  }>;
  note: string;
}

export const providerSources: ProviderSource[] = [
  {
    company: 'DeepSeek',
    sourceType: 'rss_official',
    feeds: [
      { kind: 'atom', url: 'https://github.com/deepseek-ai/DeepSeek-V3/releases.atom' },
      { kind: 'atom', url: 'https://github.com/deepseek-ai/DeepGEMM/releases.atom' },
    ],
    note: 'DeepSeek does not expose a site RSS feed, but official GitHub release Atom feeds have release entries.',
  },
  {
    company: 'IBM Research',
    sourceType: 'rss_official',
    feeds: [{ kind: 'rss', url: 'https://research.ibm.com/rss' }],
    note: 'IBM Research blog advertises an official RSS alternate at /rss.',
  },
  {
    company: 'Amazon AI',
    sourceType: 'rss_official',
    feeds: [
      { kind: 'rss', url: 'https://aws.amazon.com/blogs/machine-learning/feed/' },
      { kind: 'rss', url: 'https://www.amazon.science/index.rss' },
    ],
    note: 'AWS Machine Learning Blog and Amazon Science both expose working RSS feeds.',
  },
  {
    company: 'NVIDIA AI',
    sourceType: 'rss_official',
    feeds: [
      { kind: 'rss', url: 'https://blogs.nvidia.com/feed/' },
      { kind: 'atom', url: 'https://developer.nvidia.com/blog/category/generative-ai/feed/' },
    ],
    note: 'NVIDIA exposes official blog feeds and developer category Atom feeds.',
  },
  {
    company: 'Alibaba Qwen',
    sourceType: 'rss_official',
    feeds: [{ kind: 'rss', url: 'https://qwenlm.github.io/blog/index.xml' }],
    note: 'Qwen blog exposes a working RSS index.',
  },
];
