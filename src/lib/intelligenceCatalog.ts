import catalogJson from "../data/intelligence-catalog.json";

export type EntityType = "provider" | "lab" | "research_org" | "harness";
export type EntityStatus = "active" | "watchlist";

export interface IntelligenceEntity {
  slug: string;
  name: string;
  entityType: EntityType;
  status: EntityStatus;
  homepageUrl: string;
  summary: string;
}

export interface IntelligenceSource {
  sourceKey: string;
  entitySlug: string;
  name: string;
  officialUrl: string;
  endpointUrl: string;
  transportType: string;
  sourceRole: string;
  parserKey: string;
  sourceType: string;
  itemType: string;
  active: boolean;
  archiveOnly: boolean;
  required: boolean;
  verifiedAt: string;
  includePaths: string[];
  allowedHosts: string[];
}

const catalog = catalogJson as {
  schemaVersion: number;
  entities: IntelligenceEntity[];
  sources: IntelligenceSource[];
};

export const intelligenceEntities = catalog.entities;
export const intelligenceSources = catalog.sources;

const entityBySlug = new Map(intelligenceEntities.map((entity) => [entity.slug, entity]));
const activeEntitySlugs = new Set(
  intelligenceSources.filter((source) => source.active).map((source) => source.entitySlug),
);

export const activeEntities = intelligenceEntities.filter(
  (entity) => entity.status === "active" && activeEntitySlugs.has(entity.slug),
);

export const entitiesBySection = {
  labs: intelligenceEntities.filter((entity) => entity.entityType !== "harness"),
  harnesses: intelligenceEntities.filter((entity) => entity.entityType === "harness"),
};

const COMPANY_ALIASES: Record<string, string> = {
  "amazon ai": "amazon-ai",
  "alibaba qwen": "alibaba-qwen",
  "google deepmind": "google-deepmind",
  "ibm research": "ibm-research",
  "meta ai": "meta-ai",
  "moonshot ai": "moonshot-ai",
  "nvidia ai": "nvidia-ai",
  "z.ai": "z-ai",
};

function normalizedName(value: string): string {
  return value.trim().toLocaleLowerCase("en-US");
}

export function getEntity(slug: string): IntelligenceEntity | undefined {
  return entityBySlug.get(slug);
}

export function entitySources(slug: string): IntelligenceSource[] {
  return intelligenceSources.filter((source) => source.entitySlug === slug);
}

export function entityForArticle(article: { company: string }): IntelligenceEntity | undefined {
  const company = normalizedName(article.company);
  const alias = COMPANY_ALIASES[company];
  if (alias) return getEntity(alias);
  return intelligenceEntities.find((entity) => normalizedName(entity.name) === company);
}

export function isEntityCovered(slug: string): boolean {
  return activeEntitySlugs.has(slug);
}

export function entityTypeLabel(type: EntityType): string {
  switch (type) {
    case "research_org": return "Research organization";
    case "harness": return "Agent harness";
    case "lab": return "AI lab";
    default: return "Model provider";
  }
}

export function entitySharePath(entity: IntelligenceEntity): string {
  return entity.entityType === "harness"
    ? `/entities/${entity.slug}/`
    : `/?company=${encodeURIComponent(entity.name)}`;
}
