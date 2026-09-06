// Written labels for the database enums, shared by the feed cards and the source pages.
// Sentence case, never a machine-generated title case of the raw value.

export function itemTypeLabel(itemType?: string | null): string | null {
  switch (itemType) {
    case "announcement": return "Announcement";
    case "release": return "Release";
    case "model_release": return "Model release";
    case "harness_release": return "Agent tool release";
    case "api_change": return "API change";
    case "security": return "Security";
    case "deprecation": return "Deprecation";
    case "research": return "Research";
    case "benchmark": return "Benchmark";
    case "documentation": return "Docs";
    case "funding": return "Funding";
    default: return null;
  }
}

export function sourceRoleLabel(sourceRole?: string | null): string {
  switch (sourceRole) {
    case "changelog": return "Changelog";
    case "newsroom": return "Newsroom";
    case "releases": return "Release notes";
    case "research": return "Research";
    default: return "Publisher feed";
  }
}

export function transportTypeLabel(transportType?: string | null): string {
  switch ((transportType || "").toLowerCase()) {
    case "rss": return "RSS feed";
    case "atom": return "Atom feed";
    case "json": return "JSON feed";
    case "html": return "Web page";
    case "sitemap": return "Sitemap";
    default: return "Publisher feed";
  }
}
