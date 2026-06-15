import type { APIRoute } from "astro";
import { allArticles, buildRss, RSS_HEADERS } from "../../../lib/feeds.js";
import { TOPICS, deriveTopics } from "../../../lib/articleTags.js";

export function getStaticPaths() {
  return TOPICS.map((t) => ({ params: { slug: t.key }, props: { key: t.key, label: t.label } }));
}

export const GET: APIRoute = ({ props }) => {
  const { key, label } = props as { key: string; label: string };
  const items = allArticles().filter((a) => deriveTopics(a).includes(key));
  return new Response(
    buildRss({
      title: `AI News Hub — ${label}`,
      description: `${label} stories across every tracked AI lab.`,
      feedPath: `/feed/topic/${key}.xml`,
      items,
      buildDate: new Date().toUTCString(),
    }),
    { headers: RSS_HEADERS }
  );
};
