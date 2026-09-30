import React from "react";
import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import ArticlesIslandWrapper from "./ArticlesIslandWrapper.js";
import type { Article } from "../types/article.js";

const versionArticle: Article = {
  id: "package-version-preview",
  company: "Cline",
  title: "@cline/agents@0.0.88",
  summary: "@cline/agents@0.0.88",
  content: "@cline/shared@0.0.88",
  url: "https://github.com/cline/cline/releases/tag/sdk%2Fagents%2Fv0.0.88",
  published_at: "2026-09-30T02:32:30+00:00",
  source_type: "rss_official",
  source_url: "https://github.com/cline/cline/releases.atom",
  source_key: "cline-releases",
};

test("server-rendered package versions stay readable without email-like text nodes", () => {
  const html = renderToStaticMarkup(<ArticlesIslandWrapper
    initialArticles={[versionArticle]}
    now={Date.parse("2026-09-30T04:00:00Z")}
  />);
  // The title and visible publisher excerpt both need the text-node boundary.
  expect(html.match(/@cline\/agents@<wbr\s*\/>0\.0\.88/g)).toHaveLength(2);
  expect(html.replace(/<[^>]*>/g, "")).toContain("@cline/agents@0.0.88");
  expect(html).not.toContain("/cdn-cgi/l/email-protection");
});
