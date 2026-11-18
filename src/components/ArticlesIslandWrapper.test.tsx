import React from "react";
import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ArticlesProvider } from "../hooks/useArticlesContext.js";
import ArticleListIsland from "./ArticleListIsland.js";
import ArticlesIslandWrapper from "./ArticlesIslandWrapper.js";
import type { Article } from "../types/article.js";
import { admittedRouteArticles } from "../lib/articleAdmission.js";
import providerArticles from "../../public/data/provider-articles.json";
import type { FeedView } from "./ArticlesIslandWrapper.js";
import type { ReadState } from "../hooks/useReadState.js";

const versionArticle: Article = {
  id: "package-version-preview",
  company: "Cline",
  title: "@cline/agents@0.0.88",
  summary: "Published packages in this release: @cline/agents@0.0.88",
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

test("package titles remain readable when search highlighting splits the text", () => {
  const client = new QueryClient();
  const html = renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <ArticlesProvider
        filters={{ company: "All", topics: [], q: "agents" }}
        initialData={{
          pages: [{ data: [versionArticle], state: "static", cacheFreshness: versionArticle.published_at }],
          pageParams: [null],
        }}
      >
        <ArticleListIsland
          now={Date.parse("2026-09-30T04:00:00Z")}
          onClearFilters={() => {}}
          readState={{ seen: new Set(), saved: new Set(), markSeen: () => {}, toggleSaved: () => {}, hydrated: true }}
        />
      </ArticlesProvider>
    </QueryClientProvider>,
  );
  const highlighted = html.match(/<mark[^>]*>(.*?)<\/mark>/)?.[1];
  expect(highlighted).toBe("agents");
  expect(html).toMatch(/@cline\/<mark[^>]*>agents<\/mark>@<wbr\s*\/>0\.0\.88/);
  expect(html.replace(/<[^>]*>/g, "")).toContain(versionArticle.title);
  client.clear();
});

const educationRecords = admittedRouteArticles((providerArticles as Article[]).filter((article) => [
  "23517512-d27f-5bed-8711-af9838e4868a",
  "f625fa71-efb5-5520-a965-d9f94c0a2f0e",
].includes(article.id)));

function renderFeedPages(view: FeedView = "all", state: Partial<ReadState> = {}): string {
  const client = new QueryClient();
  const html = renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <ArticlesProvider
        filters={{ company: "All", topics: [], q: "" }}
        initialData={{
          pages: educationRecords.map((article) => ({
            data: [article], state: "live" as const, cacheFreshness: article.published_at,
          })),
          pageParams: educationRecords.map(() => null),
        }}
      >
        <ArticleListIsland
          view={view}
          now={Date.parse("2026-09-30T04:00:00Z")}
          onClearFilters={() => {}}
          readState={{ seen: new Set(), saved: new Set(), markSeen: () => {}, toggleSaved: () => {}, hydrated: true, ...state }}
        />
      </ArticlesProvider>
    </QueryClientProvider>,
  );
  client.clear();
  return html;
}

test("one verified report is rendered when its records arrive on separate pages", () => {
  const html = renderFeedPages();
  expect(html.match(/data-article-id=/g)).toHaveLength(1);
  expect(html).toContain('data-article-id="23517512-d27f-5bed-8711-af9838e4868a"');
});

test("older feed dates retain the publisher UTC day", () => {
  const html = renderFeedPages();
  expect(html).toContain("Aug 27, 2025");
  expect(html).not.toContain("Aug 26, 2025");
});

test("saved and read flags on the retained alias still apply to the report", () => {
  const alias = "f625fa71-efb5-5520-a965-d9f94c0a2f0e";
  const saved = renderFeedPages("saved", { saved: new Set([alias]) });
  expect(saved.match(/data-article-id=/g)).toHaveLength(1);
  expect(saved).toContain('data-article-id="23517512-d27f-5bed-8711-af9838e4868a"');
  expect(saved).toContain("Remove “Education Report: How educators use Claude” from saved");
  const unread = renderFeedPages("unread", { seen: new Set([alias]) });
  expect(unread).not.toContain("data-article-id=");
});

test('SSR keeps interactive controls disabled until their event handlers are ready', () => {
  const html = renderToStaticMarkup(<ArticlesIslandWrapper initialArticles={[versionArticle]} now={Date.parse('2026-10-15T23:00:00Z')} />);
  expect(html).toContain('<fieldset disabled="" aria-busy="true"');
  expect(html).toContain('News filters and saved stories');
  expect(html).toContain('/article/package-version-preview/');
});

