import { describe, expect, test } from 'bun:test';
import { eventBundleForItems, significanceForItem } from './events.mjs';

function item(overrides = {}) {
  return {
    id: '11111111-1111-5111-8111-111111111111',
    entity_slug: 'example-lab',
    entity_name: 'Example Lab',
    title: 'Documentation update',
    item_type: 'documentation',
    published_at: '2026-08-30T12:00:00.000Z',
    external_id: null,
    ...overrides,
  };
}

describe('significanceForItem', () => {
  test('marks a versioned flagship launch major with a public reason', () => {
    expect(significanceForItem(item({
      title: 'Introducing GLM-5, our next flagship model',
      item_type: 'other',
    }))).toEqual({
      significance: 'major',
      reason: 'Named model version announced or released',
    });
  });

  test('marks a harness major-version release major', () => {
    expect(significanceForItem(item({
      title: 'OpenClaw v3.0.0',
      item_type: 'harness_release',
      external_id: 'v3.0.0',
    }))).toEqual({
      significance: 'major',
      reason: 'Major harness version released',
    });
  });

  test('keeps routine documentation out of Major Updates', () => {
    expect(significanceForItem(item())).toEqual({ significance: 'routine', reason: null });
  });
});

describe('eventBundleForItems', () => {
  test('creates stable one-record events without fuzzy clustering', () => {
    const items = [item(), item({
      id: '22222222-2222-5222-8222-222222222222',
      title: 'Another documentation update',
    })];
    const first = eventBundleForItems(items, {
      sourceName: 'Example News',
      entityId: 'aaaaaaaa-1111-5111-8111-111111111111',
    });
    const second = eventBundleForItems(items, {
      sourceName: 'Example News',
      entityId: 'aaaaaaaa-1111-5111-8111-111111111111',
    });

    expect(first).toEqual(second);
    expect(first.events).toHaveLength(2);
    expect(new Set(first.events.map(({ anchor_item_id }) => anchor_item_id)).size).toBe(2);
    expect(first.eventItems.every(({ role }) => role === 'anchor')).toBeTrue();
  });
});
