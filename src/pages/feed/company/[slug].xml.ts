import type { APIRoute } from "astro";
import { allArticles, buildRss, companySlug, RSS_HEADERS } from "../../../lib/feeds.js";
import { companies } from "../../../lib/companyCatalog.js";

export function getStaticPaths() {
  return companies
    .filter((c) => c.name !== "All")
    .map((c) => ({ params: { slug: companySlug(c.name) }, props: { name: c.name } }));
}

export const GET: APIRoute = ({ props }) => {
  const name = (props as { name: string }).name;
  const items = allArticles().filter((a) => a.company === name);
  return new Response(
    buildRss({
      title: `AI News Hub — ${name}`,
      description: `Latest primary-source updates from ${name}.`,
      feedPath: `/feed/company/${companySlug(name)}.xml`,
      items,
      buildDate: new Date().toUTCString(),
    }),
    { headers: RSS_HEADERS }
  );
};
