import type { APIRoute } from "astro";
import { allArticles, buildJsonFeed, JSON_HEADERS } from "../../../lib/feeds.js";
import { entityForArticle, intelligenceEntities } from "../../../lib/intelligenceCatalog.js";

export function getStaticPaths() {
  return intelligenceEntities.map((entity) => ({ params: { slug: entity.slug }, props: { entity } }));
}

export const GET: APIRoute = ({ props }) => {
  const { entity } = props as { entity: (typeof intelligenceEntities)[number] };
  const items = allArticles().filter((article) => entityForArticle(article)?.slug === entity.slug);
  return new Response(buildJsonFeed({
    title: `AI News Hub - ${entity.name}`,
    description: `Primary-source updates from ${entity.name}.`,
    feedPath: `/feed/entity/${entity.slug}.json`,
    items,
    buildDate: new Date().toUTCString(),
  }), { headers: JSON_HEADERS });
};