test('saved stories honor source filters and never offer unrelated feed pagination', () => {
  function render(company: string) {
    return renderToStaticMarkup(<QueryClientProvider client={new QueryClient()}>
      <ArticlesProvider filters={{ company, topics: [], q: '' }} initialData={{
        pages: [{ data: [versionArticle], state: 'static', cacheFreshness: versionArticle.published_at, next: { publishedAt: versionArticle.published_at, id: versionArticle.id } }], pageParams: [null],
      }}>
        <ArticleListIsland now={Date.parse('2026-10-15T23:00:00Z')} view="saved" onClearFilters={() => {}} readState={{ seen: new Set(), saved: new Set([versionArticle.id]), markSeen: () => {}, toggleSaved: () => {}, hydrated: true }} />
      </ArticlesProvider>
    </QueryClientProvider>);
  }
  const all = render('All');
  expect(all).toContain('/article/package-version-preview/');
  expect(all).not.toContain('Load 20 more');
  const filtered = render('OpenAI');
  expect(filtered).not.toContain('/article/package-version-preview/');
  expect(filtered).toContain('Loading saved stories');
  expect(filtered).not.toContain('Load more to keep looking');
});

function clineRelease(id: string, tag: string, publishedAt: string, summary = ""): Article {
  return {
    ...versionArticle,
    id,
    title: tag,
    summary,
    content: summary,
    url: `https://github.com/cline/cline/releases/tag/${encodeURIComponent(tag)}`,
    published_at: publishedAt,
  };
}

function renderLedger(articles: Article[], view: FeedView = "all", state: Partial<ReadState> = {}): string {
  const client = new QueryClient();
  const html = renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <ArticlesProvider
        filters={{ company: "All", topics: [], q: "" }}
        initialData={{ pages: [{ data: articles, state: "static", cacheFreshness: articles[0].published_at }], pageParams: [null] }}
      >
        <ArticleListIsland
          view={view}
          now={Date.parse("2026-09-30T12:00:00Z")}
          onClearFilters={() => {}}
          readState={{ seen: new Set(), saved: new Set(), markSeen: () => {}, toggleSaved: () => {}, hydrated: true, ...state }}
        />
      </ArticlesProvider>
    </QueryClientProvider>,
  );
  client.clear();
  return html;
}

const ledger = [
  clineRelease("alpha-2", "v9.9.9-alpha.2", "2026-09-30T09:00:00Z"),
  clineRelease("stable", "v9.9.8", "2026-09-30T08:00:00Z", "Release v9.9.8"),
  clineRelease("alpha-1", "v9.9.9-alpha.1", "2026-09-30T07:00:00Z"),
  clineRelease("date-only", "v9.9.7", "2026-09-30T00:00:00Z", "Adds a faster diff view for large files."),
];

test("folds one project's pre-release builds into a single row that names how many", () => {
  const html = renderLedger(ledger);
  expect(html.match(/data-build-group=/g)).toHaveLength(1);
  expect(html).toContain("2 pre-release builds");
  // Folded members are not rendered until the group is opened; the other records are rows.
  expect(html.match(/<article /g)).toHaveLength(2);
  expect(html).not.toContain('data-article-id="alpha-1"');
});

test("a release row names its project with a real space, in the title and in control names", () => {
  const html = renderLedger(ledger);
  const title = html.match(/<h3 class="feed-title">(.*?)<\/h3>/)?.[1].replace(/<[^>]*>/g, "");
  expect(title).toBe("Cline v9.9.8");
  expect(html).toContain("Save “Cline v9.9.8” for later");
  expect(html).toContain("Original source on github.com for “Cline v9.9.8”");
});

test("an excerpt that only repeats the tag is left out, and a date without a time prints no clock", () => {
  const html = renderLedger(ledger);
  expect(html).not.toContain("Release v9.9.8");
  expect(html).toContain("Adds a faster diff view for large files.");
  expect(html).toContain(">08:00<");
  expect(html).not.toContain(">00:00<");
});

test("saved builds are listed as their own rows instead of being folded", () => {
  const html = renderLedger(ledger, "saved", { saved: new Set(["alpha-1", "alpha-2"]) });
  expect(html).not.toContain("data-build-group=");
  expect(html.match(/<article /g)).toHaveLength(2);
});
