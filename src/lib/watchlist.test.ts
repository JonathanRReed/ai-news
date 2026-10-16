import { expect, test } from 'bun:test';
import { isWatchlistStory } from './watchlist.js';
const story = { id: 'article-1', company: 'OpenAI', title: 'A release', published_at: '2026-10-07T00:00:00Z' };
test('watchlist payloads require valid dates and safe article routes', () => {
  expect(isWatchlistStory(story)).toBe(true);
  expect(isWatchlistStory({ ...story, id: '../other' })).toBe(false);
  expect(isWatchlistStory({ ...story, published_at: 'invalid' })).toBe(false);
  expect(isWatchlistStory({ ...story, title: null })).toBe(false);
});
