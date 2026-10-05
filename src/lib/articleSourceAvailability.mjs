import unavailableSources from "../data/unavailable-article-sources.json" with { type: "json" };

// A publisher feed can be healthy while an individual page has disappeared.
// Keep the source record intact; suppress navigation only for verified missing pages.
function sourceUrlKey(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return "";
    url.hash = "";
    url.pathname = url.pathname.replace(/\/+$/, "");
    return url.toString();
  } catch {
    return "";
  }
}

const unavailableByUrl = new Map(
  unavailableSources.map((source) => [sourceUrlKey(source.url), source]),
);

export function unavailableArticleSource(url) {
  return unavailableByUrl.get(sourceUrlKey(url)) ?? null;
}

