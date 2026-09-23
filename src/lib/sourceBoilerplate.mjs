const genericDescriptions = new Map([
  [
    'mistral-sitemap',
    'The most powerful AI platform for enterprises. Customize, fine-tune, and deploy AI assistants, autonomous agents, and multimodal AI with open models.',
  ],
  [
    'anthropic-sitemap',
    "Anthropic is an AI safety and research company that's working to build reliable, interpretable, and steerable AI systems.",
  ],
]);

export function isSourceBoilerplate(sourceKey, value) {
  const generic = genericDescriptions.get(sourceKey);
  return Boolean(generic && typeof value === 'string' && value.replace(/\s+/g, ' ').trim() === generic);
}
