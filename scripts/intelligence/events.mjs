import { stableRecordId } from './normalize.mjs';

const MODEL_FAMILY_VERSION = /\b(?:gpt|claude|gemini|llama|qwen|deepseek|glm|kimi|mistral|mixtral|minimax|command|jamba|grok|nova|phi|gemma|step)[-\s]?[a-z]?\d+(?:\.\d+){0,2}\b/i;
const RELEASE_INTENT = /\b(announc(?:e|es|ed|ing|ement)|introduc(?:e|es|ed|ing)|launch(?:e|es|ed|ing)?|releas(?:e|es|ed|ing)|available now|now available|ships?|unveil(?:s|ed|ing)?)\b/i;
const MAJOR_SEMVER = /\bv(?:ersion\s*)?(?:[2-9]|[1-9]\d+)\.0(?:\.0)?\b/i;
const ALLOWED_EVENT_TYPES = new Set([
  'announcement',
  'model_release',
  'api_change',
  'deprecation',
  'research',
  'benchmark',
  'security',
  'harness_release',
  'documentation',
  'other',
]);

function slugify(value) {
  return value.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 56)
    .replace(/-+$/g, '');
}

export function significanceForItem(item) {
  const title = item.title ?? '';
  if (
    MODEL_FAMILY_VERSION.test(title)
    && RELEASE_INTENT.test(title)
  ) {
    return {
      significance: 'major',
      reason: 'Named model version announced or released',
    };
  }
  if (
    item.item_type === 'harness_release'
    && MAJOR_SEMVER.test(`${item.external_id ?? ''} ${title}`)
  ) {
    return {
      significance: 'major',
      reason: 'Major harness version released',
    };
  }
  if (item.item_type === 'security') {
    return { significance: 'notable', reason: 'Official security update.' };
  }
  if (item.item_type === 'api_change' || item.item_type === 'deprecation') {
    return { significance: 'notable', reason: 'Official platform compatibility change.' };
  }
  return { significance: 'routine', reason: null };
}

export function eventBundleForItems(items, { sourceName, entityId }) {
  const events = [];
  const eventItems = [];
  const eventEntities = [];

  for (const item of items) {
    const id = stableRecordId('event', item.id);
    const date = item.published_at.slice(0, 10);
    const titleSlug = slugify(item.title) || 'official-update';
    const { significance, reason } = significanceForItem(item);
    events.push({
      id,
      slug: `${item.entity_slug}-${date}-${titleSlug}-${id.slice(0, 8)}`,
      title: item.title,
      event_type: ALLOWED_EVENT_TYPES.has(item.item_type) ? item.item_type : 'other',
      significance,
      significance_reason: reason,
      occurred_at: item.published_at,
      anchor_item_id: item.id,
      status: 'active',
      what_changed: `${item.entity_name} published “${item.title}” via ${sourceName}.`,
      metadata: { classification_rule: 'deterministic-v1' },
    });
    eventItems.push({ event_id: id, content_item_id: item.id, role: 'anchor' });
    eventEntities.push({ event_id: id, entity_id: entityId, role: 'publisher' });
  }
  return { events, eventItems, eventEntities };
}
